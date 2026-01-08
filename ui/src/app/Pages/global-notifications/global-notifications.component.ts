import { Component, OnDestroy, OnInit } from '@angular/core';
import { GroupsService } from '../../Services/groups.service';
import { GroupMembershipRequest } from '../../Interfaces/Groups/groups-interfaces';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../Services/toast.service';
import { ButtonsComponent } from '../../Components/buttons/buttons.component';
import { NotificationsService } from '../../Services/notifications';

@Component({
  selector: 'app-global-notifications',
  standalone: true,
  imports: [CommonModule, ButtonsComponent],
  templateUrl: './global-notifications.component.html',
  styleUrls: ['./global-notifications.component.scss'],
})
export class GlobalNotificationsComponent implements OnInit, OnDestroy {

  groupedRequests: {
    groupId: number;
    groupName: string;
    requests: GroupMembershipRequest[];
    open?: boolean;
  }[] = [];
  loadingRequests = false;
  errorRequests = '';

  constructor(
    private groupsService: GroupsService,
    private toastService: ToastService,
    private notificationsService: NotificationsService
  ) {}

  ngOnInit(): void {
    this.viewRequests();

   
  }

  ngOnDestroy(): void {}

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
        console.error('Error fetching requests:', err);
        this.errorRequests = 'Failed to load requests';
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
        console.error('Error accepting request:', err);
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
        console.error('Error rejecting request:', err);
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
          console.error('Error accepting request:', err);
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
          console.error('Error rejecting request:', err);
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

  // Remove the specific request
  group.requests = group.requests.filter(r => r.userEmail !== req.userEmail);

  // Remove group if no requests left
  if (group.requests.length === 0) {
    this.groupedRequests.splice(groupIndex, 1);
  }

  // Update pending requests badge
  this.notificationsService.set(this.totalRequests);
}

}
