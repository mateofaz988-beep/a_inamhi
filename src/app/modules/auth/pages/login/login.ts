import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  standalone: false
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';

  mostrarPassword = false;
  mayusculasActivas = false;
  recordarme = false;
  cargando = false;

  usuarioError = false;
  passwordError = false;
  mensajeError = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const usuarioGuardado = localStorage.getItem('login_username');

    if (usuarioGuardado) {
      this.username = usuarioGuardado;
      this.recordarme = true;
    }
  }

  detectarMayusculas(event: KeyboardEvent): void {
    this.mayusculasActivas = event.getModifierState?.('CapsLock') ?? false;
  }

  limpiarErrores(): void {
    this.usuarioError = false;
    this.passwordError = false;
    this.mensajeError = '';
  }

  onLogin(): void {
    this.mensajeError = '';
    this.usuarioError = !this.username.trim();
    this.passwordError = !this.password.trim();

    if (this.usuarioError || this.passwordError) {
      this.mensajeError = 'Ingrese usuario y contraseña.';
      return;
    }

    this.cargando = true;

    this.authService.login({
      user: this.username.trim(),
      pass: this.password
    }).subscribe({
      next: (res) => {
        this.cargando = false;

        if (this.recordarme) {
          localStorage.setItem('login_username', this.username.trim());
        } else {
          localStorage.removeItem('login_username');
        }

        if (res.role === 'admin') {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/visitante/inicio']);
        }
      },
      error: (err) => {
        this.cargando = false;
        console.error('Error en el acceso:', err);
        this.mensajeError = 'Usuario o contraseña no válidos.';
      }
    });
  }
}