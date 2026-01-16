import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark, heroExclamationTriangle, heroTrash } from '@ng-icons/heroicons/outline';
import { ButtonsComponent } from '../../buttons/buttons.component';

@Component({
    selector: 'app-delete-group-modal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, NgIconComponent, ButtonsComponent],
    viewProviders: [provideIcons({ heroXMark, heroExclamationTriangle, heroTrash })],
    templateUrl: './delete-group-modal.component.html',
    styleUrl: './delete-group-modal.component.scss'
})
export class DeleteGroupModalComponent implements OnChanges {
    @Input() isVisible: boolean = false;
    @Input() group: any = null;
    @Input() isDeleting: boolean = false;

    @Output() close = new EventEmitter<void>();
    @Output() confirm = new EventEmitter<string>();

    deleteConfirmControl = new FormControl('');

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['isVisible'] && this.isVisible) {
            this.deleteConfirmControl.reset();
        }
    }

    closeModal() {
        this.close.emit();
    }

    onConfirm() {
        if (this.canDelete && this.group) {
            this.confirm.emit(this.group.id);
        }
    }

    get canDelete(): boolean {
        return this.deleteConfirmControl.value === this.group?.name;
    }

    // Prevent closing when clicking inside content
    onContentClick(event: MouseEvent) {
        event.stopPropagation();
    }
}
