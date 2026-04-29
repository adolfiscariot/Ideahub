/// <reference types="jasmine" />
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { GroupsService } from './groups.service';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import {
  Group,
  GroupMember,
  GroupMembershipRequest,
  AddGroup,
  JoinGroupResponse,
} from '../Interfaces/Groups/groups-interfaces';
import { environment } from '../../environments/environment';

interface RawMockResponse<T> {
  success?: boolean;
  status?: boolean;
  message?: string;
  data?: T;
}

describe('GroupsService', () => {
  let service: GroupsService;
  let http_mock: HttpTestingController;

  const api_url = `${environment.apiUrl}/group`;

  // Shared test data
  const mock_group: Group = {
    id: 'group-123',
    name: 'Innovation Tech',
    description: 'Tech enthusiasts',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    createdByUserId: 'user-001',
    isDeleted: false,
  };

  const mock_member: GroupMember = {
    userId: 'user-002',
    groupId: 'group-123',
    joinedAt: '2024-02-01T00:00:00Z',
    displayName: 'Bob Smith',
    email: 'bob@example.com',
    roleId: 'role-regular',
  };

  const mock_request: GroupMembershipRequest = {
    id: 999,
    userId: 'user-003',
    groupId: 'group-123',
    status: 'Pending',
    requestedAt: '2024-03-01T00:00:00Z',
    userEmail: 'charlie@example.com',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GroupsService],
    });
    service = TestBed.inject(GroupsService);
    http_mock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http_mock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // convertResponse normalization
  describe('convertResponse', () => {
    it('should use status as success if present', () => {
      const raw: RawMockResponse<Group[]> = {
        status: true,
        data: [mock_group],
      };

      service.getGroups().subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      http_mock.expectOne(`${api_url}/view-groups`).flush(raw);
    });

    it('should default success to false when both success and status are missing', () => {
      const raw: RawMockResponse<Group[]> = { message: 'error' };

      service.getGroups().subscribe((res) => {
        expect(res.success).toBeFalse();
      });

      http_mock.expectOne(`${api_url}/view-groups`).flush(raw);
    });
  });

  // getGroups
  describe('getGroups()', () => {
    it('should GET /group/view-groups', () => {
      const mock_response: ApiResponse<Group[]> = {
        success: true,
        message: 'ok',
        data: [mock_group],
      };

      service.getGroups().subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data?.length).toBe(1);
        expect(res.data?.[0].name).toBe('Innovation Tech');
      });

      const req = http_mock.expectOne(`${api_url}/view-groups`);
      expect(req.request.method).toBe('GET');
      req.flush(mock_response);
    });
  });

  // createGroup
  describe('createGroup()', () => {
    it('should POST /group/create-group', () => {
      const new_group: AddGroup = {
        name: 'New Group',
        description: 'Desc',
        isPublic: true,
      };
      const mock_response: ApiResponse<Group> = {
        success: true,
        message: 'created',
        data: mock_group,
      };

      service.createGroup(new_group).subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data?.id).toBe('group-123');
      });

      const req = http_mock.expectOne(`${api_url}/create-group`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(new_group);
      req.flush(mock_response);
    });
  });

  // joinGroup
  describe('joinGroup()', () => {
    it('should POST /group/join-group with groupId param', () => {
      const mock_response: ApiResponse<JoinGroupResponse> = {
        success: true,
        message: 'joined',
        data: { isPublic: true },
      };

      service.joinGroup('group-123').subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = http_mock.expectOne(
        (request) =>
          request.url === `${api_url}/join-group` &&
          request.params.get('groupId') === 'group-123',
      );
      expect(req.request.method).toBe('POST');
      req.flush(mock_response);
    });
  });

  // getGroupMembers
  describe('getGroupMembers()', () => {
    it('should GET /group/get-members with groupId param', () => {
      const mock_response: ApiResponse<GroupMember[]> = {
        success: true,
        message: 'ok',
        data: [mock_member],
      };

      service.getGroupMembers('group-123').subscribe((res) => {
        expect(res.data?.[0].email).toBe('bob@example.com');
      });

      const req = http_mock.expectOne(
        (request) =>
          request.url === `${api_url}/get-members` &&
          request.params.get('groupId') === 'group-123',
      );
      expect(req.request.method).toBe('GET');
      req.flush(mock_response);
    });
  });

  // Request Management
  describe('Request Management', () => {
    it('should GET /group/view-requests', () => {
      const mock_response: ApiResponse<GroupMembershipRequest[]> = {
        success: true,
        message: 'ok',
        data: [mock_request],
      };

      service.viewRequests('group-123').subscribe((res) => {
        expect(res.data?.length).toBe(1);
      });

      const req = http_mock.expectOne(
        (r) =>
          r.url === `${api_url}/view-requests` &&
          r.params.get('groupId') === 'group-123',
      );
      req.flush(mock_response);
    });

    it('should POST /group/accept-request', () => {
      const mock_response: ApiResponse<void> = {
        success: true,
        message: 'accepted',
      };

      service
        .acceptRequest('group-123', 'charlie@example.com')
        .subscribe((res) => {
          expect(res.success).toBeTrue();
        });

      const req = http_mock.expectOne(
        (r) =>
          r.url === `${api_url}/accept-request` &&
          r.params.get('groupId') === 'group-123' &&
          r.params.get('requestUserEmail') === 'charlie@example.com',
      );
      expect(req.request.method).toBe('POST');
      req.flush(mock_response);
    });

    it('should POST /group/reject-request', () => {
      const mock_response: ApiResponse<void> = {
        success: true,
        message: 'rejected',
      };

      service
        .rejectRequest('group-123', 'charlie@example.com')
        .subscribe((res) => {
          expect(res.success).toBeTrue();
        });

      const req = http_mock.expectOne(
        (r) =>
          r.url === `${api_url}/reject-request` &&
          r.params.get('groupId') === 'group-123' &&
          r.params.get('requestUserEmail') === 'charlie@example.com',
      );
      expect(req.request.method).toBe('POST');
      req.flush(mock_response);
    });
  });

  // Group Management
  describe('Group Management Actions', () => {
    it('should POST /group/leave-group', () => {
      const mock_response: ApiResponse<void> = { success: true, message: 'ok' };

      service.leaveGroup('group-123').subscribe();

      const req = http_mock.expectOne(
        (r) =>
          r.url === `${api_url}/leave-group` &&
          r.params.get('groupId') === 'group-123',
      );
      req.flush(mock_response);
    });

    it('should DELETE /group/{id}', () => {
      const mock_response: ApiResponse<void> = { success: true, message: 'ok' };

      service.deleteGroup('group-123').subscribe();

      const req = http_mock.expectOne(`${api_url}/group-123`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mock_response);
    });

    it('should POST /group/transfer-ownership', () => {
      const mock_response: ApiResponse<void> = { success: true, message: 'ok' };

      service
        .transferOwnership('group-123', 'newowner@example.com')
        .subscribe();

      const req = http_mock.expectOne(
        (r) =>
          r.url === `${api_url}/transfer-ownership` &&
          r.params.get('groupId') === 'group-123' &&
          r.params.get('newOwnerEmail') === 'newowner@example.com',
      );
      req.flush(mock_response);
    });
  });
});
