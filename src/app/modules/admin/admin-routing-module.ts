import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DashboardComponent } from './pages/dashboard/dashboard';
import { NuevoFuncionarioComponent } from '../../components/nuevo-funcionario/nuevo-funcionario';
import { AuditoriaComponent } from '../../components/auditoria/auditoria';
import { SolicitudPermisosComponent } from '../../components/solicitud-permisos/solicitud-permisos';
import { UsuariosComponent } from '../../components/usuarios/usuarios';

const routes: Routes = [

  {
    path: 'dashboard',
    component: DashboardComponent
  },

  {
    path: 'nuevo-funcionario',
    component: NuevoFuncionarioComponent
  },

  {
    path: 'auditoria',
    component: AuditoriaComponent
  },

  {
    path: 'solicitud-permisos',
    component: SolicitudPermisosComponent
  },

  {
    path: 'usuarios',
    component: UsuariosComponent
  },

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