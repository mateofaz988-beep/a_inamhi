import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth'; // Verifica esta ruta

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  standalone: false
})
export class LoginComponent {
  username = '';
  password = '';

  constructor(private router: Router, private authService: AuthService) {}

  onLogin() {
    this.authService.login({ user: this.username, pass: this.password }).subscribe({
      next: (res) => {
        // Redirección basada en el rol de la base de datos
        if (res.role === 'admin') {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/visitante/inicio']);
        }
      },
      error: (err) => {
        console.error('Error en el acceso:', err);
        alert('Usuario o contraseña no válidos');
      }
    });
  }
}