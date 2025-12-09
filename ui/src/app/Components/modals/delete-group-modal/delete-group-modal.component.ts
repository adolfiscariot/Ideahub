import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-delete-group-modal',
  templateUrl: './delete-group-modal.component.html',
  styleUrls: ['./delete-group-modal.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule  // Only need ReactiveFormsModule, not CommonModule
  ]
})
export class DeleteGroupModalComponent {
  confirmForm: FormGroup;
  isSubmitting = false;

  constructor(
    public dialogRef: MatDialogRef<DeleteGroupModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { groupName: string },
    private fb: FormBuilder
  ) {
    this.confirmForm = this.fb.group({
      confirmText: ['', [
        Validators.required,
        Validators.pattern(/^DELETE$/)
      ]]
    });
  }

  onConfirm(): void {
    if (this.confirmForm.valid) {
      this.isSubmitting = true;
      setTimeout(() => {
        this.dialogRef.close('confirm');
      }, 500);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  get confirmText() {
    return this.confirmForm.get('confirmText');
  }
}