import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

import { AuthService } from '../services/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {

    // 🔐 Si está logueado
    if (this.authService.isLoggedIn()) {
      return true;
    }

    // ❌ Si no → lo mando al login
    this.router.navigate(['/auth']);
    return false;
  }
}