import {
  ApplicationConfig,
  provideZoneChangeDetection,
  APP_INITIALIZER,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptorsFromDi,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import { heroBell } from '@ng-icons/heroicons/outline';
import { provideIcons } from '@ng-icons/core';
import { provideAuth0, AuthHttpInterceptor } from '@auth0/auth0-angular';
//import { environment } from '../environments/environment';
import { AppConfigService } from './core/services/app-config.service';

function initConfig(cfg: AppConfigService) {
  return () => cfg.load();
}
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: AuthHttpInterceptor, multi: true },
    {
      provide: APP_INITIALIZER,
      useFactory: initConfig,
      deps: [AppConfigService],
      multi: true,
    },
    provideIcons({ heroBell }),
    provideAuth0({
      domain: 'dev-2685h5q7efjt6peh.us.auth0.com',
      clientId: '04mFGQUmAGjOE1t18D8r0drPuPHUXEWO',
      useRefreshTokens: true,
      cacheLocation: 'localstorage',
      authorizationParams: {
        redirect_uri: window.location.origin,
        audience: 'https://api.ideahub',
        scope: 'openid profile email offline_access',
      },
      httpInterceptor: {
        allowedList: [
          {
            uri: `http://localhost:5065/api/*`, // change to http://localhost:5065/api/* for localhost, change to ${environment.apiUrl}/* for prod
            tokenOptions: {
              authorizationParams: {
                audience: 'https://api.ideahub',
                scope: 'openid profile email offline_access',
              },
            },
          },
        ],
      },
    }),
  ],
};
