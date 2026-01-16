import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GroupsService } from '../../../Services/groups.service';
import { ToastService } from '../../../Services/toast.service';
import { AuthService } from '../../../Services/auth/auth.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark, heroUser, heroArrowsRightLeft } from '@ng-icons/heroicons/outline';
import { ButtonsComponent } from '../../buttons/buttons.component';

@Component({
  selector: 'app-group-members-modal',
  standalone: true,
  imports: [CommonModule, NgIconComponent, ButtonsComponent],
  viewProviders: [provideIcons({ heroXMark, heroUser, heroArrowsRightLeft })],
  templateUrl: './group-members-modal.component.html',
  styleUrls: ['./group-members-modal.component.scss']
})
export class GroupMembersModalComponent implements OnInit {
  members: any[] = [];
  isLoading: boolean = true;
  isOwner: boolean = false;
  currentUserId: string = '';

  constructor(
    public dialogRef: MatDialogRef<GroupMembersModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { group: any },
    private groupsService: GroupsService,
    private toastService: ToastService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.checkOwnership();
    this.loadMembers();
  }

  checkOwnership(): void {
    const userId = this.authService.getUserId();
    if (userId) {
      this.currentUserId = userId;
      // Check if the current user created the group
      // Ensure accurate comparison by handling potential type mismatches
      const creatorId = this.data.group.createdByUserId;
      this.isOwner = String(creatorId) === String(userId);
    }
  }

  loadMembers(): void {
    this.isLoading = true;
    this.groupsService.getGroupMembers(this.data.group.id).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        const isSuccess = response.success || response.status;
        if (isSuccess && response.data) {
          this.members = response.data;
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('Error loading members:', error);
        this.toastService.show('Failed to load group members.', 'error');
      }
    });
  }

  transferOwnership(member: any): void {
    const memberEmail = member.email || member.userEmail;
    if (!memberEmail) {
      this.toastService.show('Cannot transfer to user without email.', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to transfer ownership of this group to ${member.displayName || memberEmail}? You will lose admin privileges.`)) {
      return;
    }

    this.groupsService.transferOwnership(this.data.group.id, memberEmail).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.toastService.show('Ownership transferred successfully.', 'success');
          this.dialogRef.close({ ownershipTransferred: true });
        } else {
          this.toastService.show(response.message || 'Failed to transfer ownership.', 'error');
        }
      },
      error: (error: any) => {
        console.error('Error transferring ownership:', error);
        this.toastService.show('Failed to transfer ownership.', 'error');
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  close(): void {
    this.dialogRef.close();
  }
}