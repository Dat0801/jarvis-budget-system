import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit {
  userName: string = 'Minh';
  userEmail: string = 'minh@jarvis.finance';
  darkMode: boolean = false;
  selectedLanguage: string = 'English';
  selectedCurrency: string = 'USD ($)';

  constructor(
    private router: Router,
    private authService: AuthService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.loadPreferences();
  }

  loadUserData() {
    // Load user information from service/API
    // This is placeholder data - replace with actual API calls
    this.userName = 'Minh';
    this.userEmail = 'minh@jarvis.finance';
  }

  loadPreferences() {
    // Load preferences from local storage or settings service
    const savedDarkMode = localStorage.getItem('darkMode');
    const savedLanguage = localStorage.getItem('language');
    const savedCurrency = localStorage.getItem('currency');

    this.darkMode = savedDarkMode ? JSON.parse(savedDarkMode) : false;
    this.selectedLanguage = savedLanguage || 'English';
    this.selectedCurrency = savedCurrency || 'USD ($)';
  }

  toggleDarkMode() {
    localStorage.setItem('darkMode', JSON.stringify(this.darkMode));
    // Apply dark mode to app
    if (this.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  async changeLanguage() {
    const alert = await this.alertController.create({
      header: 'Select Language',
      inputs: [
        {
          name: 'language',
          type: 'radio',
          label: 'English',
          value: 'English',
          checked: this.selectedLanguage === 'English'
        },
        {
          name: 'language',
          type: 'radio',
          label: 'Tiếng Việt',
          value: 'Tiếng Việt',
          checked: this.selectedLanguage === 'Tiếng Việt'
        },
        {
          name: 'language',
          type: 'radio',
          label: '中文',
          value: '中文',
          checked: this.selectedLanguage === '中文'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'OK',
          handler: (data) => {
            this.selectedLanguage = data;
            localStorage.setItem('language', data);
            this.showToast('Language changed successfully');
          }
        }
      ]
    });
    await alert.present();
  }

  async changeCurrency() {
    const alert = await this.alertController.create({
      header: 'Select Currency',
      inputs: [
        {
          name: 'currency',
          type: 'radio',
          label: 'USD ($)',
          value: 'USD ($)',
          checked: this.selectedCurrency === 'USD ($)'
        },
        {
          name: 'currency',
          type: 'radio',
          label: 'EUR (€)',
          value: 'EUR (€)',
          checked: this.selectedCurrency === 'EUR (€)'
        },
        {
          name: 'currency',
          type: 'radio',
          label: 'VND (₫)',
          value: 'VND (₫)',
          checked: this.selectedCurrency === 'VND (₫)'
        },
        {
          name: 'currency',
          type: 'radio',
          label: 'GBP (£)',
          value: 'GBP (£)',
          checked: this.selectedCurrency === 'GBP (£)'
        },
        {
          name: 'currency',
          type: 'radio',
          label: 'JPY (¥)',
          value: 'JPY (¥)',
          checked: this.selectedCurrency === 'JPY (¥)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'OK',
          handler: (data) => {
            this.selectedCurrency = data;
            localStorage.setItem('currency', data);
            this.showToast('Currency changed successfully');
          }
        }
      ]
    });
    await alert.present();
  }

  async resetJarsData() {
    const alert = await this.alertController.create({
      header: 'Reset Jars Data',
      message: 'Are you sure you want to reset all your jars data? This action cannot be undone.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Reset',
          role: 'destructive',
          handler: () => {
            // Call API to reset jars data
            this.showToast('Jars data reset successfully');
          }
        }
      ]
    });
    await alert.present();
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Log Out',
      message: 'Are you sure you want to log out?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Log Out',
          role: 'destructive',
          handler: () => {
            this.authService.logout().subscribe({
              next: () => {
                this.router.navigate(['/auth/login']);
              },
              error: (err) => {
                console.error('Logout error:', err);
                this.router.navigate(['/auth/login']);
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}
