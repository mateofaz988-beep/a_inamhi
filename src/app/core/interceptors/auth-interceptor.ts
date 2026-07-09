import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Interceptor funcional que agrega el token JWT a todas las peticiones
 * y maneja errores globales de autenticación.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('auth_token');

  // Agregar header Authorization si existe token.
  // El backend (decodificar_token en app.py) exige el prefijo "Bearer ";
  // este interceptor corre sobre TODAS las peticiones y su setHeaders
  // sobrescribe cualquier Authorization que un componente haya fijado a
  // mano, así que si aquí falta el prefijo, ningún endpoint protegido del
  // backend puede autenticar a nadie, sin importar lo que haga cada
  // componente individualmente.
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      // 401 Unauthorized → sesión expirada, redirigir a login
      if (error.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_role');
        router.navigate(['/auth']);
      }

      return throwError(() => error);
    })
  );
};
