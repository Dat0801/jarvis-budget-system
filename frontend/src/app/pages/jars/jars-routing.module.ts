import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { JarsPage } from './jars.page';

const routes: Routes = [
  {
    path: '',
    component: JarsPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class JarsPageRoutingModule {}
