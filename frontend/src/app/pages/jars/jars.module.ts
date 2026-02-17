import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { JarsPageRoutingModule } from './jars-routing.module';
import { JarsPage } from './jars.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, JarsPageRoutingModule, JarsPage],
})
export class JarsPageModule {}
