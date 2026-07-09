import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth';
import { environment } from '../../../environments/environment';

interface Usuario {
  id:      number;
  usuario: string;
  rol:     string;
}

@Component({
  selector:     'app-usuarios',
  standalone:   true,
  imports:      [CommonModule, FormsModule],
  templateUrl:  './usuarios.html',
  styleUrls:    ['./usuarios.scss']
})
export class UsuariosComponent implements OnInit {

  private readonly API = `${String(environment.apiUrl || 'http://localhost:5000/api').replace(/\/$/, '')}/usuarios`;

  cargando     = false;
  guardando    = false;
  eliminandoId: number | null = null;

  mostrarPassword        = false;
  mostrarConfirmPassword = false;

  usuarios: Usuario[] = [];

  editandoId:  number | null = null;
  rolEditando: string        = 'visitante';

  form = {
    usuario:         '',
    password:        '',
    confirmPassword: '',
    rol:             'visitante'
  };

  roles = [
    { value: 'admin',     label: 'Administrador' },
    { value: 'visitante', label: 'Visitante'      }
  ];

  constructor(
    private http:        HttpClient,
    private router:      Router,
    public  authService: AuthService,
    private cdr:         ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  get totalAdmin()     { return this.usuarios.filter(u => u.rol === 'admin').length;     }
  get totalVisitante() { return this.usuarios.filter(u => u.rol === 'visitante').length; }

  private headers() {
    return new HttpHeaders({ Authorization: this.authService.getToken() });
  }

  volver() {
    this.router.navigate(['/admin/dashboard']);
  }

  limpiar() {
    this.form = { usuario: '', password: '', confirmPassword: '', rol: 'visitante' };
    this.mostrarPassword        = false;
    this.mostrarConfirmPassword = false;
  }

  private validar(): boolean {
    const u = this.form.usuario.trim();
    const p = this.form.password.trim();
    const c = this.form.confirmPassword.trim();

    if (!u)                              return this.alerta('Ingrese el nombre de usuario');
    if (u.length < 4)                    return this.alerta('El usuario debe tener al menos 4 caracteres');
    if (u.length > 30)                   return this.alerta('El usuario no debe superar los 30 caracteres');
    if (!/^[a-zA-Z0-9_]+$/.test(u))     return this.alerta('Solo letras, números y guion bajo');
    if (!p)                              return this.alerta('Ingrese la contraseña');
    if (p.length < 4)                    return this.alerta('La contraseña debe tener al menos 4 caracteres');
    if (!c)                              return this.alerta('Confirme la contraseña');
    if (p !== c)                         return this.alerta('Las contraseñas no coinciden', 'error');
    return true;
  }

  private alerta(msg: string, tipo: 'warning' | 'error' = 'warning'): false {
    Swal.fire('Atención', msg, tipo);
    return false;
  }

  guardar() {
    if (!this.authService.isAdmin()) {
      Swal.fire('Acceso denegado', 'Solo el administrador puede registrar usuarios', 'warning');
      return;
    }
    if (!this.validar()) return;

    this.guardando = true;

    this.http.post<any>(this.API, {
      usuario:  this.form.usuario.trim(),
      password: this.form.password.trim(),
      rol:      this.form.rol
    }, { headers: this.headers() }).subscribe({
      next: (res) => {
        this.guardando = false;
        Swal.fire({ icon: 'success', title: 'Usuario registrado', text: res?.message || 'Creado correctamente', timer: 1800, showConfirmButton: false });
        this.limpiar();
        this.cargarUsuarios();
      },
      error: (err) => {
        this.guardando = false;
        Swal.fire('Error', err?.error?.error || 'No se pudo registrar el usuario', 'error');
      }
    });
  }

  cargarUsuarios() {
    this.cargando = true;
    this.http.get<Usuario[]>(this.API, { headers: this.headers() }).subscribe({
      next: (data) => {
        this.usuarios = data || [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargando = false;
        this.cdr.detectChanges();
        Swal.fire('Error', err?.error?.error || 'No se pudieron cargar los usuarios', 'error');
      }
    });
  }

  iniciarEdicion(u: Usuario) {
    this.editandoId  = u.id;
    this.rolEditando = u.rol;
  }

  cancelarEdicion() {
    this.editandoId  = null;
    this.rolEditando = 'visitante';
  }

  guardarRol(u: Usuario) {
    if (!u?.id) return;

    this.http.put<any>(`${this.API}/${u.id}`, { rol: this.rolEditando }, { headers: this.headers() }).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Rol actualizado', timer: 1400, showConfirmButton: false });
        this.cancelarEdicion();
        this.cargarUsuarios();
      },
      error: (err) => {
        Swal.fire('Error', err?.error?.error || 'No se pudo actualizar el rol', 'error');
      }
    });
  }

  eliminar(u: Usuario) {
    if (!u?.id) return;

    Swal.fire({
      title:              `¿Eliminar a "${u.usuario}"?`,
      text:               'Esta acción no se puede deshacer.',
      icon:               'warning',
      showCancelButton:   true,
      confirmButtonColor: '#ef4444',
      confirmButtonText:  'Sí, eliminar',
      cancelButtonText:   'Cancelar'
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.eliminandoId = u.id;

      this.http.delete<any>(`${this.API}/${u.id}`, { headers: this.headers() }).subscribe({
        next: () => {
          this.eliminandoId = null;
          Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1400, showConfirmButton: false });
          this.cargarUsuarios();
        },
        error: (err) => {
          this.eliminandoId = null;
          Swal.fire('Error', err?.error?.error || 'No se pudo eliminar', 'error');
        }
      });
    });
  }

  claseRol(rol: string): string {
    return rol === 'admin' ? 'badge-admin' : 'badge-visitante';
  }

  labelRol(rol: string): string {
    return rol === 'admin' ? 'Administrador' : 'Visitante';
  }
}
