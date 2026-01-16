import { Component, EventEmitter, Input, Output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark, heroUserGroup, heroLockClosed, heroLockOpen } from '@ng-icons/heroicons/outline';
import { updateCharCount } from '../../../Components/utils/char-count-util';
import { Subject, takeUntil } from 'rxjs';
import { ButtonsComponent } from '../../buttons/buttons.component';

@Component({
  selector: 'app-create-group-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIconComponent, ButtonsComponent],
  viewProviders: [provideIcons({ heroXMark, heroUserGroup, heroLockClosed, heroLockOpen })],
  templateUrl: './create-group-modal.component.html',
  styleUrl: './create-group-modal.component.scss'
})
export class CreateGroupModalComponent implements OnDestroy {
  @Input() isVisible: boolean = false;
  @Input() isSubmitting: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() create = new EventEmitter<any>();

  createGroupForm: FormGroup;
  nameCount = 0;
  descCount = 0;
  nameLimitReached = false;
  descLimitReached = false;
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder) {
    this.createGroupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      isPublic: [true, Validators.required]
    });

    this.setupCharCounters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupCharCounters(): void {
    this.createGroupForm.get('name')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const result = updateCharCount(this.createGroupForm, 'name', 100);
        this.nameCount = result.count;
        this.nameLimitReached = result.limitReached;
      });

    this.createGroupForm.get('description')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const result = updateCharCount(this.createGroupForm, 'description', 500);
        this.descCount = result.count;
        this.descLimitReached = result.limitReached;
      });
  }

  closeModal() {
    this.createGroupForm.reset({ isPublic: true });
    this.close.emit();
  }

  // Prevent closing when clicking inside the modal content
  onContentClick(event: MouseEvent) {
    event.stopPropagation();
  }

  onSubmit() {
    if (this.createGroupForm.valid) {
      this.create.emit(this.createGroupForm.value);
    } else {
      this.createGroupForm.markAllAsTouched();
    }
  }

  get name() { return this.createGroupForm.get('name'); }
  get description() { return this.createGroupForm.get('description'); }
  get privacy() { return this.createGroupForm.get('isPublic'); }
}
