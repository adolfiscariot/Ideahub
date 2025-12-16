import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AddGroup } from '../../Interfaces/Groups/groups-interfaces';
import { GroupsService } from '../../Services/groups.service';
import { AuthService } from '../../Services/auth/auth.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonsComponent } from "../../Components/buttons/buttons.component";
import { ModalComponent } from '../../Components/modal/modal.component';

@Component({
  selector: 'app-groups',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonsComponent,
    ModalComponent
  ]
})
export class GroupsComponent implements OnInit {
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
  
  // Modal states
  showDetailsModal = false;
  showMembersModal = false;
  showDeleteModal = false;
  selectedGroup: any = null;
  
  // Members data
  groupMembers: any[] = [];
  isLoadingMembers = false;
  
  // Delete state
  isDeleting: boolean = false;
  
  // Current user ID
  currentUserId: string | null = null;
  
  constructor(
    private groupsService: GroupsService,
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.createGroupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
    });
  }

  ngOnInit(): void {
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
        
        if (response.success && response.data) {
          this.groups = response.data.map((group: any) => {
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
    this.selectedGroup = group;
    this.showMembersModal = true;
    this.loadGroupMembers(group.id);
  }

  closeMembersModal(): void {
    this.showMembersModal = false;
    this.selectedGroup = null;
    this.groupMembers = [];
  }

  openDeleteModal(group: any): void {
    this.selectedGroup = group;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedGroup = null;
  }

  // ===== DATA LOADING METHODS =====

  loadGroupMembers(groupId: string): void {
    this.isLoadingMembers = true;
    this.groupsService.getGroupMembers(groupId).subscribe({
      next: (response: any) => {
        this.isLoadingMembers = false;
        const isSuccess = response.success || response.status;
        if (isSuccess && response.data) {
          this.groupMembers = response.data;
        }
      },
      error: (error: any) => {
        this.isLoadingMembers = false;
        console.error('Error loading members:', error);
      }
    });
  }

  // ===== GROUP JOIN & VIEW IDEAS =====

  onViewIdeas(groupId: string): void {
    const group = this.groups.find(g => g.id === groupId);
    
    if (!group?.isMember) {
      alert('You must be a member of this group to view ideas.');
      return;
    }
    
    const isGroupCreator = this.isGroupCreator(group);
    
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
      alert('You are already a member of this group!');
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

  deleteGroup(groupId: string): void {
    this.isDeleting = true;
    
    this.groupsService.deleteGroup(groupId).subscribe({
      next: (response: any) => {
        this.isDeleting = false;
        this.closeDeleteModal();
        
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

  formatModalDate(date: any): string {
    if (!date) return 'Unknown';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  trackById(index: number, item: any): string {
    return item.id || index.toString();
  }

  // ===== PERMISSION METHODS =====

  isGroupCreator(group: any): boolean {
    if (!group || !group.createdByUserId || !this.currentUserId) return false;
    
    const groupCreatorId = group.createdByUserId.toString().trim().toLowerCase();
    const currentId = this.currentUserId.toString().trim().toLowerCase();
    
    return groupCreatorId === currentId;
  }

  canConfigureGroup(group: any): boolean {
    return this.isGroupCreator(group);
  }

  // ===== FORM GETTER METHODS =====

  get name() { 
    return this.createGroupForm.get('name'); 
  }
  
  get description() { 
    return this.createGroupForm.get('description'); 
  }
}