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
  @Output() close = new EventEmitter<void>();
  @Output() share = new EventEmitter<{title: string, description: string}>();
  @Input() isVisible: boolean = false;
  
  @ViewChild('descriptionTextarea') descriptionTextarea!: ElementRef;
  
  ideaForm: FormGroup;
  isSubmitting = false;
  
  // Character limits
  readonly TITLE_MAX_LENGTH = 100;
  readonly DESCRIPTION_MAX_LENGTH = 1000;
  
  // For textarea auto-resize
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
    // Listen to form changes to update textarea size
    this.ideaForm.get('description')?.valueChanges.subscribe(() => {
      setTimeout(() => this.adjustTextareaSize(), 0);
    });
  }

  ngAfterViewInit(): void {
    this.adjustTextareaSize();
  }

  closeModal(): void {
    this.close.emit();
  }
  
  submitIdea(): void {
    if (this.ideaForm.valid) {
      this.isSubmitting = true;
      
      // Emit the idea data to parent component
      this.share.emit(this.ideaForm.value);
      
      // Reset form
      setTimeout(() => {
        this.ideaForm.reset();
        this.isSubmitting = false;
      }, 1000);
    }
  }
  
  // Helper methods for character counting
  get titleLength(): number {
    return this.ideaForm.get('title')?.value?.length || 0;
  }
  
  get descriptionLength(): number {
    return this.ideaForm.get('description')?.value?.length || 0;
  }
  
  get titleRemaining(): number {
    return this.TITLE_MAX_LENGTH - this.titleLength;
  }
  
  get descriptionRemaining(): number {
    return this.DESCRIPTION_MAX_LENGTH - this.descriptionLength;
  }
  
  // Check if approaching or exceeding limits
  get isTitleWarning(): boolean {
    return this.titleRemaining <= 20 && this.titleRemaining > 0;
  }
  
  get isTitleLimitReached(): boolean {
    return this.titleLength >= this.TITLE_MAX_LENGTH;
  }
  
  get isTitleError(): boolean {
    return this.titleRemaining < 0;
  }
  
  get isDescriptionWarning(): boolean {
    return this.descriptionRemaining <= 100 && this.descriptionRemaining > 0;
  }
  
  get isDescriptionLimitReached(): boolean {
    return this.descriptionLength >= this.DESCRIPTION_MAX_LENGTH;
  }
  
  get isDescriptionError(): boolean {
    return this.descriptionRemaining < 0;
  }
  
  // Get limit messages
  get titleLimitMessage(): string {
    if (this.isTitleError) {
      return 'Limit exceeded! Please shorten your title.';
    } else if (this.isTitleLimitReached) {
      return 'Character limit reached!';
    } else if (this.isTitleWarning) {
      return `${this.titleRemaining} characters remaining`;
    }
    return '';
  }
  
  get descriptionLimitMessage(): string {
    if (this.isDescriptionError) {
      return 'Limit exceeded! Please shorten your description.';
    } else if (this.isDescriptionLimitReached) {
      return 'Character limit reached!';
    } else if (this.isDescriptionWarning) {
      return `${this.descriptionRemaining} characters remaining`;
    }
    return '';
  }
  
  // Adjust textarea size based on content
  adjustTextareaSize(): void {
    if (!this.descriptionTextarea?.nativeElement) return;
    
    const textarea = this.descriptionTextarea.nativeElement;
    
    // Reset height to auto to get accurate scrollHeight
    textarea.style.height = 'auto';
    textarea.style.overflowY = 'hidden';
    
    // Calculate new height (with min and max limits)
    const newHeight = Math.max(
      this.textareaMinHeight,
      Math.min(textarea.scrollHeight, this.textareaMaxHeight)
    );
    
    textarea.style.height = newHeight + 'px';
    
    // Adjust width based on content length (for horizontal expansion)
    const contentLength = this.descriptionLength;
    const avgCharWidth = 8; // Approximate average character width in pixels
    const paddingWidth = 32; // Account for padding
    
    // Only expand horizontally for very long lines
    if (contentLength > 0) {
      const lines = textarea.value.split('\n');
      const longestLine = Math.max(...lines.map((line: string) => line.length));
      
      // Expand width if line is long (more than 60 characters)
      if (longestLine > 60) {
        const calculatedWidth = Math.min(longestLine * avgCharWidth + paddingWidth, 800);
        textarea.style.width = calculatedWidth + 'px';
      } else {
        textarea.style.width = '100%';
      }
    }
  }
  
  // Prevent typing when limit is reached
  onTitleInput(event: any): void {
    if (this.isTitleLimitReached && !this.isTitleError) {
      // If at limit but not exceeded, prevent further input
      const value = this.ideaForm.get('title')?.value || '';
      if (value.length > this.TITLE_MAX_LENGTH) {
        this.ideaForm.get('title')?.setValue(value.slice(0, this.TITLE_MAX_LENGTH));
      }
    }
  }
  
  onDescriptionInput(event: any): void {
    if (this.isDescriptionLimitReached && !this.isDescriptionError) {
      // If at limit but not exceeded, prevent further input
      const value = this.ideaForm.get('description')?.value || '';
      if (value.length > this.DESCRIPTION_MAX_LENGTH) {
        this.ideaForm.get('description')?.setValue(value.slice(0, this.DESCRIPTION_MAX_LENGTH));
      }
    }
    this.adjustTextareaSize();
  }
  
  // Handle keydown to prevent input when at limit
  onKeyDown(event: KeyboardEvent, field: 'title' | 'description'): void {
    const maxLength = field === 'title' ? this.TITLE_MAX_LENGTH : this.DESCRIPTION_MAX_LENGTH;
    const currentLength = field === 'title' ? this.titleLength : this.descriptionLength;
    
    // Allow navigation and deletion keys even when at limit
    const allowedKeys = [
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End', 'Tab', 'Enter'
    ];
    
    // If at or over limit and key is not allowed, prevent input
    if (currentLength >= maxLength && 
        !allowedKeys.includes(event.key) &&
        !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
    }
  }
}