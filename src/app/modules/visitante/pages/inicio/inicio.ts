import { Component } from '@angular/core';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.scss'],
  standalone: false
})
export class InicioComponent {
  fechaActual = 'Abril 2026';

  constructor(private authService: AuthService) {
    
  }

  cerrarSesion(): void {
    this.authService.logout();
  }
}
