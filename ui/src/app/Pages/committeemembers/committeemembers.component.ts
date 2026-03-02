import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommitteeMembersService } from '../../Services/committeemembers.service';
import { AuthService } from '../../Services/auth/auth.service';
import { ToastService } from '../../Services/toast.service';
import { ApiResponse } from '../../Interfaces/Api-Response/api-response';
import { ButtonsComponent } from '../../Components/buttons/buttons.component';

@Component({
    selector: 'app-committeemembers',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonsComponent],
    templateUrl: './committeemembers.component.html',
    styleUrl: './committeemembers.component.scss'
})
export class CommitteeMembersComponent implements OnInit {
    committeeMembers: any[] = [];
    allUsers: any[] = [];
    selectedUserEmail: string = '';
    isSuperAdmin: boolean = false;
    isCommitteeMember: boolean = false;

    private committeeService = inject(CommitteeMembersService);
    private authService = inject(AuthService);
    private toastService = inject(ToastService);

    ngOnInit(): void {
        this.isSuperAdmin = this.authService.isSuperAdmin();
        this.isCommitteeMember = this.authService.isCommitteeMember();
        this.loadCommitteeMembers();
        this.loadAllUsers();
    }

    loadCommitteeMembers(): void {
        this.committeeService.getCommitteeMembers().subscribe({
            next: (response: ApiResponse) => {
                if (response.status) {
                    this.committeeMembers = response.data;
                }
            },
            error: (err) => {
                this.toastService.show('Failed to load committee members', 'error');
            }
        });
    }

    loadAllUsers(): void {
        this.committeeService.getAllUsers().subscribe({
            next: (response: ApiResponse) => {
                if (response.status) {
                    this.allUsers = response.data;
                }
            },
            error: (err) => {
                this.toastService.show('Failed to load users', 'error');
            }
        });
    }

    addMember(): void {
        if (!this.selectedUserEmail) {
            this.toastService.show('Please select a user email', 'warning');
            return;
        }

        this.committeeService.addCommitteeMember(this.selectedUserEmail).subscribe({
            next: (response: ApiResponse) => {
                if (response.status) {
                    this.toastService.show('Committee member added successfully', 'success');
                    this.loadCommitteeMembers();
                    this.selectedUserEmail = '';
                } else {
                    this.toastService.show(response.message || 'Failed to add member', 'error');
                }
            },
            error: (err) => {
                this.toastService.show('Failed to add committee member', 'error');
            }
        });
    }
}
