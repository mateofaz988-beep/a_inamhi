import { Component } from '@angular/core';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.html',
   styleUrls: ['./inicio.scss'],
  standalone: false
})
export class InicioComponent {
  fechaActual = 'Abril 2026';
}