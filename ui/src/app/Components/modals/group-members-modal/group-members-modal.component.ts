import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GroupsService } from '../../../Services/groups.service';
import {
  Group,
  GroupMember,
  JoinGroupResponse,
} from '../../../Interfaces/Groups/groups-interfaces';
import { ApiResponse } from '../../../Interfaces/Api-Response/api-response';
import { ToastService } from '../../../Services/toast.service';
import { AuthService } from '../../../Services/auth/auth.service';

@Component({
  selector: 'app-group-members-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './group-members-modal.component.html',
  styleUrls: ['./group-members-modal.component.scss'],
})
export class GroupMembersModalComponent implements OnInit {
  members: GroupMember[] = [];
  isLoading = true;
  joining = false;
  isOwner = false;
  currentUserEmail = '';

  public dialogRef = inject(MatDialogRef<GroupMembersModalComponent>);
  public data: { group: Group } = inject(MAT_DIALOG_DATA);
  private groupsService = inject(GroupsService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);

  ngOnInit() {
    this.checkOwnership();
    this.loadMembers();
  }

  checkOwnership(): void {
    this.authService.getCurrentUser().subscribe((user) => {
      this.currentUserEmail = user?.email ?? '';
    });

    this.authService.getUserId().subscribe((currentUserId: string) => {
      if (this.data.group.createdByUserId === currentUserId) {
        this.isOwner = true;
      }
    });
  }

  loadMembers() {
    this.isLoading = true;
    this.groupsService.getGroupMembers(this.data.group.id).subscribe({
      next: (response: ApiResponse<GroupMember[]>) => {
        this.isLoading = false;
        const isSuccess = response.success;
        if (isSuccess && response.data) {
          this.members = response.data;
        }
      },
      error: () => {
        this.isLoading = false;
        this.toastService.show('Failed to load group members.', 'error');
      },
    });
  }

  joinGroup() {
    this.joining = true;
    this.groupsService.joinGroup(this.data.group.id).subscribe({
      next: (response: ApiResponse<JoinGroupResponse>) => {
        this.joining = false;
        const isSuccess = response.success;

        // Handle both casing variants for isPublic from JoinGroupResponse
        const isPublic = response.data?.isPublic ?? response.data?.IsPublic;

        if (isSuccess) {
          if (isPublic === false) {
            this.toastService.show(
              'Join request sent! Awaiting admin approval.',
              'success',
            );
          } else {
            this.toastService.show('Joined successfully!', 'success');
          }
          this.dialogRef.close({ joined: true });
        } else {
          this.toastService.show(
            response.message || 'Failed to join group.',
            'error',
          );
        }
      },
      error: () => {
        this.joining = false;
        this.toastService.show('Failed to join group.', 'error');
      },
    });
  }

  transferOwnership(member: GroupMember) {
    const memberEmail = member.email;
    if (!memberEmail) {
      this.toastService.show('Cannot transfer to user without email.', 'error');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to transfer ownership of this group to ${member.displayName || memberEmail}? You will lose admin privileges.`,
      )
    ) {
      return;
    }

    this.groupsService
      .transferOwnership(this.data.group.id, memberEmail)
      .subscribe({
        next: (response: ApiResponse<void>) => {
          if (response.success) {
            this.toastService.show(
              'Ownership transferred successfully.',
              'success',
            );
            this.dialogRef.close({ ownershipTransferred: true });
          } else {
            this.toastService.show(
              response.message || 'Failed to transfer ownership.',
              'error',
            );
          }
        },
        error: () => {
          this.toastService.show('Failed to transfer ownership.', 'error');
        },
      });
  }

  getInitials(name: string) {
    if (!name) return '?';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  close() {
    this.dialogRef.close();
  }
}
