export interface Group {
  id: number;
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
}
export interface UserGroup {
    userId: string; // Changed from number to string
    groupId: number;
    joinedAt: Date | string;
    roleId: string;
    roleName?: 'SuperAdmin' | 'GroupAdmin' | 'Regular User';
}

export interface GroupMember {
  userId: string; // Changed from number to string
  groupId: number;
  joinedAt: Date | string;
  displayName: string;
  email: string;
  roleId: string;
  roleName?: 'SuperAdmin' | 'GroupAdmin' | 'Regular User';
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

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
}

// Group Membership Request - SINGLE DEFINITION
export interface GroupMembershipRequest {
  id: number;
  userId: string; // Changed from number to string to match your DB (UserId is GUID/string)
  groupId: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string; // Changed to string only for simplicity
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
  groupId: number;
  userId: string; // Changed to string to match above
}

// For approving/rejecting a request
export interface ProcessMembershipRequest {
  requestId: number;
  status: 'Approved' | 'Rejected';
  processedByUserId: string; // Changed to string
}

// REMOVE THE DUPLICATE DEFINITION BELOW - THIS IS CAUSING THE ERROR
// export interface GroupMembershipRequest { ... }