export interface MostVotedIdea {
    id: number;
    title: string;
    proposedSolution: string;
    author: string;
    groupName: string;
    voteCount: number;
    groupId: number;
    isMember: boolean;
}

export interface TopContributor {
    displayName: string;
    email: string;
    ideaCount: number;
}

export interface PromotedIdea {
    id: number;
    title: string;
    proposedSolution: string;
    author: string;
    groupName: string;
    promotedDate: string;
    projectId: number;
    groupId?: number;
}

export interface IdeaStats {
    total: number;
    open: number;
    promoted: number;
    closed: number;
}

export interface GroupEngagement {
    id: number;
    name: string;
    ideaCount: number;
    voteCount: number;
    isMember: boolean;
}

export interface PersonalStats {
    ideasCreated: number;
    votesCast: number;
    projectsInvolved: number;
    groupsCreated: number;
}
