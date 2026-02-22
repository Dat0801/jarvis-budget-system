import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionsPage } from './transactions.page';
import { TransactionsPageRoutingModule } from './transactions-routing.module';
import { TransactionDetailPage } from './transaction-detail.page';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';

@NgModule({
  imports: [IonicModule, CommonModule, FormsModule, TransactionsPageRoutingModule, TransactionDetailPage, PageHeaderComponent],
  declarations: [TransactionsPage],
})
export class TransactionsPageModule {}
