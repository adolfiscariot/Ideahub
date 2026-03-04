import { Component, OnDestroy, OnInit } from '@angular/core';
import { GroupsService } from '../../Services/groups.service';
import { GroupMembershipRequest } from '../../Interfaces/Groups/groups-interfaces';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../Services/toast.service';
import { ButtonsComponent } from '../../Components/buttons/buttons.component';
import { NotificationsService } from '../../Services/notifications';
import { NotificationService, CommentNotification } from '../../Services/notification.service';
import { SignalrService } from '../../Services/signalr.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-global-notifications',
  standalone: true,
  imports: [CommonModule, ButtonsComponent],
  templateUrl: './global-notifications.component.html',
  styleUrls: ['./global-notifications.component.scss'],
})
export class GlobalNotificationsComponent implements OnInit, OnDestroy {

  // ── Tab state ──────────────────────────────────────────────
  activeTab: 'requests' | 'comments' = 'requests';

  // ── Group Requests (unchanged) ─────────────────────────────
  groupedRequests: {
    groupId: number;
    groupName: string;
    requests: GroupMembershipRequest[];
    open?: boolean;
  }[] = [];
  loadingRequests = false;
  errorRequests = '';

  // ── Comment Notifications ──────────────────────────────────
  commentNotifications: CommentNotification[] = [];
  loadingNotifications = false;
  errorNotifications = '';

  private signalRSub?: Subscription;

  constructor(
    private groupsService: GroupsService,
    private toastService: ToastService,
    private notificationsService: NotificationsService,
    private notificationService: NotificationService,
    private signalRService: SignalrService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.viewRequests();
    this.loadCommentNotifications();

    // Re-fetch notifications list when a new one arrives via SignalR
    this.signalRSub = this.signalRService.notificationSubject.subscribe((msg) => {
      if (msg) this.loadCommentNotifications();
    });
  }

  ngOnDestroy(): void {
    this.signalRSub?.unsubscribe();
  }

  // ── Tab switching ──────────────────────────────────────────
  setTab(tab: 'requests' | 'comments'): void {
    this.activeTab = tab;
  }

  // ── Group Requests (all logic unchanged) ───────────────────
  viewRequests() {
    this.loadingRequests = true;
    this.errorRequests = '';

    this.groupsService.viewGlobalRequests().subscribe({
      next: (res) => {
        const allRequests = res.data ?? [];
        const groupMap = new Map<number, { groupId: number; groupName: string; requests: GroupMembershipRequest[]; open?: boolean }>();

        allRequests.forEach((r: any) => {
          if (!groupMap.has(r.groupId)) {
            groupMap.set(r.groupId, { groupId: r.groupId, groupName: r.groupName, requests: [], open: false });
          }
          groupMap.get(r.groupId)!.requests.push(r);
        });

        this.groupedRequests = Array.from(groupMap.values());
        this.loadingRequests = false;
      },
      error: (err) => {
        //this.errorRequests = 'Failed to load requests';
        this.loadingRequests = false;
      }
    });
  }

  toggleGroup(group: { open?: boolean }) {
    group.open = !group.open;
  }

  acceptRequest(req: GroupMembershipRequest) {
    this.groupsService.acceptRequest(req.groupId.toString(), req.userEmail!).subscribe({
      next: () => {
        this.toastService.show('Request accepted', 'success');
        this.removeRequestFromGroup(req);
        this.notificationsService.decrement(1);
      },
      error: (err) => {
        this.toastService.show('Failed to accept request', 'error');
      }
    });
  }

  rejectRequest(req: GroupMembershipRequest) {
    this.groupsService.rejectRequest(req.groupId.toString(), req.userEmail!).subscribe({
      next: () => {
        this.toastService.show('Request rejected', 'success');
        this.removeRequestFromGroup(req);
        this.notificationsService.decrement(1);
      },
      error: (err) => {
        this.toastService.show('Failed to reject request', 'error');
      }
    });
  }

  acceptAll(group: { requests: GroupMembershipRequest[] }) {
    const requests = [...group.requests];
    let completed = 0;
    let failed = false;

    requests.forEach(req => {
      this.groupsService.acceptRequest(req.groupId.toString(), req.userEmail!).subscribe({
        next: () => {
          this.removeRequestFromGroup(req);
          completed++;
          if (completed === requests.length && !failed) {
            this.toastService.show('All requests accepted', 'success');
            this.notificationsService.decrement(requests.length);
          }
        },
        error: (err) => {
          failed = true;
          this.toastService.show('Some requests failed to accept', 'error');
        }
      });
    });
  }

  rejectAll(group: { requests: GroupMembershipRequest[] }) {
    const requests = [...group.requests];
    let completed = 0;
    let failed = false;

    requests.forEach(req => {
      this.groupsService.rejectRequest(req.groupId.toString(), req.userEmail!).subscribe({
        next: () => {
          this.removeRequestFromGroup(req);
          completed++;
          if (completed === requests.length && !failed) {
            this.toastService.show('All requests rejected', 'success');
          }
        },
        error: (err) => {
          failed = true;
          this.toastService.show('Some requests failed to reject', 'error');
        }
      });
    });
  }

  get totalRequests(): number {
    return this.groupedRequests.reduce((total, group) => total + group.requests.length, 0);
  }

  private removeRequestFromGroup(req: GroupMembershipRequest) {
    const groupIndex = this.groupedRequests.findIndex(g => g.groupId === req.groupId);
    if (groupIndex === -1) return;

    const group = this.groupedRequests[groupIndex];
    group.requests = group.requests.filter(r => r.userEmail !== req.userEmail);

    if (group.requests.length === 0) {
      this.groupedRequests.splice(groupIndex, 1);
    }

    this.notificationsService.set(this.totalRequests);
  }

  // ── Comment Notifications ──────────────────────────────────
  loadCommentNotifications(): void {
    this.loadingNotifications = true;
    this.errorNotifications = '';

    this.notificationService.getNotifications().subscribe({
      next: (res) => {
        this.commentNotifications = res.data ?? [];
        this.loadingNotifications = false;
      },
      error: () => {
        //this.errorNotifications = 'Failed to load notifications';
        this.loadingNotifications = false;
      }
    });
  }

  markAsRead(notification: CommentNotification): void {
    if (notification.isRead) return;

    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        notification.isRead = true;
      },
      error: () => {
        this.toastService.show('Failed to mark as read', 'error');
      }
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.commentNotifications.forEach(n => n.isRead = true);
        this.toastService.show('All notifications marked as read', 'success');
        // Dismiss read notifications after 3 seconds
        setTimeout(() => {
          this.commentNotifications = this.commentNotifications.filter(n => !n.isRead);
        }, 30000);
      },
      error: () => {
        this.toastService.show('Failed to mark all as read', 'error');
      }
    });
  }

  onNotificationClick(notification: CommentNotification): void {
    this.router.navigate(['/groups', notification.comment.groupId, 'ideas'], {
      queryParams: { ideaId: notification.comment.ideaId, commentId: notification.comment.id }
    });

    if (!notification.isRead) {
      this.markAsRead(notification);
    }
  }

  get unreadCount(): number {
    return this.commentNotifications.filter(n => !n.isRead).length;
  }
}
