export interface Project {
    id: number;
    title: string;
    description: string;
    status: ProjectStatus;
    createdAt: string;
    endedAt?: string;
    overseenBy: string; // User name or email, depending on what we display
    overseenById: string;
    groupName?: string;
    ideaTitle?: string;
}

export enum ProjectStatus {
    Planning = 0,
    Active = 1,
    Completed = 2,
    Shelved = 3,
    Cancelled = 4
}
