import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DashboardComponent } from './pages/dashboard/dashboard';
import { NuevoFuncionarioComponent } from '../../components/nuevo-funcionario/nuevo-funcionario';

const routes: Routes = [

  // =========================
  // DASHBOARD
  // =========================
  {
    path: 'dashboard',
    component: DashboardComponent
  },

  // =========================
  // NUEVO FUNCIONARIO
  // =========================
  {
    path: 'nuevo-funcionario',
    component: NuevoFuncionarioComponent
  },

  // =========================
  // REDIRECCIÓN POR DEFECTO
  // =========================
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }