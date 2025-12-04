import { Component, OnInit, inject } from '@angular/core';
import { IdeaService } from '../../Services/idea/idea.service';
import { MyIdea } from '../../Interfaces/Idea/my-idea.interface';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-my-ideas',
    imports: [CommonModule],
    templateUrl: './my-ideas.component.html',
    styleUrl: './my-ideas.component.scss'
})
export class MyIdeasComponent implements OnInit {
    private ideaService = inject(IdeaService);

    ideas: MyIdea[] = [];
    isLoading = true;

    ngOnInit(): void {
        this.ideaService.getMyIdeas().subscribe({
            next: (response) => {
                if (response.status && response.data) {
                    this.ideas = response.data;
                }
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Failed to fetch ideas', err);
                this.isLoading = false;
            }
        });
    }
}
