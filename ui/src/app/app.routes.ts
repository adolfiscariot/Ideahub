import { Routes } from '@angular/router';
import { AuthGuard } from './Guards/auth.guard';
import { LandingGuard } from './Guards/landing.guard';
import { CommitteeGuard } from './Guards/committee.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [LandingGuard],
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
    path: 'forgot-password',
    loadComponent: () =>
      import('./Pages/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'home',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./Pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'groups',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./Pages/group/group.component').then((m) => m.GroupsComponent),
  },
  {
    path: 'projects',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./Pages/projects/projects.component').then((m) => m.ProjectsComponent),
  },

  {
    path: 'groups/:groupId/ideas',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./Pages/ideas/ideas.component').then((m) => m.IdeasComponent),
  },
  {
    path: 'groups/:groupId/ideas/:ideaId/score',
    canActivate: [AuthGuard, CommitteeGuard],
    loadComponent: () =>
      import('./Pages/idea-scoring/idea-scoring.component').then(
        (m) => m.IdeaScoringComponent
      ),
  },
  {
    path: 'notifications',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./Pages/global-notifications/global-notifications.component').then(
        (m) => m.GlobalNotificationsComponent
      ),
  },
  {
    path: 'committeemembers',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./Pages/committeemembers/committeemembers.component').then(
        (m) => m.CommitteeMembersComponent
      ),
  },
  {
    path: 'projects/:projectId/tasks',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./Pages/task-management/task-management.component').then((m) => m.TaskManagementComponent),
  },
  {
    path: 'projects/:projectId/timesheets',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./Pages/timesheets/timesheets.component').then((m) => m.TimesheetsComponent),
  }

];