import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth';
import { environment } from '../../../environments/environment';

interface Autoridad {
  id:                  number;
  nombres:             string;
  denominacion_puesto: string;
  unidad_organica:     string;
  provincia:           string;
  canton:              string;
}

@Component({
  selector:    'app-autoridades',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './autoridades.html',
  styleUrls:   ['./autoridades.scss']
})
export class AutoridadesComponent implements OnInit {

  private readonly API = `${String(environment.apiUrl || 'http://localhost:5000/api').replace(/\/$/, '')}/autoridades`;

  cargando   = false;
  guardando  = false;
  eliminandoId: number | null = null;

  autoridades: Autoridad[] = [];

  editandoId: number | null = null;
  formEditar: Partial<Autoridad> = {};

  form: Omit<Autoridad, 'id'> = {
    nombres:             '',
    denominacion_puesto: '',
    unidad_organica:     '',
    provincia:           'PICHINCHA',
    canton:              'QUITO'
  };

  constructor(
    private http:        HttpClient,
    private router:      Router,
    public  authService: AuthService,
    private cdr:         ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  private headers() {
    return new HttpHeaders({ Authorization: this.authService.getToken() });
  }

  volver() {
    this.router.navigate(['/admin/dashboard']);
  }

  limpiar() {
    this.form = { nombres: '', denominacion_puesto: '', unidad_organica: '', provincia: 'PICHINCHA', canton: 'QUITO' };
  }

  cargar() {
    this.cargando = true;
    this.http.get<Autoridad[]>(this.API, { headers: this.headers() }).subscribe({
      next: (data) => {
        this.autoridades = Array.isArray(data) ? data : [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdr.detectChanges();
        Swal.fire('Error', 'No se pudo cargar la lista de autoridades', 'error');
      }
    });
  }

  private validar(f: Partial<Autoridad>): boolean {
    if (!f.nombres?.trim()) {
      Swal.fire('Campo requerido', 'El nombre es obligatorio', 'warning'); return false;
    }
    if (!f.denominacion_puesto?.trim()) {
      Swal.fire('Campo requerido', 'La denominación del puesto es obligatoria', 'warning'); return false;
    }
    return true;
  }

  guardar() {
    if (!this.validar(this.form)) return;
    this.guardando = true;

    const payload = {
      nombres:             this.form.nombres.trim().toUpperCase(),
      denominacion_puesto: this.form.denominacion_puesto.trim().toUpperCase(),
      unidad_organica:     this.form.unidad_organica.trim().toUpperCase(),
      provincia:           this.form.provincia.trim().toUpperCase() || 'PICHINCHA',
      canton:              this.form.canton.trim().toUpperCase()    || 'QUITO'
    };

    this.http.post(this.API, payload, { headers: this.headers() }).subscribe({
      next: () => {
        this.guardando = false;
        this.limpiar();
        this.cdr.detectChanges();
        this.cargar();
        Swal.fire({ icon: 'success', title: 'Autoridad registrada', timer: 1500, showConfirmButton: false });
      },
      error: (err) => {
        this.guardando = false;
        this.cdr.detectChanges();
        Swal.fire('Error', err?.error?.error || 'No se pudo registrar', 'error');
      }
    });
  }

  iniciarEdicion(a: Autoridad) {
    this.editandoId = a.id;
    this.formEditar = { ...a };
  }

  cancelarEdicion() {
    this.editandoId = null;
    this.formEditar = {};
  }

  guardarEdicion(a: Autoridad) {
    if (!this.validar(this.formEditar)) return;

    const payload = {
      nombres:             (this.formEditar.nombres             || '').trim().toUpperCase(),
      denominacion_puesto: (this.formEditar.denominacion_puesto || '').trim().toUpperCase(),
      unidad_organica:     (this.formEditar.unidad_organica     || '').trim().toUpperCase(),
      provincia:           (this.formEditar.provincia           || 'PICHINCHA').trim().toUpperCase(),
      canton:              (this.formEditar.canton              || 'QUITO').trim().toUpperCase()
    };

    this.http.put(`${this.API}/${a.id}`, payload, { headers: this.headers() }).subscribe({
      next: () => {
        this.cancelarEdicion();
        this.cdr.detectChanges();
        this.cargar();
        Swal.fire({ icon: 'success', title: 'Actualizado correctamente', timer: 1500, showConfirmButton: false });
      },
      error: (err) => Swal.fire('Error', err?.error?.error || 'No se pudo actualizar', 'error')
    });
  }

  eliminar(a: Autoridad) {
    Swal.fire({
      title: '¿Eliminar autoridad?',
      html:  `<strong>${a.nombres}</strong><br><small>${a.denominacion_puesto}</small>`,
      icon:  'warning',
      showCancelButton:   true,
      confirmButtonText:  'Sí, eliminar',
      cancelButtonText:   'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor:  '#64748b'
    }).then(res => {
      if (!res.isConfirmed) return;
      this.eliminandoId = a.id;
      this.http.delete(`${this.API}/${a.id}`, { headers: this.headers() }).subscribe({
        next: () => {
          this.eliminandoId = null;
          this.cdr.detectChanges();
          this.cargar();
          Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1400, showConfirmButton: false });
        },
        error: (err) => {
          this.eliminandoId = null;
          this.cdr.detectChanges();
          Swal.fire('Error', err?.error?.error || 'No se pudo eliminar', 'error');
        }
      });
    });
  }
}
