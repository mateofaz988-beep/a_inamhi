import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly API_URL = 'http://localhost:5000/api/auth';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // =========================
  // 🔐 LOGIN ROBUSTO
  // =========================
  login(credentials: { user: string; pass: string }): Observable<any> {

    // 🔥 DEBUG (puedes quitar luego)
    console.log('Enviando credenciales:', credentials);

    return this.http.post<any>(`${this.API_URL}/login`, {
      user: credentials.user,
      pass: credentials.pass
    }).pipe(

      tap(response => {
        console.log('Respuesta backend:', response);

        if (response && response.token) {
          localStorage.setItem('auth_token', response.token);
          localStorage.setItem('user_role', response.role);

          console.log('✅ Login exitoso');
        } else {
          throw new Error('Respuesta inválida del servidor');
        }
      }),

      catchError((error: HttpErrorResponse) => {

        console.error('❌ Error login:', error);

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
    return localStorage.getItem('auth_token') || '';
  }

  // =========================
  // 🚪 LOGOUT
  // =========================
  logout(): void {
    localStorage.clear();
    this.router.navigate(['/auth']);
  }
}