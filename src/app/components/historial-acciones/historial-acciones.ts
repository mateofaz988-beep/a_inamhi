import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth';

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

  constructor(
    private http:        HttpClient,
    private router:      Router,
    public  authService: AuthService,
    private cdr:         ChangeDetectorRef
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
    this.http.get(`${this.BASE}/${accion.id}/descargar`, {
      headers:      this.headers(),
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = accion.archivo_nombre || `accion_${accion.id}`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => Swal.fire('Error', 'No se pudo descargar el archivo', 'error')
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
}
