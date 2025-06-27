import { Component, inject } from '@angular/core';
import { ButtonsComponent } from '../buttons/buttons.component';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../Services/auth/auth.service';
import { NgIf, AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-navbar',
  imports: [ButtonsComponent, RouterModule, NgIf, AsyncPipe],
  standalone: true,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  date = new Date().getFullYear();

  authService = inject(AuthService);

  loggedInStatus: Observable<boolean> = this.authService.isLoggedIn$;

  onLogout(){
    this.authService.logout();
  }
}
