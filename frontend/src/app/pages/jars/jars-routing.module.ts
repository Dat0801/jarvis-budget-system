import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { JarsPage } from './jars.page';

const routes: Routes = [
  {
    path: '',
    component: JarsPage,
    title: 'Budget Jars',
  },
  {
    path: ':id',
    loadComponent: () => import('./jar-detail/jar-detail.page').then(m => m.JarDetailPage),
    title: 'Budget Detail',
  },
  {
    path: ':id/activity',
    loadComponent: () => import('./jar-activity/jar-activity.page').then(m => m.JarActivityPage),
    title: 'Budget Activity',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class JarsPageRoutingModule {}
