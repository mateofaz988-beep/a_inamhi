import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.scss']
})
export class UsuariosComponent implements OnInit {

  private readonly API_URL = 'http://localhost:5000/api/usuarios';

  guardando = false;
  cargandoUsuarios = false;
  mostrarPassword = false;
  mostrarConfirmPassword = false;

  usuarios: any[] = [];
  usuariosFiltrados: any[] = [];
  searchText: string = '';

  editandoId: number | null = null;
  rolEditando: string = 'visitante';

  nuevoUsuario = {
    usuario: '',
    password: '',
    confirmPassword: '',
    rol: 'visitante'
  };

  roles = [
    { value: 'admin', label: 'Administrador' },
    { value: 'visitante', label: 'Visitante' }
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.obtenerUsuarios();
  }

  getHeaders() {
    return new HttpHeaders({
      Authorization: this.authService.getToken()
    });
  }

  volver() {
    this.router.navigate(['/admin/dashboard']);
  }

  limpiarFormulario() {
    this.nuevoUsuario = {
      usuario: '',
      password: '',
      confirmPassword: '',
      rol: 'visitante'
    };
  }

  validarFormulario(): boolean {
    const usuario = this.nuevoUsuario.usuario.trim();
    const password = this.nuevoUsuario.password.trim();
    const confirmPassword = this.nuevoUsuario.confirmPassword.trim();
    const rol = this.nuevoUsuario.rol.trim();

    if (!usuario) {
      Swal.fire('Atención', 'Ingrese el nombre de usuario', 'warning');
      return false;
    }

    if (usuario.length < 4) {
      Swal.fire('Atención', 'El usuario debe tener al menos 4 caracteres', 'warning');
      return false;
    }

    if (usuario.length > 30) {
      Swal.fire('Atención', 'El usuario no debe superar los 30 caracteres', 'warning');
      return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(usuario)) {
      Swal.fire('Atención', 'El usuario solo puede contener letras, números y guion bajo', 'warning');
      return false;
    }

    if (!password) {
      Swal.fire('Atención', 'Ingrese la contraseña', 'warning');
      return false;
    }

    if (password.length < 4) {
      Swal.fire('Atención', 'La contraseña debe tener al menos 4 caracteres', 'warning');
      return false;
    }

    if (!confirmPassword) {
      Swal.fire('Atención', 'Confirme la contraseña', 'warning');
      return false;
    }

    if (password !== confirmPassword) {
      Swal.fire('Error', 'Las contraseñas no coinciden', 'error');
      return false;
    }

    if (!['admin', 'visitante'].includes(rol)) {
      Swal.fire('Error', 'Rol inválido', 'error');
      return false;
    }

    return true;
  }

  guardar() {
    if (!this.authService.isAdmin()) {
      Swal.fire('Acceso denegado', 'Solo el administrador puede registrar usuarios', 'warning');
      return;
    }

    if (!this.validarFormulario()) return;

    this.guardando = true;

    const payload = {
      usuario: this.nuevoUsuario.usuario.trim(),
      password: this.nuevoUsuario.password.trim(),
      rol: this.nuevoUsuario.rol.trim()
    };

    this.http.post<any>(this.API_URL, payload, {
      headers: this.getHeaders()
    }).subscribe({
      next: (res) => {
        this.guardando = false;

        Swal.fire({
          icon: 'success',
          title: 'Usuario registrado',
          text: res?.message || 'El usuario fue creado correctamente',
          timer: 1800,
          showConfirmButton: false
        });

        this.limpiarFormulario();
        this.obtenerUsuarios();
      },
      error: (err) => {
        this.guardando = false;
        console.error('Error registrando usuario:', err);

        Swal.fire(
          'Error',
          err?.error?.error || 'No se pudo registrar el usuario',
          'error'
        );
      }
    });
  }

  obtenerUsuarios() {
    this.cargandoUsuarios = true;

    this.http.get<any[]>(this.API_URL, {
      headers: this.getHeaders()
    }).subscribe({
      next: (data) => {
        this.cargandoUsuarios = false;
        this.usuarios = data || [];
        this.usuariosFiltrados = [...this.usuarios];
      },
      error: (err) => {
        this.cargandoUsuarios = false;
        console.error('Error cargando usuarios:', err);
        Swal.fire('Error', err?.error?.error || 'No se pudieron cargar los usuarios', 'error');
      }
    });
  }

  buscar() {
    const texto = this.searchText.toLowerCase().trim();

    if (!texto) {
      this.usuariosFiltrados = [...this.usuarios];
      return;
    }

    this.usuariosFiltrados = this.usuarios.filter(u =>
      (u.usuario || '').toLowerCase().includes(texto) ||
      (u.rol || '').toLowerCase().includes(texto)
    );
  }

  iniciarEdicion(usuario: any) {
    this.editandoId = usuario.id;
    this.rolEditando = usuario.rol;
  }

  cancelarEdicion() {
    this.editandoId = null;
    this.rolEditando = 'visitante';
  }

  guardarRol(usuario: any) {
    if (!usuario?.id) return;

    this.http.put<any>(`${this.API_URL}/${usuario.id}`, {
      rol: this.rolEditando
    }, {
      headers: this.getHeaders()
    }).subscribe({
      next: (res) => {
        Swal.fire({
          icon: 'success',
          title: 'Rol actualizado',
          text: res?.message || 'El rol fue actualizado correctamente',
          timer: 1600,
          showConfirmButton: false
        });

        this.cancelarEdicion();
        this.obtenerUsuarios();
      },
      error: (err) => {
        console.error('Error actualizando rol:', err);
        Swal.fire('Error', err?.error?.error || 'No se pudo actualizar el rol', 'error');
      }
    });
  }

  eliminar(usuario: any) {
    if (!usuario?.id) return;

    Swal.fire({
      title: `¿Eliminar a ${usuario.usuario}?`,
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.http.delete<any>(`${this.API_URL}/${usuario.id}`, {
        headers: this.getHeaders()
      }).subscribe({
        next: (res) => {
          Swal.fire({
            icon: 'success',
            title: 'Usuario eliminado',
            text: res?.message || 'El usuario fue eliminado correctamente',
            timer: 1600,
            showConfirmButton: false
          });

          this.obtenerUsuarios();
        },
        error: (err) => {
          console.error('Error eliminando usuario:', err);
          Swal.fire('Error', err?.error?.error || 'No se pudo eliminar el usuario', 'error');
        }
      });
    });
  }

  obtenerClaseRol(rol: string): string {
    return rol === 'admin' ? 'badge-admin' : 'badge-visitante';
  }

  traducirRol(rol: string): string {
    return rol === 'admin' ? 'Administrador' : 'Visitante';
  }
}