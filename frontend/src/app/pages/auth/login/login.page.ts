import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  email = '';
  password = '';
  showPassword = false;
  isLoading = false;
  loginError: string | null = null;

  constructor(private authService: AuthService, private router: Router) {
    // Basic initialization
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

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async loginWithGoogle() {
    this.isLoading = true;
    this.loginError = null;

    try {
      console.log('Starting Google Sign In...');
      // Ensure it's initialized before signing in
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
            this.loginError = error?.error?.message ?? 'Backend authentication failed';
          },
        });
      } else {
        this.isLoading = false;
        this.loginError = 'Google authentication succeeded but no token was returned';
      }
    } catch (error: any) {
      this.isLoading = false;
      console.error('Google Auth Plugin Error Detail:', error);
      
      // Handle the case where the user closes the popup or there's a config error
      if (error.error === 'popup_closed_by_user' || error.message === 'popup_closed_by_user') {
        this.loginError = 'Login window closed. If you didn\'t close it, please check if your Google Client ID allows http://localhost:8100 as an Authorized Origin.';
      } else if (error.error === 'access_denied') {
        this.loginError = 'Permission denied. Please allow access to continue.';
      } else {
        this.loginError = error.message || 'Google Sign-In failed. Please check your internet connection or try again.';
      }
    }
  }

  submit(): void {
    this.isLoading = true;
    this.loginError = null;
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/tabs/dashboard']);
      },
      error: (error) => {
        this.isLoading = false;
        const status = error?.status;
        const backendMessage = error?.error?.message ?? error?.message;

        if (status === 401) {
          this.loginError = 'Invalid email or password';
        } else if (backendMessage) {
          this.loginError = backendMessage;
        } else {
          this.loginError = 'Failed to sign in. Please try again.';
        }
      },
    });
  }
}
