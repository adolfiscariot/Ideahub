import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { AddGroup } from '../../Interfaces/Groups/groups-interfaces';
import { GroupsService } from '../../Services/groups.service';
import { AuthService } from '../../Services/auth/auth.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { GroupDetailsModalComponent } from '../../Components/modals/group-details-modal/group-details-modal.component';
import { GroupMembersModalComponent } from '../../Components/modals/group-members-modal/group-members-modal.component';
import { DeleteGroupModalComponent } from '../../Components/modals/delete-group-modal/delete-group-modal.component';
import { Router } from '@angular/router';
import { ButtonsComponent } from "../../Components/buttons/buttons.component";
import { BaseLayoutComponent } from '../../Components/base-layout/base-layout.component';

@Component({
  selector: 'app-groups',
  templateUrl: './group.component.html', 
  styleUrls: ['./group.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonsComponent,
    BaseLayoutComponent
  ]
})
export class GroupsComponent implements OnInit {
  // viewMode: 'list' | 'grid' = 'list';

  // Group data
  groups: any[] = [];

  // Page content
  title = 'Groups';
  subtitle = 'Explore and join groups to collaborate on ideas and projects.';

  // Form state
  showCreateForm = false;
  createGroupForm: FormGroup;
  isSubmitting = false;
  isLoading: boolean = true;

  // Current user ID
  currentUserId: string | null = null;

  // Store pending requests for each group
  pendingRequests: Map<string, boolean> = new Map();

  constructor(
    private groupsService: GroupsService,
    private authService: AuthService,
    private dialog: MatDialog,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.createGroupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
    });
  }

  ngOnInit(): void {  // ====== DOES NOT GET THE USERID========
    // Get current user ID first
    this.currentUserId = this.authService.getCurrentUserId();
    console.log('Current User ID on init:', this.currentUserId);
    this.loadGroups();
  }

  // ===== GROUP LOADING METHODS =====

  loadGroups(): void {
    this.isLoading = true;
    this.groupsService.getGroups().subscribe({
      next: (response: any) => {
        this.isLoading = false;

        console.log('DEBUG - Full API response:', response);

        if (response.success && response.data) {
          this.groups = response.data.map((group: any) => {
            console.log('Group:', {
              id: group.id,
              name: group.name,
              isMember: group.isMember,
              hasPendingRequest: group.hasPendingRequest,
              createdByUserId: group.createdByUserId,
              isCreator: group.createdByUserId === this.currentUserId
            });

            return {
              ...group,
              id: group.id,
              name: group.name || group.Name,
              description: group.description || group.Description,
              isMember: group.isMember || group.IsMember || false,
              hasPendingRequest: group.hasPendingRequest || group.HasPendingRequest || false,
              memberCount: group.memberCount || group.MemberCount || 0,
              ideaCount: group.ideaCount || group.IdeaCount || 0,
              isActive: group.isActive || group.IsActive !== false,
              isDeleted: group.isDeleted || group.IsDeleted || false,
              createdAt: group.createdAt || group.CreatedAt || new Date().toISOString(),
              createdByUserId: group.createdByUserId || group.CreatedByUserId,
              createdByUser: group.createdByUser || group.CreatedByUser || {
                displayName: 'Unknown',
                email: ''
              }
            };
          });

          console.log('Final groups state:');
          this.groups.forEach((group, i) => {
            console.log(`${i + 1}. ${group.name}: creator=${group.createdByUserId}, currentUser=${this.currentUserId}, isCreator=${this.isGroupCreator(group)}`);
          });

        } else {
          console.error('Failed to load groups:', response.message);
          this.groups = [];
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('Error loading groups:', error);
        this.groups = [];
      }
    });
  }

  // ===== MODAL METHODS =====

  openDetailsModal(group: any): void {
    this.dialog.open(GroupDetailsModalComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: { group: group },
      panelClass: 'custom-modal'
    });
  }

  openMembersModal(group: any): void {
    this.dialog.open(GroupMembersModalComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: { group: group },
      panelClass: 'custom-modal'
    });
  }

  openPendingRequestsModal(group: any): void {
    alert(`Pending requests for ${group.name}:\n\nFeature coming soon!`);
  }

  // ===== GROUP JOIN & VIEW IDEAS METHODS =====

  onViewIdeas(groupId: string): void {
    const group = this.groups.find(g => g.id === groupId);

    if (!group?.isMember) {
      alert('You must be a member of this group to view ideas.');
      return;
    }

    // Check if user is group creator
    const isGroupCreator = this.isGroupCreator(group);

    // Navigate to ideas page with state
    this.router.navigate(['/groups', groupId, 'ideas'], {
      state: {
        isGroupCreator: isGroupCreator,
        groupName: group.name,
        groupCreatorId: group.createdByUserId
      }
    });
  }

  onJoinGroup(groupId: string): void {
    const group = this.groups.find(g => g.id === groupId);

    if (group?.isMember) {
      alert('You are already a member of this group!'); // THIS WON'T BE TRIGGERED REALLY SINCE THE JOIN BUTTON ONLY SHOWS WHEN YOU ARE NOT A MEMBER
      return;
    }

    if (group?.hasPendingRequest) {
      alert('You already have a pending request for this group!');
      return;
    }

    this.groupsService.joinGroup(groupId).subscribe({
      next: (response: any) => {
        const isSuccess = response.success || response.status;
        if (isSuccess) {
          alert('Join request sent! Waiting for admin approval.');
          this.loadGroups();
        } else {
          if (response.message?.includes('already a member')) {
            alert('You are already a member of this group!');
            this.loadGroups();
          } else if (response.message?.includes('pending request')) {
            alert('You already have a pending request for this group!');
            this.loadGroups();
          } else {
            alert(response.message || 'Failed to send join request.');
          }
        }
      },
      error: (error: any) => {
        console.error('Error joining group:', error);
        alert('Failed to send join request. Please try again.');
      }
    });
  }

  // ===== GROUP CREATION METHODS =====

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      this.createGroupForm.reset();
    }
  }

  onCreateGroup(): void {
    if (this.createGroupForm.invalid) {
      this.createGroupForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const newGroup: AddGroup = this.createGroupForm.value;

    this.groupsService.createGroup(newGroup).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        const isSuccess = response.success || response.status;
        if (isSuccess) {
          alert('Group created successfully!');
          this.loadGroups();
          this.createGroupForm.reset();
          this.showCreateForm = false;
        } else {
          if (response.message?.includes('authenticated') ||
            response.message?.includes('User ID') ||
            response.message?.includes('login')) {
            alert('Please login to create a group.');
          } else {
            alert(response.message || 'Failed to create group.');
          }
        }
      },
      error: (error: any) => {
        this.isSubmitting = false;
        console.error('Error creating group:', error);

        if (error.status === 401) {
          alert('Please login to create a group.');
        } else if (error.status === 400) {
          alert('Invalid group data. Please check your input.');
        } else {
          alert('Failed to create group. Please try again.');
        }
      }
    });
  }

  onCancelCreate(): void {
    this.showCreateForm = false;
    this.createGroupForm.reset();
  }
  // ===== GROUP DELETION METHODS =====

  isDeleting: boolean = false;

  onDeleteGroup(group: any): void {
    const dialogRef = this.dialog.open(DeleteGroupModalComponent, {
      width: '400px',
      data: { groupName: group.name }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'confirm') {
        this.deleteGroup(group.id);
      }
    });
  }

  deleteGroup(groupId: string): void {
    this.isDeleting = true;

    this.groupsService.deleteGroup(groupId).subscribe({
      next: (response: any) => {
        this.isDeleting = false;

        if (response.success) {
          alert('Group deleted successfully!');
          this.groups = this.groups.filter(group => group.id !== groupId);

          if (this.groups.length === 0) {
            this.title = 'No Groups';
            this.subtitle = 'All groups have been deleted.';
          }
        } else {
          alert(response.message || 'Failed to delete group');

          if (response.message?.includes('permission') ||
            response.message?.includes('admin') ||
            response.message?.includes('not allowed')) {
            alert('Only group admin can delete groups.');
          }
        }
      },
      error: (error: any) => {
        this.isDeleting = false;
        console.error('Error deleting group:', error);

        if (error.status === 401) {
          alert('Please login to delete groups.');
        } else if (error.status === 403) {
          alert('You do not have permission to delete this group.');
        } else if (error.status === 404) {
          alert('Group not found.');
        } else {
          alert('Failed to delete group. Please try again.');
        }
      }
    });
  }

  // ===== HELPER METHODS =====

  formatDate(date: any): string {
    if (!date) return 'Unknown date';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  }

  formatMemberCount(count: number): string {
    if (!count || count === 0) return '0 members';
    return count === 1 ? '1 member' : `${count} members`;
  }

  trackById(index: number, item: any): string {
    return item.id || index.toString();
  }

  // ===== PERMISSION METHODS =====

  isGroupCreator(group: any): boolean {
    if (!group || !group.createdByUserId || !this.currentUserId) return false;

    // Normalize both IDs (trim and lowercase)
    const groupCreatorId = group.createdByUserId.toString().trim().toLowerCase();
    const currentId = this.currentUserId.toString().trim().toLowerCase();

    console.log(`Comparing IDs: "${groupCreatorId}" === "${currentId}" = ${groupCreatorId === currentId}`);

    return groupCreatorId === currentId;
  }

  canConfigureGroup(group: any): boolean {
    return this.isGroupCreator(group);
  }

  // ===== PENDING REQUEST METHODS =====

  hasPendingRequest(groupId: string): boolean {
    return this.pendingRequests.get(groupId) || false;
  }

  // ===== FORM GETTER METHODS ===== // SHOULD BE REMOVED AND MOVED TO 

  get name() {
    return this.createGroupForm.get('name');
  }

  get description() {
    return this.createGroupForm.get('description');
  }
}