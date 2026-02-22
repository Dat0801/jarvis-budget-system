import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TransactionsPage } from './transactions.page';
import { TransactionDetailPage } from './transaction-detail.page';

const routes: Routes = [
  {
    path: '',
    component: TransactionsPage,
  },
  {
    path: ':type/:id',
    component: TransactionDetailPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TransactionsPageRoutingModule {}
