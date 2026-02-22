import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SettingsPage } from './settings.page';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { RouterModule } from '@angular/router';

import { SettingsPageRoutingModule } from './settings-routing.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SettingsPageRoutingModule,
    PageHeaderComponent
  ],
  declarations: [SettingsPage]
})
export class SettingsPageModule {}
