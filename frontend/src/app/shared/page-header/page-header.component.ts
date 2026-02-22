import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

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

  get headerClasses(): string[] {
    const classes = ['app-header'];
    if (this.headerClass) {
      classes.push(this.headerClass);
    }
    return classes;
  }
}

