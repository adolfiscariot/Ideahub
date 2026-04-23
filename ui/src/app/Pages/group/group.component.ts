import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { GroupsService } from '../../Services/groups.service';
import { AuthService } from '../../Services/auth/auth.service';
import { ToastService } from '../../Services/toast.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonsComponent } from '../../Components/buttons/buttons.component';
import { ModalComponent } from '../../Components/modal/modal.component';
import { GroupMembersModalComponent } from '../../Components/modals/group-members-modal/group-members-modal.component';
import { AbstractControl } from '@angular/forms';
import { MembershipNotificationsService } from '../../Services/membership-notifications.service';
import { updateCharCount } from '../../Components/utils/char-count-util';
import { Subject, takeUntil } from 'rxjs';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import {
  Group,
  GroupMember,
  AddGroup,
  RawBackendGroup,
  JoinGroupResponse,
} from '../../Interfaces/Groups/groups-interfaces';
import { ApiResponse } from '../../Interfaces/Api-Response/api-response';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-groups',
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonsComponent,
    ModalComponent,
    MatPaginatorModule,
    FormsModule,
  ],
})
export class GroupsComponent implements OnInit, OnDestroy {
  private groupsService = inject(GroupsService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private membershipNotificationsService = inject(
    MembershipNotificationsService,
  );
  private fb = inject(FormBuilder);

  // Group data
  groups: Group[] = [];

  // Page content
  title = 'Groups';
  subtitle = 'Explore and join groups to collaborate on ideas and projects.';

  // Form state
  showCreateModal = false;
  createGroupForm: FormGroup;
  isSubmitting = false;
  isLoading = true;
  showDetailsModal = false;
  showMembersModal = false;
  showDeleteModal = false;
  selectedGroup: Group | null = null;
  groupMembers: GroupMember[] = [];
  isLoadingMembers = false;
  isDeleting = false;
  nameCount = 0;
  descCount = 0;
  nameLimitReached = false;
  descLimitReached = false;
  deleteConfirmControl: FormControl;

  // Current user ID
  currentUserId: string | null = null;

  // Store pending requests for each group
  pendingRequests = new Map<string, boolean>();

  pageSize = 8;
  currentPage = 0;
  paginateGroups: Group[] = [];
  dontShowPages = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  showGroupInfoModal = false;
  private destroy$ = new Subject<void>();

  constructor() {
    this.createGroupForm = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(100),
        ],
      ],
      description: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(500),
        ],
      ],
      isPublic: [true, Validators.required],
    });
    this.deleteConfirmControl = this.fb.control('') as FormControl;
  }

  ngOnInit() {
    // Get current user ID first
    this.currentUserId = this.authService.getCurrentUserId();
    this.loadGroups();

    const hideInfo = localStorage.getItem('hideGroupInfo') === 'true';
    this.showGroupInfoModal = !hideInfo;
    this.setupCharCounters();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupCharCounters() {
    this.createGroupForm
      .get('name')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const result = updateCharCount(this.createGroupForm, 'name', 100);
        this.nameCount = result.count;
        this.nameLimitReached = result.limitReached;
      });

    this.createGroupForm
      .get('description')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const result = updateCharCount(
          this.createGroupForm,
          'description',
          500,
        );
        this.descCount = result.count;
        this.descLimitReached = result.limitReached;
      });
  }

  autoGrow(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  updatePaginatedGroups() {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginateGroups = this.groups.slice(startIndex, endIndex);
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedGroups();
  }

  // ===== GROUP LOADING METHODS =====

  loadGroups() {
    this.isLoading = true;
    this.groupsService.getGroups().subscribe({
      next: (response: ApiResponse<Group[]>) => {
        this.isLoading = false;

        if (response.success && response.data) {
          this.groups = response.data.map(
            (raw: Group | Record<string, unknown>) => {
              const group = raw as RawBackendGroup;
              const mappedId = group.id || group.Id || '';
              return {
                ...group,
                id: mappedId,
                name: (group.name || group.Name || '').trim(),
                description: group.description || group.Description || '',
                isMember: group.isMember || group.IsMember || false,
                hasPendingRequest:
                  group.hasPendingRequest || group.HasPendingRequest || false,
                memberCount: group.memberCount || group.MemberCount || 0,
                ideaCount: group.ideaCount || group.IdeaCount || 0,
                isActive: group.isActive || group.IsActive !== false,
                isDeleted: group.isDeleted || group.IsDeleted || false,
                createdAt:
                  group.createdAt ||
                  group.CreatedAt ||
                  new Date().toISOString(),
                createdByUserId:
                  group.createdByUserId || group.CreatedByUserId || '',
                createdByUser: group.createdByUser ||
                  group.CreatedByUser || {
                    displayName: 'Unknown',
                    email: '',
                  },
                isPublic:
                  group.isPublic === true ||
                  (typeof group.isPublic === 'string' &&
                    group.isPublic.toLowerCase() === 'true') ||
                  group.IsPublic === true ||
                  (typeof group.IsPublic === 'string' &&
                    group.IsPublic.toLowerCase() === 'true')
                    ? 'Public'
                    : 'Private',
              } as Group;
            },
          );

          this.groups.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          this.dontShowPages = this.groups.length <= this.pageSize;
          this.updatePaginatedGroups();
        } else {
          this.groups = [];
        }
      },
      error: () => {
        this.isLoading = false;
        this.groups = [];
      },
    });
  }

  closeGroupInfo() {
    this.showGroupInfoModal = false;
  }

  displayGroupInfo() {
    this.showGroupInfoModal = true;
  }

  dontShowGroupInfoAgain() {
    localStorage.setItem('hideGroupInfo', 'true');
    this.showGroupInfoModal = false;
  }

  // ===== MODAL METHODS =====

  openDetailsModal(group: Group) {
    this.selectedGroup = group;
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedGroup = null;
  }

  openMembersModal(group: Group) {
    this.dialog.open(GroupMembersModalComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: { group: group },
      panelClass: 'custom-modal',
    });
  }

  closeMembersModal() {
    this.showMembersModal = false;
    this.selectedGroup = null;
    this.groupMembers = [];
  }

  openCreateModal() {
    this.showCreateModal = true;
  }

  closeCreateModal() {
    this.showCreateModal = false;
    this.createGroupForm.reset({ isPublic: true });
  }

  openDeleteModal(group: Group) {
    this.selectedGroup = group;
    this.showDeleteModal = true;

    this.deleteConfirmControl.setValue('');
    this.deleteConfirmControl.setValidators([
      Validators.required,
      (control: AbstractControl) => {
        const normalize = (value: unknown) =>
          String(value ?? '')
            .toLowerCase()
            .replace(/\s+/g, '');
        return normalize(control.value) === normalize(group.name)
          ? null
          : { mismatch: true };
      },
    ]);
    this.deleteConfirmControl.updateValueAndValidity();
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.selectedGroup = null;
  }

  // ===== GROUP JOIN & VIEW IDEAS METHODS =====

  onViewIdeas(groupId: string) {
    if (!groupId) {
      console.warn('Cannot view ideas: groupId is missing');
      return;
    }

    const group = this.groups.find((g) => String(g.id) === String(groupId));

    if (!group) return;

    if (!group.isMember) {
      this.toastService.show(
        'You must be a member of this group to view ideas.',
        'info',
      );
      return;
    }

    // Check if user is group creator
    const isGroupCreator = this.isGroupCreator(group);

    // Navigate to ideas page with state
    this.router.navigate(['/groups', groupId, 'ideas'], {
      state: {
        isGroupCreator: isGroupCreator,
        groupName: group.name,
        groupCreatorId: group.createdByUserId,
      },
    });
  }

  onJoinGroup(groupId: string) {
    const group = this.groups.find((g) => String(g.id) === String(groupId));

    if (!group) return;

    if (group.isMember) {
      this.toastService.show('You are already a member of this group!', 'info');
      return;
    }

    if (group?.hasPendingRequest) {
      this.toastService.show(
        'You already have a pending request for this group!',
        'info',
      );
      return;
    }

    this.groupsService.joinGroup(groupId).subscribe({
      next: (response: ApiResponse<JoinGroupResponse>) => {
        const isSuccess = response.success;

        // Handle both casing variants for isPublic from JoinGroupResponse
        const isPublic = response.data?.isPublic ?? response.data?.IsPublic;

        if (isSuccess && isPublic === false) {
          this.toastService.show(
            'Request sent! Waiting for admin approval.',
            'success',
          );
          group.isMember = false;
          group.hasPendingRequest = true; // Mark as pending immediately
          this.loadGroups();
        } else if (isSuccess && isPublic === true) {
          this.toastService.show('Joined successfully', 'success');
          group.isMember = true;
          this.onViewIdeas(groupId);
        } else if (isSuccess) {
          // Success but isPublic flag missing or unmapped
          this.toastService.show('Join request successful', 'success');
          this.loadGroups();
        } else {
          if (response.message?.includes('already a member')) {
            this.toastService.show(
              'You are already a member of this group!',
              'info',
            );
            this.loadGroups();
          } else if (response.message?.includes('pending request')) {
            this.toastService.show(
              'You already have a pending request for this group!',
              'info',
            );
            this.loadGroups();
          } else {
            this.toastService.show(
              response.message || 'Failed to send join request.',
              'error',
            );
          }
        }
      },
      error: () => {
        this.toastService.show(
          'Failed to send join request. Please try again.',
          'error',
        );
      },
    });
  }

  // ===== GROUP CREATION METHODS =====

  toggleCreateForm() {
    if (this.showCreateModal) {
      this.closeCreateModal();
    } else {
      this.openCreateModal();
    }
  }

  onCreateGroup() {
    if (this.createGroupForm.invalid) {
      this.createGroupForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const newGroup: AddGroup = this.createGroupForm.value;

    this.groupsService.createGroup(newGroup).subscribe({
      next: (response: ApiResponse<Group>) => {
        this.isSubmitting = false;
        const isSuccess = response.success;
        if (isSuccess) {
          this.toastService.show('Group created successfully!', 'success');
          this.currentPage = 0;
          this.loadGroups();

          this.createGroupForm.reset();
          this.closeCreateModal();
        } else {
          if (
            response.message?.includes('authenticated') ||
            response.message?.includes('User ID') ||
            response.message?.includes('login')
          ) {
            this.toastService.show(
              'Please login to create a group.',
              'warning',
            );
          } else {
            this.toastService.show(
              response.message || 'Failed to create group.',
              'error',
            );
          }
        }
      },
      error: (error: { status: number }) => {
        this.isSubmitting = false;

        if (error.status === 401) {
          this.toastService.show('Please login to create a group.', 'warning');
        } else if (error.status === 400) {
          this.toastService.show(
            'Invalid group data. Please check your input.',
            'error',
          );
        } else {
          this.toastService.show(
            'Failed to create group. Please try again.',
            'error',
          );
        }
      },
    });
  }

  loadGroupMembers(groupId: string) {
    this.isLoadingMembers = true;
    this.groupMembers = [];

    this.groupsService.getGroupMembers(groupId).subscribe({
      next: (response: ApiResponse<GroupMember[]>) => {
        this.isLoadingMembers = false;
        if (response.success && response.data) {
          this.groupMembers = response.data.map((member: GroupMember) => {
            const m = member as unknown as Record<string, unknown>;
            return {
              ...member,
              id: member.userId || (m['id'] as string),
              userId: member.userId || (m['id'] as string),
              name: m['name'] as string,
              displayName: member.displayName || (m['name'] as string),
              userName: m['userName'] as string,
              email: member.email,
              createdByUserId: m['createdByUserId'] as string,
            } as GroupMember;
          });
        } else {
          this.groupMembers = [];
        }
      },
      error: () => {
        this.isLoadingMembers = false;
        this.groupMembers = [];
      },
    });
  }

  onCancelCreate() {
    this.closeCreateModal();
  }

  // ===== GROUP DELETION METHODS =====

  deleteGroup(groupId: string) {
    this.isDeleting = true;

    this.groupsService.deleteGroup(groupId).subscribe({
      next: (response: ApiResponse<void>) => {
        this.isDeleting = false;

        if (response.success) {
          this.toastService.show('Group deleted successfully!', 'success');
          this.loadGroups();
          this.groups = this.groups.filter(
            (group) => group.id.toString() !== groupId,
          );
          this.membershipNotificationsService.refreshPendingRequests();
          this.closeDeleteModal();

          if (this.groups.length === 0) {
            this.title = 'No Groups';
            this.subtitle = 'All groups have been deleted.';
          }
        } else {
          this.toastService.show(
            response.message || 'Failed to delete group',
            'error',
          );

          if (
            response.message?.includes('permission') ||
            response.message?.includes('admin') ||
            response.message?.includes('not allowed')
          ) {
            this.toastService.show(
              'Only group admin can delete groups.',
              'warning',
            );
          }
        }
      },
      error: (error: { status: number }) => {
        this.isDeleting = false;

        if (error.status === 401) {
          this.toastService.show('Please login to delete groups.', 'warning');
        } else if (error.status === 403) {
          this.toastService.show(
            'You do not have permission to delete this group.',
            'warning',
          );
        } else if (error.status === 404) {
          this.toastService.show('Group not found.', 'error');
        } else {
          this.toastService.show(
            'Failed to delete group. It may have linked projects',
            'error',
          );
        }
      },
    });
  }

  // ===== HELPER METHODS =====

  formatDate(date: string | Date | undefined): string {
    if (!date) return 'Unknown date';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  }

  formatMemberCount(count: number): string {
    if (!count || count === 0) return '0 members';
    return count === 1 ? '1 member' : `${count} members`;
  }

  trackById(index: number, item: Group): string {
    if (!item || !item.id) return index.toString();
    return item.id.toString();
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  // ===== PERMISSION METHODS =====

  isGroupCreator(group: Group | null): boolean {
    if (!group || !group.createdByUserId || !this.currentUserId) return false;

    // Normalize both IDs (trim and lowercase)
    const groupCreatorId = group.createdByUserId
      .toString()
      .trim()
      .toLowerCase();
    const currentId = this.currentUserId.toString().trim().toLowerCase();

    return groupCreatorId === currentId;
  }

  canConfigureGroup(group: Group): boolean {
    return this.isGroupCreator(group);
  }

  // ===== PENDING REQUEST METHODS =====

  hasPendingRequest(groupId: string): boolean {
    return this.pendingRequests.get(groupId) || false;
  }

  // ===== FORM GETTER METHODS =====

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
