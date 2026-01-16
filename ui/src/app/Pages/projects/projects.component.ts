import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Project, ProjectStatus } from '../../Interfaces/Projects/Project';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EditProjectModalComponent } from '../../Components/modals/edit-project-modal/edit-project-modal.component';
import { ViewProjectModalComponent } from '../../Components/modals/view-project-modal/view-project-modal.component';
import { ProjectsService } from '../../Services/projects/projects.service';
import { AuthService } from '../../Services/auth/auth.service';
import { Toast, ToastService } from '../../Services/toast.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPencilSquare, heroEye, heroUserGroup, heroLightBulb, heroRectangleStack } from '@ng-icons/heroicons/outline';

@Component({
    selector: 'app-projects',
    standalone: true,
    imports: [CommonModule, FormsModule, MatDialogModule, NgIconComponent],
    viewProviders: [provideIcons({ heroPencilSquare, heroEye, heroUserGroup, heroLightBulb, heroRectangleStack })],
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

    constructor(
        private toastService: ToastService
    ) { }

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

    openViewModal(project: Project): void {
        const dialogRef = this.dialog.open(ViewProjectModalComponent, {
            width: '600px',
            maxHeight: '90vh',
            panelClass: 'custom-modal',
            data: {
                project,
                canEdit: this.canEdit(project)
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result?.action === 'edit') {
                this.openEditModal(result.project);
            }
        });
    }

    openEditModal(project: Project): void {
        const dialogRef = this.dialog.open(EditProjectModalComponent, {
            width: '500px',
            data: { project }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                const updateDto = {
                    title: result.title,
                    description: result.description,
                    status: ProjectStatus[result.status],
                    endedAt: result.endedAt ? new Date(result.endedAt).toISOString() : null
                };

                this.projectsService.updateProject(project.id, updateDto).subscribe({
                    next: () => {
                        this.toastService.show('Project updated successfully', 'success');
                        this.loadProjects();
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
