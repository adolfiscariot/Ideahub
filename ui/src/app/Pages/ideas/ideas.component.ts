import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IdeasService } from '../../Services/ideas.services';
import { GroupsService } from '../../Services/groups.service';
import { Idea, CreateIdeaRequest } from '../../Interfaces/Ideas/idea-interfaces';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ideas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ideas.component.html',
  styleUrls: ['./ideas.component.scss']
})
export class IdeasComponent implements OnInit, OnDestroy {
  groupId: string = '';
  groupName: string = '';
  ideas: Idea[] = [];
  isLoading: boolean = false;
  isSubmitting: boolean = false;
  showCreateForm: boolean = false;
  
  createIdeaForm: FormGroup;
  
  private routeSub: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ideasService: IdeasService,
    private groupsService: GroupsService,
    private fb: FormBuilder
  ) {
    this.createIdeaForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]]
    });
  }

  ngOnInit(): void {
    this.routeSub = this.route.params.subscribe(params => {
      this.groupId = params['groupId'];
      this.loadGroupInfo();
      this.loadIdeas();
    });
  }

  ngOnDestroy(): void {
    this.routeSub.unsubscribe();
  }

  loadGroupInfo(): void {
    // Load group info to get the name
    this.groupsService.getGroups().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const group = response.data.find((g: any) => g.id === this.groupId);
          if (group) {
            this.groupName = group.name;
          }
        }
      },
      error: (error) => {
        console.error('Error loading group info:', error);
      }
    });
  }

  loadIdeas(): void {
    this.isLoading = true;
    this.ideasService.getIdeasByGroup(this.groupId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.ideas = response.data;
        } else {
          console.error('Failed to load ideas:', response.message);
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading ideas:', error);
      }
    });
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      this.createIdeaForm.reset();
    }
  }

  onCreateIdea(): void {
    if (this.createIdeaForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    const request: CreateIdeaRequest = {
      ...this.createIdeaForm.value,
      groupId: this.groupId
    };

    this.ideasService.createIdea(request).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          this.showCreateForm = false;
          this.createIdeaForm.reset();
          this.loadIdeas(); // Refresh the list
        } else {
          alert(`Failed to create idea: ${response.message}`);
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error creating idea:', error);
        alert('An error occurred while creating the idea.');
      }
    });
  }

  onViewIdea(ideaId: string): void {
    // Navigate to idea detail page or open modal
    this.ideasService.getIdea(this.groupId, ideaId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          alert(`Idea Details:\n\nTitle: ${response.data.title}\n\nDescription: ${response.data.description}\n\nCreated: ${new Date(response.data.createdAt).toLocaleDateString()}\n\nStatus: ${response.data.status}`);
        }
      },
      error: (error) => {
        console.error('Error loading idea:', error);
      }
    });
  }

 
canPromoteIdea(idea: Idea): boolean {
  const currentUserId = 'current-user-id'; // replace with actual current user ID logic
  // Example logic: only the idea owner or a specific role can promote
  return idea.userId === currentUserId && !idea.isPromotedToProject && !idea.isDeleted;
}


trackById(index: number, idea: Idea): string {
  return idea.id;
}

  onVote(ideaId: string): void {
    this.ideasService.voteForIdea({ ideaId, groupId: this.groupId }).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadIdeas(); // Refresh to update vote count
        } else {
          alert(`Failed to vote: ${response.message}`);
        }
      },
      error: (error) => {
        console.error('Error voting:', error);
      }
    });
  }

  onPromote(ideaId: string): void {
    if (confirm('Are you sure you want to promote this idea to a project?')) {
      this.ideasService.promoteIdea({ ideaId, groupId: this.groupId }).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadIdeas(); // Refresh to update status
          } else {
            alert(`Failed to promote idea: ${response.message}`);
          }
        },
        error: (error) => {
          console.error('Error promoting idea:', error);
        }
      });
    }
  }

  onDeleteIdea(ideaId: string): void {
    if (confirm('Are you sure you want to delete this idea?')) {
      this.ideasService.deleteIdea(ideaId).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadIdeas(); // Refresh the list
          } else {
            alert(`Failed to delete idea: ${response.message}`);
          }
        },
        error: (error) => {
          console.error('Error deleting idea:', error);
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/groups']);
  }

  // Form getters for easy access
  get title() { return this.createIdeaForm.get('title'); }
  get description() { return this.createIdeaForm.get('description'); }
}