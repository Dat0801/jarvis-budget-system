import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
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
  isLoading = false;
  loginError: string | null = null;

  constructor(private authService: AuthService, private router: Router) {}

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
