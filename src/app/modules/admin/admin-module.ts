import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// Importación del sistema de rutas del módulo
import { AdminRoutingModule } from './admin-routing-module';

// Importación de componentes de página
import { DashboardComponent } from './pages/dashboard/dashboard';
import { SharedModule } from '../../shared/shared-module';

// Importación del módulo compartido (Contiene la tabla y FormsModule)

@NgModule({
  declarations: [
    DashboardComponent
  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    SharedModule // Esto permite usar <app-tabla-empleados> en el dashboard
  ]
})
export class AdminModule { }