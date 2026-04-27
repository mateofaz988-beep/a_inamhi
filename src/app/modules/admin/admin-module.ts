import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AdminRoutingModule } from './admin-routing-module';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { FuncionariosDesvinculadosComponent } from '../../components/funcionarios-desvinculados/funcionarios-desvinculados';
import { SharedModule } from '../../shared/shared-module';

@NgModule({
  declarations: [
    FuncionariosDesvinculadosComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    DashboardComponent,
    AdminRoutingModule
  ]
})
export class AdminModule { }