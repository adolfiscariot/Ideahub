import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-tasks',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <div style="padding: 50px; text-align: center; font-family: sans-serif;">
      <h1>Tasks Page Works</h1>
      <p>This is a placeholder for the project tasks, subtasks, and timesheets.</p>
      <button routerLink="/projects" style="padding: 10px 20px; cursor: pointer;">Back to Projects</button>
    </div>
  `
})
export class TasksComponent { }
