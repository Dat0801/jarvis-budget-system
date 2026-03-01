import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    title: 'Jarvis Budget',
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('../home/home.module').then(m => m.HomePageModule),
        title: 'Dashboard',
      },
      {
        path: 'transactions',
        loadChildren: () => import('../transactions/transactions.module').then(m => m.TransactionsPageModule),
        title: 'Transactions',
      },
      {
        path: 'stats',
        redirectTo: 'transactions',
        pathMatch: 'full'
      },
      {
        path: 'notes',
        loadChildren: () => import('../pages/notes/notes.module').then(m => m.NotesPageModule),
        title: 'Notes',
      },
      {
        path: 'budgets',
        loadChildren: () => import('../pages/jars/jars.module').then(m => m.JarsPageModule),
        title: 'Budget Jars',
      },
      {
        path: 'settings',
        loadChildren: () => import('../settings/settings.module').then(m => m.SettingsPageModule),
        title: 'Settings',
      },
      {
        path: 'categories',
        loadChildren: () => import('../pages/categories/categories.module').then(m => m.CategoriesPageModule),
        title: 'Categories',
      },
      {
        path: 'wallets',
        loadChildren: () => import('../pages/wallets/wallets.module').then(m => m.WalletsPageModule),
        title: 'Wallets',
      },
      {
        path: '',
        redirectTo: '/tabs/dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: '/tabs/dashboard',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class TabsPageRoutingModule {}
