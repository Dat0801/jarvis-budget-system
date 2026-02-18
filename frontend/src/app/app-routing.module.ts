import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: 'auth/login',
    loadChildren: () => import('./pages/auth/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'auth/register',
    loadChildren: () => import('./pages/auth/register/register.module').then(m => m.RegisterPageModule)
  },
  {
    path: 'income',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/income/income.module').then(m => m.IncomePageModule)
  },
  {
    path: 'expense',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/expense/expense.module').then(m => m.ExpensePageModule)
  },
  {
    path: 'notes',
    redirectTo: '/tabs/notes',
    pathMatch: 'full'
  },
  {
    path: '',
    canActivate: [AuthGuard],
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
  }
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
