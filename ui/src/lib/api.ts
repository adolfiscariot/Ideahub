// API Configuration and Utilities
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Types matching backend models
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface User {
  id: string;
  displayName: string;
  email: string;
  avatar?: string;
}

export interface Group {
  id: number;
  name: string;
  description: string;
  memberCount?: number;
  ideaCount?: number;
  isMember?: boolean;
  createdAt: string;
  createdBy?: {
    displayName: string;
    email: string;
  };
}

export interface Idea {
  id: number;
  title: string;
  content: string;
  authorId: string;
  groupId: number;
  votes: number;
  commentCount: number;
  createdAt: string;
  userVote?: 'up' | 'down' | null;
}

export interface GroupDto {
  name: string;
  description: string;
}

export interface IdeaDto {
  title: string;
  content: string;
  groupId: number;
}

// API Client Class
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Load token from localStorage
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Group APIs
  async getGroups(): Promise<ApiResponse<Group[]>> {
    return this.request<Group[]>('/Group/view-groups');
  }

  async getGroup(groupId: number): Promise<ApiResponse<Group>> {
    return this.request<Group>(`/Group/${groupId}`);
  }

  async createGroup(groupData: GroupDto): Promise<ApiResponse> {
    return this.request('/Group/create-group', {
      method: 'POST',
      body: JSON.stringify(groupData),
    });
  }

  async joinGroup(groupId: number): Promise<ApiResponse> {
    return this.request(`/Group/join-group?groupId=${groupId}`, {
      method: 'POST',
    });
  }

  async leaveGroup(groupId: number): Promise<ApiResponse> {
    return this.request(`/Group/leave-group?groupId=${groupId}`, {
      method: 'POST',
    });
  }

  async getGroupMembers(groupId: number): Promise<ApiResponse<User[]>> {
    return this.request<User[]>(`/Group/get-members?groupId=${groupId}`);
  }

  // Idea APIs  
  async getIdeas(groupId?: number): Promise<ApiResponse<Idea[]>> {
    const endpoint = groupId 
      ? `/Idea/view-ideas?groupId=${groupId}` 
      : '/Idea/view-ideas';
    return this.request<Idea[]>(endpoint);
  }

  async getIdea(ideaId: number): Promise<ApiResponse<Idea>> {
    return this.request<Idea>(`/Idea/${ideaId}`);
  }

  async createIdea(ideaData: IdeaDto): Promise<ApiResponse> {
    return this.request('/Idea/create-idea', {
      method: 'POST',
      body: JSON.stringify(ideaData),
    });
  }

  async updateIdea(ideaId: number, ideaData: Partial<IdeaDto>): Promise<ApiResponse> {
    return this.request(`/Idea/update-idea/${ideaId}`, {
      method: 'PUT',
      body: JSON.stringify(ideaData),
    });
  }

  async deleteIdea(ideaId: number): Promise<ApiResponse> {
    return this.request(`/Idea/${ideaId}`, {
      method: 'DELETE',
    });
  }

  // Vote APIs
  async voteIdea(ideaId: number, voteType: 'up' | 'down'): Promise<ApiResponse> {
    return this.request('/Vote/vote-idea', {
      method: 'POST',
      body: JSON.stringify({ ideaId, voteType }),
    });
  }

  // Auth APIs
  async login(email: string, password: string): Promise<ApiResponse<{ token: string }>> {
    return this.request<{ token: string }>('/Auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<ApiResponse> {
    return this.request('/Auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);
