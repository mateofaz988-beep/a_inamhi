import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly API_URL = `${environment.apiUrl}/auth`;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // =========================
  // 🔐 LOGIN
  // =========================
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/login`, {
      user: credentials.user,
      pass: credentials.pass
    }).pipe(
      tap(response => {
        if (response && response.token) {
          localStorage.setItem('auth_token', response.token);
          localStorage.setItem('user_role', response.role);
          if (response.usuario) {
            localStorage.setItem('auth_user', response.usuario);
          }
        } else {
          throw new Error('Respuesta inválida del servidor');
        }
      }),
      catchError((error) => {
        let mensaje = 'Error en el servidor';

        if (error.status === 401) {
          mensaje = 'Usuario o contraseña incorrectos';
        }

        return throwError(() => new Error(mensaje));
      })
    );
  }

  // =========================
  // 🔐 ESTADO DE SESIÓN
  // =========================
  isLoggedIn(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  // =========================
  // 👤 OBTENER ROL
  // =========================
  getRole(): string {
    return localStorage.getItem('user_role') || '';
  }

  // =========================
  // 🔥 VALIDAR ADMIN
  // =========================
  isAdmin(): boolean {
    return this.getRole() === 'admin';
  }

  // =========================
  // 🔑 TOKEN PARA HEADERS
  // =========================
  getToken(): string {
    const token = localStorage.getItem('auth_token');
    return token ? `Bearer ${token}` : '';
  }

  // =========================
  // 👤 OBTENER USUARIO
  // =========================
  getUser(): string {
    return localStorage.getItem('auth_user') || '';
  }

  // =========================
  // 🚪 LOGOUT
  // =========================
  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('auth_user');
    this.router.navigate(['/auth']);
  }
}