import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';

import { AuthService } from '../../core/services/auth';
import { environment } from '../../../environments/environment';

interface PersonaHistorial {
  cedula: string;
  nombres: string;
  cargo?: string | null;
  unidad?: string | null;
  modalidad?: string | null;
  numero_nomina?: string | null;
  encontrado_en_personal?: boolean | number;
}

interface AccionHistorial {
  id: number;
  documento_id?: number | null;
  accion_personal_id?: number | null;
  numero_accion?: string | null;
  tipo_accion?: string | null;
  fecha_accion?: string | null;
  fecha_registro?: string | null;
  archivo_nombre?: string | null;
  archivo_tipo?: string | null;
  registrado_por?: string | null;
  es_nativo?: boolean | number;
  estado?: string | null;
  estado_documento?: string | null;
  datos_formulario?: any;
}

interface FirmaDocumento {
  id?: number;
  seccion: string;
  nombre_firmante: string;
  cargo_firmante?: string | null;
  estado: string;
  fecha_firma?: string | null;
  certificado_subject?: string | null;
}

interface RespuestaBusqueda {
  persona?: PersonaHistorial | null;
  acciones?: AccionHistorial[];
}

interface FormularioSubir {
  numero_accion: string;
  tipo_accion: string;
  fecha_accion: string;
}

@Component({
  selector: 'app-historial-acciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historial-acciones.html',
  styleUrls: ['./historial-acciones.scss'],
})
export class HistorialAccionesComponent implements OnDestroy {
  private readonly API_URL = String(
    environment.apiUrl || 'http://localhost:5000/api',
  ).replace(/\/$/, '');
  private readonly BASE = `${this.API_URL}/historial-acciones`;
  private readonly FIRMAS_API = `${this.API_URL}/acciones-personal`;

  private readonly EXTENSIONES_DOCUMENTOS = [
    '.pdf',
    '.xlsx',
    '.xls',
    '.docx',
    '.doc',
  ];

  private readonly EXTENSIONES_CERTIFICADOS = ['.p12', '.pfx'];
  private readonly MAX_DOCUMENTO_BYTES = 20 * 1024 * 1024;
  private readonly MAX_CERTIFICADO_BYTES = 10 * 1024 * 1024;

  textoBusqueda = '';
  ultimoTerminoBuscado = '';
  buscando = false;
  yaSeHizoBusqueda = false;

  persona: PersonaHistorial | null = null;
  acciones: AccionHistorial[] = [];

  filtroAcciones = '';
  filtroTipo = '';
  ordenAcciones: 'recientes' | 'antiguas' | 'numero' = 'recientes';

  mostrarModal = false;
  subiendoArchivo = false;
  archivoSeleccionado: File | null = null;

  formSubir: FormularioSubir = this.crearFormularioSubir();

  readonly tiposAccion = [
    'Vacaciones',
    'Permiso',
    'Comisión de Servicios',
    'Traslado',
    'Cambio Administrativo',
    'Subrogación',
    'Licencia sin Sueldo',
    'Licencia con Sueldo',
    'Sanción',
    'Cesación de Funciones',
    'Nombramiento',
    'Encargo',
    'Renuncia',
    'Otro',
  ];

  // Visor de archivos cargados o generados.
  mostrarVisorArchivo = false;
  cargandoVisorArchivo = false;
  accionVisualizada: AccionHistorial | null = null;
  visorArchivoUrl: SafeResourceUrl | null = null;
  visorArchivoEsPdf = false;
  visorArchivoNombre = '';
  visorArchivoMime = '';
  private visorArchivoObjectUrl: string | null = null;

  // Gestión de firmas electrónicas para documentos nativos.
  mostrarOffcanvasFirmas = false;
  mostrarModalFirma = false;
  documentoActualId: number | null = null;
  accionDocumentoActual: AccionHistorial | null = null;
  firmasDocumento: FirmaDocumento[] = [];
  firmaSeleccionada: FirmaDocumento | null = null;
  passwordFirmaSeccion = '';
  mostrarPasswordFirma = false;
  selectedFile: File | null = null;
  firmando = false;
  cargandoFirmas = false;
  cargandoPdfFirmas = false;
  finalizandoDocumento = false;
  pdfFirmasUrl: SafeResourceUrl | null = null;
  private pdfFirmasObjectUrl: string | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    public readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef,
    private readonly sanitizer: DomSanitizer,
  ) {}

  ngOnDestroy(): void {
    this.liberarUrlVisorArchivo();
    this.liberarUrlPdfFirmas();
  }

  get accionesFiltradas(): AccionHistorial[] {
    const texto = this.normalizarTexto(this.filtroAcciones);
    const tipo = this.normalizarTexto(this.filtroTipo);

    const resultado = this.acciones.filter((accion) => {
      const coincideTexto = !texto || [
        accion.numero_accion,
        accion.tipo_accion,
        accion.archivo_nombre,
        accion.registrado_por,
        accion.estado_documento,
        accion.estado,
      ].some((valor) => this.normalizarTexto(valor).includes(texto));

      const coincideTipo = !tipo ||
        this.normalizarTexto(accion.tipo_accion) === tipo;

      return coincideTexto && coincideTipo;
    });

    return resultado.sort((a, b) => {
      if (this.ordenAcciones === 'numero') {
        return String(a.numero_accion || '').localeCompare(
          String(b.numero_accion || ''),
          'es',
          { numeric: true },
        );
      }

      const fechaA = this.obtenerMarcaTiempo(a);
      const fechaB = this.obtenerMarcaTiempo(b);
      return this.ordenAcciones === 'antiguas'
        ? fechaA - fechaB
        : fechaB - fechaA;
    });
  }

  get tiposDisponibles(): string[] {
    return Array.from(
      new Set(
        this.acciones
          .map((accion) => String(accion.tipo_accion || '').trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, 'es'));
  }

  get totalNativas(): number {
    return this.acciones.filter((accion) => this.esNativo(accion)).length;
  }

  get totalCargadas(): number {
    return this.acciones.length - this.totalNativas;
  }

  get formularioSubirValido(): boolean {
    return Boolean(
      this.persona &&
      this.formSubir.tipo_accion.trim() &&
      this.archivoSeleccionado &&
      !this.subiendoArchivo,
    );
  }

  get archivoSeleccionadoTamano(): string {
    return this.archivoSeleccionado
      ? this.formatearBytes(this.archivoSeleccionado.size)
      : '';
  }

  get todasFirmasCompletadas(): boolean {
    return this.firmasDocumento.length > 0 &&
      this.firmasDocumento.every(
        (firma) => this.normalizarTexto(firma.estado) === 'firmada',
      );
  }

  get progresoFirmas(): number {
    if (this.firmasDocumento.length === 0) {
      return 0;
    }

    const completadas = this.firmasDocumento.filter(
      (firma) => this.normalizarTexto(firma.estado) === 'firmada',
    ).length;

    return Math.round((completadas / this.firmasDocumento.length) * 100);
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: this.authService.getToken(),
    });
  }

  volver(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  async buscar(): Promise<void> {
    const termino = this.textoBusqueda.trim();

    if (!termino || this.buscando) {
      if (!termino) {
        Swal.fire({
          icon: 'info',
          title: 'Ingrese un criterio de búsqueda',
          text: 'Puede buscar por cédula, nombre completo o número de nómina.',
          confirmButtonText: 'Entendido',
        });
      }
      return;
    }

    this.buscando = true;
    this.ultimoTerminoBuscado = termino;
    this.persona = null;
    this.acciones = [];
    this.filtroAcciones = '';
    this.filtroTipo = '';

    try {
      const respuesta = await firstValueFrom(
        this.http.get<RespuestaBusqueda>(
          `${this.BASE}/buscar?q=${encodeURIComponent(termino)}`,
          { headers: this.headers() },
        ),
      );

      this.persona = respuesta?.persona || null;
      this.acciones = Array.isArray(respuesta?.acciones)
        ? respuesta.acciones
        : [];
      this.yaSeHizoBusqueda = true;
    } catch (error: unknown) {
      this.yaSeHizoBusqueda = true;
      const mensaje = await this.obtenerMensajeError(
        error,
        'No se pudo realizar la búsqueda.',
      );
      Swal.fire('Error', mensaje, 'error');
    } finally {
      this.buscando = false;
      this.cdr.detectChanges();
    }
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      void this.buscar();
    }
  }

  limpiarBusqueda(): void {
    this.textoBusqueda = '';
    this.ultimoTerminoBuscado = '';
    this.persona = null;
    this.acciones = [];
    this.filtroAcciones = '';
    this.filtroTipo = '';
    this.yaSeHizoBusqueda = false;
    this.cdr.detectChanges();
  }

  limpiarFiltros(): void {
    this.filtroAcciones = '';
    this.filtroTipo = '';
    this.ordenAcciones = 'recientes';
  }

  abrirModal(): void {
    if (!this.persona) {
      return;
    }

    this.formSubir = this.crearFormularioSubir();
    this.archivoSeleccionado = null;
    this.mostrarModal = true;
    this.cdr.detectChanges();
  }

  cerrarModal(): void {
    if (this.subiendoArchivo) {
      return;
    }

    this.mostrarModal = false;
    this.archivoSeleccionado = null;
    this.formSubir = this.crearFormularioSubir();
    this.cdr.detectChanges();
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;

    if (!archivo) {
      this.archivoSeleccionado = null;
      return;
    }

    const extension = this.obtenerExtension(archivo.name);

    if (!this.EXTENSIONES_DOCUMENTOS.includes(extension)) {
      input.value = '';
      this.archivoSeleccionado = null;
      Swal.fire(
        'Archivo no permitido',
        'Seleccione un archivo PDF, Excel o Word.',
        'warning',
      );
      return;
    }

    if (archivo.size > this.MAX_DOCUMENTO_BYTES) {
      input.value = '';
      this.archivoSeleccionado = null;
      Swal.fire(
        'Archivo demasiado grande',
        'El documento no puede superar los 20 MB.',
        'warning',
      );
      return;
    }

    this.archivoSeleccionado = archivo;
    this.cdr.detectChanges();
  }

  quitarArchivoSeleccionado(event?: Event): void {
    event?.stopPropagation();
    this.archivoSeleccionado = null;
    const input = document.getElementById(
      'archivoAccionInput',
    ) as HTMLInputElement | null;
    if (input) {
      input.value = '';
    }
  }

  async subirAccion(): Promise<void> {
    if (!this.persona || this.subiendoArchivo) {
      return;
    }

    if (!this.formSubir.tipo_accion.trim()) {
      Swal.fire(
        'Dato obligatorio',
        'Seleccione el tipo de acción de personal.',
        'warning',
      );
      return;
    }

    if (!this.archivoSeleccionado) {
      Swal.fire(
        'Documento requerido',
        'Seleccione el archivo que se incorporará al historial.',
        'warning',
      );
      return;
    }

    const formData = new FormData();
    formData.append('cedula', this.persona.cedula || '');
    formData.append('nombres', this.persona.nombres || '');
    formData.append('numero_accion', this.formSubir.numero_accion.trim());
    formData.append('tipo_accion', this.formSubir.tipo_accion.trim());
    formData.append('fecha_accion', this.formSubir.fecha_accion || '');
    formData.append(
      'archivo',
      this.archivoSeleccionado,
      this.archivoSeleccionado.name,
    );

    this.subiendoArchivo = true;

    try {
      await firstValueFrom(
        this.http.post(`${this.BASE}/subir`, formData, {
          headers: this.headers(),
        }),
      );

      this.mostrarModal = false;
      this.archivoSeleccionado = null;
      this.formSubir = this.crearFormularioSubir();
      await this.buscar();

      Swal.fire({
        icon: 'success',
        title: 'Acción registrada',
        text: 'El documento fue incorporado correctamente al historial.',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error: unknown) {
      const mensaje = await this.obtenerMensajeError(
        error,
        'No se pudo registrar la acción de personal.',
      );
      Swal.fire('Error', mensaje, 'error');
    } finally {
      this.subiendoArchivo = false;
      this.cdr.detectChanges();
    }
  }

  async verDocumento(accion: AccionHistorial): Promise<void> {
    if (!this.tieneArchivo(accion) || this.cargandoVisorArchivo) {
      return;
    }

    this.cargandoVisorArchivo = true;
    this.accionVisualizada = accion;
    this.visorArchivoNombre = this.obtenerNombreArchivo(accion);
    this.visorArchivoMime = '';
    this.visorArchivoEsPdf = false;
    this.mostrarVisorArchivo = true;

    try {
      const blob = await firstValueFrom(
        this.http.get(this.obtenerUrlArchivo(accion), {
          headers: this.headers(),
          responseType: 'blob',
        }),
      );

      this.visorArchivoMime = blob.type || this.obtenerMimePorNombre(
        this.visorArchivoNombre,
      );
      this.visorArchivoEsPdf = this.esArchivoPdf(
        this.visorArchivoNombre,
        this.visorArchivoMime,
      );

      this.liberarUrlVisorArchivo();
      this.visorArchivoObjectUrl = URL.createObjectURL(blob);
      this.visorArchivoUrl = this.visorArchivoEsPdf
        ? this.sanitizer.bypassSecurityTrustResourceUrl(
            this.visorArchivoObjectUrl,
          )
        : null;
    } catch (error: unknown) {
      this.cerrarVisorArchivo();
      const mensaje = await this.obtenerMensajeError(
        error,
        'No se pudo abrir el documento.',
      );
      Swal.fire('Error', mensaje, 'error');
    } finally {
      this.cargandoVisorArchivo = false;
      this.cdr.detectChanges();
    }
  }

  cerrarVisorArchivo(): void {
    this.mostrarVisorArchivo = false;
    this.accionVisualizada = null;
    this.visorArchivoUrl = null;
    this.visorArchivoEsPdf = false;
    this.visorArchivoNombre = '';
    this.visorArchivoMime = '';
    this.liberarUrlVisorArchivo();
    this.cdr.detectChanges();
  }

  descargarDesdeVisor(): void {
    if (this.accionVisualizada) {
      void this.descargar(this.accionVisualizada);
    }
  }

  async descargar(accion: AccionHistorial): Promise<void> {
    if (!this.tieneArchivo(accion)) {
      return;
    }

    try {
      const blob = await firstValueFrom(
        this.http.get(this.obtenerUrlArchivo(accion), {
          headers: this.headers(),
          responseType: 'blob',
        }),
      );

      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = this.obtenerNombreArchivo(accion);
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error: unknown) {
      const mensaje = await this.obtenerMensajeError(
        error,
        'No se pudo descargar el archivo.',
      );
      Swal.fire('Error', mensaje, 'error');
    }
  }

  async eliminar(accion: AccionHistorial): Promise<void> {
    if (this.esNativo(accion)) {
      Swal.fire(
        'Acción protegida',
        'Los documentos generados por el sistema no se eliminan desde el historial.',
        'info',
      );
      return;
    }

    const confirmacion = await Swal.fire({
      title: '¿Eliminar esta acción?',
      html: `
        <strong>${this.escaparHtml(accion.numero_accion || 'Sin número')}</strong>
        <br>
        <small>${this.escaparHtml(accion.tipo_accion || 'Sin tipo')}</small>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
    });

    if (!confirmacion.isConfirmed) {
      return;
    }

    try {
      await firstValueFrom(
        this.http.delete(`${this.BASE}/${accion.id}`, {
          headers: this.headers(),
        }),
      );
      await this.buscar();
      Swal.fire({
        icon: 'success',
        title: 'Registro eliminado',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error: unknown) {
      const mensaje = await this.obtenerMensajeError(
        error,
        'No se pudo eliminar el registro.',
      );
      Swal.fire('Error', mensaje, 'error');
    }
  }

  tieneArchivo(accion: AccionHistorial): boolean {
    return this.esNativo(accion) || Boolean(accion.archivo_nombre);
  }

  esNativo(accion: AccionHistorial): boolean {
    return accion.es_nativo === true || Number(accion.es_nativo) === 1;
  }

  estadoAccion(accion: AccionHistorial): string {
    return String(
      accion.estado_documento || accion.estado ||
      (this.esNativo(accion) ? 'GENERADO' : 'ARCHIVADO'),
    ).trim();
  }

  claseEstadoAccion(accion: AccionHistorial): string {
    const estado = this.normalizarTexto(this.estadoAccion(accion));

    if (estado.includes('final') || estado.includes('firmad')) {
      return 'estado--success';
    }
    if (estado.includes('pend') || estado.includes('firma')) {
      return 'estado--warning';
    }
    if (estado.includes('rech') || estado.includes('anul')) {
      return 'estado--danger';
    }
    return 'estado--neutral';
  }

  iconoArchivo(accion: AccionHistorial): string {
    const extension = this.obtenerExtension(this.obtenerNombreArchivo(accion));

    if (extension === '.pdf') {
      return 'bi-file-earmark-pdf-fill';
    }
    if (extension === '.xlsx' || extension === '.xls') {
      return 'bi-file-earmark-excel-fill';
    }
    if (extension === '.docx' || extension === '.doc') {
      return 'bi-file-earmark-word-fill';
    }
    return 'bi-file-earmark-fill';
  }

  async gestionarFirmas(accion: AccionHistorial): Promise<void> {
    if (!this.esNativo(accion)) {
      Swal.fire(
        'Firma no disponible',
        'La gestión de firmas aplica a documentos generados por el sistema.',
        'info',
      );
      return;
    }

    const documentoId = this.obtenerDocumentoId(accion);
    if (!documentoId) {
      Swal.fire(
        'Documento no identificado',
        'No se pudo determinar el identificador del documento.',
        'error',
      );
      return;
    }

    this.documentoActualId = documentoId;
    this.accionDocumentoActual = accion;
    this.mostrarOffcanvasFirmas = true;
    this.firmasDocumento = [];
    this.pdfFirmasUrl = null;
    this.cdr.detectChanges();

    await Promise.all([
      this.cargarPdfFirmas(),
      this.cargarFirmasDocumento(),
    ]);
  }

  async cargarFirmasDocumento(): Promise<void> {
    if (!this.documentoActualId || this.cargandoFirmas) {
      return;
    }

    this.cargandoFirmas = true;

    try {
      const respuesta = await firstValueFrom(
        this.http.get<FirmaDocumento[] | { firmas?: FirmaDocumento[] }>(
          `${this.FIRMAS_API}/${this.documentoActualId}/firmas`,
          { headers: this.headers() },
        ),
      );

      this.firmasDocumento = Array.isArray(respuesta)
        ? respuesta
        : Array.isArray(respuesta?.firmas)
          ? respuesta.firmas
          : [];
    } catch (error: unknown) {
      const mensaje = await this.obtenerMensajeError(
        error,
        'No se pudieron cargar las firmas del documento.',
      );
      Swal.fire('Error', mensaje, 'error');
    } finally {
      this.cargandoFirmas = false;
      this.cdr.detectChanges();
    }
  }

  async cargarPdfFirmas(): Promise<void> {
    if (!this.documentoActualId || this.cargandoPdfFirmas) {
      return;
    }

    this.cargandoPdfFirmas = true;

    try {
      const blob = await firstValueFrom(
        this.http.get(
          `${this.FIRMAS_API}/${this.documentoActualId}/pdf?t=${Date.now()}`,
          {
            headers: this.headers(),
            responseType: 'blob',
          },
        ),
      );

      this.liberarUrlPdfFirmas();
      this.pdfFirmasObjectUrl = URL.createObjectURL(blob);
      this.pdfFirmasUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        this.pdfFirmasObjectUrl,
      );
    } catch (error: unknown) {
      const mensaje = await this.obtenerMensajeError(
        error,
        'No se pudo cargar la vista previa del PDF.',
      );
      Swal.fire('Error', mensaje, 'error');
    } finally {
      this.cargandoPdfFirmas = false;
      this.cdr.detectChanges();
    }
  }

  abrirPanelFirmas(): void {
    this.mostrarOffcanvasFirmas = true;
  }

  cerrarPanelFirmas(): void {
    this.mostrarOffcanvasFirmas = false;
  }

  abrirModalFirma(firma: FirmaDocumento): void {
    if (this.normalizarTexto(firma.estado) === 'firmada') {
      return;
    }

    this.firmaSeleccionada = firma;
    this.mostrarModalFirma = true;
    this.passwordFirmaSeccion = '';
    this.mostrarPasswordFirma = false;
    this.selectedFile = null;
    this.cdr.detectChanges();
  }

  cerrarModalFirma(): void {
    if (this.firmando) {
      return;
    }

    this.mostrarModalFirma = false;
    this.firmaSeleccionada = null;
    this.passwordFirmaSeccion = '';
    this.mostrarPasswordFirma = false;
    this.selectedFile = null;
    this.limpiarInputCertificado();
    this.cdr.detectChanges();
  }

  cerrarGestionFirmas(): void {
    if (this.firmando || this.finalizandoDocumento) {
      return;
    }

    this.mostrarOffcanvasFirmas = false;
    this.mostrarModalFirma = false;
    this.documentoActualId = null;
    this.accionDocumentoActual = null;
    this.firmasDocumento = [];
    this.firmaSeleccionada = null;
    this.passwordFirmaSeccion = '';
    this.selectedFile = null;
    this.pdfFirmasUrl = null;
    this.liberarUrlPdfFirmas();
    void this.buscar();
    this.cdr.detectChanges();
  }

  seleccionarCertificadoFirma(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;

    if (!archivo) {
      this.selectedFile = null;
      return;
    }

    const extension = this.obtenerExtension(archivo.name);

    if (!this.EXTENSIONES_CERTIFICADOS.includes(extension)) {
      input.value = '';
      this.selectedFile = null;
      Swal.fire(
        'Certificado no válido',
        'Seleccione un certificado con extensión .p12 o .pfx.',
        'warning',
      );
      return;
    }

    if (archivo.size > this.MAX_CERTIFICADO_BYTES) {
      input.value = '';
      this.selectedFile = null;
      Swal.fire(
        'Certificado demasiado grande',
        'El certificado no puede superar los 10 MB.',
        'warning',
      );
      return;
    }

    this.selectedFile = archivo;
    this.cdr.detectChanges();
  }

  quitarCertificadoFirma(event?: Event): void {
    event?.stopPropagation();
    this.selectedFile = null;
    this.limpiarInputCertificado();
  }

  async firmarSeccion(): Promise<void> {
    if (
      !this.documentoActualId ||
      !this.firmaSeleccionada ||
      !this.selectedFile ||
      !this.passwordFirmaSeccion.trim() ||
      this.firmando
    ) {
      return;
    }

    this.firmando = true;

    try {
      const formData = new FormData();
      formData.append(
        'certificado',
        this.selectedFile,
        this.selectedFile.name,
      );
      formData.append('password', this.passwordFirmaSeccion);
      formData.append('seccion', this.firmaSeleccionada.seccion);

      await firstValueFrom(
        this.http.post(
          `${this.FIRMAS_API}/${this.documentoActualId}/firmar`,
          formData,
          { headers: this.headers() },
        ),
      );

      const seccionFirmada = this.firmaSeleccionada.seccion;
      this.mostrarModalFirma = false;
      this.firmaSeleccionada = null;
      this.passwordFirmaSeccion = '';
      this.selectedFile = null;
      this.limpiarInputCertificado();

      await Promise.all([
        this.cargarFirmasDocumento(),
        this.cargarPdfFirmas(),
      ]);

      Swal.fire({
        icon: 'success',
        title: 'Firma aplicada correctamente',
        text: `La sección ${seccionFirmada} fue firmada.`,
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error: unknown) {
      const mensaje = await this.obtenerMensajeError(
        error,
        'No se pudo aplicar la firma. Verifique el certificado y la contraseña.',
      );
      Swal.fire('Error al firmar', mensaje, 'error');
    } finally {
      this.passwordFirmaSeccion = '';
      this.firmando = false;
      this.cdr.detectChanges();
    }
  }

  async finalizarDocumento(): Promise<void> {
    if (!this.documentoActualId || this.finalizandoDocumento) {
      return;
    }

    if (!this.todasFirmasCompletadas) {
      Swal.fire(
        'Firmas pendientes',
        'Todas las secciones deben estar firmadas antes de finalizar el documento.',
        'warning',
      );
      return;
    }

    const confirmacion = await Swal.fire({
      title: '¿Finalizar el documento?',
      text: 'El documento quedará cerrado con todas las firmas aplicadas.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, finalizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0f766e',
      reverseButtons: true,
    });

    if (!confirmacion.isConfirmed) {
      return;
    }

    this.finalizandoDocumento = true;
    let documentoFinalizado = false;

    try {
      await firstValueFrom(
        this.http.post(
          `${this.FIRMAS_API}/${this.documentoActualId}/finalizar`,
          {},
          { headers: this.headers() },
        ),
      );

      documentoFinalizado = true;
      await Swal.fire(
        'Documento finalizado',
        'El proceso de firmas se completó correctamente.',
        'success',
      );
    } catch (error: unknown) {
      const mensaje = await this.obtenerMensajeError(
        error,
        'No se pudo finalizar el documento.',
      );
      Swal.fire('Error', mensaje, 'error');
    } finally {
      this.finalizandoDocumento = false;
      if (documentoFinalizado) {
        this.cerrarGestionFirmas();
      }
      this.cdr.detectChanges();
    }
  }


  firmaEstaFirmada(firma: FirmaDocumento): boolean {
    return this.normalizarTexto(firma.estado) === 'firmada';
  }

  estadoFirmaClase(firma: FirmaDocumento): string {
    const estado = this.normalizarTexto(firma.estado);
    if (estado === 'firmada') {
      return 'firma-card--firmada';
    }
    if (estado === 'rechazada' || estado === 'anulada') {
      return 'firma-card--error';
    }
    return 'firma-card--pendiente';
  }

  private crearFormularioSubir(): FormularioSubir {
    return {
      numero_accion: '',
      tipo_accion: '',
      fecha_accion: this.fechaLocalIso(),
    };
  }

  private fechaLocalIso(): string {
    const fecha = new Date();
    const offset = fecha.getTimezoneOffset();
    const local = new Date(fecha.getTime() - offset * 60_000);
    return local.toISOString().slice(0, 10);
  }

  private obtenerDocumentoId(accion: AccionHistorial): number | null {
    const valor = accion.documento_id ?? accion.accion_personal_id ?? accion.id;
    const numero = Number(valor);
    return Number.isFinite(numero) && numero > 0 ? numero : null;
  }

  private obtenerUrlArchivo(accion: AccionHistorial): string {
    if (this.esNativo(accion)) {
      const documentoId = this.obtenerDocumentoId(accion);
      return `${this.FIRMAS_API}/${documentoId}/pdf`;
    }
    return `${this.BASE}/${accion.id}/descargar`;
  }

  private obtenerNombreArchivo(accion: AccionHistorial): string {
    if (accion.archivo_nombre) {
      return accion.archivo_nombre;
    }

    const numero = String(accion.numero_accion || accion.id)
      .replace(/[^a-zA-Z0-9_-]+/g, '_');
    return `accion_${numero}.pdf`;
  }

  private obtenerMarcaTiempo(accion: AccionHistorial): number {
    const valor = accion.fecha_accion || accion.fecha_registro || '';
    const marca = new Date(valor).getTime();
    return Number.isNaN(marca) ? 0 : marca;
  }

  private normalizarTexto(valor: unknown): string {
    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private obtenerExtension(nombre: string): string {
    const posicion = nombre.lastIndexOf('.');
    return posicion >= 0 ? nombre.slice(posicion).toLowerCase() : '';
  }

  private formatearBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return '0 bytes';
    }

    const unidades = ['bytes', 'KB', 'MB', 'GB'];
    const indice = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      unidades.length - 1,
    );
    const valor = bytes / Math.pow(1024, indice);
    return `${valor.toFixed(indice === 0 ? 0 : 1)} ${unidades[indice]}`;
  }

  private obtenerMimePorNombre(nombre: string): string {
    const extension = this.obtenerExtension(nombre);
    const mapa: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
    };
    return mapa[extension] || 'application/octet-stream';
  }

  private esArchivoPdf(nombre: string, mime: string): boolean {
    return mime.toLowerCase().includes('pdf') ||
      this.obtenerExtension(nombre) === '.pdf';
  }

  private liberarUrlVisorArchivo(): void {
    if (this.visorArchivoObjectUrl) {
      URL.revokeObjectURL(this.visorArchivoObjectUrl);
      this.visorArchivoObjectUrl = null;
    }
  }

  private liberarUrlPdfFirmas(): void {
    if (this.pdfFirmasObjectUrl) {
      URL.revokeObjectURL(this.pdfFirmasObjectUrl);
      this.pdfFirmasObjectUrl = null;
    }
  }

  private limpiarInputCertificado(): void {
    const input = document.getElementById(
      'firmaFile',
    ) as HTMLInputElement | null;
    if (input) {
      input.value = '';
    }
  }

  private escaparHtml(valor: string): string {
    const elemento = document.createElement('div');
    elemento.textContent = valor;
    return elemento.innerHTML;
  }

  private async obtenerMensajeError(
    error: unknown,
    mensajePredeterminado: string,
  ): Promise<string> {
    if (!(error instanceof HttpErrorResponse)) {
      return mensajePredeterminado;
    }

    const cuerpo = error.error;

    if (cuerpo instanceof Blob) {
      try {
        const texto = await cuerpo.text();
        if (texto) {
          const json = JSON.parse(texto);
          return json?.error || json?.message || mensajePredeterminado;
        }
      } catch {
        return mensajePredeterminado;
      }
    }

    if (typeof cuerpo === 'string' && cuerpo.trim()) {
      try {
        const json = JSON.parse(cuerpo);
        return json?.error || json?.message || cuerpo;
      } catch {
        return cuerpo;
      }
    }

    if (cuerpo && typeof cuerpo === 'object') {
      const objeto = cuerpo as Record<string, unknown>;
      const mensaje = objeto['error'] || objeto['message'] || objeto['detalle'];
      if (mensaje) {
        return String(mensaje);
      }
    }

    if (error.status === 0) {
      return 'No fue posible conectarse con el servidor.';
    }

    if (error.status === 401 || error.status === 403) {
      return 'La sesión no tiene autorización para realizar esta operación.';
    }

    if (error.status === 404) {
      return 'El registro o archivo solicitado no existe.';
    }

    if (error.status === 413) {
      return 'El archivo supera el tamaño permitido por el servidor.';
    }

    return mensajePredeterminado;
  }
}
