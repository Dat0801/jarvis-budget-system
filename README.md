# Jarvis Budget System

A comprehensive personal finance management application that combines the **6-Jar Budgeting methodology** with a flexible **Multi-Wallet architecture**. Built with a mobile-first approach using a Laravel 11 backend and a cross-platform Ionic/Angular frontend.

## 🌟 Features

### 💰 Financial Architecture (Jars & Wallets)
- **Flexible Jar System**: Manage your budget through custom buckets (based on the 6-Jar system: NEC, EDU, PLAY, FFA, LTSS, GIVE).
- **Multi-Wallet Support**: Track balances across multiple physical and digital accounts (Cash, Bank, E-wallets).
- **Jar-Wallet Linking**: Each budget jar is associated with a specific wallet, ensuring your funds are tracked precisely where they reside.
- **Dynamic Allocations**: Easily adjust your budget goals and repeat them across months.

### 📝 Transaction Management
- **Hierarchical Categories**: Organize spending with deeply nested category trees (e.g., Food > Dining Out > Pizza).
- **Income & Expense Tracking**: Log daily transactions with associations to both Jars and Wallets.
- **Transaction History**: Detailed logs with category-based filtering and search.

### 📊 Analytics & Reporting
- **Spending Insights**: Visual analytics showing distribution by Jar, Category, and Time.
- **Monthly Reports**: Automatically generated summaries of your financial health at the end of each month.
- **Income vs. Expenses**: Comparison charts to monitor savings and spending habits over time.

### 📝 Productivity & Automation
- **Financial Notes**: Create notes for financial goals, shopping lists, or due payments.
- **Due Date Reminders**: Automated notifications for notes with upcoming deadlines.
- **Task Management**: Mark notes as completed when your financial milestones are reached.
- **Automated Monthly Reset**: System-wide processing to prepare for a new financial month.

### 🔒 Security & UX
- **Secure Authentication**: JWT-based API authentication for the mobile app.
- **Social Login**: Integrated Google OAuth for seamless registration and access.
- **Cross-Platform**: Optimized for Web, PWA, and Native Android (via Capacitor).
- **Admin Portal**: A full-featured dashboard for system administrators to manage users and global settings.

---

## 🏗️ Project Structure

The project is split into two main components:

- **`backend/`**: [Laravel 11](file:///Users/admin/Documents/personal-project/jarvis-budget-system/backend) API, Admin Portal, and Automated Tasks.
- **`frontend/`**: [Ionic + Angular](file:///Users/admin/Documents/personal-project/jarvis-budget-system/frontend) Mobile/Web Application.

---

## 🛠️ Technology Stack

### Backend
- **Framework**: Laravel 11 (PHP 8.2+)
- **Auth**: JWT Auth (Tymon) & Laravel Breeze (Inertia + Vue)
- **Database**: PostgreSQL (Supabase recommended)
- **Permissions**: Spatie Laravel Permission
- **Background Tasks**: Laravel Scheduler & Notifications

### Frontend
- **Framework**: Ionic 7 + Angular 17
- **Platform**: Capacitor (Android/iOS)
- **State Management**: Angular Services & Observables
- **Styling**: Tailwind CSS & Ionic UI Components

---

## 🚀 Getting Started

### Prerequisites
- PHP 8.2+
- Composer
- Node.js 18+ & npm
- Ionic CLI (`npm install -g @ionic/cli`)
- Android Studio (for native Android builds)

### 1. Backend Setup
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan jwt:secret
# Configure your database in .env
php artisan migrate --seed
npm install && npm run build
php artisan serve
```

### 2. Frontend Setup
```bash
cd frontend
npm install
# Configure API URL in src/environments/environment.ts
ionic serve
```

---

## 📱 Mobile Deployment
To build the Android application:
```bash
cd frontend
ionic build
npx cap add android
npx cap copy
npx cap open android
```

---

## 📄 License
This project is open-sourced software licensed under the [MIT license](LICENSE).
