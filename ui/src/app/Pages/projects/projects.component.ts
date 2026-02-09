import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Project, ProjectStatus } from '../../Interfaces/Projects/Project';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EditProjectModalComponent } from '../../Components/modals/edit-project-modal/edit-project-modal.component';
import { ProjectsService } from '../../Services/projects/projects.service';
import { AuthService } from '../../Services/auth/auth.service';
import { Toast, ToastService } from '../../Services/toast.service';
import { MediaService } from '../../Services/media.service';
import { forkJoin } from 'rxjs';
import { Media } from '../../Interfaces/Media/media-interface';
import { MediaComponent } from '../media/media.component';

type ProjectWithMedia = Project & { media?: Media[] };

@Component({
    selector: 'app-projects',
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogModule, MediaComponent],
    templateUrl: './projects.component.html',
    styleUrl: './projects.component.scss'
})
export class ProjectsComponent implements OnInit {
    projects: ProjectWithMedia[] = [];
    ProjectStatus = ProjectStatus;

    private projectsService = inject(ProjectsService);
    private mediaService = inject(MediaService);
    private dialog = inject(MatDialog);
    private authService = inject(AuthService);
    currentUserId: string = '';

    constructor(
        private toastService: ToastService
    ) {}

    ngOnInit(): void {
        this.currentUserId = this.authService.getUserId();
        this.loadProjects();
    }

    canEdit(project: Project): boolean {
        // Strict check: Only overseer can edit
        return this.currentUserId === project.overseenById;
    }

    loadProjects(): void {
    this.projectsService.getMyProjects().subscribe({
        next: (projectsData) => {
            this.projects = projectsData as ProjectWithMedia[];
            const mediaRequests = this.projects.map(project =>
                this.mediaService.viewMedia(undefined, undefined, Number(project.id))
            );

            forkJoin(mediaRequests).subscribe({
                next: (mediaResults) => {
                    this.projects.forEach((project, idx) => {
                        project.media = mediaResults[idx].data || [];
                    });
                    //console.log('Projects with media:', this.projects);
                },
                error: (err) => {
                    //console.error('Failed to fetch media for projects', err);
                    this.toastService.show('Failed to fetch media for project', 'error');
                }
            });
        },
        error: (err) => {
            //console.error('Failed to load projects', err);
            this.toastService.show('Failed to load projects', 'error');
        }
    });
}

    // loadProjects(): void {
    //     this.projectsService.getMyProjects().subscribe({
    //         next: (data) => {
    //             this.projects = data;
    //         },
    //         error: (err) => {
    //             console.error('Failed to load projects', err);
    //             // Optionally show error toast
    //         }
    //     });
    // }

    getStatusLabel(status: ProjectStatus): string {
        return ProjectStatus[status];
    }

    getStatusClass(status: ProjectStatus): string {
        switch (status) {
            case ProjectStatus.Planning: return 'status-planning';
            case ProjectStatus.Active: return 'status-active';
            case ProjectStatus.Completed: return 'status-completed';
            case ProjectStatus.Shelved: return 'status-shelved';
            case ProjectStatus.Cancelled: return 'status-cancelled';
            default: return '';
        }
    }

    openEditModal(project: Project): void {
        const dialogRef = this.dialog.open(EditProjectModalComponent, {
            width: '500px',
            data: { project }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                // Prepare update DTO
                const updateDto = {
                    title: result.title,
                    description: result.description,
                    // Convert numeric enum to string key for backend
                    status: ProjectStatus[result.status],
                    endedAt: result.endedAt ? new Date(result.endedAt).toISOString() : null
                };

                this.projectsService.updateProject(project.id, updateDto).subscribe({
                    next: (updatedProject) => {
                        console.log('Project updated successfully');
                        this.toastService.show('Project updated successfuly', 'success');
                        this.loadProjects(); // Reload to get fresh data
                    },
                    error: (err) => {
                        console.error('Failed to update project', err);
                        this.toastService.show('Failed to update project', 'error');
                    }
                });
            }
        });
    }
}

