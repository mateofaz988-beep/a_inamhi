import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// GUARD FUNCIONAL
import { adminGuard } from '../../core/guards/admin-guard';

// LAYOUT
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout';

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
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'nuevo-funcionario',
        component: NuevoFuncionarioComponent
      },
      {
        path: 'funcionarios-desvinculados',
        component: FuncionariosDesvinculadosComponent
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
        path: 'autoridades',
        component: AutoridadesComponent
      },
      {
        path: 'personal-estructura',
        component: PersonalEstructuraComponent
      },
      {
        path: 'historial-acciones',
        component: HistorialAccionesComponent
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
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