import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TransactionsPage } from './transactions.page';
import { TransactionDetailPage } from './transaction-detail.page';

const routes: Routes = [
  {
    path: '',
    component: TransactionsPage,
    title: 'Transactions',
  },
  {
    path: ':type/:id',
    component: TransactionDetailPage,
    title: 'Transaction Detail',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TransactionsPageRoutingModule {}
