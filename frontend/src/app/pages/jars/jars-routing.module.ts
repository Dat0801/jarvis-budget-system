import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { JarsPage } from './jars.page';
import { JarDetailPage } from './jar-detail/jar-detail.page';

const routes: Routes = [
  {
    path: '',
    component: JarsPage,
  },
  {
    path: ':id',
    component: JarDetailPage,
  },
  {
    path: ':id/activity',
    loadComponent: () => import('./jar-activity/jar-activity.page').then(m => m.JarActivityPage),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class JarsPageRoutingModule {}
