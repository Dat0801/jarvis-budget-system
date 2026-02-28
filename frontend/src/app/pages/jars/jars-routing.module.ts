import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { JarsPage } from './jars.page';
import { JarActivityPage } from './jar-activity/jar-activity.page';

const routes: Routes = [
  {
    path: '',
    component: JarsPage,
    title: 'Budget Jars',
  },
  {
    path: ':id',
    component: JarActivityPage,
    title: 'Jar Detail',
  },
  {
    path: ':id/activity',
    redirectTo: ':id',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class JarsPageRoutingModule {}
