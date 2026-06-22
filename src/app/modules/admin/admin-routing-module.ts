import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// GUARD FUNCIONAL
import { adminGuard } from '../../core/guards/admin-guard';

// PAGES
import { DashboardComponent } from './pages/dashboard/dashboard';

// COMPONENTES
import { NuevoFuncionarioComponent } from '../../components/nuevo-funcionario/nuevo-funcionario';
import { AuditoriaComponent } from '../../components/auditoria/auditoria';
import { SolicitudPermisosComponent } from '../../components/solicitud-permisos/solicitud-permisos';
import { UsuariosComponent } from '../../components/usuarios/usuarios';
import { FuncionariosDesvinculadosComponent } from '../../components/funcionarios-desvinculados/funcionarios-desvinculados';
import { AutoridadesComponent } from '../../components/autoridades/autoridades';
import { PersonalEstructuraComponent } from '../../components/personal-estructura/personal-estructura';
import { HistorialAccionesComponent } from '../../components/historial-acciones/historial-acciones';

const routes: Routes = [

  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [adminGuard]
  },

  {
    path: 'nuevo-funcionario',
    component: NuevoFuncionarioComponent,
    canActivate: [adminGuard]
  },

  {
    path: 'funcionarios-desvinculados',
    component: FuncionariosDesvinculadosComponent,
    canActivate: [adminGuard]
  },

  {
    path: 'auditoria',
    component: AuditoriaComponent,
    canActivate: [adminGuard]
  },

  {
    path: 'solicitud-permisos',
    component: SolicitudPermisosComponent,
    canActivate: [adminGuard]
  },

  {
    path: 'usuarios',
    component: UsuariosComponent,
    canActivate: [adminGuard]
  },

  {
    path: 'autoridades',
    component: AutoridadesComponent,
    canActivate: [adminGuard]
  },

  {
    path: 'personal-estructura',
    component: PersonalEstructuraComponent,
    canActivate: [adminGuard]
  },

  {
    path: 'historial-acciones',
    component: HistorialAccionesComponent,
    canActivate: [adminGuard]
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