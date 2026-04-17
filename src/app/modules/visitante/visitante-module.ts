import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VisitanteRoutingModule } from './visitante-routing-module';
import { SharedModule } from '../../shared/shared-module';
import { InicioComponent } from './pages/inicio/inicio';


@NgModule({
  declarations: [
    InicioComponent
  ],
  imports: [
    CommonModule,
    VisitanteRoutingModule,
    SharedModule // <-- AGREGA ESTO AQUÍ
  ]
})
export class VisitanteModule { }