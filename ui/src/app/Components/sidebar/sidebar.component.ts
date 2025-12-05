import { Component, inject, Output, EventEmitter } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../Services/auth/auth.service';
import { LucideAngularModule, LayoutDashboard, Lightbulb, Users, Briefcase, LogOut, ChevronLeft, ChevronRight } from 'lucide-angular';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, LucideAngularModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  authService = inject(AuthService);

  @Output() collapsedChange = new EventEmitter<boolean>();
  isCollapsed = false;

  readonly icons = {
    dashboard: LayoutDashboard,
    ideas: Lightbulb,
    groups: Users,
    projects: Briefcase,
    logout: LogOut,
    collapse: ChevronLeft,
    expand: ChevronRight
  };

  onLogout() {
    this.authService.logout().subscribe();
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(this.isCollapsed);
  }
}
