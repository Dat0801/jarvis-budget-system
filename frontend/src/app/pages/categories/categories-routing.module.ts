import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CategoriesPage } from './categories.page';

const routes: Routes = [
  {
    path: '',
    component: CategoriesPage,
    title: 'Categories',
  },
  {
    path: 'new',
    loadComponent: () => import('./category-detail/category-detail.page').then(m => m.CategoryDetailPage),
    title: 'Add Category',
  },
  {
    path: ':id',
    loadComponent: () => import('./category-detail/category-detail.page').then(m => m.CategoryDetailPage),
    title: 'Category Detail',
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CategoriesPageRoutingModule {}
