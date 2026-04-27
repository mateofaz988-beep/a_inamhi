import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// PAGES
import { DashboardComponent } from './pages/dashboard/dashboard';

// COMPONENTES
import { NuevoFuncionarioComponent } from '../../components/nuevo-funcionario/nuevo-funcionario';
import { AuditoriaComponent } from '../../components/auditoria/auditoria';
import { SolicitudPermisosComponent } from '../../components/solicitud-permisos/solicitud-permisos';
import { UsuariosComponent } from '../../components/usuarios/usuarios';
import { FuncionariosDesvinculadosComponent } from '../../components/funcionarios-desvinculados/funcionarios-desvinculados';

const routes: Routes = [

  // =========================
  // DASHBOARD
  // =========================
  {
    path: 'dashboard',
    component: DashboardComponent
  },

  // =========================
  // FUNCIONARIOS
  // =========================
  {
    path: 'nuevo-funcionario',
    component: NuevoFuncionarioComponent
  },

  {
    path: 'funcionarios-desvinculados',
    component: FuncionariosDesvinculadosComponent
  },

  // =========================
  // AUDITORIA
  // =========================
  {
    path: 'auditoria',
    component: AuditoriaComponent
  },

  // =========================
  // DOCUMENTOS
  // =========================
  {
    path: 'solicitud-permisos',
    component: SolicitudPermisosComponent
  },

  // =========================
  // USUARIOS
  // =========================
  {
    path: 'usuarios',
    component: UsuariosComponent
  },

  // =========================
  // DEFAULT
  // =========================
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },

  // =========================
  // FALLBACK (MUY IMPORTANTE)
  // =========================
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