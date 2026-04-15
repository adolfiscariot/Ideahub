import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { TaskService } from '../../Services/task.service';
import { TaskDetails } from '../../Interfaces/Tasks/task-interface';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    @if (!accessDenied) {
      <div class="tasks-container">
        <div class="header">
          <h1>Task Workspace</h1>
          <p>Project ID: {{ projectId }}</p>
        </div>
        
        <div class="content">
          <!-- Task content will go here -->
          <div style="padding: 50px; text-align: center;">
              <mat-icon style="font-size: 48px; width: 48px; height: 48px; color: #6366f1;">construction</mat-icon>
              <h2>Workspace Under Construction</h2>
              <p>You have access! We are currently building the task management interface.</p>
              <button routerLink="/projects" class="btn-back">Back to Projects</button>
          </div>
        </div>
      </div>
    } @else {
      <div class="restricted-container">
        <mat-icon class="lock-icon">lock</mat-icon>
        <h1>Access Restricted</h1>
        <p>You do not have permissions to view this project workspace. <br> 
           Only the Project Overseer and assigned members can enter.</p>
        <button routerLink="/projects" class="btn-back">Return to Projects</button>
      </div>
    }

    <style>
      .tasks-container, .restricted-container {
        padding: 40px;
        max-width: 1200px;
        margin: 0 auto;
        font-family: 'Inter', sans-serif;
        text-align: center;
      }
      .restricted-container {
        margin-top: 100px;
      }
      .lock-icon {
        font-size: 80px;
        width: 80px;
        height: 80px;
        color: #ef4444;
        margin-bottom: 20px;
      }
      h1 { color: #1e293b; font-size: 2rem; margin-bottom: 10px; }
      p { color: #64748b; margin-bottom: 30px; font-size: 1.1rem; }
      .btn-back {
        background: #6366f1;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }
      .btn-back:hover { background: #4f46e5; }
    </style>
  `
})
export class TasksComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private taskService = inject(TaskService);

  projectId: number | null = null;
  tasks: TaskDetails[] = [];
  accessDenied = false;
  isLoading = true;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('projectId');
    if (idParam) {
      this.projectId = Number(idParam);
      this.loadTasks();
    }
  }

  loadTasks(): void {
    if (!this.projectId) return;

    this.isLoading = true;
    this.taskService.getProjectTasks(this.projectId).subscribe({
      next: (response) => {
        if (response.success) {
          this.tasks = response.data || [];
          this.accessDenied = false;
        } else {
          // This handles cases where status is false but not a hard 403
          this.accessDenied = true;
        }
        this.isLoading = false;
      },
      error: (err) => {
        if (err.status === 403) {
          this.accessDenied = true;
        }
        this.isLoading = false;
      }
    });
  }
}
