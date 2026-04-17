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
import { combineLatest, map } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [ButtonsComponent, RouterModule, AsyncPipe, CommonModule, NgIconsModule, MatButtonModule, MatIconModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  date = new Date().getFullYear();
  authService = inject(AuthService);
  membershipNotificationsService = inject(MembershipNotificationsService);   // group requests count
  notificationService = inject(NotificationService);     // comment notifications count

  loggedInStatus = this.authService.isLoggedIn$;

  // Combined badge: group requests + unread comment notifications
  totalBadge$ = combineLatest([
    this.membershipNotificationsService.pendingRequests$,
    this.notificationService.unreadCount$
  ]).pipe(
    map(([requests, comments]) => requests + comments)
  );
  ngOnInit() {
    // Fetch unread comment count on startup
    if (this.authService.isLoggedIn()) {
      this.notificationService.fetchUnreadCount();
    }
  }

  // Re-sync count whenever the tab regains focus (catches missed SignalR events)
  @HostListener('window:focus')
  onWindowFocus() {
    if (this.authService.isLoggedIn()) {
      this.notificationService.fetchUnreadCount();
    }
  }

  onLogout() {
    this.authService.logout().subscribe({
      // next: (response) => console.log(`Logout successful. ${response.message}`),
      // error: (error) => console.error(`Logout failed: ${error.message}`)
    });
  }

  isMobileMenuOpen = false;

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }
}
