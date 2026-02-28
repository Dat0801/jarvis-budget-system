import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, closeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss'],
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() translucent = true;
  @Input() showBack = false;
  @Input() backHref: string | null = null;
  @Input() headerClass = '';
  @Input() useCloseIcon = false;

  constructor() {
    addIcons({ arrowBackOutline, closeOutline });
  }

  get headerClasses(): string[] {
    const classes = ['app-header'];
    if (this.headerClass) {
      classes.push(this.headerClass);
    }
    return classes;
  }

  get backIcon(): string {
    return this.useCloseIcon ? 'close-outline' : 'arrow-back-outline';
  }
}

