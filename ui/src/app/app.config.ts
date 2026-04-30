import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core'; 
import { provideRouter } from '@angular/router'; 
import { provideHttpClient, withInterceptors } from '@angular/common/http'; 
import { routes } from './app.routes'; import { authInterceptor } from './Interceptors/auth/auth.interceptor'; 
import { provideAnimations } from '@angular/platform-browser/animations'; 
import { heroBell } from '@ng-icons/heroicons/outline'; 
import { provideIcons } from '@ng-icons/core'; 
import { AppConfigService } from './core/services/app-config.service'; 

function initConfig(cfg: AppConfigService) { return () => cfg.load(); } 
export const appConfig: ApplicationConfig = { 
  providers: [ 
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(
      withInterceptors([authInterceptor])),{
        provide: APP_INITIALIZER,
        useFactory: initConfig,
        deps: [AppConfigService],
        multi: true
      },
    provideRouter(routes),
    provideIcons({ heroBell }),
  ],
};
