import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionsPage } from './transactions.page';
import { TransactionsPageRoutingModule } from './transactions-routing.module';
import { TransactionDetailPage } from './transaction-detail.page';

@NgModule({
  imports: [IonicModule, CommonModule, FormsModule, TransactionsPageRoutingModule, TransactionDetailPage],
  declarations: [TransactionsPage],
})
export class TransactionsPageModule {}
