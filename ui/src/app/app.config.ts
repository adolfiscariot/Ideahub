import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './Interceptors/auth/auth.interceptor';

import { provideAnimations } from '@angular/platform-browser/animations';

import { NgIconsModule } from '@ng-icons/core';
import { heroBell } from '@ng-icons/heroicons/outline';

import { provideIcons } from '@ng-icons/core';

export const appConfig: ApplicationConfig = {
  providers:
    [
      provideZoneChangeDetection({ eventCoalescing: true }),
      provideRouter(routes),
      provideAnimations(),
      provideHttpClient(
        withInterceptors([authInterceptor])
      ),
      provideRouter(routes),
      provideIcons({ heroBell})
    ]
};
