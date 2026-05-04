import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

import { AuthService } from '../services/auth';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {

    // 🔐 Debe estar logueado Y ser admin
    if (this.authService.isLoggedIn() && this.authService.isAdmin()) {
      return true;
    }

    // ❌ Si no es admin → fuera
    this.router.navigate(['/auth']);
    return false;
  }
}