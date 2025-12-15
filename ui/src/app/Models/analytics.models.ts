export interface MostVotedIdea {
    id: string;
    title: string;
    description: string;
    author: string;
    groupName: string;
    voteCount: number;
}

export interface TopContributor {
    displayName: string;
    email: string;
    ideaCount: number;
}

export interface PromotedIdea {
    id: string;
    title: string;
    description: string;
    author: string;
    groupName: string;
    promotedDate: string;
}

export interface IdeaStats {
    total: number;
    open: number;
    promoted: number;
    closed: number;
}

export interface GroupEngagement {
    name: string;
    ideaCount: number;
    voteCount: number;
}

export interface PersonalStats {
    ideasCreated: number;
    votesCast: number;
    projectsInvolved: number;
    groupsCreated: number;
}
