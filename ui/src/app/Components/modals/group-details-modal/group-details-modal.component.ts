import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-group-details-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './group-details-modal.component.html',
  styleUrls: ['./group-details-modal.component.scss']
})
export class GroupDetailsModalComponent {
  constructor(
    public dialogRef: MatDialogRef<GroupDetailsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { group: any }
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  formatDate(date: any): string {
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
}