import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MyIdea } from '../../Interfaces/Idea/my-idea.interface';
import { ApiResponse } from '../../Interfaces/Api-Response/api-response';

@Injectable({
    providedIn: 'root'
})
export class IdeaService {
    private readonly apiUrl = 'http://localhost:5066/api/idea';

    constructor(private http: HttpClient) { }

    getMyIdeas(): Observable<ApiResponse<MyIdea[]>> {
        return this.http.get<ApiResponse<MyIdea[]>>(`${this.apiUrl}/my-ideas`);
    }
}
