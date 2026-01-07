import { Component, OnDestroy, OnInit } from '@angular/core';
import { GroupsService } from '../../Services/groups.service';

@Component({
  selector: 'app-global-notifications',
  imports: [],
  templateUrl: './global-notifications.component.html',
  styleUrl: './global-notifications.component.scss',
})
export class GlobalNotificationsComponent implements OnInit, OnDestroy {
  
  pendingRequests: any[] = [];
  loadingRequests = false;
  errorRequests = '';

  constructor(
    private groupsService: GroupsService,
  ){}
  ngOnInit(): void {
        
    }
  
    ngOnDestroy(): void {

    }


    viewRequests() {
    console.log('Fetching pending requests');
    
    this.loadingRequests = true;
    this.errorRequests = '';

    this.groupsService.viewGlobalRequests().subscribe({
      next: (res: any) => {
        console.log('Pending requests received:', res);
        this.pendingRequests = res.data.map((email: string) => ({ email })) // res should be an array of { userId, ... }
        this.loadingRequests = false;
      },
      error: (err) => {
        console.error('Error fetching requests:', err);
        this.errorRequests = 'Failed to load requests';
        this.loadingRequests = false;
      }
    });
  }

}
