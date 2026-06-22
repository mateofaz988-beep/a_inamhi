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

  // Agregar header Authorization si existe token
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: token
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
