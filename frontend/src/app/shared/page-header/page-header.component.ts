import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { IonicModule, NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, closeOutline } from 'ionicons/icons';
import { Router } from '@angular/router';

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
  
  @Output() backClick = new EventEmitter<void>();

  constructor(
    private router: Router, 
    private navCtrl: NavController,
    private el: ElementRef
  ) {
    addIcons({ arrowBackOutline, closeOutline });
  }

  @HostListener('window:keydown.esc', ['$event'])
  handleEscKey(event: KeyboardEvent) {
    // Check if there are any open modals or other high-priority overlays.
    // In Ionic, modals are siblings to ion-router-outlet. 
    // We should not trigger the back navigation if a modal is currently open.
    const openModal = document.querySelector('ion-modal.modal-show, ion-modal.show-modal');
    if (openModal) {
      return;
    }

    // Only handle Esc if this header is visible and not hidden by other layers
    if (this.isComponentVisible() && (this.showBack || this.backHref || this.useCloseIcon)) {
      this.onBack();
    }
  }

  private isComponentVisible(): boolean {
    const element = this.el.nativeElement as HTMLElement;
    if (!element) return false;
    
    // Check if the element is currently visible in the DOM
    const rect = element.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0;
    if (!isVisible) return false;

    // Optional: check if it's the top-most layer if needed, 
    // but usually in Ionic only one page is active in the view.
    return true;
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

  onBack(): void {
    if (this.backClick.observed) {
      this.backClick.emit();
    } else if (this.backHref) {
      this.router.navigateByUrl(this.backHref);
    } else if (this.showBack) {
      this.navCtrl.back();
    }
  }
}

