import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector:    'app-historial-acciones',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './historial-acciones.html',
  styleUrls:   ['./historial-acciones.scss']
})
export class HistorialAccionesComponent {

  private readonly BASE = 'http://localhost:5000/api/historial-acciones';

  textoBusqueda = '';
  buscando      = false;
  yaSeHizoBusqueda = false;

  persona:  any       = null;
  acciones: any[]     = [];

  mostrarModal  = false;
  subiendoArchivo = false;
  archivoSeleccionado: File | null = null;

  formSubir = {
    numero_accion: '',
    tipo_accion:   '',
    fecha_accion:  ''
  };

  tiposAccion = [
    'Vacaciones', 'Permiso', 'Comisión de Servicios', 'Traslado',
    'Cambio Administrativo', 'Subrogación', 'Licencia sin Sueldo',
    'Licencia con Sueldo', 'Sanción', 'Cesación de Funciones', 'Otro'
  ];

  // ── Estados para Firmas Electrónicas ──
  mostrarOffcanvasFirmas = false;
  mostrarModalFirma = false;
  documentoActualId: number | null = null;
  firmasDocumento: any[] = [];
  firmaSeleccionada: any | null = null;
  passwordFirmaSeccion = '';
  selectedFile: File | null = null;
  firmando = false;
  cargandoFirmas = false;
  descargandoPdf = false;
  pdfFirmasUrl: SafeResourceUrl | null = null;

  private readonly FIRMAS_API = 'http://localhost:5000/api/acciones-personal';

  constructor(
    private http:        HttpClient,
    private router:      Router,
    public  authService: AuthService,
    private cdr:         ChangeDetectorRef,
    private sanitizer:   DomSanitizer
  ) {}

  private headers() {
    return new HttpHeaders({ Authorization: this.authService.getToken() });
  }

  volver() {
    this.router.navigate(['/admin/dashboard']);
  }

  buscar() {
    const q = this.textoBusqueda.trim();
    if (!q) return;

    this.buscando = true;
    this.persona  = null;
    this.acciones = [];

    this.http.get<any>(`${this.BASE}/buscar?q=${encodeURIComponent(q)}`, {
      headers: this.headers()
    }).subscribe({
      next: (res) => {
        this.persona         = res.persona   || null;
        this.acciones        = res.acciones  || [];
        this.buscando        = false;
        this.yaSeHizoBusqueda = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.buscando = false;
        this.yaSeHizoBusqueda = true;
        this.cdr.detectChanges();
        Swal.fire('Error', 'No se pudo realizar la búsqueda', 'error');
      }
    });
  }

  onEnter(event: KeyboardEvent) {
    if (event.key === 'Enter') this.buscar();
  }

  limpiarBusqueda() {
    this.textoBusqueda    = '';
    this.persona          = null;
    this.acciones         = [];
    this.yaSeHizoBusqueda = false;
    this.cdr.detectChanges();
  }

  // ── Modal subir ────────────────────────────────────────────────────────────
  abrirModal() {
    this.formSubir = { numero_accion: '', tipo_accion: '', fecha_accion: '' };
    this.archivoSeleccionado = null;
    this.mostrarModal = true;
    this.cdr.detectChanges();
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.archivoSeleccionado = null;
    this.cdr.detectChanges();
  }

  onArchivoSeleccionado(event: Event) {
    const input = event.target as HTMLInputElement;
    this.archivoSeleccionado = input.files?.[0] ?? null;
  }

  subirAccion() {
    if (!this.persona) return;

    const fd = new FormData();
    fd.append('cedula',        this.persona.cedula  || '');
    fd.append('nombres',       this.persona.nombres || '');
    fd.append('numero_accion', this.formSubir.numero_accion);
    fd.append('tipo_accion',   this.formSubir.tipo_accion);
    fd.append('fecha_accion',  this.formSubir.fecha_accion);
    if (this.archivoSeleccionado) {
      fd.append('archivo', this.archivoSeleccionado, this.archivoSeleccionado.name);
    }

    this.subiendoArchivo = true;
    this.http.post(`${this.BASE}/subir`, fd, { headers: this.headers() }).subscribe({
      next: () => {
        this.subiendoArchivo = false;
        this.cerrarModal();
        this.buscar();
        Swal.fire({ icon: 'success', title: 'Acción registrada', timer: 1500, showConfirmButton: false });
      },
      error: (err) => {
        this.subiendoArchivo = false;
        this.cdr.detectChanges();
        Swal.fire('Error', err?.error?.error || 'No se pudo subir la acción', 'error');
      }
    });
  }

  // ── Descargar ──────────────────────────────────────────────────────────────
  descargar(accion: any) {
    const urlDescarga = accion.es_nativo 
      ? `${this.FIRMAS_API}/${accion.id}/pdf` 
      : `${this.BASE}/${accion.id}/descargar`;

    this.http.get(urlDescarga, {
      headers:      this.headers(),
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = accion.archivo_nombre || `accion_${accion.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        if (err.error instanceof Blob) {
          err.error.text().then((text: string) => {
            try {
              const msg = JSON.parse(text).error;
              Swal.fire('Error', msg || 'No se pudo descargar el archivo', 'error');
            } catch (e) {
              Swal.fire('Error', 'No se pudo descargar el archivo', 'error');
            }
          });
        } else {
          Swal.fire('Error', 'El archivo físico ya no existe en el servidor o la ruta es inválida.', 'error');
        }
      }
    });
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────
  eliminar(accion: any) {
    Swal.fire({
      title: '¿Eliminar esta acción?',
      html:  `<strong>${accion.numero_accion || 'Sin número'}</strong><br><small>${accion.tipo_accion || ''} — ${accion.fecha_registro}</small>`,
      icon:  'warning',
      showCancelButton:   true,
      confirmButtonText:  'Sí, eliminar',
      cancelButtonText:   'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor:  '#64748b'
    }).then(res => {
      if (!res.isConfirmed) return;
      this.http.delete(`${this.BASE}/${accion.id}`, { headers: this.headers() }).subscribe({
        next: () => {
          this.buscar();
          Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1400, showConfirmButton: false });
        },
        error: () => Swal.fire('Error', 'No se pudo eliminar', 'error')
      });
    });
  }

  tieneArchivo(accion: any): boolean {
    return !!accion.archivo_nombre;
  }

  // ── Métodos para Firmas Electrónicas (Documentos Nativos) ─────────────────
  
  gestionarFirmas(accion: any) {
    if (!accion.es_nativo || !accion.id) return;
    this.documentoActualId = accion.id;
    
    // Obtener URL del PDF para vista previa
    const url = `${this.FIRMAS_API}/${accion.id}/pdf`;
    this.pdfFirmasUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    
    this.mostrarOffcanvasFirmas = true;
    this.cargarFirmasDocumento();
  }

  async cargarFirmasDocumento(): Promise<void> {
    if (!this.documentoActualId) return;
    
    try {
      this.cargandoFirmas = true;
      this.cdr.detectChanges();
      
      const firmas = await firstValueFrom(this.http.get<any[]>(
        `${this.FIRMAS_API}/${this.documentoActualId}/firmas`,
        { headers: this.headers() }
      ));
      
      this.firmasDocumento = firmas || [];
    } catch (e: any) {
      Swal.fire('Error', 'No se pudieron cargar las firmas', 'error');
    } finally {
      this.cargandoFirmas = false;
      this.cdr.detectChanges();
    }
  }

  abrirModalFirma(firma: any): void {
    if (firma.estado === 'FIRMADA') return;
    this.firmaSeleccionada = firma;
    this.mostrarModalFirma = true;
    this.passwordFirmaSeccion = '';
    this.selectedFile = null;
    this.cdr.detectChanges();
  }

  cerrarModalFirma(): void {
    this.mostrarModalFirma = false;
    this.firmaSeleccionada = null;
    this.passwordFirmaSeccion = '';
    this.selectedFile = null;
    this.cdr.detectChanges();
  }

  cerrarOffcanvasFirmas(): void {
    this.mostrarOffcanvasFirmas = false;
    this.documentoActualId = null;
    this.pdfFirmasUrl = null;
    this.firmasDocumento = [];
    this.buscar(); // Refrescar lista principal por si cambiaron estados
    this.cdr.detectChanges();
  }

  seleccionarCertificadoFirma(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;

    if (!archivo) {
      this.selectedFile = null;
      return;
    }

    if (!archivo.name.toLowerCase().endsWith('.p12') && !archivo.name.toLowerCase().endsWith('.pfx')) {
      input.value = '';
      this.selectedFile = null;
      Swal.fire('Archivo no válido', 'Seleccione un certificado .p12 o .pfx', 'warning');
      return;
    }
    
    this.selectedFile = archivo;
  }

  async firmarSeccion(): Promise<void> {
    if (!this.documentoActualId || !this.firmaSeleccionada || !this.selectedFile || !this.passwordFirmaSeccion || this.firmando) return;
    
    try {
      this.firmando = true;
      this.cdr.detectChanges();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const formData = new FormData();
      formData.append('certificado', this.selectedFile);
      formData.append('password', this.passwordFirmaSeccion);
      formData.append('seccion', this.firmaSeleccionada.seccion);
      
      await firstValueFrom(this.http.post(
        `${this.FIRMAS_API}/${this.documentoActualId}/firmar`, 
        formData,
        { headers: this.headers() }
      ));
      
      Swal.fire('Firma exitosa', `Se firmó la sección ${this.firmaSeleccionada.seccion}`, 'success');
      this.cerrarModalFirma();
      
      // Actualizar iframe para ver la nueva firma
      const url = `${this.FIRMAS_API}/${this.documentoActualId}/pdf?t=${new Date().getTime()}`;
      this.pdfFirmasUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);

      await this.cargarFirmasDocumento();
    } catch (e: any) {
      Swal.fire('Error al firmar', e?.error?.error || 'Contraseña incorrecta o certificado inválido', 'error');
    } finally {
      this.firmando = false;
      this.cdr.detectChanges();
    }
  }

  async finalizarDocumento(): Promise<void> {
    if (!this.documentoActualId) return;
    try {
      await firstValueFrom(this.http.post(
        `${this.FIRMAS_API}/${this.documentoActualId}/finalizar`, 
        {},
        { headers: this.headers() }
      ));
      
      Swal.fire('Documento finalizado', 'Todas las firmas se han completado', 'success');
      this.cerrarOffcanvasFirmas();
    } catch (e: any) {
      Swal.fire('Error', e?.error?.error || 'Aún faltan firmas obligatorias', 'error');
    }
  }
}
