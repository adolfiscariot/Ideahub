import { Component, OnInit, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AnalyticsService } from '../../Services/analytics.service';
import { CommonModule } from '@angular/common';
import { StatCardComponent } from '../../Components/stat-card/stat-card.component';
import { DashboardCardComponent } from '../../Components/dashboard-card/dashboard-card.component';
import { ModalComponent } from '../../Components/modal/modal.component';
import { ProjectService } from '../../Services/project.service';
import { Router } from '@angular/router';
import { ButtonsComponent } from '../../Components/buttons/buttons.component';
import { ToastService } from '../../Services/toast.service';
import {
  PromotedIdea,
  IdeaStats,
  GroupEngagement,
  PersonalStats,
  MostVotedIdea,
  TopContributor,
} from '../../Models/analytics.models';
import { Project } from '../../Interfaces/Projects/project-interface';

import { provideIcons } from '@ng-icons/core';
import {
  heroChartBar,
  heroLockOpen,
  heroRocketLaunch,
  heroLockClosed,
  heroFire,
  heroTrophy,
  heroBuildingOffice2,
  heroLightBulb,
  heroHandThumbUp,
  heroBriefcase,
  heroUserGroup,
  heroStar,
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    StatCardComponent,
    DashboardCardComponent,
    ModalComponent,
    ButtonsComponent,
  ],
  viewProviders: [
    provideIcons({
      heroChartBar,
      heroLockOpen,
      heroRocketLaunch,
      heroLockClosed,
      heroFire,
      heroTrophy,
      heroBuildingOffice2,
      heroLightBulb,
      heroHandThumbUp,
      heroBriefcase,
      heroUserGroup,
      heroStar,
    }),
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  mostVotedIdeas: MostVotedIdea[] = [];
  topContributors: TopContributor[] = [];
  promotedIdeas: PromotedIdea[] = [];
  ideaStats: IdeaStats | null = null;
  groupEngagement: GroupEngagement[] = [];
  personalStats: PersonalStats | null = null;
  showWelcomeInfoModal = false;

  isProjectModalOpen = false;
  selectedProjectId: number | null = null;
  selectedGroupId: string | null = null;
  currentProject: Project | null = null;

  ngOnInit() {
    this.fetchAnalytics();
    const hasSeenWelcome = localStorage.getItem('seenWelcomeGuide');

    if (!hasSeenWelcome) {
      this.showWelcomeInfoModal = true;
    }
  }

  closeWelcomeInfo() {
    this.showWelcomeInfoModal = false;
    localStorage.setItem('seenWelcomeGuide', 'true');
  }

  displayWelcomeInfo() {
    this.showWelcomeInfoModal = true;
  }

  fetchAnalytics() {
    forkJoin({
      mostVoted: this.analyticsService.getMostVotedIdeas(),
      topContributors: this.analyticsService.getTopContributors(),
      promoted: this.analyticsService.getPromotedIdeas(),
      stats: this.analyticsService.getIdeaStatistics(),
      engagement: this.analyticsService.getGroupEngagement(),
      personal: this.analyticsService.getPersonalStats(),
    }).subscribe({
      next: (results) => {
        if (results.mostVoted.success || results.mostVoted.status)
          this.mostVotedIdeas = results.mostVoted.data ?? [];
        if (results.topContributors.success || results.topContributors.status)
          this.topContributors = results.topContributors.data ?? [];
        if (results.promoted.success || results.promoted.status)
          this.promotedIdeas = results.promoted.data ?? [];
        if (results.stats.success || results.stats.status)
          this.ideaStats = results.stats.data ?? null;
        if (results.engagement.success || results.engagement.status)
          this.groupEngagement = results.engagement.data ?? [];
        if (results.personal.success || results.personal.status)
          this.personalStats = results.personal.data ?? null;
      },
    });
  }

  onIdeaClick(idea: MostVotedIdea) {
    if (idea.isMember) {
      this.router.navigate(['/groups', idea.groupId.toString(), 'ideas'], {
        queryParams: { ideaId: idea.id },
      });
    } else {
      this.toastService.show('Join this group to view its ideas', 'info');
      this.router.navigate(['/groups'], {
        queryParams: { joinGroupId: idea.groupId },
      });
    }
  }

  onGroupClick(group: GroupEngagement) {
    if (group.isMember) {
      this.router.navigate(['/groups', group.id.toString(), 'ideas']);
    } else {
      this.toastService.show(
        `Join Group to join ${group.name} to access its ideas`,
        'info',
      );
      this.router.navigate(['/groups'], {
        queryParams: { joinGroupId: group.id },
      });
    }
  }

  onPromotedIdeaClick(idea: PromotedIdea) {
    if (!idea.projectId) return;

    this.router.navigate(['/projects'], {
      queryParams: { openProject: idea.projectId },
    });
  }
}
