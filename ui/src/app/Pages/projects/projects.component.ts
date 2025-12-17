import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseLayoutComponent } from '../../Components/base-layout/base-layout.component';
import { Project, ProjectStatus } from '../../Interfaces/Projects/Project';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EditProjectModalComponent } from '../../Components/modals/edit-project-modal/edit-project-modal.component';
import { ProjectsService } from '../../Services/projects/projects.service';
import { AuthService } from '../../Services/auth/auth.service';

@Component({
    selector: 'app-projects',
    standalone: true,
    imports: [CommonModule, BaseLayoutComponent, FormsModule, MatDialogModule],
    templateUrl: './projects.component.html',
    styleUrl: './projects.component.scss'
})
export class ProjectsComponent implements OnInit {
    projects: Project[] = [];
    ProjectStatus = ProjectStatus;

    private projectsService = inject(ProjectsService);
    private dialog = inject(MatDialog);
    private authService = inject(AuthService);
    currentUserId: string = '';

    constructor() { }

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
            next: (data) => {
                this.projects = data;
            },
            error: (err) => {
                console.error('Failed to load projects', err);
                // Optionally show error toast
            }
        });
    }

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
                    // Overseer update logic could go here if the modal supports it
                };

                this.projectsService.updateProject(project.id, updateDto).subscribe({
                    next: (updatedProject) => {
                        console.log('Project updated successfully');
                        this.loadProjects(); // Reload to get fresh data
                    },
                    error: (err) => {
                        console.error('Failed to update project', err);
                        alert('Failed to update project');
                    }
                });
            }
        });
    }
}

