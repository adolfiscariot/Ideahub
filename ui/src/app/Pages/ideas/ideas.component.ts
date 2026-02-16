import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IdeasService } from '../../Services/ideas.services';
import { GroupsService } from '../../Services/groups.service';
import { AuthService } from '../../Services/auth/auth.service';
import { Idea, CreateIdeaRequest, IdeaUpdate, PromoteRequest, viewComment, createComment } from '../../Interfaces/Ideas/idea-interfaces';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { VoteService } from '../../Services/vote.service';
import { ButtonsComponent } from '../../Components/buttons/buttons.component';
import { MatDialog } from '@angular/material/dialog';
import { GroupMembersModalComponent } from '../../Components/modals/group-members-modal/group-members-modal.component';
import { ToastService } from '../../Services/toast.service';
import { ProjectService } from '../../Services/project.service';
import { CreateProjectRequest } from '../../Interfaces/Projects/project-interface';
import { ModalComponent } from '../../Components/modal/modal.component';
import { updateCharCount } from '../../Components/utils/char-count-util';
import { Subject, takeUntil } from 'rxjs';
import { HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommentsService } from '../../Services/comments.service';
import { MediaComponent } from '../media/media.component';
import { MediaType, Media } from '../../Interfaces/Media/media-interface';
import { MediaService } from '../../Services/media.service';
import { firstValueFrom } from 'rxjs';
import { formatFileSize, detectMediaType, removeFileAtIndex, processSelectedFiles } from '../../Components/utils/media.utils';

@Component({
  selector: 'app-ideas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonsComponent, FormsModule, ModalComponent, MediaComponent],
  templateUrl: './ideas.component.html',
  styleUrls: ['./ideas.component.scss']
})
export class IdeasComponent implements OnInit, OnDestroy {
  groupId: string = '';
  groupName: string = '';
  ideas: Idea[] = [];
  isLoading: boolean = false;
  isSubmitting: boolean = false;
  showShareModal: boolean = false;
  currentUserId: string = '';

  selectedIdea: any = null;
  membersCount: string = '0';

  isVoting: boolean = false;
  isUnvoting: boolean = false;
  isViewingVoters: boolean = false;
  selectedIdeaForVoters: Idea | null = null;
  votersList: any[] = [];

  groupCreatorId: string = '';

  //showMembersModal = false;
  showAdminLeaveModal: boolean = false;
  showTransferOwnershipModal: boolean = false;

  isGroupCreatorFromState: boolean | undefined = undefined; // set from route state
  groupCreatorIdFromState: string = ''; // set from route state

  isPromoting: boolean = false;
  currentlyPromotingIdeaId: string | null = null;

  groupMembers: any[] = [];

  isEditMode: boolean = false;

  modalEditData: any = {
    id: '',
    title: '',
    description: ''
  };

  sortMode: 'top' | 'newest' = 'top';

  showRequestsModal = false;
  pendingRequests: any[] = [];
  loadingRequests = false;
  errorRequests = '';
  newOwnerEmail!: string;

  showProjectModal = false;
  currentIdeaToPromote: Idea | null = null;
  projectData: CreateProjectRequest = {
    title: '',
    description: '',
    overseenByEmail: ''
  };
  showMemberLeaveModal = false;
  titleLength = 0;
  descLength = 0;
  isFormValid = false;
  shareTitleCount = 0;
  shareDescCount = 0;

  shareIdeaForm!: FormGroup;

  private routeSub: Subscription = new Subscription();

  showDeleteIdeaModal = false;
  ideaIdToDelete: string | null = null;

  showIdeaInfoModal = false;
  //showCloseIdea=false;
  ideaIdToClose: string | null = null;

  selectedType: string = '';
  selectedDomain: string = '';
  selectedImpact: string = '';

  isDropdownOpen = false;

  selectedOptionLabel: string = 'All Categories';

  isReadyForPromotion = false;

  comments: viewComment[] = [];
  newCommentContent: string = '';
  isLoadingComments: boolean = false;

  selectedCommentFiles: File[] = [];
  isPostingComment = false;
  commentStatus = '';
  allowedFileTypes = '.jpg,.jpeg,.png,.gif,.bmp,.webp,.mp4,.mov,.avi,.wmv,.pdf,.doc,.docx,.txt,.xls,.xlsx';

  selectedIdeaFiles: File[] = [];
  isUploadingIdeaMedia = false;
  ideaUploadStatus = '';

  showClosedIdeas: boolean = false;
  closedIdeas: Idea[] = [];

  showMobileMenu: boolean = false;
  showIdeaActionsMenu: boolean = false;

  toggleMobileMenu() {
    this.showMobileMenu = !this.showMobileMenu;
  }

  closeMobileMenu() {
    this.showMobileMenu = false;
  }

  toggleIdeaActionsMenu() {
    this.showIdeaActionsMenu = !this.showIdeaActionsMenu;
  }

  closeIdeaActionsMenu() {
    this.showIdeaActionsMenu = false;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ideasService: IdeasService,
    private groupsService: GroupsService,
    private authService: AuthService,
    private voteService: VoteService,
    private toastService: ToastService,
    private dialog: MatDialog,
    private projectService: ProjectService,
    private commentService: CommentsService,
    private mediaService: MediaService,
    private fb: FormBuilder
  ) {
  }

  ngOnInit(): void {
    // console.log('=== INITIALIZING IDEAS COMPONENT ===');

    // Get current user ID from auth service
    this.currentUserId = this.authService.getCurrentUserId();
    // console.log('Current User ID:', this.currentUserId);

    this.shareIdeaForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(20)]],
      description: ['', Validators.required],
      type: ['', Validators.required],
      domain: ['', Validators.required],
      impact: ['', Validators.required]
    });

    this.setupShareIdeaCharCounters();
    // Check browser history state FIRST (in case of page refresh)
    // console.log('Browser history state:', history.state);

    // Get router state (passed from Groups component)
    const navigation = this.router.getCurrentNavigation();
    // console.log('=== NAVIGATION DEBUG ===');
    // console.log('Navigation exists:', !!navigation);
    // console.log('Navigation extras:', navigation?.extras);
    // console.log('Navigation state:', navigation?.extras?.state);

    if (navigation?.extras?.state) {
      const state = navigation.extras.state as any;
      this.isGroupCreatorFromState = state.isGroupCreator || false;
      this.groupName = state.groupName || this.groupName;
      this.groupCreatorIdFromState = state.groupCreatorId || '';
      this.groupCreatorId = this.groupCreatorIdFromState; // Set main ID too

      // console.log('RECEIVED ROUTE STATE:', {
      //   isGroupCreator: this.isGroupCreatorFromState,
      //   groupName: this.groupName,
      //   groupCreatorId: this.groupCreatorIdFromState,
      //   fullState: state
      // });
    } else {
      // console.log('NO ROUTE STATE from navigation');

      // Try to get from browser history (for page refreshes)
      if (history.state && history.state.groupCreatorId) {
        // console.log('Found state in browser history:', history.state);
        this.isGroupCreatorFromState = history.state.isGroupCreator;
        this.groupName = history.state.groupName || this.groupName;
        this.groupCreatorIdFromState = history.state.groupCreatorId;
        this.groupCreatorId = this.groupCreatorIdFromState;
      }
    }

    this.routeSub = this.route.params.subscribe(params => {
      this.groupId = params['groupId'];
      // console.log('Group ID from route:', this.groupId);

      // console.log('=== CURRENT STATE ===', {
      //   groupCreatorId: this.groupCreatorId,
      //   groupCreatorIdFromState: this.groupCreatorIdFromState,
      //   isGroupCreatorFromState: this.isGroupCreatorFromState,
      //   groupName: this.groupName
      // });

      // If we don't have creator ID, load from API
      if (!this.groupCreatorId) {
        // console.log('No groupCreatorId, loading from API...');
        this.loadGroupInfo();
      } else {
        // console.log('Using existing groupCreatorId:', this.groupCreatorId);
      }
      this.loadGroupMembers();
      const hideInfo = localStorage.getItem('hideIdeaInfo') === 'true';
      this.showIdeaInfoModal = !hideInfo;
      this.loadIdeas();
    });
  }

  ngOnDestroy(): void {
    this.routeSub.unsubscribe();
  }

  private destroy$ = new Subject<void>();
  private setupShareIdeaCharCounters(): void {

    this.shareIdeaForm.get('title')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const res = updateCharCount(this.shareIdeaForm, 'title', 20);
        this.shareTitleCount = res.count;
      });

    this.shareIdeaForm.get('description')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const res = updateCharCount(this.shareIdeaForm, 'description', 1000);
        this.shareDescCount = res.count;
      });
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  selectCategory(filterType: 'type' | 'domain' | 'impact', value: string) {
    if (filterType === 'type') this.selectedType = value;
    if (filterType === 'domain') this.selectedDomain = value;
    if (filterType === 'impact') this.selectedImpact = value;

    this.filterByCategory({
      type: this.selectedType,
      domain: this.selectedDomain,
      impact: this.selectedImpact
    });
  }

  @ViewChild('dropdown', { static: true }) dropdown!: ElementRef;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.isDropdownOpen) return;

    if (!this.dropdown.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }

  // private filterOutClosed(ideas: Idea[]): Idea[] {
  //   return ideas.filter(idea => idea.status !== 'Closed');
  // }
  private filterOutClosed(ideas: Idea[]): Idea[] {
    if (this.showClosedIdeas) {
      return ideas.filter(idea => idea.status === 'Closed');
    } else {
      return ideas.filter(idea => idea.status !== 'Closed');
    }
  }


  filterByCategory(filters: { type: string; domain: string; impact: string }) {
    this.ideasService
      .getIdeasByGroup(this.groupId, filters.type, filters.domain, filters.impact)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // Map the filtered ideas
            const filteredIdeas = response.data.map((idea: any) => {
              const mappedIdea: Idea = {
                id: idea.id?.toString() || '',
                title: idea.title || '',
                description: idea.description || '',
                filter: idea.filter || '',
                UserId: idea.userId || idea.UserId || '',
                userId: idea.userId || idea.UserId || '',
                groupId: this.groupId,
                isPromotedToProject: idea.isPromotedToProject || false,
                isDeleted: idea.isDeleted || false,
                createdAt: new Date(idea.createdAt || new Date()),
                updatedAt: new Date(idea.updatedAt || new Date()),
                status: idea.status || 'Open',
                deletedAt: idea.deletedAt ? new Date(idea.deletedAt) : undefined,
                voteCount: idea.voteCount || 0,
                commentCount: 0,
                userVoted: false,
                userName: idea.userName || '',
                userVoteId: undefined,
                groupName: idea.name || '',
                name: idea.name || '',
                mediaCount: 0
              };
              return mappedIdea;
            });

            // Apply current view mode filter
            if (this.showClosedIdeas) {
              this.ideas = filteredIdeas.filter(idea => idea.status === 'Closed');
            } else {
              this.ideas = filteredIdeas.filter(idea => idea.status !== 'Closed');
            }

            // Sort appropriately
            if (this.showClosedIdeas) {
              this.sortClosedIdeas();
            } else {
              this.sortIdeas();
            }
          }
        },
        error: (err) => {
          console.error('Error filtering ideas:', err);
        }
      });
  }

  loadClosedIdeas(): void {
    this.isLoading = true;
    // console.log('=== LOAD CLOSED IDEAS CALLED ===');
    // console.log('Loading CLOSED ideas for group:', this.groupId);

    this.ideasService.getIdeasByGroup(this.groupId).subscribe({
      next: async (response) => {
        this.isLoading = false;
        // console.log('=== CLOSED IDEAS API RESPONSE ===');
        // console.log('Response success:', response.success);
        // console.log('Response data length:', response.data?.length || 0);

        if (response.success && response.data) {
          // Filter for CLOSED ideas only
          const closedIdeasFromApi = response.data
            .filter((idea: any) => {
              const isClosed = idea.status === 'Closed';
              // console.log(`Checking idea "${idea.title}": status="${idea.status}", isClosed=${isClosed}`);
              return isClosed;
            })
            .map((idea: any) => {
              // console.log(`Mapping CLOSED idea "${idea.title}":`, {
              //   id: idea.id,
              //   status: idea.status,
              //   votes: idea.voteCount
              // });

              const mappedIdea: Idea = {
                id: idea.id?.toString() || '',
                title: idea.title || '',
                description: idea.description || '',
                filter: idea.filter || '',
                UserId: idea.userId || idea.UserId || '',
                userId: idea.userId || idea.UserId || '',
                groupId: this.groupId,
                isPromotedToProject: idea.isPromotedToProject || false,
                isDeleted: idea.isDeleted || false,
                createdAt: new Date(idea.createdAt || new Date()),
                updatedAt: new Date(idea.updatedAt || new Date()),
                status: idea.status || 'Closed',
                deletedAt: idea.deletedAt ? new Date(idea.deletedAt) : undefined,
                voteCount: idea.voteCount || 0,
                commentCount: 0,
                userVoted: false,
                userName: idea.userName || '',
                userVoteId: undefined,
                groupName: idea.name || '',
                name: idea.name || '',
                mediaCount: 0
              };
              return mappedIdea;
            });

          // console.log(`Loaded ${closedIdeasFromApi.length} CLOSED ideas from API`);

          // Assign to main ideas array for display
          this.ideas = closedIdeasFromApi;

          // Also store in closedIdeas array if you want to keep separate
          this.closedIdeas = [...closedIdeasFromApi];

          // Sort closed ideas by newest first (like in the image)
          this.sortClosedIdeas();

          // console.log('=== FINAL CLOSED IDEAS ARRAY ===');
          // this.ideas.forEach((idea, index) => {
          //   console.log(`${index + 1}. "${idea.title}" - Status: "${idea.status}"`);
          // });

          // Fetch vote counts
          if (this.ideas.length > 0) {
            await this.fetchAndUpdateVoteCounts();
          }
        } else {
          // console.warn('⚠️ Failed to load closed ideas:', response.message);
          this.ideas = [];
          this.closedIdeas = [];
        }
      },
      error: (error) => {
        this.isLoading = false;
        // console.error('❌ Error loading closed ideas:', error);
        this.ideas = [];
        this.closedIdeas = [];
      }
    });
  }

  sortClosedIdeas(): void {
    if (!this.closedIdeas) return;

    this.closedIdeas.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  // toggle between open and closed ideas
  toggleViewClosedIdeas(): void {
    // console.log('=== TOGGLE VIEW CLOSED IDEAS ===');
    // console.log('Before toggle - showClosedIdeas:', this.showClosedIdeas);

    this.showClosedIdeas = !this.showClosedIdeas;

    // console.log('After toggle - showClosedIdeas:', this.showClosedIdeas);

    if (this.showClosedIdeas) {
      // Load closed ideas when switching to closed view
      // console.log('Switching to CLOSED view, loading closed ideas...');
      this.loadClosedIdeas();
    } else {
      // Reload open ideas when switching back
      console.log('Switching to OPEN view, loading open ideas...');
      this.loadIdeas();
    }

    // Clear any selected idea when switching views
    this.selectedIdea = null;
  }


  clearAllCategories() {
    this.selectedType = '';
    this.selectedDomain = '';
    this.selectedImpact = '';

    this.selectedOptionLabel = 'All Categories';

    this.filterByCategory({
      type: '',
      domain: '',
      impact: ''
    });

    this.loadIdeas();
  }


  openEditModal(idea: any) {
    this.isEditMode = true;
    this.modalEditData = { ...idea };
  }

  setSortMode(mode: 'top' | 'newest'): void {
    this.sortMode = mode;
    this.sortIdeas();
  }

  sortIdeas(): void {
    if (!this.ideas) return;

    if (this.sortMode === 'top') {
      this.ideas.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
    } else if (this.sortMode === 'newest') {
      this.ideas.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
  }

  selectIdea(idea: any): void {
    console.log('Selecting idea:', idea);
    this.selectedIdea = idea;
    this.loadComments(idea.id);
  }

  loadComments(ideaId: number) {
    this.isLoadingComments = true;
    this.commentService.getComments(ideaId).subscribe({
      next: (res) => {
        this.isLoadingComments = false;
        if (res.success && res.data) {
          this.comments = res.data.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );


        } else {
          this.comments = [];
        }
      },
      error: (err) => {
        console.error('Failed to load comments', err);
        this.isLoadingComments = false;
      }
    });
  }


  async addComment(): Promise<void> {
    const content = this.newCommentContent?.trim();
    if (!content) {
      return this.toastService.show('To post a comment, you are required to provide one', 'info');
    }

    this.isPostingComment = true;
    //this.commentStatus = 'Posting comment...';

    try {
      // Create the comment
      const commentResponse = await firstValueFrom(
        this.commentService.postComment(this.selectedIdea.id, { content })
      );

      if (!commentResponse.success || !commentResponse.data?.id) {
        throw new Error('Failed to create comment');
      }

      const commentId = commentResponse.data.id;

      // If there are files, upload them
      if (this.selectedCommentFiles.length > 0) {
        this.commentStatus = `Attaching ${this.selectedCommentFiles.length} media file(s)...`;

        // Upload each file with the comment ID
        const uploadPromises = this.selectedCommentFiles.map(file =>
          firstValueFrom(
            this.mediaService.uploadMedia(
              file,
              this.detectMediaType(file),
              undefined,
              commentId, // pass the new comment ID
              undefined
            )
          )
        );

        // Wait for all uploads
        await Promise.all(uploadPromises);

        this.toastService.show(`Comment with ${this.selectedCommentFiles.length} media file(s) posted`, 'success');
      } else {
        this.toastService.show('Comment posted', 'success');
      }

      //this.commentStatus = 'Comment posted successfully!';
      this.newCommentContent = '';
      this.selectedCommentFiles = [];
      this.loadComments(this.selectedIdea.id);

      // Clear status after 2 second
      setTimeout(() => {
        this.commentStatus = '';
      }, 2000);

    } catch (error: any) {
      console.error('Error posting comment:', error);
      this.commentStatus = error.message || 'Failed to post comment. Please try again.';
      this.toastService.show(this.commentStatus, 'error');
    } finally {
      this.isPostingComment = false;
    }
  }


  deleteComment(commentId: number) {
    this.commentService.deleteComment(commentId).subscribe({
      next: (res) => {
        if (res.success) {
          this.comments = this.comments.filter(c => c.id !== commentId);
          this.toastService.show('Comment deleted', 'success');
        } else {
          this.toastService.show('Failed to delete comment', 'error');
        }
      },
      error: (err) => { /* console.error('Error deleting comment', err) */ }
    });
  }

  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    // Under 1 minute
    if (seconds < 60) return 'Just now';

    // Under 1 hour
    if (minutes < 60) return `${minutes} min ago`;

    // Under 24 hours
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;

    // 24+ hours → show date
    return date.toLocaleDateString();
  }

  onCommentFileSelected(event: any): void {
    const files: FileList = event.target.files;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file size (20MB limit)
      if (file.size > 20 * 1024 * 1024) {
        this.toastService.show(`${file.name} exceeds 20MB limit`, 'warning');
        continue;
      }

      this.selectedCommentFiles.push(file);
    }

    // Reset file input
    event.target.value = '';
  }

  removeCommentFile(index: number): void {
    this.selectedCommentFiles.splice(index, 1);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  detectMediaType(file: File): MediaType {
    const fileName = file.name.toLowerCase();
    const extension = fileName.substring(fileName.lastIndexOf('.'));

    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(extension)) {
      return MediaType.Image;
    }
    if (['.mp4', '.mov', '.avi', '.wmv'].includes(extension)) {
      return MediaType.Video;
    }
    return MediaType.Document;
  }
  viewRequests(groupId: string) {
    // console.log('Fetching pending requests for group:', groupId);
    this.showRequestsModal = true;
    this.loadingRequests = true;
    this.errorRequests = '';

    this.groupsService.viewRequests(groupId).subscribe({
      next: (res: any) => {
        // console.log('Pending requests received:', res);
        this.pendingRequests = res.data.map((email: string) => ({ email })) // res should be an array of { userId, ... }
        this.loadingRequests = false;
      },
      error: (err) => {
        // console.error('Error fetching requests:', err);
        this.errorRequests = 'Failed to load requests';
        this.loadingRequests = false;
      }
    });
  }

  updateShareIdeaCounts() {
    this.shareTitleCount = this.modalEditData.title?.length || 0;
    this.shareDescCount = this.modalEditData.description?.length || 0;
  }

  autoGrow(event: any) {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  confirmLeaveGroup() {
    if (this.isGroupCreator()) {
      this.showAdminLeaveModal = true;
    }
    else {
      this.showMemberLeaveModal = true;
    }
  }

  confirmMemberLeave() {
    this.showMemberLeaveModal = false;
    this.leaveGroup();
  }

  cancelMemberLeave() {
    this.showMemberLeaveModal = false;
  }

  cancelDeleteIdea() {
    this.ideaIdToDelete = null;
    this.showDeleteIdeaModal = false;
  }

  openDeleteIdeaModal(ideaId: string) {
    this.ideaIdToDelete = ideaId;
    this.showDeleteIdeaModal = true;
  }

  closeIdeabtn(ideaId: string) {
    this.ideaIdToClose = ideaId;
    this.onCloseIdea();
    this.selectedIdea = null;
  }

  onCloseIdea() {
    if (!this.ideaIdToClose) return;

    // console.log('=== CLOSING IDEA ===');
    // console.log('Idea ID to close:', this.ideaIdToClose);
    // console.log('Current view mode:', this.showClosedIdeas ? 'Closed' : 'Open');

    this.ideasService.closeIdea(this.ideaIdToClose).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.show('Idea closed successfully!', 'success');

          //console.log('Idea closed successfully, refreshing...');

          // Refresh based on current view
          if (this.showClosedIdeas) {
            //console.log('Currently in CLOSED view, loading closed ideas...');
            this.loadClosedIdeas();
          } else {
            //console.log('Currently in OPEN view, loading open ideas...');
            this.loadIdeas();
          }

          // Clear the selected idea
          this.selectedIdea = null;
          this.ideaIdToClose = null;
        } else {
          //console.warn('Failed to close idea:', response.message);
          this.toastService.show(`Failed to close idea: ${response.message}`, 'error');
        }
      },
      error: (error) => {
        //console.error('Error closing idea:', error);
        this.toastService.show('Failed to close idea. Idea has already been closed', 'error');
        this.ideaIdToClose = null;
      }
    });
  }

  closeIdeaInfo() {
    this.showIdeaInfoModal = false;
  }

  displayIdeaInfo() {
    this.showIdeaInfoModal = true;
  }

  dontShowIdeaInfoAgain() {
    localStorage.setItem('hideIdeaInfo', 'true');
    console.log('hide idea information')
    this.showIdeaInfoModal = false;
  }

  leaveGroup() {
    if (!this.groupId) return;

    this.groupsService.leaveGroup(this.groupId).subscribe({
      next: (res) => {
        console.log('Left group response:', res); // check backend response
        this.toastService.show('You have left the group', 'success');          // simple feedback for now
        this.router.navigate(['/groups']);         // redirect after leaving
      },
      error: (err) => {
        console.error('Failed to leave group:', err);
        this.toastService.show('Failed to leave the group', 'error');       // simple error feedback
      }
    });
  }

  acceptRequest(groupId: string, requestUserEmail: string) {
    console.log('Accept request:', requestUserEmail);
    this.groupsService.acceptRequest(groupId, requestUserEmail).subscribe({
      next: () => {
        console.log('Request accepted for user:', requestUserEmail);
        this.pendingRequests = this.pendingRequests.filter(r => r.email !== requestUserEmail);

        if (this.pendingRequests.length === 0) {
          this.closeRequestsModal();
          this.toastService.show('Accepted User request', 'success');
        }
        this.loadGroupMembers();
      },
      error: (err) => console.error('Error accepting request:', err)
    });
  }

  rejectRequest(groupId: string, requestUserEmail: string) {
    console.log('Reject request:', requestUserEmail);
    this.groupsService.rejectRequest(groupId, requestUserEmail).subscribe({
      next: () => {
        console.log('Request rejected for user:', requestUserEmail);
        this.pendingRequests = this.pendingRequests.filter(r => r.email !== requestUserEmail);

        if (this.pendingRequests.length === 0) {
          this.closeRequestsModal();
          this.toastService.show('Rejected User request', 'success');
        }
        this.loadGroupMembers();
      },
      error: (err) => console.error('Error rejecting request:', err)
    });



  }

  closeRequestsModal() {
    this.showRequestsModal = false;
  }



  onUpdateIdeaFromModal(event: { title: string, description: string }): void {
    if (!this.selectedIdea) {
      console.log('No idea selected for modal update');
      return;
    }

    console.log('Updating idea from modal:', event);

    // Create the update data according to your interface
    const updateData: IdeaUpdate = {
      title: event.title,
      description: event.description,
      status: this.selectedIdea.status ?? "open"
    };


    this.ideasService.updateIdea(this.selectedIdea.id, updateData).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Idea updated from modal successfully');

          // Update the idea in the local array
          const index = this.ideas.findIndex(i => i.id === this.selectedIdea.id);
          if (index !== -1) {
            this.ideas[index].title = event.title;
            this.ideas[index].description = event.description;
            this.ideas[index].updatedAt = new Date();

            // Update the ideas array reference
            this.ideas = [...this.ideas];
          }

          // Update selected idea
          this.selectedIdea.title = event.title;
          this.selectedIdea.description = event.description;
          this.selectedIdea.updatedAt = new Date();

          // Close modal and reset
          this.showShareModal = false;
          this.isEditMode = false;

          this.toastService.show('Idea updated successfully!', 'success');
        } else {
          this.toastService.show(`Failed to update idea: ${response.message}`, 'error');
        }
      },
      error: (error) => {
        console.error('Error updating idea from modal:', error);
        this.toastService.show('An error occurred while updating the idea.', 'error');
      }
    });
  }

  loadGroupInfo(): void {
    // Skip if we already have the info from route state
    if (this.groupCreatorIdFromState && this.groupName) {
      console.log('Skipping loadGroupInfo - already have data from route state');
      this.groupCreatorId = this.groupCreatorIdFromState;
      return;
    }

    this.groupsService.getGroups().subscribe({
      next: (response) => {
        console.log('=== GROUP INFO RESPONSE ===');

        if (response.success && response.data) {
          const group = response.data.find((g: any) => g.id === this.groupId);

          if (group) {
            // Only set groupName if not already set from state
            if (!this.groupName) {
              this.groupName = group.name;
            }

            // Try different property names for creator ID
            // Only set if not already from state
            if (!this.groupCreatorId) {
              this.groupCreatorId = group.createdByUserId || group.userId || group.createdBy || group.ownerId || '';
            }

            console.log('Group info loaded:', {
              groupName: this.groupName,
              groupCreatorId: this.groupCreatorId,
              fromState: !!this.groupCreatorIdFromState
            });
          }
        }
      },
      error: (error) => {
        console.error('Error loading group info:', error);
      }
    });
  }


  openMembersModal() {
    console.log('Opening members modal for group:', this.groupId);

    this.dialog.open(GroupMembersModalComponent, {
      width: '600px',
      maxHeight: '90vh',
      data: {
        group: {
          id: this.groupId,
          name: this.groupName,
          memberCount: this.membersCount
        }
      },
      panelClass: 'custom-modal'
    });
  }

  formatIdeaDate(date: any): string {
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


  loadGroupMembers(): void {
    if (!this.groupId) {
      // console.warn("Cannot load members: groupId is missing");
      return;
    }

    this.groupsService.getGroupMembers(this.groupId).subscribe({
      next: (response) => {
        if (response.success) {
          // console.log("Members fetched:", response.data);

          // Save full list
          this.groupMembers = response.data || [];

          // Save count as string
          this.membersCount = `${this.groupMembers.length}`;
        } else {
          // console.warn("Failed to fetch members:", response.message);
          this.groupMembers = [];
          this.membersCount = "0";
        }
      },
      error: (error) => {
        // console.error("Error fetching members:", error);
        this.groupMembers = [];
        this.membersCount = "0";
      }
    });
  }


  loadIdeas(): void {
    this.isLoading = true;
    // console.log('=== LOAD IDEAS CALLED ===');
    // console.log('showClosedIdeas value:', this.showClosedIdeas);
    // console.log('Loading for group:', this.groupId);

    this.ideasService.getIdeasByGroup(this.groupId).subscribe({
      next: async (response) => {
        this.isLoading = false;
        // console.log('=== API RESPONSE RECEIVED ===');
        // console.log('Response success:', response.success);
        // console.log('Response data type:', typeof response.data);
        // console.log('Response data length:', response.data?.length || 0);

        if (response.success && response.data) {
          // console.log('Full response data:', response.data);

          const allIdeas = response.data.map((idea: any) => {
            // console.log(`Mapping idea "${idea.title}":`, {
            //   id: idea.id,
            //   status: idea.status || 'Open',
            //   isPromotedToProject: idea.isPromotedToProject,
            //   isDeleted: idea.isDeleted
            // });

            const mappedIdea: Idea = {
              id: idea.id?.toString() || '',
              title: idea.title || '',
              description: idea.description || '',
              filter: idea.filter || '',
              UserId: idea.userId || idea.UserId || '',
              userId: idea.userId || idea.UserId || '',
              groupId: this.groupId,
              isPromotedToProject: idea.isPromotedToProject || false,
              isDeleted: idea.isDeleted || false,
              createdAt: new Date(idea.createdAt || new Date()),
              updatedAt: new Date(idea.updatedAt || new Date()),
              status: idea.status || 'Open',
              deletedAt: idea.deletedAt ? new Date(idea.deletedAt) : undefined,
              voteCount: 0,
              commentCount: 0,
              userVoted: false,
              userName: idea.userName || '',
              userVoteId: undefined,
              groupName: idea.name || '',
              name: idea.name || '',
              mediaCount: 0
            };
            return mappedIdea;
          });

          //console.log(`Mapped ${allIdeas.length} total ideas`);

          // DEBUG: Log all idea statuses
          // console.log('=== ALL IDEA STATUSES ===');
          // allIdeas.forEach((idea, index) => {
          //   console.log(`${index + 1}. "${idea.title}" - Status: "${idea.status}"`);
          // });

          if (this.showClosedIdeas) {
            // Show only CLOSED ideas
            const closedIdeas = allIdeas.filter(idea => {
              const isClosed = idea.status === 'Closed';
              // console.log(`Checking idea "${idea.title}": status="${idea.status}", isClosed=${isClosed}`);
              return isClosed;
            });
            this.ideas = closedIdeas;
            console.log(`Filtered to ${this.ideas.length} CLOSED ideas`);
          } else {
            // Show only OPEN ideas (not closed)
            const openIdeas = allIdeas.filter(idea => {
              const isOpen = idea.status !== 'Closed';
              console.log(`Checking idea "${idea.title}": status="${idea.status}", isOpen=${isOpen}`);
              return isOpen;
            });
            this.ideas = openIdeas;
            console.log(`Filtered to ${this.ideas.length} OPEN ideas`);
          }

          // If no ideas after filtering, log it
          if (this.ideas.length === 0) {
            console.log('⚠️ No ideas found after filtering!');
            console.log('Current view mode:', this.showClosedIdeas ? 'Closed' : 'Open');
            console.log('Total ideas from API:', allIdeas.length);
          }

          // Then fetch vote counts for all filtered ideas
          if (this.ideas.length > 0) {
            await this.fetchAndUpdateVoteCounts();
          } else {
            console.log('No ideas to fetch vote counts for');
          }

          // Sort based on current mode
          if (this.showClosedIdeas) {
            // For closed ideas, sort by newest first
            this.sortClosedIdeas();
          } else {
            // For open ideas, use existing sort mode
            this.sortIdeas();
          }

          console.log('=== FINAL IDEAS ARRAY ===');
          this.ideas.forEach((idea, index) => {
            console.log(`${index + 1}. "${idea.title}" - Status: "${idea.status}" - Votes: ${idea.voteCount}`);
          });

          // Update selected idea if it exists
          if (this.selectedIdea) {
            const updatedSelectedIdea = this.ideas.find(i => i.id === this.selectedIdea?.id);
            if (updatedSelectedIdea) {
              this.selectedIdea = updatedSelectedIdea;
              console.log('Updated selected idea:', this.selectedIdea.title);
            } else {
              this.selectedIdea = null;
              console.log('Selected idea not found in current view, cleared selection');
            }
          }

          console.log('=== IDEAS LOADING COMPLETE ===');
        } else {
          console.warn('⚠️ Failed to load ideas:', response.message);
          this.ideas = [];
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('❌ Error loading ideas:', error);
        this.ideas = [];
      }
    });
  }




  // Check if current user is the owner of an idea
  isUserIdeaOwner(idea: any): boolean {
    if (!idea || !this.currentUserId) {
      console.log('Ownership check failed: missing data', {
        hasIdea: !!idea,
        hasCurrentUserId: !!this.currentUserId,
        ideaUserId: idea?.userId,
        currentUserId: this.currentUserId
      });
      return false;
    }

    const ideaUserId = idea.userId;

    if (!ideaUserId) {
      console.log('No userId found in idea:', idea);
      return false;
    }

    // Normalize both IDs (trim and lowercase) 
    const normalizedIdeaUserId = ideaUserId.toString().trim().toLowerCase();
    const normalizedCurrentUserId = this.currentUserId.toString().trim().toLowerCase();

    const isOwner = normalizedIdeaUserId === normalizedCurrentUserId;

    console.log(`Ownership check for "${idea.title}":`, {
      ideaUserId,
      currentUserId: this.currentUserId,
      normalizedIdeaUserId,
      normalizedCurrentUserId,
      isOwner
    });

    return isOwner;
  }

  isGroupCreator(): boolean {
    console.log('=== isGroupCreator() CALLED ===');

    // First check if we already have the value from route state
    if (this.isGroupCreatorFromState !== undefined) {
      console.log('Using pre-determined group creator status from route state:', this.isGroupCreatorFromState);
      console.log('Route state values:', {
        isGroupCreatorFromState: this.isGroupCreatorFromState,
        groupCreatorIdFromState: this.groupCreatorIdFromState,
        currentUserId: this.currentUserId
      });
      return this.isGroupCreatorFromState;
    }

    console.log('No route state, checking via IDs...');
    console.log('Current values:', {
      groupCreatorId: this.groupCreatorId,
      currentUserId: this.currentUserId,
      hasGroupCreatorId: !!this.groupCreatorId,
      hasCurrentUserId: !!this.currentUserId
    });

    // Fallback to checking IDs if no state was passed
    if (!this.groupCreatorId || !this.currentUserId) {
      console.log('Group creator check failed - missing IDs:', {
        hasGroupCreatorId: !!this.groupCreatorId,
        hasCurrentUserId: !!this.currentUserId,
        groupCreatorId: this.groupCreatorId,
        currentUserId: this.currentUserId
      });
      return false;
    }

    const normalizedGroupCreatorId = this.groupCreatorId.toString().trim().toLowerCase();
    const normalizedCurrentUserId = this.currentUserId.toString().trim().toLowerCase();

    const isCreator = normalizedGroupCreatorId === normalizedCurrentUserId;

    console.log('Group creator check (calculated):', {
      groupCreatorId: this.groupCreatorId,
      currentUserId: this.currentUserId,
      normalizedGroupCreatorId,
      normalizedCurrentUserId,
      isCreator
    });

    return isCreator;
  }

  openShareModal(editMode = false, editData: any = null): void {
    console.log('Opening share modal in edit mode:', editMode);
    console.log('Edit data:', editData);

    this.isEditMode = editMode;

    // Always reset modalEditData to a valid object
    this.modalEditData = {
      id: '',
      title: '',
      description: ''
    };

    // If in edit mode, populate with the idea data
    if (editMode && editData) {
      this.modalEditData = {
        id: editData.id || '',
        title: editData.title || '',
        description: editData.description || ''
      };
    }

    this.showShareModal = true;
    console.log('Modal edit data set to:', this.modalEditData);
  }
  closeShareModal(): void {
    this.showShareModal = false;
    this.isEditMode = false;
    this.shareIdeaForm.reset();
    this.selectedIdeaFiles = [];
    this.ideaUploadStatus = '';
  }


  onFileSelected(
    event: Event,
    target: 'idea' | 'comment'
  ): void {
    const currentFiles =
      target === 'idea'
        ? this.selectedIdeaFiles
        : this.selectedCommentFiles;

    const result = processSelectedFiles(event, currentFiles);

    if (target === 'idea') {
      this.selectedIdeaFiles = result.files;
    } else {
      this.selectedCommentFiles = result.files;
    }

    result.errors.forEach(msg =>
      this.toastService.show(msg, 'warning')
    );
  }

  removeFile(index: number, target: 'idea' | 'comment'): void {
    if (target === 'idea') {
      this.selectedIdeaFiles = removeFileAtIndex(this.selectedIdeaFiles, index);
    } else {
      this.selectedCommentFiles = removeFileAtIndex(this.selectedCommentFiles, index);
    }
  }

  formatIdeaCommentFileSize(bytes: number): string {
    return formatFileSize(bytes);
  }

  detectFileMediaType(file: File): MediaType {
    return detectMediaType(file);
  }

  // Update your existing onShareIdea() method to handle media
  async onShareIdea(ideaData: { title: string; description: string }): Promise<void> {
    if (this.shareIdeaForm.invalid) {
      this.shareIdeaForm.markAllAsTouched();
      this.toastService.show('Please fill in all required fields', 'error');
      return;
    }

    this.isSubmitting = true;
    this.ideaUploadStatus = 'Creating idea...';

    const filterArray = [
      this.shareIdeaForm.get('type')?.value,
      this.shareIdeaForm.get('domain')?.value,
      this.shareIdeaForm.get('impact')?.value
    ].filter(x => x);

    const request: CreateIdeaRequest = {
      title: ideaData.title,
      description: ideaData.description,
      groupId: this.groupId,
      filter: filterArray
    };

    try {
      // Create idea
      const ideaResponse = await firstValueFrom(
        this.ideasService.createIdea(request)
      );

      if (!ideaResponse.success || !ideaResponse.data?.id) {
        throw new Error('Failed to create idea');
      }

      const ideaId = ideaResponse.data.id;

      // If there are files, upload them
      if (this.selectedIdeaFiles.length > 0) {
        this.ideaUploadStatus = `Attaching ${this.selectedIdeaFiles.length} media file(s)...`;

        // Upload each file with the idea ID
        const uploadPromises = this.selectedIdeaFiles.map(file =>
          firstValueFrom(
            this.mediaService.uploadMedia(
              file,
              this.detectMediaType(file),
              Number(ideaId), // the new idea ID
              undefined,
              undefined
            )
          )
        );

        // Wait for all uploads
        await Promise.all(uploadPromises);

        this.toastService.show(`Idea created with ${this.selectedIdeaFiles.length} media file(s)`, 'success');
      } else {
        this.toastService.show('Idea created successfully!', 'success');
      }

      this.closeShareModal();
      this.loadIdeas();
      this.selectedIdeaFiles = [];
      this.ideaUploadStatus = '';

    } catch (error: any) {
      console.error('Error creating idea:', error);
      this.ideaUploadStatus = 'Failed to create idea. Please try again.';
      this.toastService.show(this.ideaUploadStatus, 'error');
    } finally {
      this.isSubmitting = false;
    }
  }


  openDescriptionModal(idea: any): void {
    alert(`Full Description:\n\n${idea.description}`);
  }

  onViewIdea(ideaId: string): void {
    this.ideasService.getIdea(this.groupId, ideaId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          alert(`Idea Details:\n\nTitle: ${response.data.title}\n\nDescription: ${response.data.description}\n\nCreated: ${new Date(response.data.createdAt).toLocaleDateString()}`);
        }
      },
      error: (error) => {
        console.error('Error loading idea:', error);
      }
    });
  }

  trackById(index: number, idea: Idea): string {
    return idea.id;
  }

  onVote(ideaId: string): void {
    console.log(`=== VOTING FOR IDEA ${ideaId} ===`);
    this.isVoting = true;

    this.ideasService.voteForIdea(this.groupId, ideaId).subscribe({
      next: (response) => {
        this.isVoting = false;
        console.log('Vote response:', response);

        if (response.success && response.data) {
          const voteId = response.data?.id;

          // Update the idea in the list
          const idea = this.ideas.find(i => i.id === ideaId);
          if (idea) {
            idea.userVoted = true;
            idea.userVoteId = voteId?.toString();

            // Increment vote count locally

            idea.voteCount = (idea.voteCount || 0) + 1;
            idea.userVoted = true;
            idea.userVoteId = voteId?.toString();

            if (this.selectedIdea && this.selectedIdea.id === ideaId) {
              this.selectedIdea = { ...idea }
            }
          }

          console.log('✓ Vote successful!');
        } else {
          this.toastService.show(`Failed to vote: ${response.message}`, 'error');
        }
      },
      error: (error) => {
        this.isVoting = false;
        console.error('Error voting:', error);
        this.toastService.show('An error occurred while voting.', 'error');
      }
    });
  }

  onUnvote(idea: Idea, event?: Event): void {
    if (event) event.stopPropagation();

    console.log(`=== UNVOTING FOR IDEA ${idea.id} ===`);

    if (!idea.userVoteId) {
      console.error('Cannot unvote: No vote ID found');
      this.toastService.show('Cannot unvote: No vote ID found. Please refresh the page.', 'error');
      return;
    }

    this.isUnvoting = true;
    this.ideasService.removeVote(idea.userVoteId).subscribe({
      next: (response) => {
        this.isUnvoting = false;
        console.log('Unvote response:', response);

        if (response.success) {
          // Update local state
          idea.userVoted = false;
          idea.voteCount = Math.max(0, (idea.voteCount || 1) - 1);
          idea.userVoteId = undefined;

          // If this idea is currently selected, update it too
          if (this.selectedIdea && this.selectedIdea.id === idea.id) {
            this.selectedIdea.userVoted = false;
            this.selectedIdea.voteCount = idea.voteCount;
            this.selectedIdea.userVoteId = undefined;
          }

          console.log('✓ Unvote successful!');
        } else {
          this.toastService.show(`Failed to unvote: ${response.message}`, 'error');
        }
      },
      error: (error) => {
        this.isUnvoting = false;
        console.error('Error unvoting:', error);

        if (error.status === 404) {
          this.toastService.show('Vote not found. It may have already been removed.', 'warning');
          // Force refresh the idea
          idea.userVoted = false;
          idea.userVoteId = undefined;
        } else {
          this.toastService.show('An error occurred while unvoting.', 'error');
        }
      }
    });
  }

  // Add property
  showVotersModalView = false;

  // Update onViewVoters method
  onViewVoters(idea: Idea, event?: Event): void {
    if (event) event.stopPropagation();

    this.isViewingVoters = true;
    this.selectedIdeaForVoters = idea;
    this.showVotersModalView = true;

    this.ideasService.getVotesForIdea(idea.id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.votersList = response.data;
        } else {
          this.toastService.show(`Failed to get voters: ${response.message}`, 'error');
          this.closeVotersModal();
        }
        this.isViewingVoters = false;
      },
      error: (error) => {
        this.isViewingVoters = false;
        console.error('Error fetching voters:', error);
        this.toastService.show('Failed to load voters', 'error');
        this.closeVotersModal();
      }
    });
  }
  // Close voters modal
  closeVotersModal(): void {
    this.showVotersModalView = false;
    this.selectedIdeaForVoters = null;
    this.votersList = [];
  }

  // Helper method for voter initials
  getVoterInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  // Format vote date
  formatVoteDate(date: any): string {
    if (!date) return 'unknown date';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'invalid date';
    }
  }

  /**
   * Check votes for all ideas in the list
   */
  async checkUserVotesForAllIdeas(): Promise<void> {
    console.log('=== CHECKING USER VOTES FOR ALL IDEAS ===');
    console.log('Current User ID:', this.currentUserId);

    if (!this.currentUserId) {
      console.warn('No current user ID, skipping vote check');
      return;
    }

    // Create an array of promises for parallel processing
    const voteChecks = this.ideas.map(async (idea, index) => {
      console.log(`[${index + 1}/${this.ideas.length}] Checking votes for idea "${idea.title}"...`);

      try {
        const voteInfo = await this.getUserVoteForIdea(idea.id);

        if (voteInfo.hasVoted) {
          idea.userVoted = true;
          idea.userVoteId = voteInfo.voteId;
          console.log(`✓ User has voted for "${idea.title}"`, {
            voteId: voteInfo.voteId,
            voteTime: voteInfo.voteTime
          });
        } else {
          idea.userVoted = false;
          idea.userVoteId = undefined;
          console.log(`✗ User has NOT voted for "${idea.title}"`);
        }
      } catch (error) {
        console.error(`Error checking votes for idea ${idea.id}:`, error);
        idea.userVoted = false;
        idea.userVoteId = undefined;
      }

      return idea;
    });

    // Wait for all checks to complete
    await Promise.all(voteChecks);

    // Update the UI
    this.ideas = [...this.ideas];
    console.log('=== VOTE CHECK COMPLETE ===');
    this.logVoteStatus();
  }

  /**
   * Get user's vote information for a specific idea
   */
  private getUserVoteForIdea(ideaId: string): Promise<{ hasVoted: boolean, voteId?: string, voteTime?: string }> {
    return new Promise((resolve, reject) => {
      this.ideasService.getVotesForIdea(ideaId).subscribe({
        next: (response) => {
          if (response.success && response.data && Array.isArray(response.data)) {
            console.log(`Votes for idea ${ideaId}:`, {
              count: response.data.length,
              voters: response.data.map((v: any) => ({
                userId: v.userId,
                userName: v.userName,
                voteId: v.voteId
              }))
            });

            // Find vote by current user that's not deleted
            const userVote = response.data.find((vote: any) => {
              const voteUserId = vote.userId || vote.UserId;
              const isCurrentUser = voteUserId?.toString() === this.currentUserId;
              const isNotDeleted = !vote.isDeleted;

              return isCurrentUser && isNotDeleted;
            });

            if (userVote) {
              console.log(`Found user vote for idea ${ideaId}:`, {
                voteId: userVote.voteId,
                time: userVote.time
              });

              resolve({
                hasVoted: true,
                voteId: userVote.voteId?.toString(),
                voteTime: userVote.time
              });
            } else {
              console.log(`No active vote found for current user on idea ${ideaId}`);
              resolve({ hasVoted: false });
            }
          } else {
            console.log(`No votes found for idea ${ideaId} or invalid response`);
            resolve({ hasVoted: false });
          }
        },
        error: (error) => {
          console.error(`Error fetching votes for idea ${ideaId}:`, error);
          reject(error);
        }
      });
    });
  }

  /**
   * Log current vote status for debugging
   */
  private logVoteStatus(): void {
    console.log('=== CURRENT VOTE STATUS ===');
    this.ideas.forEach((idea, index) => {
      console.log(`${index + 1}. "${idea.title}":`, {
        voted: idea.userVoted,
        voteId: idea.userVoteId,
        totalVotes: idea.voteCount
      });
    });

    const votedCount = this.ideas.filter(i => i.userVoted).length;
    console.log(`Summary: ${votedCount}/${this.ideas.length} ideas voted`);
  }

  // Add this helper method for displaying voters
  private showVotersModal(idea: Idea, voters: any[]): void {
    let message = `Voters for "${idea.title}":\n\n`;

    if (voters.length === 0) {
      message += 'No votes yet';
    } else {
      voters.forEach((voter, index) => {
        const time = new Date(voter.time).toLocaleString();
        message += `${index + 1}. ${voter.userName} (${voter.userEmail})\n`;
        message += `   Voted: ${time}\n\n`;
      });
    }

    // You could use a proper modal component here instead
    alert(message);
  }

  // Add this method to close the voters view
  closeVotersView(): void {
    this.selectedIdeaForVoters = null;
    this.votersList = [];
  }

  // EDIT IDEA METHODS
  startEditing(): void {
    this.showShareModal = true;
    this.isEditMode = true;

    this.modalEditData = {
      title: this.selectedIdea.title,
      description: this.selectedIdea.description
    };

    // Patch form values with existing idea data
    this.shareIdeaForm.patchValue({
      title: this.selectedIdea.title,
      description: this.selectedIdea.description,
      type: this.selectedIdea.type || '',
      domain: this.selectedIdea.domain || '',
      impact: this.selectedIdea.impact || ''
    });

    // Update character counts
    this.shareTitleCount = this.selectedIdea.title?.length || 0;
    this.shareDescCount = this.selectedIdea.description?.length || 0;
  }

  // Method to fetch and update vote counts for all ideas
  async fetchAndUpdateVoteCounts(): Promise<void> {
    console.log('=== FETCHING VOTE COUNTS ===');

    // Create an array of promises to fetch votes for each idea
    const voteCountPromises = this.ideas.map(async (idea) => {
      try {
        const response = await this.ideasService.getVotesForIdea(idea.id).toPromise();

        if (response?.success && response.data) {
          // Count only active (non-deleted) votes
          const activeVotes = response.data.filter((vote: any) => !vote.isDeleted);
          idea.voteCount = activeVotes.length;

          // Only check promotion readiness for OPEN ideas
          if (idea.status !== 'Closed') {
            const totalGroupMembers = `${this.groupMembers.length}`;
            const PROMOTION_THRESHOLD = Math.ceil(Number(totalGroupMembers) * 0.5);
            idea.isReadyForPromotion = idea.voteCount >= PROMOTION_THRESHOLD;
          } else {
            idea.isReadyForPromotion = false; // Closed ideas can't be promoted
          }

          console.log(`Idea "${idea.title}" (${idea.status}): ${activeVotes.length} votes`);

          // Also check if current user has voted
          const userVote = activeVotes.find((vote: any) =>
            vote.userId?.toString() === this.currentUserId
          );

          if (userVote) {
            idea.userVoted = true;
            idea.userVoteId = userVote.voteId?.toString();
            console.log(`  - User has voted (voteId: ${userVote.voteId})`);
          }
        } else {
          idea.voteCount = 0;
          idea.isReadyForPromotion = false;
          console.log(`Idea "${idea.title}": 0 votes (no data or error)`);
        }
      } catch (error) {
        console.error(`Error fetching votes for idea ${idea.id}:`, error);
        idea.voteCount = 0;
        idea.isReadyForPromotion = false;
      }

      return idea;
    });

    // Wait for all vote counts to be fetched
    await Promise.all(voteCountPromises);

    console.log('=== VOTE COUNTS UPDATED ===');

    // Update the array reference to trigger change detection
    this.ideas = [...this.ideas];

    // Log final vote counts
    console.log('Final vote counts:');
    this.ideas.forEach((idea, index) => {
      console.log(`${index + 1}. "${idea.title}" (${idea.status}): ${idea.voteCount} votes, userVoted: ${idea.userVoted}`);
    });
  }

  //Promote Idea to project and create project
  onPromoteIdea(idea: Idea, event?: Event): void {
    event?.stopPropagation();

    if (idea.isPromotedToProject) {
      alert('Already promoted!');
      return;
    }

    this.currentIdeaToPromote = idea;
    this.projectData = {
      title: idea.title,
      description: idea.description,
      overseenByEmail: ''
    };
    this.showProjectModal = true;
  }

  createProjectFromIdea(): void {
    if (!this.currentIdeaToPromote || !this.groupId) return;
    if (!this.projectData.overseenByEmail) {
      alert('Enter overseer email');
      return;
    }

    this.isPromoting = true;
    const idea = this.currentIdeaToPromote;

    this.ideasService.promoteIdea({
      ideaId: idea.id,
      groupId: this.groupId
    }).subscribe({
      next: (promoteRes) => {
        if (promoteRes.success) {
          this.projectService.createProject(
            this.groupId,
            idea.id,
            this.projectData
          ).subscribe({
            next: (projectRes) => {
              if (projectRes.success && projectRes.data?.projectId) {
                const projectId = projectRes.data?.projectId;
                this.handleSuccess(idea, projectRes);
              }
              else {
                this.handleProjectError('Failed to promote idea');
              }
            },

            error: (err) => this.handleProjectError(err)
          });
        } else {
          this.isPromoting = false;
          alert('Promotion failed');
        }
      },
      error: (err) => {
        this.isPromoting = false;
        alert('Error promoting');
      }
    });
  }


  private handleSuccess(idea: Idea, response: any): void {
    this.isPromoting = false;
    this.showProjectModal = false;

    if (response.success) {
      idea.isPromotedToProject = true;
      idea.projectId = response.projectId;
      idea.status = 'Promoted';

      if (this.selectedIdea?.id === idea.id) {
        this.selectedIdea.isPromotedToProject = true;
        this.selectedIdea.status = 'Promoted';
      }

      this.ideas = [...this.ideas];
      this.toastService.show('Project created', 'success');
      this.selectedIdea = false;
      this.loadIdeas();

      this.currentIdeaToPromote = null;
      this.projectData = { title: '', description: '', overseenByEmail: '' };
    } else {
      alert('Project creation failed');
    }
  }

  private handleProjectError(error: any): void {
    this.isPromoting = false;

    if (error.status === 404) {
      alert(`User not found: ${this.projectData.overseenByEmail}`);
    } else {
      alert('Failed to create project');
    }
  }

  closeProjectModal(): void {
    if (!this.isPromoting) {
      this.showProjectModal = false;
      this.currentIdeaToPromote = null;
    }
  }


  // DELETE IDEA METHOD
  onDeleteIdea() {
    if (!this.ideaIdToDelete) return;

    this.ideasService.deleteIdea(this.ideaIdToDelete).subscribe({
      next: (response) => {
        console.log('Delete response:', response);

        if (response.success) {
          console.log('Delete successful');

          // 1. Remove from local ideas array (immediate UI update)
          const index = this.ideas.findIndex(idea => idea.id === this.ideaIdToDelete);
          if (index !== -1) {
            this.ideas.splice(index, 1);
            this.ideas = [...this.ideas]; // Create new reference for change detection
          }

          // 2. If we're viewing this idea in details panel, close it
          if (this.selectedIdea?.id === this.ideaIdToDelete) {
            this.selectedIdea = null;
            this.isEditMode = false; // Exit edit mode if open
            console.log('Closed details panel for deleted idea');
          }

          this.toastService.show('Idea deleted successfully!', 'success');
        } else {
          this.toastService.show('Failed to delete idea: ${response.message}', 'error');
        }
        this.cancelDeleteIdea();
      },

      error: (error) => {
        this.toastService.show('Failed to delete idea. Idea may have been promoted to a project', 'error');
        this.cancelDeleteIdea();
      }
    });
  }

  deleteGroup() {
    this.groupsService.deleteGroup(this.groupId).subscribe({
      next: () => {
        this.router.navigate(['/groups']);
      },
      error: () => {
        alert('Failed to delete group');
      }
    });
  }
  openTransferOwnershipModal() {
    this.showAdminLeaveModal = false;
    this.showTransferOwnershipModal = true;
  }
  transferOwnership() {
    if (!this.newOwnerEmail) {
      alert('Please select a member');
      return;
    }

    this.groupsService.transferOwnership(this.groupId, this.newOwnerEmail)
      .subscribe({
        next: () => {
          this.showTransferOwnershipModal = false;
          this.router.navigate(['/groups']);
          this.toastService.show(`Transfer of ownership successfully transferred to ${this.newOwnerEmail}`, 'success')
        },
        error: () => {
          this.toastService.show('Failed to transfer ownership', 'error');
        }
      });
  }
}
