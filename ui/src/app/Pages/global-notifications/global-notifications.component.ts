import { Component, OnDestroy, OnInit } from '@angular/core';
import { GroupsService } from '../../Services/groups.service';
import { GroupMembershipRequest } from '../../Interfaces/Groups/groups-interfaces';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-global-notifications',
  standalone: true,
  imports: [CommonModule],
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

  constructor(private groupsService: GroupsService) {}

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
      next: () => this.removeRequestFromGroup(req),
      error: (err) => console.error('Error accepting request:', err)
    });
  }

  rejectRequest(req: GroupMembershipRequest) {
    this.groupsService.rejectRequest(req.groupId.toString(), req.userEmail!).subscribe({
      next: () => this.removeRequestFromGroup(req),
      error: (err) => console.error('Error rejecting request:', err)
    });
  }

  acceptAll(group: { requests: GroupMembershipRequest[] }) {
    group.requests.slice().forEach(req => this.acceptRequest(req));
  }

  rejectAll(group: { requests: GroupMembershipRequest[] }) {
    group.requests.slice().forEach(req => this.rejectRequest(req));
  }

  private removeRequestFromGroup(req: GroupMembershipRequest) {
    const group = this.groupedRequests.find(g => g.groupId === req.groupId);
    if (!group) return;
    group.requests = group.requests.filter(r => r.userEmail !== req.userEmail);
    if (group.requests.length === 0) group.open = false;
  }
}
