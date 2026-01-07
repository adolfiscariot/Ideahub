import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { AddGroup } from '../../Interfaces/Groups/groups-interfaces';
import { GroupsService } from '../../Services/groups.service';
import { AuthService } from '../../Services/auth/auth.service';
import { ToastService } from '../../Services/toast.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonsComponent } from "../../Components/buttons/buttons.component";
import { BaseLayoutComponent } from '../../Components/base-layout/base-layout.component';
import { ModalComponent } from '../../Components/modal/modal.component';
import { GroupMembersModalComponent } from '../../Components/modals/group-members-modal/group-members-modal.component';

@Component({
  selector: 'app-groups',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonsComponent,
    BaseLayoutComponent,
    ModalComponent,
    FormsModule,
    GroupMembersModalComponent
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
  showCreateModal = false;
  createGroupForm: FormGroup;
  isSubmitting = false;
  isLoading: boolean = true;
  showDetailsModal = false;
  showMembersModal = false;
  showDeleteModal = false;
  selectedGroup: any = null;
  groupMembers: any[] = [];
  isLoadingMembers = false;
  isDeleting: boolean = false;
  confirmationInput: string = '';
  isDeletedDisabled: boolean = true;
  nameCount = 0;
  descCount = 0;
  nameLimitReached = false;
  descLimitReached = false;


  // Current user ID
  currentUserId: string | null = null;

  // Store pending requests for each group
  pendingRequests: Map<string, boolean> = new Map();

  constructor(
    private groupsService: GroupsService,
    private authService: AuthService,
    private toastService: ToastService,
    private dialog: MatDialog,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.createGroupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      isPublic: [true, Validators.required]
    });
  }

  ngOnInit(): void {  // ====== DOES NOT GET THE USERID========
    // Get current user ID first
    this.currentUserId = this.authService.getCurrentUserId();
    console.log('Current User ID on init:', this.currentUserId);
    this.loadGroups();
    this.updateCharCounts();
  }

  updateCharCounts() {
  const nameControl = this.createGroupForm.get('name');
  const descControl = this.createGroupForm.get('description');

  const nameValue = nameControl?.value || '';
  const descValue = descControl?.value || '';

  this.nameCount = nameValue.length;
  this.descCount = descValue.length;

  // NAME
  if (this.nameCount > 100) {
    this.nameLimitReached = true;
    nameControl?.setValue(nameValue.substring(0, 100), { emitEvent: false });
    this.nameCount = 100;
  } else {
    this.nameLimitReached = false;
  }

  // DESCRIPTION
  if (this.descCount > 500) {
    this.descLimitReached = true;
    descControl?.setValue(descValue.substring(0, 500), { emitEvent: false });
    this.descCount = 500;
  } else {
    this.descLimitReached = false;
  }
}



  autoGrow(event: any) {
  const textarea = event.target;
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
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
              isCreator: group.createdByUserId === this.currentUserId,
              isPublic: group.isPublic
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
              },
              isPublic:
                group.isPublic === true ||
                group.isPublic === 'true' ||
                group.IsPublic === true ||
                group.IsPublic === 'true'
                  ? 'Public'
                  : 'Private',
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
  this.selectedGroup = group;
  this.showDetailsModal = true;
}

closeDetailsModal(): void {
  this.showDetailsModal = false;
  this.selectedGroup = null;
}

openMembersModal(group: any): void {
    this.dialog.open(GroupMembersModalComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: { group: group },
      panelClass: 'custom-modal'
    });
  }

closeMembersModal(): void {
  this.showMembersModal = false;
  this.selectedGroup = null;
  this.groupMembers = [];
}

openCreateModal(): void {
  this.showCreateModal = true;
}

closeCreateModal(): void {
  this.showCreateModal = false;
  this.createGroupForm.reset();
}

openDeleteModal(group: any): void {
  this.selectedGroup = group;
  this.showDeleteModal = true;
}

closeDeleteModal(): void {
  this.showDeleteModal = false;
  this.selectedGroup = null;
}

onConfirmationInput(value: string): void {
  this.confirmationInput = value;
  this.isDeletedDisabled = value !== this.selectedGroup?.name;
}
  // ===== GROUP JOIN & VIEW IDEAS METHODS =====

  onViewIdeas(groupId: string): void {
    const group = this.groups.find(g => g.id === groupId);

    if (!group?.isMember) {
      this.toastService.show('You must be a member of this group to view ideas.', 'info');
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
      this.toastService.show('You are already a member of this group!', 'info');
      return;
    }

    if (group?.hasPendingRequest) {
      this.toastService.show('You already have a pending request for this group!', 'info');
      return;
    }

    this.groupsService.joinGroup(groupId).subscribe({
      next: (response: any) => {
        const isSuccess = response.success || response.status;
        if (isSuccess || group.isPublic == false) {
          this.toastService.show('Request sent! Waiting for admin approval.', 'success');
          group.isMember=false;
          this.loadGroups();
        } 
        else if (isSuccess || group.isPublic==true){
          this.toastService.show('Joined successfully', 'success'); 
          group.isMember=true;
          this.onViewIdeas(groupId);
        }
        else {
          if (response.message?.includes('already a member')) {
            this.toastService.show('You are already a member of this group!', 'info');
            this.loadGroups();
          } else if (response.message?.includes('pending request')) {
            this.toastService.show('You already have a pending request for this group!', 'info');
            this.loadGroups();
          } else {
            this.toastService.show(response.message || 'Failed to send join request.', 'error');
          }
        }
      },
      error: (error: any) => {
        console.error('Error joining group:', error);
        this.toastService.show('Failed to send join request. Please try again.', 'error');
      }
    });
  }

  // ===== GROUP CREATION METHODS =====

 toggleCreateForm(): void {
  if (this.showCreateModal) {
    this.closeCreateModal();
  } else {
    this.openCreateModal();
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
          this.toastService.show('Group created successfully!', 'success');
          this.loadGroups();
          this.createGroupForm.reset();
          this.closeCreateModal();
        } else {
          if (response.message?.includes('authenticated') ||
            response.message?.includes('User ID') ||
            response.message?.includes('login')) {
            this.toastService.show('Please login to create a group.', 'warning');
          } else {
            this.toastService.show(response.message || 'Failed to create group.', 'error');
          }
        }
      },
      error: (error: any) => {
        this.isSubmitting = false;
        console.error('Error creating group:', error);

        if (error.status === 401) {
          this.toastService.show('Please login to create a group.', 'warning');
        } else if (error.status === 400) {
          this.toastService.show('Invalid group data. Please check your input.', 'error');
        } else {
          this.toastService.show('Failed to create group. Please try again.', 'error');
        }
      }
    });
  }

  loadGroupMembers(groupId: string): void {
  this.isLoadingMembers = true;
  this.groupMembers = [];
  
  this.groupsService.getGroupMembers(groupId).subscribe({
    next: (response: any) => {
      this.isLoadingMembers = false;
      if (response.success && response.data) {
        this.groupMembers = response.data.map((member: any) => ({
          id: member.userId ?? member.id,
          userId: member.userId || member.id,
          name: member.name,
          displayName: member.displayName || member.name,
          userName: member.userName,
          email: member.email,
          createdByUserId: member.createdByUserId
        }));
      } else {
        console.error('Failed to load group members:', response.message);
        this.groupMembers = [];
      }
    },
    error: (error: any) => {
      this.isLoadingMembers = false;
      console.error('Error loading group members:', error);
      this.groupMembers = [];
    }
  });
}

  onCancelCreate(): void {
    this.closeCreateModal();
  }
  // ===== GROUP DELETION METHODS =====

  deleteGroup(groupId: string): void {
    this.isDeleting = true;

    this.groupsService.deleteGroup(groupId).subscribe({
      next: (response: any) => {
        this.isDeleting = false;

        if (response.success) {
          this.toastService.show('Group deleted successfully!', 'success');
          this.groups = this.groups.filter(group => group.id !== groupId);
          this.closeDeleteModal();

          if (this.groups.length === 0) {
            this.title = 'No Groups';
            this.subtitle = 'All groups have been deleted.';
          }
        } else {
          this.toastService.show(response.message || 'Failed to delete group', 'error');

          if (response.message?.includes('permission') ||
            response.message?.includes('admin') ||
            response.message?.includes('not allowed')) {
            this.toastService.show('Only group admin can delete groups.', 'warning'); 
          }
        }
      },
      error: (error: any) => {
        this.isDeleting = false;
        console.error('Error deleting group:', error);

        if (error.status === 401) {
          this.toastService.show('Please login to delete groups.', 'warning');
        } else if (error.status === 403) {
          this.toastService.show('You do not have permission to delete this group.', 'warning');
        } else if (error.status === 404) {
          this.toastService.show('Group not found.', 'error');
        } else {
          this.toastService.show('Failed to delete group. It may have linked ideas or projects', 'error');
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

  getInitials(name: string): string {
  if (!name) return '?';
  return name.split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
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

  get privacy() {
    return this.createGroupForm.get('isPublic');
  }
}
  