import { Routes } from '@angular/router';
import { LandingPageComponent } from './Pages/landing-page/landing-page.component';
import { RegisterComponent } from './Pages/register/register.component';

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
];
