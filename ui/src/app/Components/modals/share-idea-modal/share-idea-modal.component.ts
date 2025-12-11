// ... existing imports stay the same
import { Component, Output, EventEmitter, Input, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-share-idea-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './share-idea-modal.component.html',
  styleUrls: ['./share-idea-modal.component.scss']
})
export class ShareIdeaModalComponent implements OnInit, AfterViewInit {

  @Input() isVisible: boolean = false;
  @Input() isEditMode: boolean = false;
  @Input() editData: { title: string, description: string } | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() share = new EventEmitter<{ title: string, description: string }>();
  @Output() update = new EventEmitter<{ title: string, description: string }>();

  @ViewChild('descriptionTextarea') descriptionTextarea!: ElementRef;

  ideaForm: FormGroup;
  isSubmitting = false;

  isTitleWarning = false;
  isTitleLimitReached = false;
  isTitleError = false;
  titleLimitMessage = '';
  
  isDescriptionWarning = false;
  isDescriptionLimitReached = false;
  isDescriptionError = false;
  descriptionLimitMessage = '';

  // WARNING/ERROR THRESHOLDS
  readonly TITLE_WARNING_THRESHOLD = 80;  
  readonly TITLE_ERROR_THRESHOLD = 100;  
  readonly DESC_WARNING_THRESHOLD = 800; 
  readonly DESC_ERROR_THRESHOLD = 1000;   

  readonly TITLE_MAX_LENGTH = 100;
  readonly DESCRIPTION_MAX_LENGTH = 1000;

  textareaRows = 5;
  textareaMinHeight = 120;
  textareaMaxHeight = 400;
  textareaWidth = '100%';

  constructor(private fb: FormBuilder) {
    this.ideaForm = this.fb.group({
      title: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(this.TITLE_MAX_LENGTH)
      ]],
      description: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(this.DESCRIPTION_MAX_LENGTH)
      ]]
    });
  }

  ngOnInit(): void {
    // If edit mode and edit data is given → preload form
    if (this.isEditMode && this.editData) {
      this.ideaForm.patchValue({
        title: this.editData.title,
        description: this.editData.description
      });
    }

    this.ideaForm.get('description')?.valueChanges.subscribe(() => {
      setTimeout(() => this.adjustTextareaSize(), 0);
    });

    // ADD: Set up value changes for title to update warning/error states
    this.ideaForm.get('title')?.valueChanges.subscribe(() => {
      this.updateTitleValidationState();
    });

    // ADD: Set up value changes for description to update warning/error states
    this.ideaForm.get('description')?.valueChanges.subscribe(() => {
      this.updateDescriptionValidationState();
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.adjustTextareaSize(), 0);
  }

  closeModal(): void {
    this.close.emit();
  }

  submit(): void {
    if (this.ideaForm.invalid) return;

    this.isSubmitting = true;

    const payload = this.ideaForm.value;

    if (this.isEditMode) {
      this.update.emit(payload);
    } else {
      this.share.emit(payload);
    }

    setTimeout(() => {
      this.ideaForm.reset();
      this.isSubmitting = false;
    }, 600);
  }

  onTitleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateTitleValidationState();
  }

  onDescriptionInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.updateDescriptionValidationState();
  }

  onKeyDown(event: KeyboardEvent, field: 'title' | 'description'): void {
    // Prevent Enter key default
    if (field === 'title' && event.key === 'Enter') {
      event.preventDefault();
    }
  }

  private updateTitleValidationState(): void {
    const titleControl = this.ideaForm.get('title');
    if (!titleControl) return;
    
    const length = titleControl.value?.length || 0;
    const isTouched = titleControl.touched || titleControl.dirty;
    
   
    this.isTitleWarning = length >= this.TITLE_WARNING_THRESHOLD && length < this.TITLE_MAX_LENGTH;
    
    // Update limit reached state
    this.isTitleLimitReached = length >= this.TITLE_MAX_LENGTH;
    
    
    this.isTitleError = isTouched && titleControl.invalid;
    
    // Update message
    if (length >= this.TITLE_MAX_LENGTH) {
      this.titleLimitMessage = `Maximum ${this.TITLE_MAX_LENGTH} characters reached`;
    } else if (length >= this.TITLE_WARNING_THRESHOLD) {
      const remaining = this.TITLE_MAX_LENGTH - length;
      this.titleLimitMessage = `${remaining} characters remaining`;
    } else {
      this.titleLimitMessage = '';
    }
  }

  private updateDescriptionValidationState(): void {
    const descControl = this.ideaForm.get('description');
    if (!descControl) return;
    
    const length = descControl.value?.length || 0;
    const isTouched = descControl.touched || descControl.dirty;
    
    // Update warning state
    this.isDescriptionWarning = length >= this.DESC_WARNING_THRESHOLD && length < this.DESCRIPTION_MAX_LENGTH;
    
    // Update limit reached state
    this.isDescriptionLimitReached = length >= this.DESCRIPTION_MAX_LENGTH;
    
    // Update error state (based on form validation)
    this.isDescriptionError = isTouched && descControl.invalid;
    
    // Update message
    if (length >= this.DESCRIPTION_MAX_LENGTH) {
      this.descriptionLimitMessage = `Maximum ${this.DESCRIPTION_MAX_LENGTH} characters reached`;
    } else if (length >= this.DESC_WARNING_THRESHOLD) {
      const remaining = this.DESCRIPTION_MAX_LENGTH - length;
      this.descriptionLimitMessage = `${remaining} characters remaining`;
    } else {
      this.descriptionLimitMessage = '';
    }
    
    // Auto-adjust textarea
    setTimeout(() => this.adjustTextareaSize(), 0);
  }

  // ------------------------
  // Helpers
  // ------------------------
  get titleLength(): number {
    return this.ideaForm.get('title')?.value?.length || 0;
  }

  get descriptionLength(): number {
    return this.ideaForm.get('description')?.value?.length || 0;
  }

  adjustTextareaSize(): void {
    if (!this.descriptionTextarea) return;

    const textarea = this.descriptionTextarea.nativeElement;
    textarea.style.height = 'auto';
    textarea.style.overflowY = 'hidden';

    const newHeight = Math.max(
      this.textareaMinHeight,
      Math.min(textarea.scrollHeight, this.textareaMaxHeight)
    );

    textarea.style.height = newHeight + 'px';
    textarea.style.width = '100%';
  }

  // template validation
  get isFormValid(): boolean {
    return !this.isSubmitting && this.ideaForm.valid && !this.isTitleError && !this.isDescriptionError;
  }
}