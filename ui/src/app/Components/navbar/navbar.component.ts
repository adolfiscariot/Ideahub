import { Component, HostListener, OnInit, inject } from '@angular/core';
import { ButtonsComponent } from '../buttons/buttons.component';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../Services/auth/auth.service';
import { AsyncPipe, CommonModule } from '@angular/common';
import { NgIconsModule } from '@ng-icons/core';
import { MembershipNotificationsService } from '../../Services/membership-notifications.service';
import { NotificationService } from '../../Services/notification.service';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { combineLatest, map, take } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    ButtonsComponent,
    RouterModule,
    AsyncPipe,
    CommonModule,
    NgIconsModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly membershipNotificationsService = inject(
    MembershipNotificationsService,
  );
  private readonly notificationService = inject(NotificationService);

  public readonly loggedInStatus$ = this.authService.isLoggedIn$;

  // Combined badge: group requests + unread comment notifications
  public readonly totalBadge$ = combineLatest([
    this.membershipNotificationsService.pendingRequests$,
    this.notificationService.unreadCount$,
  ]).pipe(map(([requests, comments]) => requests + comments));

  ngOnInit(): void {
    // Fetch unread comment count on startup
    this.loggedInStatus$.pipe(take(1)).subscribe((isLoggedIn: boolean) => {
      if (isLoggedIn) {
        this.notificationService.fetchUnreadCount();
      }
    });
  }

  // Re-sync count whenever the tab regains focus (catches missed SignalR events)
  @HostListener('window:focus')
  onWindowFocus(): void {
    this.loggedInStatus$.pipe(take(1)).subscribe((isLoggedIn: boolean) => {
      if (isLoggedIn) {
        this.notificationService.fetchUnreadCount();
      }
    });
  }

  public onLogin(): void {
    this.authService.login();
  }

  public onSignUp(): void {
    this.authService.signUp();
  }

  public onLogout(): void {
    this.authService.logout();
  }

  public isMobileMenuOpen = false;

  public toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  public closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }
}
