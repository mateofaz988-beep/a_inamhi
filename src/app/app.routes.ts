import { Routes } from '@angular/router';
import { AuditoriaComponent } from './components/auditoria/auditoria'; // importa tu componente standalone

export const routes: Routes = [

  // =========================
  // AUTH
  // =========================
  {
    path: 'auth',
    loadChildren: () =>
      import('./modules/auth/auth-module').then(m => m.AuthModule)
  },

  // =========================
  // ADMIN
  // =========================
  {
    path: 'admin',
    loadChildren: () =>
      import('./modules/admin/admin-module').then(m => m.AdminModule)
  },

  // =========================
  // AUDITORÍA (standalone)
  // =========================
  {
    path: 'admin/auditoria',
    component: AuditoriaComponent
  },

  // =========================
  // VISITANTE
  // =========================
  {
    path: 'visitante',
    loadChildren: () =>
      import('./modules/visitante/visitante-module').then(m => m.VisitanteModule)
  },

  // =========================
  // REDIRECCIONES
  // =========================
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'auth'
  }
];
