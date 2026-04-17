import { Routes } from '@angular/router';

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