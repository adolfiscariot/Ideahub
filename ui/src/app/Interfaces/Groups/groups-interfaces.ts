
export interface Group {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: Date | string;
  createdByUserId: number;
  isDeleted: boolean;
  deletedByUserId?: number;
  deletedAt?: Date | string;
   
  memberCount?: number;
  ideaCount?: number;
  isJoined?: boolean;

  userRoleInGroup?: 'SuperAdmin' | 'GroupAdmin' | 'Regular User';
}

export interface UserGroup {
    userId: number;
    groupId: number;
    joinedAt: Date | string;
    roleId: string; //UID from roles table
    roleName?: 'SuperAdmin' | 'GroupAdmin' | 'Regular User'; //fetched from the db
}

export interface GroupMember {
  userId: number;
  groupId: number;
  joinedAt: Date | string;
  displayName: string;
  email: string;
  roleId: string; //UID from roles table
  roleName?: 'SuperAdmin' | 'GroupAdmin' | 'Regular User';
}


export interface AddGroup {
  name: string;
  description: string;
}

export interface UserWithRoles {
    id: number;
    displayName: string;
    email: string;
    roles: string[]; // array of role names
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
}

// Group Membership Request
export interface GroupMembershipRequest {
  id: number;
  userId: number;
  groupId: number;
  status: 'Pending' | 'Approved' | 'Rejected'; // IS REJECTED STILL VALID CONFIRM WITH MARK
  requestedAt: Date | string;
  acceptedOrRejectedAt?: Date | string;
  userDisplayName?: string;
  userEmail?: string;
  groupName?: string;
}

// For requesting to join a group
export interface JoinGroupRequest {
  groupId: number;
  userId: number;
}

// For approving/rejecting a request
export interface ProcessMembershipRequest {
  requestId: number;
  status: 'Approved' | 'Rejected';
  processedByUserId: number;
}