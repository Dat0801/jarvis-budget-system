import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { AccountService } from '../services/account.service';

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
  selectedCurrency: string = 'VND (₫)';
  isEditProfileOpen = false;
  isChangePasswordOpen = false;
  editName = '';
  editEmail = '';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private accountService: AccountService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.loadPreferences();
  }

  loadUserData() {
    this.authService.me().subscribe({
      next: (user) => {
        this.userName = user.name;
        this.userEmail = user.email;
        this.editName = user.name;
        this.editEmail = user.email;
      },
      error: () => {
        this.userName = 'User';
        this.userEmail = 'unknown@jarvis.finance';
        this.editName = this.userName;
        this.editEmail = this.userEmail;
      }
    });
  }

  loadPreferences() {
    // Load preferences from local storage or settings service
    const savedDarkMode = localStorage.getItem('darkMode');
    const savedLanguage = localStorage.getItem('language');
    const savedCurrency = localStorage.getItem('currency');

    this.darkMode = savedDarkMode ? JSON.parse(savedDarkMode) : false;
    this.selectedLanguage = savedLanguage || 'English';
    this.selectedCurrency = savedCurrency || 'VND (₫)';
    this.applyDarkMode(this.darkMode);
  }

  toggleDarkMode() {
    localStorage.setItem('darkMode', JSON.stringify(this.darkMode));
    this.applyDarkMode(this.darkMode);
  }

  private applyDarkMode(enabled: boolean) {
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  openEditProfile() {
    this.editName = this.userName;
    this.editEmail = this.userEmail;
    this.isEditProfileOpen = true;
  }

  closeEditProfile() {
    this.isEditProfileOpen = false;
  }

  submitEditProfile() {
    const name = this.editName.trim();
    const email = this.editEmail.trim();
    if (!name || !email) {
      this.showToast('Please enter name and email');
      return;
    }

    this.accountService.updateProfile({ name, email }).subscribe({
      next: (profile) => {
        this.userName = profile.name;
        this.userEmail = profile.email;
        this.closeEditProfile();
        this.showToast('Profile updated successfully');
      },
      error: () => this.showToast('Failed to update profile'),
    });
  }

  openChangePassword() {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.isChangePasswordOpen = true;
  }

  closeChangePassword() {
    this.isChangePasswordOpen = false;
  }

  submitChangePassword() {
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.showToast('Please fill in all password fields');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.showToast('Password confirmation does not match');
      return;
    }

    this.accountService.updatePassword({
      current_password: this.currentPassword,
      password: this.newPassword,
      password_confirmation: this.confirmPassword,
    }).subscribe({
      next: () => {
        this.closeChangePassword();
        this.showToast('Password updated successfully');
      },
      error: () => this.showToast('Failed to update password'),
    });
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
      header: 'Reset Budgets Data',
      message: 'Are you sure you want to reset all your budgets data? This action cannot be undone.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Reset',
          role: 'destructive',
          handler: () => {
            this.accountService.resetData().subscribe({
              next: () => this.showToast('Budgets data reset successfully'),
              error: () => this.showToast('Failed to reset budgets data'),
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async openHelpCenter() {
    const alert = await this.alertController.create({
      header: 'Help Center',
      message: 'For support, email support@jarvis.finance. Include your account email and issue details for faster assistance.',
      buttons: ['OK'],
    });
    await alert.present();
  }

  async openAbout() {
    const alert = await this.alertController.create({
      header: 'About Jarvis',
      message: 'Jarvis Budget System helps you manage budgets, track income/expense, and review monthly analytics.',
      buttons: ['OK'],
    });
    await alert.present();
  }

  openCategories() {
    this.router.navigate(['/tabs/categories']);
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
