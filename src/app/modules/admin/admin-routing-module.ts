import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// 🔐 GUARD ADMIN

// PAGES
import { DashboardComponent } from './pages/dashboard/dashboard';

// COMPONENTES
import { NuevoFuncionarioComponent } from '../../components/nuevo-funcionario/nuevo-funcionario';
import { AuditoriaComponent } from '../../components/auditoria/auditoria';
import { SolicitudPermisosComponent } from '../../components/solicitud-permisos/solicitud-permisos';
import { UsuariosComponent } from '../../components/usuarios/usuarios';
import { FuncionariosDesvinculadosComponent } from '../../components/funcionarios-desvinculados/funcionarios-desvinculados';
import { AdminGuard } from '../../core/guards/admin-guard';

const routes: Routes = [

  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AdminGuard]
  },

  {
    path: 'nuevo-funcionario',
    component: NuevoFuncionarioComponent,
    canActivate: [AdminGuard]
  },

  {
    path: 'funcionarios-desvinculados',
    component: FuncionariosDesvinculadosComponent,
    canActivate: [AdminGuard]
  },

  {
    path: 'auditoria',
    component: AuditoriaComponent,
    canActivate: [AdminGuard]
  },

  {
    path: 'solicitud-permisos',
    component: SolicitudPermisosComponent,
    canActivate: [AdminGuard]
  },

  {
    path: 'usuarios',
    component: UsuariosComponent,
    canActivate: [AdminGuard]
  },

  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },

  {
    path: '**',
    redirectTo: 'dashboard'
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }