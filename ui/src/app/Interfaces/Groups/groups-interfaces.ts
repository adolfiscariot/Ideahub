export interface Group {
  id: string;
  Id?: string; //backend mapping
  name: string;
  description: string;
  isActive: boolean;
  createdAt: Date | string;
  createdByUserId: string;
  isDeleted: boolean;
  deletedByUserId?: string;
  deletedAt?: Date | string;

  memberCount?: number;
  ideaCount?: number;
  isMember?: boolean;
  hasPendingRequest?: boolean;
  createdByUser?: {
    displayName: string;
    email: string;
  };

  userRoleInGroup?: 'SuperAdmin' | 'GroupAdmin' | 'Regular User';
  isPublic?: 'Public' | 'Private' | boolean;
}
export interface UserGroup {
  userId: string; // Changed from number to string
  groupId: string;
  joinedAt: Date | string;
  roleId: string;
  roleName?: 'SuperAdmin' | 'GroupAdmin' | 'Regular User';
}

export interface GroupMember {
  userId: string; // Changed from number to string
  groupId: string;
  joinedAt: Date | string;
  displayName: string;
  email: string;
  roleId: string;
  roleName?: 'SuperAdmin' | 'GroupAdmin' | 'Regular User';
  id?: string;
  name?: string;
  userName?: string;
  createdByUserId?: string;
}

export interface AddGroup {
  name: string;
  description: string;
  isPublic: boolean;
}

export interface UserWithRoles {
  id: number;
  displayName: string;
  email: string;
  roles: string[]; // array of role names
}

// Group Membership Request - SINGLE DEFINITION
export interface GroupMembershipRequest {
  id: number;
  userId: string;
  groupId: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string;
  acceptedOrRejectedAt?: string;

  // Additional info from joins (optional)
  userName?: string;
  userEmail?: string;
  userDisplayName?: string; // For backward compatibility
  groupName?: string;
  groupDescription?: string;
}

// For requesting to join a group
export interface JoinGroupRequest {
  groupId: string;
  userId: string; // Changed to string to match above
}

// For approving/rejecting a request
export interface ProcessMembershipRequest {
  requestId: number;
  status: 'Approved' | 'Rejected';
  processedByUserId: string; // Changed to string
}

// Interface for mapping raw backend responses (handles both camelCase and PascalCase)
export interface RawBackendGroup extends Partial<Group> {
  Id?: string;
  Name?: string;
  Description?: string;
  IsMember?: boolean;
  HasPendingRequest?: boolean;
  MemberCount?: number;
  IdeaCount?: number;
  IsActive?: boolean;
  IsDeleted?: boolean;
  CreatedAt?: string;
  CreatedByUserId?: string;
  CreatedByUser?: { displayName?: string; email?: string } | null;
  IsPublic?: boolean | string;
}

// Response from joining a group
export interface JoinGroupResponse {
  isPublic?: boolean;
  IsPublic?: boolean;
}
