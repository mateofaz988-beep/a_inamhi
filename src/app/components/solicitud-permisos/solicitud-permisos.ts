/**
 * COMPONENTE FINAL: Acción de Personal + firmas electrónicas independientes.
 * Compatible con solicitud-permisos.html.
 * Todas las firmas PENDIENTES pueden realizarse sin respetar orden secuencial.
 */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  DoCheck,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders
} from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Swal from 'sweetalert2';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth';

interface PersonaEstructura {
  id?: number;
  nombres: string;
  denominacion_puesto: string;
  unidad_organica?: string;
}

interface PersonaApiItem {
  id?: number;
  nombres?: string;
  nombre?: string;
  nombres_completos?: string;
  denominacion_puesto?: string;
  cargo?: string;
  unidad_organica?: string;
  unidad?: string;
}

interface FuncionarioApiResponse {
  cedula?: string;
  apellidos?: string;
  nombres?: string;
  nombres_completos?: string;
  nombre_completo?: string;
  modalidad?: string;
  cargo?: string;
  unidad?: string;
  rmu?: string | number | null;
  rol?: string;
  grupo_ocupacional?: string;
  ciudad?: string;
}

interface ApiDataResponse<T> {
  data?: T;
}

type ApiListResponse<T> = T[] | { data?: T[] } | null | undefined;

type EstadoFirma =
  | 'PENDIENTE'
  | 'FIRMADA'
  | 'RECHAZADA'
  | 'BLOQUEADA'
  | 'ERROR';

interface FirmaDocumento {
  id?: number;
  seccion: string;
  estado: EstadoFirma | string;
  nombre_firmante: string;
  cargo_firmante: string;
  fecha_firma: string | null;
  orden_firma: number;
  obligatorio?: boolean;
  puede_firmar?: boolean;
  mensaje_bloqueo?: string;
}

interface FirmaListResponse {
  data?: FirmaDocumento[];
  firmas?: FirmaDocumento[];
}

interface DocumentoResponse {
  doc_id?: number;
  documento_id?: number;
  id?: number;
  estado?: string;
  mensaje?: string;
  message?: string;
}

interface EscalaOcupacional {
  grado: string;
  remuneracion: number;
}

/**
 * Datos que alimentan la plantilla institucional plantilla_ap.xlsx.
 * Incluye identificación, vigencia, situación actual/propuesta y responsables.
 */
export interface FormularioAccionPersonal {
  numero_accion: string;
  fecha_elaboracion: string;

  apellidos: string;
  nombres: string;
  cedula: string;

  desde: string;
  hasta: string;
  accion_personal: string;

  proceso_institucional_actual: string;
  nivel_gestion_actual: string;
  unidad_actual: string;
  lugar_trabajo_actual: string;
  denominacion_actual: string;
  grupo_actual: string;
  grado_actual: string;
  remuneracion_actual: string;
  partida_actual: string;

  proceso_institucional_propuesta: string;
  nivel_gestion_propuesta: string;
  unidad_propuesta: string;
  lugar_trabajo_propuesta: string;
  denominacion_propuesta: string;
  grupo_propuesta: string;
  grado_propuesta: string;
  remuneracion_propuesta: string;
  partida_propuesta: string;

  nombre_autoridad: string;
  puesto_autoridad: string;

  elaborado_por: string;
  puesto_elaborado: string;

  revisado_por: string;
  puesto_revisado: string;

  registrado_por: string;
  puesto_registrado: string;
}

type CampoNombreResponsable =
  | 'nombre_autoridad'
  | 'elaborado_por'
  | 'revisado_por'
  | 'registrado_por';

type CampoPuestoResponsable =
  | 'puesto_autoridad'
  | 'puesto_elaborado'
  | 'puesto_revisado'
  | 'puesto_registrado';

@Component({
  selector: 'app-solicitud-permisos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './solicitud-permisos.html',
  styleUrls: ['./solicitud-permisos.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SolicitudPermisosComponent implements OnInit, DoCheck {
  private readonly apiBaseUrl = String(
    environment.apiUrl || 'http://localhost:5000/api'
  ).replace(/\/$/, '');

  private readonly endpoints = {
    consultarCedula: `${this.apiBaseUrl}/personal/cedula`,
    estructuraPersonal: `${this.apiBaseUrl}/personal-estructura`,
    autoridades: `${this.apiBaseUrl}/autoridades`,
    generarAccion: `${this.apiBaseUrl}/generar-accion`,
    guardarBorrador: `${this.apiBaseUrl}/acciones-personal`,
    prepararFirmas: (id: number) =>
      `${this.apiBaseUrl}/acciones-personal/${id}/preparar-firmas`,
    listarFirmas: (id: number) =>
      `${this.apiBaseUrl}/acciones-personal/${id}/firmas`,
    firmarSeccion: (id: number) =>
      `${this.apiBaseUrl}/acciones-personal/${id}/firmar`,
    descargarPdf: (id: number) =>
      `${this.apiBaseUrl}/acciones-personal/${id}/pdf`,
    finalizarDocumento: (id: number) =>
      `${this.apiBaseUrl}/acciones-personal/${id}/finalizar`
  } as const;

  private readonly maxCertificadoBytes = 10 * 1024 * 1024;
  private readonly minCertificadoBytes = 64;
  private readonly intervaloActualizacionFirmasMs = 15_000;

  readonly tiposAccionPersonal = [
    'Ingreso',
    'Reingreso',
    'Restitución',
    'Reintegro',
    'Ascenso',
    'Traslado',
    'Traspaso',
    'Cambio administrativo',
    'Intercambio voluntario',
    'Licencia',
    'Comisión de servicios',
    'Sanciones',
    'Incremento RMU',
    'Subrogación',
    'Encargo',
    'Cesación de funciones',
    'Destitución',
    'Vacaciones',
    'Revisión clas. puesto',
    'Otro'
  ] as const;

  /** Catálogos equivalentes a las listas desplegables de Hoja2. */
  readonly procesosInstitucionales = [
    'GOBERNANTE',
    'SUSTANTIVO',
    'ADJETIVO'
  ] as const;

  readonly nivelesGestion = ['DIRECCION EJECUTIVA'] as const;

  readonly unidadesAdministrativas = [
    'DIRECCION EJECUTIVA',
    'DIRECCION DE ASESORIA JURIDICA',
    'DIRECCION DE PLANIFICACION',
    'DIRECCION DE COMUNICACION SOCIAL',
    'DIRECCION DE ADMINISTRACION DE RECURSOS HUMANOS',
    'DIRECCION ADMINISTRATIVA FINANCIERA',
    'DIRECCION DE LA RED DE NACIONAL DE OBSERVACION HIDROMETEOROLOGICA',
    'DIRECCION DE INFORMACION HIDROMETEOROLOGICA',
    'DIRECCION DE PRONOSTICOS Y ALERTAS HIDROMETEOROLOGICAS',
    'DIRECCION DE ESTUDIOS, INVESTIGACION Y DESARROLLO HIDROMETEOROLOGICO',
    'DIRECCION DE LABORATORIOS DE CALIDAD DE AGUAS Y SEDIMENTOS',
    'DIRECCION REGIONAL TECNICA HIDROMETEOROLOGICA ESMERALDAS - MIRA',
    'DIRECCION REGIONAL TECNICA HIDROMETEOROLOGICA NAPO',
    'DIRECCION REGIONAL TECNICA HIDROMETEOROLOGICA PASTAZA',
    'DIRECCION REGIONAL TECNICA HIDROMETEOROLOGICA MANABI',
    'DIRECCION REGIONAL TECNICA HIDROMETEOROLOGICA GUAYAS - GALAPAGOS',
    'DIRECCION REGIONAL TECNICA HIDROMETEOROLOGICA MORONA SANTIAGO',
    'DIRECCION REGIONAL TECNICA HIDROMETEOROLOGICA JUBONES - PUYANGO',
    'GESTION PRIMARIA DE LA INFORMACION HIDROMETEOROLOGICA'
  ] as const;

  readonly lugaresTrabajo = [
    'QUITO',
    'GUAYAQUIL',
    'OTAVALO-INGUINCHO',
    'MONTUFAR-SAN GABRIEL',
    'CONCORDIA',
    'CAYAMBE-TOMALON',
    'FRANCISCO DE ORELLANA-NUEVO ROCAFUERTE',
    'SALCEDO-RUMIPAMBA',
    'PUYO',
    'CEVALLOS-QUEROCHACA',
    'RIOBAMBA',
    'PORTOVIEJO',
    'QUEVEDO-PUERTO ILA',
    'SAN CRISTOBAL',
    'CAÑAR',
    'LOJA'
  ] as const;

  readonly gruposOcupacionales = [
    'SERVIDOR PUBLICO DE APOYO 1',
    'SERVIDOR PUBLICO DE APOYO 2',
    'SERVIDOR PUBLICO DE APOYO 3',
    'SERVIDOR PUBLICO DE APOYO 4',
    'SERVIDOR PUBLICO 1',
    'SERVIDOR PUBLICO 2',
    'SERVIDOR PUBLICO 3',
    'SERVIDOR PUBLICO 4',
    'SERVIDOR PUBLICO 5',
    'SERVIDOR PUBLICO 6',
    'SERVIDOR PUBLICO 7',
    'NIVEL JERARQUICO SUPERIOR 2',
    'NIVEL JERARQUICO SUPERIOR 3'
  ] as const;

  /**
   * Tabla de Hoja2. El valor 9001 para SERVIDOR PUBLICO 2 se conserva
   * exactamente como consta en la plantilla entregada.
   */
  private readonly escalaOcupacional: Readonly<Record<string, EscalaOcupacional>> = {
    'SERVIDOR PUBLICO DE APOYO 1': { grado: '3', remuneracion: 585 },
    'SERVIDOR PUBLICO DE APOYO 2': { grado: '4', remuneracion: 622 },
    'SERVIDOR PUBLICO DE APOYO 3': { grado: '5', remuneracion: 675 },
    'SERVIDOR PUBLICO DE APOYO 4': { grado: '6', remuneracion: 733 },
    'SERVIDOR PUBLICO 1': { grado: '7', remuneracion: 817 },
    'SERVIDOR PUBLICO 2': { grado: '8', remuneracion: 9001 },
    'SERVIDOR PUBLICO 3': { grado: '9', remuneracion: 986 },
    'SERVIDOR PUBLICO 4': { grado: '10', remuneracion: 1086 },
    'SERVIDOR PUBLICO 5': { grado: '11', remuneracion: 1212 },
    'SERVIDOR PUBLICO 6': { grado: '12', remuneracion: 1412 },
    'SERVIDOR PUBLICO 7': { grado: '13', remuneracion: 1676 },
    'NIVEL JERARQUICO SUPERIOR 2': { grado: 'NJS2', remuneracion: 2368 },
    'NIVEL JERARQUICO SUPERIOR 3': { grado: 'NJS3', remuneracion: 2418 }
  };

  formulario: FormularioAccionPersonal = this.crearFormularioInicial();

  estructuraPersonal: PersonaEstructura[] = [];
  listaAutoridades: PersonaEstructura[] = [];

  consultando = false;
  cargandoPersonal = false;
  cargandoAutoridades = false;
  generandoExcel = false;
  guardandoBorrador = false;
  preparandoDocumento = false;
  cargandoFirmas = false;
  firmando = false;
  finalizandoDocumento = false;
  descargandoPdf = false;

  mostrarPrevia = false;
  mostrarOffcanvasFirmas = false;
  mostrarModalFirma = false;
  mostrarPasswordFirma = false;

  documentoActualId: number | null = null;
  estadoDocumento = 'BORRADOR';

  firmasDocumento: FirmaDocumento[] = [];
  firmaSeleccionada: FirmaDocumento | null = null;

  selectedFile: File | null = null;
  passwordFirmaSeccion = '';

  private ultimoGrupoActual = '';
  private ultimoGrupoPropuesto = '';

  private readonly personalBase: readonly PersonaEstructura[] = [
    {
      nombres: 'TUFIÑO JUNIA ALEX ISRAEL',
      denominacion_puesto:
        'DIRECTOR/A DE ADMINISTRACIÓN DE TALENTO HUMANO',
      unidad_organica: 'DIRECCIÓN DE ADMINISTRACIÓN DE RECURSOS HUMANOS'
    },
    {
      nombres: 'OCAÑA BONILLA LEONOR KAROLINA',
      denominacion_puesto: 'SECRETARIA',
      unidad_organica: 'DIRECCIÓN DE ADMINISTRACIÓN DE RECURSOS HUMANOS'
    },
    {
      nombres: 'DUEÑAS JARAMILLO OSCAR FACUNDO',
      denominacion_puesto: 'ANALISTA DE RECURSOS HUMANOS',
      unidad_organica: 'DIRECCIÓN DE ADMINISTRACIÓN DE RECURSOS HUMANOS'
    },
    {
      nombres: 'CABEZAS ALMEIDA JANNETH ALEXANDRA',
      denominacion_puesto: 'ANALISTA DE TALENTO HUMANO 2',
      unidad_organica: 'DIRECCIÓN DE ADMINISTRACIÓN DE RECURSOS HUMANOS'
    },
    {
      nombres: 'PAREDES ANDRANGO MIGUEL ANGEL',
      denominacion_puesto: 'ANALISTA 3 DE TALENTO HUMANO',
      unidad_organica: 'DIRECCIÓN DE ADMINISTRACIÓN DE RECURSOS HUMANOS'
    },
    {
      nombres: 'CUTI AMAGUAÑA GINA ELIZABETH',
      denominacion_puesto: 'ANALISTA DE TALENTO HUMANO 1',
      unidad_organica: 'DIRECCIÓN DE ADMINISTRACIÓN DE RECURSOS HUMANOS'
    },
    {
      nombres: 'CORNEJO HIDALGO PABLO ANDRÉS',
      denominacion_puesto: 'DIRECTOR EJECUTIVO, ENCARGADO',
      unidad_organica: 'DIRECCIÓN EJECUTIVA'
    }
  ];

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    public readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.estructuraPersonal = this.ordenarYDepurarPersonas([
      ...this.personalBase
    ]);
    this.listaAutoridades = this.obtenerAutoridadesLocales();

    void this.cargarEstructuraPersonal();
    void this.cargarAutoridades();

    interval(this.intervaloActualizacionFirmasMs)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (
          this.mostrarOffcanvasFirmas &&
          this.documentoActualId &&
          !this.cargandoFirmas &&
          !this.firmando
        ) {
          void this.cargarFirmasDocumento(true);
        }
      });
  }

  /**
   * Mantiene grado y remuneración sincronizados aunque el HTML use
   * [(ngModel)] directamente sobre los grupos ocupacionales.
   */
  ngDoCheck(): void {
    if (this.formulario.grupo_actual !== this.ultimoGrupoActual) {
      this.ultimoGrupoActual = this.formulario.grupo_actual;
      this.aplicarEscalaOcupacional('actual');
    }

    if (this.formulario.grupo_propuesta !== this.ultimoGrupoPropuesto) {
      this.ultimoGrupoPropuesto = this.formulario.grupo_propuesta;
      this.aplicarEscalaOcupacional('propuesta');
    }
  }

  get nombreCompletoFuncionario(): string {
    return `${this.formulario.apellidos} ${this.formulario.nombres}`
      .trim()
      .replace(/\s+/g, ' ');
  }

  get formularioBloqueado(): boolean {
    return Boolean(this.documentoActualId) &&
      this.estadoDocumento !== 'BORRADOR';
  }

  get totalFirmas(): number {
    return this.firmasDocumento.filter(
      (firma) => firma.obligatorio !== false
    ).length;
  }

  get firmasCompletadas(): number {
    return this.firmasDocumento.filter(
      (firma) =>
        firma.obligatorio !== false &&
        this.normalizarEstadoFirma(firma.estado) === 'FIRMADA'
    ).length;
  }

  get firmasPendientes(): number {
    return Math.max(this.totalFirmas - this.firmasCompletadas, 0);
  }

  get progresoFirmas(): number {
    if (!this.totalFirmas) {
      return 0;
    }

    return Math.round((this.firmasCompletadas / this.totalFirmas) * 100);
  }

  get todasLasFirmasCompletadas(): boolean {
    return this.totalFirmas > 0 && this.firmasPendientes === 0;
  }

  get siguienteFirmaPendiente(): FirmaDocumento | null {
    return (
      this.firmasDocumento
        .filter(
          (firma) =>
            firma.obligatorio !== false &&
            this.normalizarEstadoFirma(firma.estado) !== 'FIRMADA'
        )
        .sort((a, b) => a.orden_firma - b.orden_firma)[0] || null
    );
  }

  getHeaders(): HttpHeaders {
    const tokenOriginal = String(this.authService.getToken() || '').trim();

    if (!tokenOriginal) {
      return new HttpHeaders();
    }

    // El backend actual valida directamente tokens con prefijo tk_.
    // Si AuthService almacenó accidentalmente "Bearer tk_...", se elimina Bearer.
    const token = tokenOriginal.replace(/^Bearer\s+/i, '').trim();

    return new HttpHeaders({ Authorization: token });
  }

  volver(): void {
    void this.router.navigate(['/admin/dashboard']);
  }

  obtenerFechaActual(): string {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  formatearFechaVisual(fecha: string | null | undefined): string {
    const texto = String(fecha || '').trim();
    const coincidencia = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (!coincidencia) {
      return texto;
    }

    const [, anio, mes, dia] = coincidencia;
    return `${dia}/${mes}/${anio}`;
  }

  onCedulaInput(): void {
    this.formulario.cedula = String(this.formulario.cedula || '')
      .replace(/\D/g, '')
      .slice(0, 10);
  }

  async consultarCedula(): Promise<void> {
    if (this.consultando || this.formularioBloqueado) {
      return;
    }

    this.onCedulaInput();
    const cedula = this.formulario.cedula;

    if (!/^\d{10}$/.test(cedula)) {
      await Swal.fire(
        'Cédula inválida',
        'Ingrese exactamente 10 dígitos, sin espacios ni guiones.',
        'warning'
      );
      return;
    }

    try {
      this.consultando = true;
      this.actualizarVista();

      const respuesta = await firstValueFrom(
        this.http.get<
          FuncionarioApiResponse | ApiDataResponse<FuncionarioApiResponse>
        >(`${this.endpoints.consultarCedula}/${encodeURIComponent(cedula)}`, {
          headers: this.getHeaders()
        })
      );

      const data = this.extraerObjetoData(respuesta);
      this.aplicarDatosFuncionario(data);

      await Swal.fire({
        icon: 'success',
        title: 'Funcionario encontrado',
        text: 'Los nombres y apellidos se cargaron correctamente.',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error: unknown) {
      await this.mostrarErrorHttp(
        'No fue posible consultar la cédula',
        error,
        'No se encontraron datos para la cédula ingresada.'
      );
    } finally {
      this.consultando = false;
      this.actualizarVista();
    }
  }

  async cargarEstructuraPersonal(): Promise<void> {
    if (this.cargandoPersonal) {
      return;
    }

    try {
      this.cargandoPersonal = true;
      this.actualizarVista();

      const respuesta = await firstValueFrom(
        this.http.get<ApiListResponse<PersonaApiItem>>(
          this.endpoints.estructuraPersonal,
          { headers: this.getHeaders() }
        )
      );

      const personas = this.extraerRegistros(respuesta)
        .map((item) => this.transformarPersona(item))
        .filter((item): item is PersonaEstructura => item !== null);

      if (personas.length) {
        this.estructuraPersonal = this.ordenarYDepurarPersonas(personas);
      }
    } catch (error) {
      console.warn(
        'No se pudo cargar personal-estructura; se conserva la lista local.',
        error
      );
    } finally {
      this.cargandoPersonal = false;
      this.actualizarVista();
    }
  }

  async cargarAutoridades(): Promise<void> {
    if (this.cargandoAutoridades) {
      return;
    }

    try {
      this.cargandoAutoridades = true;
      this.actualizarVista();

      const respuesta = await firstValueFrom(
        this.http.get<ApiListResponse<PersonaApiItem>>(
          this.endpoints.autoridades,
          { headers: this.getHeaders() }
        )
      );

      const autoridades = this.extraerRegistros(respuesta)
        .map((item) => this.transformarPersona(item))
        .filter((item): item is PersonaEstructura => item !== null);

      if (autoridades.length) {
        this.listaAutoridades = this.ordenarYDepurarPersonas(autoridades);
      }
    } catch (error) {
      console.warn(
        'No se pudo cargar autoridades; se conserva la lista local.',
        error
      );
    } finally {
      this.cargandoAutoridades = false;
      this.actualizarVista();
    }
  }

  seleccionarResponsable(
    campoNombre: CampoNombreResponsable,
    campoPuesto: CampoPuestoResponsable,
    nombre: string
  ): void {
    if (this.formularioBloqueado) {
      return;
    }

    const nombreLimpio = String(nombre || '').trim();
    const clave = this.normalizarTexto(nombreLimpio);

    const persona = [
      ...this.estructuraPersonal,
      ...this.listaAutoridades
    ].find((item) => this.normalizarTexto(item.nombres) === clave);

    this.formulario[campoNombre] = nombreLimpio;
    this.formulario[campoPuesto] = persona?.denominacion_puesto || '';
    this.actualizarVista();
  }

  copiarSituacionActualAPropuesta(): void {
    if (this.formularioBloqueado) {
      return;
    }

    this.formulario.proceso_institucional_propuesta =
      this.formulario.proceso_institucional_actual;
    this.formulario.nivel_gestion_propuesta =
      this.formulario.nivel_gestion_actual;
    this.formulario.unidad_propuesta = this.formulario.unidad_actual;
    this.formulario.lugar_trabajo_propuesta =
      this.formulario.lugar_trabajo_actual;
    this.formulario.denominacion_propuesta =
      this.formulario.denominacion_actual;
    this.formulario.grupo_propuesta = this.formulario.grupo_actual;
    this.formulario.partida_propuesta = this.formulario.partida_actual;
    this.aplicarEscalaOcupacional('propuesta');
    this.actualizarVista();
  }

  actualizarEscalaActual(): void {
    this.aplicarEscalaOcupacional('actual');
    this.actualizarVista();
  }

  actualizarEscalaPropuesta(): void {
    this.aplicarEscalaOcupacional('propuesta');
    this.actualizarVista();
  }

  generarExcel(): void {
    const error = this.validarFormularioCompleto();

    if (error) {
      void Swal.fire('Información incompleta', error, 'warning');
      return;
    }

    this.mostrarPrevia = true;
    this.actualizarVista();
  }

  async ejecutarDescargaExcel(): Promise<void> {
    if (this.generandoExcel) {
      return;
    }

    const error = this.validarFormularioCompleto();

    if (error) {
      await Swal.fire('Información incompleta', error, 'warning');
      return;
    }

    try {
      this.generandoExcel = true;
      this.actualizarVista();

      const blob = (await firstValueFrom(
        this.http.post(
          this.endpoints.generarAccion,
          this.construirPayloadPlantilla(),
          {
            headers: this.getHeaders(),
            responseType: 'blob'
          }
        )
      )) as Blob;

      await this.validarBlobDescarga(blob);
      this.descargarBlob(blob, this.construirNombreArchivoExcel());

      await Swal.fire({
        icon: 'success',
        title: 'Excel generado',
        text: 'La plantilla de Acción de Personal fue llenada sin alterar su formato.',
        timer: 1800,
        showConfirmButton: false
      });
    } catch (error: unknown) {
      await this.mostrarErrorHttp(
        'Error al generar el Excel',
        error,
        'El servidor no pudo llenar la plantilla plantilla_ap.xlsx.'
      );
    } finally {
      this.generandoExcel = false;
      this.actualizarVista();
    }
  }

  async guardarBorrador(mostrarExito = false): Promise<boolean> {
    if (this.guardandoBorrador) {
      return false;
    }

    if (this.documentoActualId) {
      return true;
    }

    const error = this.validarFormularioCompleto();

    if (error) {
      await Swal.fire('Información incompleta', error, 'warning');
      return false;
    }

    try {
      this.guardandoBorrador = true;
      this.actualizarVista();

      const respuesta = await firstValueFrom(
        this.http.post<DocumentoResponse>(
          this.endpoints.guardarBorrador,
          this.construirPayloadDocumento(),
          { headers: this.getHeaders() }
        )
      );

      const documentoId = this.extraerDocumentoId(respuesta);

      if (!documentoId) {
        throw new Error(
          'El backend no devolvió doc_id, documento_id ni id del documento.'
        );
      }

      this.documentoActualId = documentoId;
      this.estadoDocumento = respuesta.estado || 'BORRADOR';

      if (mostrarExito) {
        await Swal.fire({
          icon: 'success',
          title: 'Borrador guardado',
          timer: 1300,
          showConfirmButton: false
        });
      }

      return true;
    } catch (error: unknown) {
      await this.mostrarErrorHttp(
        'No se pudo guardar el borrador',
        error,
        'Revise la información e intente nuevamente.'
      );
      return false;
    } finally {
      this.guardandoBorrador = false;
      this.actualizarVista();
    }
  }

  async prepararDocumentoParaFirmas(): Promise<void> {
    if (this.preparandoDocumento || this.firmando) {
      return;
    }

    const error = this.validarFormularioCompleto();

    if (error) {
      await Swal.fire('Información incompleta', error, 'warning');
      return;
    }

    const confirmacion = await Swal.fire({
      icon: 'question',
      title: '¿Enviar el documento a firmas?',
      text:
        'Después de prepararlo, los datos que alimentan la plantilla quedarán bloqueados.',
      showCancelButton: true,
      confirmButtonText: 'Sí, preparar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!confirmacion.isConfirmed) {
      return;
    }

    try {
      this.preparandoDocumento = true;
      this.actualizarVista();

      const guardado = await this.guardarBorrador(false);

      if (!guardado || !this.documentoActualId) {
        return;
      }

      const respuesta = await firstValueFrom(
        this.http.post<DocumentoResponse>(
          this.endpoints.prepararFirmas(this.documentoActualId),
          {},
          { headers: this.getHeaders() }
        )
      );

      this.estadoDocumento = respuesta.estado || 'PENDIENTE_FIRMAS';
      await this.cargarFirmasDocumento(false);
      this.mostrarOffcanvasFirmas = true;

      await Swal.fire({
        icon: 'success',
        title: 'Documento listo para firmas',
        text: 'Cada responsable puede firmar su sección con su certificado .p12.',
        timer: 1900,
        showConfirmButton: false
      });
    } catch (error: unknown) {
      await this.mostrarErrorHttp(
        'No se pudo preparar el documento',
        error,
        'No fue posible iniciar el flujo de firmas.'
      );
    } finally {
      this.preparandoDocumento = false;
      this.actualizarVista();
    }
  }

  async cargarFirmasDocumento(silencioso = false): Promise<void> {
    if (!this.documentoActualId || this.cargandoFirmas) {
      return;
    }

    try {
      this.cargandoFirmas = true;
      this.actualizarVista();

      const respuesta = await firstValueFrom(
        this.http.get<FirmaDocumento[] | FirmaListResponse>(
          this.endpoints.listarFirmas(this.documentoActualId),
          { headers: this.getHeaders() }
        )
      );

      this.firmasDocumento = this.extraerFirmas(respuesta)
        .map((firma) => this.normalizarFirma(firma))
        .sort((a, b) => a.orden_firma - b.orden_firma);
    } catch (error: unknown) {
      if (!silencioso) {
        await this.mostrarErrorHttp(
          'No se pudieron cargar las firmas',
          error,
          'Intente actualizar nuevamente.'
        );
      }
    } finally {
      this.cargandoFirmas = false;
      this.actualizarVista();
    }
  }

  async toggleOffcanvasFirmas(): Promise<void> {
    this.mostrarOffcanvasFirmas = !this.mostrarOffcanvasFirmas;
    this.actualizarVista();

    if (this.mostrarOffcanvasFirmas && this.documentoActualId) {
      await this.cargarFirmasDocumento(true);
    }
  }

  async abrirModalFirma(firma: FirmaDocumento): Promise<void> {
    if (!this.documentoActualId || this.firmando) {
      return;
    }

    await this.cargarFirmasDocumento(true);

    const firmaActualizada = this.firmasDocumento.find(
      (item) =>
        (firma.id != null && item.id === firma.id) ||
        (item.seccion === firma.seccion &&
          item.orden_firma === firma.orden_firma)
    );

    const objetivo = firmaActualizada || firma;
    const motivo = this.motivoFirmaNoDisponible(objetivo);

    if (motivo) {
      await Swal.fire('Firma no disponible', motivo, 'info');
      return;
    }

    this.firmaSeleccionada = objetivo;
    this.selectedFile = null;
    this.passwordFirmaSeccion = '';
    this.mostrarPasswordFirma = false;
    this.mostrarModalFirma = true;
    this.limpiarInputCertificado();
    this.actualizarVista();
  }

  cerrarModalFirma(): void {
    if (this.firmando) {
      return;
    }

    this.mostrarModalFirma = false;
    this.firmaSeleccionada = null;
    this.selectedFile = null;
    this.passwordFirmaSeccion = '';
    this.mostrarPasswordFirma = false;
    this.limpiarInputCertificado();
    this.actualizarVista();
  }

  async seleccionarCertificadoFirma(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] || null;

    this.selectedFile = null;

    if (!archivo) {
      this.actualizarVista();
      return;
    }

    const error = await this.validarArchivoCertificado(archivo);

    if (error) {
      input.value = '';
      await Swal.fire('Certificado no válido', error, 'warning');
      this.actualizarVista();
      return;
    }

    this.selectedFile = archivo;
    this.actualizarVista();
  }

  /** Alias para no romper plantillas HTML anteriores. */
  async onFileSelected(event: Event): Promise<void> {
    await this.seleccionarCertificadoFirma(event);
  }

  togglePasswordFirmaSeccion(): void {
    this.mostrarPasswordFirma = !this.mostrarPasswordFirma;
    this.actualizarVista();
  }

  puedeFirmar(firma: FirmaDocumento): boolean {
    return this.motivoFirmaNoDisponible(firma) === null;
  }

  motivoFirmaNoDisponible(firma: FirmaDocumento): string | null {
    const estado = this.normalizarEstadoFirma(firma.estado);

    if (estado === 'FIRMADA') {
      return 'Esta sección ya fue firmada.';
    }

    if (estado === 'RECHAZADA') {
      return 'Esta firma fue rechazada y debe ser revisada por Talento Humano.';
    }

    if (estado === 'BLOQUEADA') {
      return firma.mensaje_bloqueo || 'La firma se encuentra bloqueada.';
    }

    if (estado === 'ERROR') {
      return firma.mensaje_bloqueo || 'La firma tiene un estado de error.';
    }

    if (estado !== 'PENDIENTE') {
      return `La sección se encuentra en estado ${estado}.`;
    }

    // Las firmas son independientes: orden_firma solo se usa para ordenar
    // visualmente las tarjetas, nunca para bloquear a otros responsables.
    // También se ignoran respuestas antiguas del backend que bloqueen
    // exclusivamente por secuencia de firma.
    if (
      firma.puede_firmar === false &&
      !this.esBloqueoExclusivamentePorOrden(firma.mensaje_bloqueo)
    ) {
      return (
        firma.mensaje_bloqueo ||
        'El backend indicó que esta sección no puede firmarse.'
      );
    }

    if (!String(firma.nombre_firmante || '').trim()) {
      return 'La sección no tiene un firmante asignado.';
    }

    return null;
  }

  async firmarSeccion(): Promise<void> {
    if (
      this.firmando ||
      !this.documentoActualId ||
      !this.firmaSeleccionada
    ) {
      return;
    }

    const motivo = this.motivoFirmaNoDisponible(this.firmaSeleccionada);

    if (motivo) {
      await Swal.fire('Firma no disponible', motivo, 'warning');
      return;
    }

    if (!this.selectedFile) {
      await Swal.fire(
        'Certificado requerido',
        'Seleccione su certificado digital .p12. También se admite .pfx.',
        'warning'
      );
      return;
    }

    const errorArchivo = await this.validarArchivoCertificado(
      this.selectedFile
    );

    if (errorArchivo) {
      await Swal.fire('Certificado no válido', errorArchivo, 'warning');
      return;
    }

    if (!this.passwordFirmaSeccion.trim()) {
      await Swal.fire(
        'Contraseña requerida',
        'Ingrese la contraseña de su certificado .p12.',
        'warning'
      );
      return;
    }

    const firma = this.firmaSeleccionada;
    const confirmacion = await Swal.fire({
      icon: 'question',
      title: 'Confirmar firma electrónica',
      html: `
        <div style="text-align:left;line-height:1.5">
          <strong>Sección:</strong> ${this.escaparHtml(firma.seccion)}<br>
          <strong>Firmante esperado:</strong> ${this.escaparHtml(
            firma.nombre_firmante
          )}<br>
          <strong>Puesto:</strong> ${this.escaparHtml(firma.cargo_firmante)}
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Firmar con .p12',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!confirmacion.isConfirmed) {
      return;
    }

    try {
      this.firmando = true;
      this.actualizarVista();

      // Refresca el estado para evitar firmar una sección que cambió en otro equipo.
      await this.cargarFirmasDocumento(true);

      const firmaVigente = this.firmasDocumento.find(
        (item) =>
          (firma.id != null && item.id === firma.id) ||
          (item.seccion === firma.seccion &&
            item.orden_firma === firma.orden_firma)
      );

      if (firmaVigente) {
        const bloqueo = this.motivoFirmaNoDisponible(firmaVigente);

        if (bloqueo) {
          throw new Error(bloqueo);
        }
      }

      const formData = new FormData();
      formData.append('certificado', this.selectedFile);
      formData.append('password', this.passwordFirmaSeccion);
      formData.append('seccion', firma.seccion);
      formData.append('nombre_firmante', firma.nombre_firmante || '');
      formData.append('cargo_firmante', firma.cargo_firmante || '');
      formData.append('orden_firma', String(firma.orden_firma || 0));
      formData.append('numero_accion', this.formulario.numero_accion);
      formData.append(
        'formato_certificado',
        this.selectedFile.name.toLowerCase().endsWith('.p12') ? 'P12' : 'PFX'
      );

      await firstValueFrom(
        this.http.post<DocumentoResponse>(
          this.endpoints.firmarSeccion(this.documentoActualId),
          formData,
          { headers: this.getHeaders() }
        )
      );

      // La contraseña nunca se conserva después del envío.
      this.passwordFirmaSeccion = '';
      this.selectedFile = null;
      this.mostrarModalFirma = false;
      this.firmaSeleccionada = null;
      this.limpiarInputCertificado();

      await this.cargarFirmasDocumento(false);

      await Swal.fire({
        icon: 'success',
        title: 'Firma registrada',
        text: `La sección ${firma.seccion} fue firmada correctamente.`,
        timer: 1800,
        showConfirmButton: false
      });
    } catch (error: unknown) {
      // También se elimina la contraseña cuando la firma falla.
      this.passwordFirmaSeccion = '';
      await this.mostrarErrorFirma(error);
    } finally {
      this.firmando = false;
      this.actualizarVista();
    }
  }

  async finalizarDocumento(): Promise<void> {
    if (
      !this.documentoActualId ||
      this.finalizandoDocumento ||
      this.firmando
    ) {
      return;
    }

    await this.cargarFirmasDocumento(true);

    if (!this.todasLasFirmasCompletadas) {
      await Swal.fire(
        'Firmas pendientes',
        `Faltan ${this.firmasPendientes} firma(s) obligatoria(s).`,
        'warning'
      );
      return;
    }

    const confirmacion = await Swal.fire({
      icon: 'question',
      title: '¿Finalizar el documento?',
      text: 'El documento quedará cerrado y listo para descargar.',
      showCancelButton: true,
      confirmButtonText: 'Sí, finalizar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!confirmacion.isConfirmed) {
      return;
    }

    try {
      this.finalizandoDocumento = true;
      this.actualizarVista();

      const respuesta = await firstValueFrom(
        this.http.post<DocumentoResponse>(
          this.endpoints.finalizarDocumento(this.documentoActualId),
          {},
          { headers: this.getHeaders() }
        )
      );

      this.estadoDocumento = respuesta.estado || 'FINALIZADO';

      await Swal.fire(
        'Documento finalizado',
        'Todas las firmas fueron completadas correctamente.',
        'success'
      );
    } catch (error: unknown) {
      await this.mostrarErrorHttp(
        'No se pudo finalizar',
        error,
        'El backend informa que aún existen firmas pendientes.'
      );
    } finally {
      this.finalizandoDocumento = false;
      this.actualizarVista();
    }
  }

  async descargarPdfFirmado(): Promise<void> {
    if (!this.documentoActualId || this.descargandoPdf) {
      return;
    }

    await this.cargarFirmasDocumento(true);

    if (!this.todasLasFirmasCompletadas) {
      await Swal.fire(
        'PDF todavía no disponible',
        'Complete todas las firmas obligatorias antes de descargar el PDF final.',
        'warning'
      );
      return;
    }

    try {
      this.descargandoPdf = true;
      this.actualizarVista();

      const blob = (await firstValueFrom(
        this.http.get(this.endpoints.descargarPdf(this.documentoActualId), {
          headers: this.getHeaders(),
          responseType: 'blob'
        })
      )) as Blob;

      await this.validarBlobDescarga(blob);
      this.descargarBlob(blob, this.construirNombreArchivoPdf());
    } catch (error: unknown) {
      await this.mostrarErrorHttp(
        'No se pudo descargar el PDF',
        error,
        'El documento firmado no está disponible.'
      );
    } finally {
      this.descargandoPdf = false;
      this.actualizarVista();
    }
  }

  async limpiarFormulario(): Promise<void> {
    if (
      this.guardandoBorrador ||
      this.preparandoDocumento ||
      this.firmando ||
      this.finalizandoDocumento
    ) {
      return;
    }

    const confirmacion = await Swal.fire({
      icon: 'question',
      title: '¿Limpiar el formulario?',
      text: 'Se eliminarán los datos ingresados y el certificado seleccionado.',
      showCancelButton: true,
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!confirmacion.isConfirmed) {
      return;
    }

    this.formulario = this.crearFormularioInicial();
    this.ultimoGrupoActual = '';
    this.ultimoGrupoPropuesto = '';
    this.documentoActualId = null;
    this.estadoDocumento = 'BORRADOR';
    this.firmasDocumento = [];
    this.firmaSeleccionada = null;
    this.selectedFile = null;
    this.passwordFirmaSeccion = '';
    this.mostrarPasswordFirma = false;
    this.mostrarPrevia = false;
    this.mostrarOffcanvasFirmas = false;
    this.mostrarModalFirma = false;
    this.limpiarInputCertificado();
    this.actualizarVista();

    await Swal.fire({
      icon: 'success',
      title: 'Formulario limpio',
      timer: 1100,
      showConfirmButton: false
    });
  }

  etiquetaEstadoFirma(firma: FirmaDocumento): string {
    const estado = this.normalizarEstadoFirma(firma.estado);

    const etiquetas: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      FIRMADA: 'Firmada',
      RECHAZADA: 'Rechazada',
      BLOQUEADA: 'Bloqueada',
      ERROR: 'Error'
    };

    return etiquetas[estado] || estado;
  }

  claseEstadoFirma(firma: FirmaDocumento): string {
    return `firma-estado--${this.normalizarEstadoFirma(firma.estado).toLowerCase()}`;
  }

  trackByFirma(index: number, firma: FirmaDocumento): number | string {
    return firma.id ?? `${firma.orden_firma}-${firma.seccion}-${index}`;
  }

  private crearFormularioInicial(): FormularioAccionPersonal {
    const fechaActual = this.obtenerFechaActual();

    return {
      numero_accion: `AP-RH-${new Date().getFullYear()}-`,
      fecha_elaboracion: fechaActual,

      apellidos: '',
      nombres: '',
      cedula: '',

      desde: fechaActual,
      hasta: fechaActual,
      accion_personal: '',

      proceso_institucional_actual: '',
      nivel_gestion_actual: '',
      unidad_actual: '',
      lugar_trabajo_actual: '',
      denominacion_actual: '',
      grupo_actual: '',
      grado_actual: '',
      remuneracion_actual: '',
      partida_actual: '',

      proceso_institucional_propuesta: '',
      nivel_gestion_propuesta: '',
      unidad_propuesta: '',
      lugar_trabajo_propuesta: '',
      denominacion_propuesta: '',
      grupo_propuesta: '',
      grado_propuesta: '',
      remuneracion_propuesta: '',
      partida_propuesta: '',

      nombre_autoridad: '',
      puesto_autoridad: '',

      elaborado_por: '',
      puesto_elaborado: '',

      revisado_por: '',
      puesto_revisado: '',

      registrado_por: '',
      puesto_registrado: ''
    };
  }

  private validarFormularioCompleto(): string | null {
    const f = this.formulario;

    if (!f.numero_accion.trim()) {
      return 'Ingrese el número de la Acción de Personal.';
    }

    if (!f.fecha_elaboracion) {
      return 'Seleccione la fecha de elaboración.';
    }

    if (!/^\d{10}$/.test(f.cedula.trim())) {
      return 'Ingrese o consulte una cédula válida de 10 dígitos.';
    }

    if (!f.apellidos.trim() || !f.nombres.trim()) {
      return 'Complete los apellidos y nombres del funcionario.';
    }

    if (!f.desde) {
      return 'Seleccione la fecha desde la cual rige la acción.';
    }

    if (f.hasta && f.hasta < f.desde) {
      return 'La fecha hasta no puede ser anterior a la fecha desde.';
    }

    if (!f.accion_personal.trim()) {
      return 'Seleccione el tipo de acción de personal.';
    }

    if (!f.proceso_institucional_actual.trim()) {
      return 'Seleccione el proceso institucional actual.';
    }

    if (!f.unidad_actual.trim()) {
      return 'Seleccione la unidad administrativa actual.';
    }

    if (!f.lugar_trabajo_actual.trim()) {
      return 'Seleccione el lugar de trabajo actual.';
    }

    if (!f.denominacion_actual.trim()) {
      return 'Ingrese la denominación actual del puesto.';
    }

    if (!f.grupo_actual.trim()) {
      return 'Seleccione el grupo ocupacional actual.';
    }

    if (!f.proceso_institucional_propuesta.trim()) {
      return 'Seleccione el proceso institucional propuesto.';
    }

    if (!f.unidad_propuesta.trim()) {
      return 'Seleccione la unidad administrativa propuesta.';
    }

    if (!f.lugar_trabajo_propuesta.trim()) {
      return 'Seleccione el lugar de trabajo propuesto.';
    }

    if (!f.denominacion_propuesta.trim()) {
      return 'Ingrese la denominación propuesta del puesto.';
    }

    if (!f.grupo_propuesta.trim()) {
      return 'Seleccione el grupo ocupacional propuesto.';
    }

    const responsables: Array<{
      nombre: string;
      puesto: string;
      etiqueta: string;
    }> = [
      {
        nombre: f.nombre_autoridad,
        puesto: f.puesto_autoridad,
        etiqueta: 'autoridad nominadora'
      },
      {
        nombre: f.elaborado_por,
        puesto: f.puesto_elaborado,
        etiqueta: 'responsable de elaboración'
      },
      {
        nombre: f.revisado_por,
        puesto: f.puesto_revisado,
        etiqueta: 'responsable de revisión'
      },
      {
        nombre: f.registrado_por,
        puesto: f.puesto_registrado,
        etiqueta: 'responsable de registro y control'
      }
    ];

    const incompleto = responsables.find(
      (responsable) =>
        !responsable.nombre.trim() || !responsable.puesto.trim()
    );

    if (incompleto) {
      return `Seleccione el ${incompleto.etiqueta} y verifique su puesto.`;
    }

    return null;
  }

  /**
   * Payload compatible con la ruta existente /api/generar-accion.
   * Los alias fecha_rige_* y tipo_accion se conservan para el backend actual.
   */
  private construirPayloadPlantilla(): Record<string, string> {
    const f = this.formulario;

    return {
      numero_accion: f.numero_accion.trim(),
      fecha_elaboracion: f.fecha_elaboracion,

      apellidos: f.apellidos.trim(),
      nombres: f.nombres.trim(),
      cedula: f.cedula.trim(),

      desde: f.desde,
      hasta: f.hasta,
      fecha_rige_desde: f.desde,
      fecha_rige_hasta: f.hasta,
      accion_personal: f.accion_personal,
      tipo_accion: f.accion_personal.toUpperCase(),

      proceso_institucional_actual: f.proceso_institucional_actual.trim(),
      nivel_gestion_actual: f.nivel_gestion_actual.trim(),
      unidad: f.unidad_actual.trim(),
      unidad_administrativa: f.unidad_actual.trim(),
      unidad_actual: f.unidad_actual.trim(),
      ciudad: f.lugar_trabajo_actual.trim(),
      lugar_trabajo_actual: f.lugar_trabajo_actual.trim(),
      cargo: f.denominacion_actual.trim(),
      denominacion_actual: f.denominacion_actual.trim(),
      grupo_ocupacional: f.grupo_actual.trim(),
      grupo_ocupacional_actual: f.grupo_actual.trim(),
      grado_actual: f.grado_actual.trim(),
      remuneracion_actual: f.remuneracion_actual.trim(),
      partida_actual: f.partida_actual.trim(),

      proceso_institucional_propuesta: f.proceso_institucional_propuesta.trim(),
      nivel_gestion_propuesta: f.nivel_gestion_propuesta.trim(),
      unidad_administrativa_propuesta: f.unidad_propuesta.trim(),
      unidad_propuesta: f.unidad_propuesta.trim(),
      lugar_trabajo_propuesta: f.lugar_trabajo_propuesta.trim(),
      denominacion_propuesta: f.denominacion_propuesta.trim(),
      grupo_ocupacional_propuesto: f.grupo_propuesta.trim(),
      grupo_propuesta: f.grupo_propuesta.trim(),
      grado_propuesta: f.grado_propuesta.trim(),
      remuneracion_propuesta: f.remuneracion_propuesta.trim(),
      partida_propuesta: f.partida_propuesta.trim(),

      nombre_autoridad: f.nombre_autoridad.trim(),
      puesto_autoridad: f.puesto_autoridad.trim(),

      elaborado_por: f.elaborado_por.trim(),
      puesto_elaborado: f.puesto_elaborado.trim(),

      revisado_por: f.revisado_por.trim(),
      puesto_revisado: f.puesto_revisado.trim(),

      registrado_por: f.registrado_por.trim(),
      puesto_registrado: f.puesto_registrado.trim()
    };
  }

  private construirPayloadDocumento(): Record<string, string> {
    return {
      ...this.construirPayloadPlantilla(),
      nombres_completos: this.nombreCompletoFuncionario
    };
  }

  private aplicarDatosFuncionario(data: FuncionarioApiResponse): void {
    const cedula = String(data?.cedula || this.formulario.cedula).trim();
    const apellidosApi = String(data?.apellidos || '').trim();
    const nombresApi = String(data?.nombres || '').trim();
    const nombreCompleto = String(
      data?.nombres_completos ||
        data?.nombre_completo ||
        (!apellidosApi ? nombresApi : '')
    ).trim();

    const separados = nombreCompleto
      ? this.separarNombreCompleto(nombreCompleto)
      : { apellidos: apellidosApi, nombres: nombresApi };

    const proceso = this.buscarValorCatalogo(
      data?.rol,
      this.procesosInstitucionales
    );
    const unidad = this.buscarValorCatalogo(
      data?.unidad,
      this.unidadesAdministrativas
    );
    const grupo = this.buscarValorCatalogo(
      data?.grupo_ocupacional,
      this.gruposOcupacionales
    );
    const lugar =
      this.buscarValorCatalogo(data?.ciudad, this.lugaresTrabajo) || 'QUITO';
    const cargo = String(data?.cargo || '').trim().toUpperCase();
    const rmuApi = data?.rmu == null ? '' : String(data.rmu).trim();

    this.formulario = {
      ...this.formulario,
      cedula,
      apellidos: separados.apellidos || apellidosApi,
      nombres: separados.nombres || nombresApi,

      proceso_institucional_actual:
        proceso || this.formulario.proceso_institucional_actual,
      nivel_gestion_actual:
        this.formulario.nivel_gestion_actual || 'DIRECCION EJECUTIVA',
      unidad_actual: unidad || String(data?.unidad || '').trim().toUpperCase(),
      lugar_trabajo_actual: lugar,
      denominacion_actual: cargo,
      grupo_actual: grupo || String(data?.grupo_ocupacional || '').trim().toUpperCase(),
      remuneracion_actual: rmuApi,

      proceso_institucional_propuesta:
        proceso || this.formulario.proceso_institucional_propuesta,
      nivel_gestion_propuesta:
        this.formulario.nivel_gestion_propuesta || 'DIRECCION EJECUTIVA',
      unidad_propuesta: unidad || String(data?.unidad || '').trim().toUpperCase(),
      lugar_trabajo_propuesta: lugar,
      denominacion_propuesta: cargo,
      grupo_propuesta: grupo || String(data?.grupo_ocupacional || '').trim().toUpperCase(),
      remuneracion_propuesta: rmuApi
    };

    this.ultimoGrupoActual = '';
    this.ultimoGrupoPropuesto = '';
    this.aplicarEscalaOcupacional('actual', rmuApi);
    this.aplicarEscalaOcupacional('propuesta', rmuApi);
    this.actualizarVista();
  }

  private separarNombreCompleto(nombreCompleto: string): {
    apellidos: string;
    nombres: string;
  } {
    const partes = String(nombreCompleto || '')
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .filter(Boolean);

    if (partes.length >= 4) {
      return {
        apellidos: partes.slice(0, 2).join(' '),
        nombres: partes.slice(2).join(' ')
      };
    }

    if (partes.length === 3) {
      return {
        apellidos: partes.slice(0, 2).join(' '),
        nombres: partes[2]
      };
    }

    if (partes.length === 2) {
      return { apellidos: partes[0], nombres: partes[1] };
    }

    return {
      apellidos: partes[0] || '',
      nombres: ''
    };
  }

  private extraerObjetoData<T>(respuesta: T | ApiDataResponse<T>): T {
    if (
      respuesta &&
      typeof respuesta === 'object' &&
      'data' in respuesta &&
      (respuesta as ApiDataResponse<T>).data
    ) {
      return (respuesta as ApiDataResponse<T>).data as T;
    }

    return respuesta as T;
  }

  private extraerRegistros<T>(respuesta: ApiListResponse<T>): T[] {
    if (Array.isArray(respuesta)) {
      return respuesta;
    }

    return Array.isArray(respuesta?.data) ? respuesta.data : [];
  }

  private transformarPersona(
    item: PersonaApiItem
  ): PersonaEstructura | null {
    const nombres = String(
      item?.nombres || item?.nombre || item?.nombres_completos || ''
    ).trim();
    const puesto = String(
      item?.denominacion_puesto || item?.cargo || ''
    ).trim();

    if (!nombres || !puesto) {
      return null;
    }

    return {
      id: item?.id,
      nombres,
      denominacion_puesto: puesto,
      unidad_organica: String(
        item?.unidad_organica || item?.unidad || ''
      ).trim()
    };
  }

  private ordenarYDepurarPersonas(
    personas: readonly PersonaEstructura[]
  ): PersonaEstructura[] {
    const unicas = new Map<string, PersonaEstructura>();

    for (const persona of personas) {
      const clave = this.normalizarTexto(persona.nombres);

      if (clave && !unicas.has(clave)) {
        unicas.set(clave, { ...persona });
      }
    }

    return [...unicas.values()].sort((a, b) =>
      a.nombres.localeCompare(b.nombres, 'es', { sensitivity: 'base' })
    );
  }

  private obtenerAutoridadesLocales(): PersonaEstructura[] {
    return this.ordenarYDepurarPersonas(
      this.personalBase.filter((persona) =>
        this.normalizarTexto(persona.denominacion_puesto).includes('DIRECTOR')
      )
    );
  }

  private extraerDocumentoId(respuesta: DocumentoResponse): number | null {
    const valor = respuesta?.doc_id ?? respuesta?.documento_id ?? respuesta?.id;
    const id = Number(valor);

    return Number.isInteger(id) && id > 0 ? id : null;
  }

  private extraerFirmas(
    respuesta: FirmaDocumento[] | FirmaListResponse
  ): FirmaDocumento[] {
    if (Array.isArray(respuesta)) {
      return respuesta;
    }

    if (Array.isArray(respuesta?.firmas)) {
      return respuesta.firmas;
    }

    return Array.isArray(respuesta?.data) ? respuesta.data : [];
  }

  private normalizarFirma(firma: FirmaDocumento): FirmaDocumento {
    return {
      ...firma,
      seccion: String(firma?.seccion || '').trim(),
      estado: this.normalizarEstadoFirma(firma?.estado),
      nombre_firmante: String(firma?.nombre_firmante || '').trim(),
      cargo_firmante: String(firma?.cargo_firmante || '').trim(),
      fecha_firma: firma?.fecha_firma || null,
      orden_firma: Number(firma?.orden_firma || 0),
      obligatorio: firma?.obligatorio !== false
    };
  }

  /**
   * Reconoce mensajes heredados de bloqueo secuencial. Estos mensajes no
   * deben impedir la firma independiente de cada responsable.
   */
  private esBloqueoExclusivamentePorOrden(
    mensaje: string | null | undefined
  ): boolean {
    const texto = this.normalizarTexto(mensaje);

    if (!texto) {
      return false;
    }

    return [
      'FIRMA ANTERIOR',
      'FIRMA PREVIA',
      'FIRMAS ANTERIORES',
      'ORDEN DE FIRMA',
      'ORDEN FIRMA',
      'DEBE FIRMAR PRIMERO',
      'PRIMERO DEBE COMPLETARSE',
      'SECUENCIA DE FIRMA'
    ].some((fragmento) => texto.includes(fragmento));
  }

  private normalizarEstadoFirma(estado: unknown): string {
    return String(estado || 'PENDIENTE')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');
  }

  private async validarArchivoCertificado(
    archivo: File
  ): Promise<string | null> {
    const nombre = archivo.name.toLowerCase();
    const esP12 = nombre.endsWith('.p12');
    const esPfx = nombre.endsWith('.pfx');

    if (!esP12 && !esPfx) {
      return 'El formato principal es .p12. Como alternativa se admite .pfx.';
    }

    if (archivo.size < this.minCertificadoBytes) {
      return 'El archivo está vacío o no contiene un certificado PKCS#12 válido.';
    }

    if (archivo.size > this.maxCertificadoBytes) {
      return 'El certificado no debe superar los 10 MB.';
    }

    try {
      const encabezado = new Uint8Array(await archivo.slice(0, 1).arrayBuffer());

      // PKCS#12 normalmente inicia con una secuencia ASN.1 DER (0x30).
      // Es una comprobación básica; la validación criptográfica real la hace el backend.
      if (!encabezado.length || encabezado[0] !== 0x30) {
        return 'El archivo no parece contener una estructura PKCS#12 válida.';
      }
    } catch {
      return 'No se pudo leer el certificado seleccionado.';
    }

    return null;
  }

  private async mostrarErrorFirma(error: unknown): Promise<void> {
    const httpError = error as HttpErrorResponse;
    const estado = Number(httpError?.status || 0);

    const mensajes: Record<number, string> = {
      400: 'Contraseña incorrecta, certificado inválido o datos de firma incompletos.',
      401: 'La sesión venció. Inicie sesión nuevamente.',
      403: 'El certificado o el usuario no corresponde al firmante asignado.',
      409: 'La sección ya fue firmada o cambió de estado. Actualice las firmas.',
      413: 'El certificado supera el tamaño permitido.',
      422: 'El certificado está vencido, no es válido o no pertenece al firmante.'
    };

    await this.mostrarErrorHttp(
      'Error al firmar',
      error,
      mensajes[estado] ||
        'No se pudo aplicar la firma. Verifique el certificado .p12 y su contraseña.'
    );
  }

  private async mostrarErrorHttp(
    titulo: string,
    error: unknown,
    mensajePredeterminado: string
  ): Promise<void> {
    const mensaje = await this.extraerMensajeError(
      error,
      mensajePredeterminado
    );

    await Swal.fire(titulo, mensaje, 'error');
  }

  private async extraerMensajeError(
    error: unknown,
    mensajePredeterminado: string
  ): Promise<string> {
    if (error instanceof Error && !(error instanceof HttpErrorResponse)) {
      return error.message || mensajePredeterminado;
    }

    const httpError = error as HttpErrorResponse;
    const cuerpo = httpError?.error;

    if (cuerpo instanceof Blob) {
      try {
        const texto = await cuerpo.text();

        try {
          const json = JSON.parse(texto) as {
            error?: string;
            message?: string;
            mensaje?: string;
          };

          return (
            json.error ||
            json.message ||
            json.mensaje ||
            mensajePredeterminado
          );
        } catch {
          return texto.trim() || mensajePredeterminado;
        }
      } catch {
        return mensajePredeterminado;
      }
    }

    if (typeof cuerpo === 'string') {
      return cuerpo.trim() || mensajePredeterminado;
    }

    if (cuerpo && typeof cuerpo === 'object') {
      const respuesta = cuerpo as {
        error?: string;
        message?: string;
        mensaje?: string;
      };

      return (
        respuesta.error ||
        respuesta.message ||
        respuesta.mensaje ||
        mensajePredeterminado
      );
    }

    if (httpError?.status === 0) {
      return 'No se pudo conectar con el backend. Verifique que Flask esté ejecutándose y que environment.apiUrl sea correcto.';
    }

    if (httpError?.status === 401) {
      return 'La sesión venció o el token no es válido.';
    }

    return httpError?.message || mensajePredeterminado;
  }

  private construirNombreArchivoExcel(): string {
    const identificador = this.crearIdentificadorArchivo();
    return `ACCION_PERSONAL_${identificador}.xlsx`;
  }

  private construirNombreArchivoPdf(): string {
    const identificador = this.crearIdentificadorArchivo();
    return `ACCION_PERSONAL_FIRMADA_${identificador}.pdf`;
  }

  private crearIdentificadorArchivo(): string {
    const base = [
      this.formulario.numero_accion,
      this.formulario.cedula,
      this.formulario.apellidos
    ]
      .filter(Boolean)
      .join('_');

    return (
      this.normalizarTexto(base)
        .replace(/[^A-Z0-9_-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '') || 'DOCUMENTO'
    );
  }

  private descargarBlob(blob: Blob, nombreArchivo: string): void {
    const url = window.URL.createObjectURL(blob);
    const enlace = document.createElement('a');

    try {
      enlace.href = url;
      enlace.download = nombreArchivo;
      enlace.style.display = 'none';
      document.body.appendChild(enlace);
      enlace.click();
    } finally {
      enlace.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    }
  }

  private async validarBlobDescarga(blob: Blob): Promise<void> {
    if (!blob || blob.size === 0) {
      throw new Error('El servidor devolvió un archivo vacío.');
    }

    const tipo = String(blob.type || '').toLowerCase();

    if (tipo.includes('application/json') || tipo.includes('text/plain')) {
      const texto = await blob.text();

      try {
        const json = JSON.parse(texto) as {
          error?: string;
          message?: string;
          mensaje?: string;
        };

        throw new Error(
          json.error ||
            json.message ||
            json.mensaje ||
            'El servidor devolvió una respuesta no válida.'
        );
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error(texto.trim() || 'Respuesta no válida del servidor.');
        }
        throw error;
      }
    }
  }

  private limpiarInputCertificado(): void {
    const ids = ['archivo_p12', 'firmaFile'];

    for (const id of ids) {
      const input = document.getElementById(id) as HTMLInputElement | null;

      if (input) {
        input.value = '';
      }
    }
  }

  private aplicarEscalaOcupacional(
    tipo: 'actual' | 'propuesta',
    remuneracionPreferida = ''
  ): void {
    const campoGrupo = tipo === 'actual' ? 'grupo_actual' : 'grupo_propuesta';
    const campoGrado = tipo === 'actual' ? 'grado_actual' : 'grado_propuesta';
    const campoRemuneracion =
      tipo === 'actual' ? 'remuneracion_actual' : 'remuneracion_propuesta';

    const grupoNormalizado = this.normalizarTexto(this.formulario[campoGrupo]);
    const escala = this.escalaOcupacional[grupoNormalizado];

    if (!escala) {
      this.formulario[campoGrado] = '';
      if (!remuneracionPreferida) {
        this.formulario[campoRemuneracion] = '';
      }
      return;
    }

    this.formulario[campoGrado] = escala.grado;
    this.formulario[campoRemuneracion] = remuneracionPreferida
      ? this.formatearRemuneracion(remuneracionPreferida)
      : this.formatearRemuneracion(escala.remuneracion);
  }

  private formatearRemuneracion(valor: string | number): string {
    const texto = String(valor ?? '')
      .replace(/[^0-9,.-]/g, '')
      .trim();

    if (!texto) {
      return '';
    }

    let normalizado = texto;
    if (texto.includes(',') && texto.includes('.')) {
      normalizado = texto.lastIndexOf(',') > texto.lastIndexOf('.')
        ? texto.replace(/\./g, '').replace(',', '.')
        : texto.replace(/,/g, '');
    } else if (texto.includes(',')) {
      normalizado = texto.replace(',', '.');
    }

    const numero = Number(normalizado);
    if (!Number.isFinite(numero)) {
      return String(valor);
    }

    return `$ ${new Intl.NumberFormat('es-EC', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numero)}`;
  }

  private buscarValorCatalogo(
    valor: unknown,
    catalogo: readonly string[]
  ): string {
    const buscado = this.normalizarTexto(valor);

    if (!buscado) {
      return '';
    }

    return (
      catalogo.find((item) => this.normalizarTexto(item) === buscado) || ''
    );
  }

  private normalizarTexto(valor: unknown): string {
    return String(valor || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  private escaparHtml(valor: unknown): string {
    return String(valor || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private actualizarVista(): void {
    this.cdr.markForCheck();
  }
}
