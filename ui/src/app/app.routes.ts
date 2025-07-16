import { Routes } from '@angular/router';
import { LandingPageComponent } from './Pages/landing-page/landing-page.component';
import { RegisterComponent } from './Pages/register/register.component';
import { AuthGuard } from './Guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./Pages/landing-page/landing-page.component').then(
        (m) => m.LandingPageComponent
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./Pages/register/register.component').then(
        (m) => m.RegisterComponent
      ),
  },
  {
    path: 'confirm-registration',
    loadComponent: () =>
      import(
        './Pages/confirm-registration/confirm-registration.component'
      ).then((m) => m.ConfirmRegistrationComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./Pages/login-page/login-page.component').then(
        (m) => m.LoginPageComponent
      ),
  },
  {
    path: 'home',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./Pages/home/home.component').then((m) => m.HomeComponent),
  },
];
