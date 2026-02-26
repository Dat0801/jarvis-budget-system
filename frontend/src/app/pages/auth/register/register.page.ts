import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage {
  name = '';
  email = '';
  password = '';
  passwordConfirmation = '';
  showPassword = false;
  showPasswordConfirmation = false;
  isLoading = false;
  registerError: string | null = null;

  constructor(private authService: AuthService, private router: Router) {
    this.initializeGoogleAuth();
  }

  async initializeGoogleAuth() {
    try {
      await GoogleAuth.initialize({
        clientId: '1044373444358-l8e8la7n6ch4p9r4keckgm51tgtpc1fe.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
    } catch (e) {
      console.warn('Google Auth already initialized or failed:', e);
    }
  }

  async loginWithGoogle() {
    this.isLoading = true;
    this.registerError = null;

    try {
      console.log('Starting Google Sign In...');
      await this.initializeGoogleAuth();
      
      const user = await GoogleAuth.signIn();
      console.log('Google Auth Success:', user);
      
      const token = user.authentication.idToken || user.authentication.accessToken;
      
      if (token) {
        this.authService.googleLogin(token).subscribe({
          next: (res) => {
            console.log('Backend Google Login Success:', res);
            this.isLoading = false;
            this.router.navigate(['/tabs/dashboard']);
          },
          error: (error) => {
            this.isLoading = false;
            console.error('Backend Google Login Error:', error);
            this.registerError = error?.error?.message ?? 'Backend authentication failed';
          },
        });
      } else {
        this.isLoading = false;
        this.registerError = 'Google authentication succeeded but no token was returned';
      }
    } catch (error: any) {
      this.isLoading = false;
      console.error('Google Auth Plugin Error Detail:', error);
      
      if (error.error === 'popup_closed_by_user' || error.message === 'popup_closed_by_user') {
        this.registerError = 'Login window closed. If you didn\'t close it, please check if your Google Client ID allows http://localhost:8100 as an Authorized Origin.';
      } else if (error.error === 'access_denied') {
        this.registerError = 'Permission denied. Please allow access to continue.';
      } else {
        this.registerError = error.message || 'Google Sign-In failed. Please check your internet connection or try again.';
      }
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  togglePasswordConfirmationVisibility(): void {
    this.showPasswordConfirmation = !this.showPasswordConfirmation;
  }

  submit(): void {
    this.isLoading = true;
    this.registerError = null;
    this.authService
      .register({
        name: this.name,
        email: this.email,
        password: this.password,
        password_confirmation: this.passwordConfirmation,
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/tabs/dashboard']);
        },
        error: (error) => {
          this.isLoading = false;
          const backendMessage = error?.error?.message ?? error?.message;
          this.registerError = backendMessage ?? 'Failed to create account. Please try again.';
        },
      });
  }
}
