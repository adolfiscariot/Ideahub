import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { NotificationService } from './notification.service';

@Injectable({
    providedIn: 'root'
})
export class SignalrService {
    private hubConnection: signalR.HubConnection | undefined;
    public notificationSubject = new BehaviorSubject<string | null>(null);

    private notificationService = inject(NotificationService);

    public startConnection = () => {
        if (this.hubConnection) {
            this.hubConnection.stop();
            this.hubConnection = undefined;
        }
        this.hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(environment.apiUrl + '/hubs/notifications', {
                accessTokenFactory: () => localStorage.getItem('accessToken') || '',
            })
            .withAutomaticReconnect()
            .build();

        // Re-register listener every time the connection comes back up
        this.hubConnection.onreconnected(() => {
            console.log('SignalR reconnected — re-registering listener');
            this.registerNotificationListener();
        });

        this.hubConnection
            .start()
            .then(() => {
                console.log('SignalR Connection started');
                this.registerNotificationListener();
            })
            .catch(err => console.log('Error while starting connection: ' + err));
    }

    public registerNotificationListener = () => {
        // Guard: remove any existing handler before re-registering to avoid stacking
        this.hubConnection?.off('ReceiveNotification');
        this.hubConnection?.on('ReceiveNotification', (message: string) => {
            console.log('Notification received:', message);
            this.notificationSubject.next(message);
            this.notificationService.fetchUnreadCount();
        });
    }

    public stopConnection = () => {
        if (this.hubConnection) {
            this.hubConnection.stop();
        }
    }
}
