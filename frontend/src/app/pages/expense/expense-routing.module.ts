import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ExpensePage } from './expense.page';

const routes: Routes = [
  {
    path: '',
    component: ExpensePage,
    title: 'Add Expense',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ExpensePageRoutingModule {}
