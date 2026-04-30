/// <reference types="jasmine" />
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '../core/services/app-config.service';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { CommitteeMembersService } from './committeemembers.service';
import { ApiResponse } from '../Interfaces/Api-Response/api-response';
import { UserRecord } from '../Interfaces/Users/user-interface';

interface RawMockResponse<T> {
  success?: boolean;
  status?: boolean;
  message?: string;
  data?: T;
}

describe('CommitteeMembersService', () => {
  let service: CommitteeMembersService;
  let httpMock: HttpTestingController;

  const apiUrl = `${'http://localhost:5065/api'}/Committee`;

  // Shared test data

  const mockUser: UserRecord = {
    id: 'user-001',
    email: 'alice@ideahub.com',
    fullName: 'Alice Kamau',
    displayName: 'Alice',
    roles: ['CommitteeMember'],
  };

  const mockUserB: UserRecord = {
    id: 'user-002',
    email: 'bob@ideahub.com',
    fullName: 'Bob Otieno',
    displayName: 'Bob',
    roles: ['RegularUser'],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CommitteeMembersService, { provide: AppConfigService, useValue: { apiUrl: 'http://localhost:5065/api' } }],
    });
    service = TestBed.inject(CommitteeMembersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // convertResponse normalization

  describe('convertResponse (via getCommitteeMembers)', () => {
    it('should use response.status when success is absent', () => {
      const raw: RawMockResponse<UserRecord[]> = {
        status: true,
        message: 'ok',
        data: [],
      };

      service.getCommitteeMembers().subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      httpMock.expectOne(apiUrl).flush(raw);
    });

    it('should fall back to response.success when status is absent', () => {
      const raw: ApiResponse<UserRecord[]> = {
        success: true,
        message: 'ok',
        data: [],
      };

      service.getCommitteeMembers().subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      httpMock.expectOne(apiUrl).flush(raw);
    });

    it('should default success to false when neither status nor success is set', () => {
      const raw: RawMockResponse<UserRecord[]> = { message: 'fail' };

      service.getCommitteeMembers().subscribe((res) => {
        expect(res.success).toBeFalse();
      });

      httpMock.expectOne(apiUrl).flush(raw);
    });

    it('should default message to empty string when absent', () => {
      const raw: RawMockResponse<UserRecord[]> = { success: true };

      service.getCommitteeMembers().subscribe((res) => {
        expect(res.message).toBe('');
      });

      httpMock.expectOne(apiUrl).flush(raw);
    });
  });

  // getCommitteeMembers

  describe('getCommitteeMembers()', () => {
    it('should GET /Committee', () => {
      const raw: ApiResponse<UserRecord[]> = {
        success: true,
        message: 'ok',
        data: [mockUser],
      };

      service.getCommitteeMembers().subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data?.length).toBe(1);
        expect(res.data?.[0].email).toBe('alice@ideahub.com');
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(raw);
    });

    it('should return multiple committee members', () => {
      const raw: ApiResponse<UserRecord[]> = {
        success: true,
        message: 'ok',
        data: [mockUser, mockUserB],
      };

      service.getCommitteeMembers().subscribe((res) => {
        expect(res.data?.length).toBe(2);
        expect(res.data?.[1].fullName).toBe('Bob Otieno');
      });

      httpMock.expectOne(apiUrl).flush(raw);
    });

    it('should return empty list when no committee members exist', () => {
      const raw: ApiResponse<UserRecord[]> = {
        success: true,
        message: 'none',
        data: [],
      };

      service.getCommitteeMembers().subscribe((res) => {
        expect(res.data).toEqual([]);
      });

      httpMock.expectOne(apiUrl).flush(raw);
    });

    it('should handle an unsuccessful response gracefully', () => {
      const raw: ApiResponse<UserRecord[]> = {
        success: false,
        message: 'Forbidden',
      };

      service.getCommitteeMembers().subscribe((res) => {
        expect(res.success).toBeFalse();
        expect(res.message).toBe('Forbidden');
      });

      httpMock.expectOne(apiUrl).flush(raw);
    });
  });

  // getAllUsers

  describe('getAllUsers()', () => {
    it('should GET /Committee/users', () => {
      const raw: ApiResponse<UserRecord[]> = {
        success: true,
        message: 'ok',
        data: [mockUser, mockUserB],
      };

      service.getAllUsers().subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data?.length).toBe(2);
      });

      const req = httpMock.expectOne(`${apiUrl}/users`);
      expect(req.request.method).toBe('GET');
      req.flush(raw);
    });

    it('should return user records with all fields intact', () => {
      const raw: ApiResponse<UserRecord[]> = {
        success: true,
        message: 'ok',
        data: [mockUser],
      };

      service.getAllUsers().subscribe((res) => {
        const user = res.data?.[0];
        expect(user?.id).toBe('user-001');
        expect(user?.displayName).toBe('Alice');
        expect(user?.roles).toContain('CommitteeMember');
      });

      httpMock.expectOne(`${apiUrl}/users`).flush(raw);
    });

    it('should return an empty list if no users are registered', () => {
      const raw: ApiResponse<UserRecord[]> = {
        success: true,
        message: 'none',
        data: [],
      };

      service.getAllUsers().subscribe((res) => {
        expect(res.data).toEqual([]);
      });

      httpMock.expectOne(`${apiUrl}/users`).flush(raw);
    });

    it('should handle users without optional displayName or roles', () => {
      const minimalUser: UserRecord = {
        id: 'user-003',
        email: 'carl@ideahub.com',
        fullName: 'Carl Njoroge',
      };
      const raw: ApiResponse<UserRecord[]> = {
        success: true,
        message: 'ok',
        data: [minimalUser],
      };

      service.getAllUsers().subscribe((res) => {
        expect(res.data?.[0].displayName).toBeUndefined();
        expect(res.data?.[0].roles).toBeUndefined();
      });

      httpMock.expectOne(`${apiUrl}/users`).flush(raw);
    });
  });

  // addCommitteeMember

  describe('addCommitteeMember(email)', () => {
    it('should POST to /Committee/add/{email} with empty body', () => {
      const raw: ApiResponse<void> = { success: true, message: 'Member added' };

      service.addCommitteeMember('alice@ideahub.com').subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.message).toBe('Member added');
      });

      const req = httpMock.expectOne(`${apiUrl}/add/alice@ideahub.com`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(raw);
    });

    it('should embed the email in the URL path', () => {
      const raw: ApiResponse<void> = { success: true, message: 'ok' };

      service.addCommitteeMember('bob@ideahub.com').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/add/bob@ideahub.com`);
      expect(req.request.url).toContain('bob@ideahub.com');
      req.flush(raw);
    });

    it('should handle a failure if the user is already a committee member', () => {
      const raw: ApiResponse<void> = {
        success: false,
        message: 'User already a committee member',
      };

      service.addCommitteeMember('alice@ideahub.com').subscribe((res) => {
        expect(res.success).toBeFalse();
        expect(res.message).toBe('User already a committee member');
      });

      httpMock.expectOne(`${apiUrl}/add/alice@ideahub.com`).flush(raw);
    });

    it('should handle a failure if the user email does not exist', () => {
      const raw: ApiResponse<void> = {
        success: false,
        message: 'User not found',
      };

      service.addCommitteeMember('ghost@ideahub.com').subscribe((res) => {
        expect(res.success).toBeFalse();
        expect(res.message).toBe('User not found');
      });

      httpMock.expectOne(`${apiUrl}/add/ghost@ideahub.com`).flush(raw);
    });
  });
});
