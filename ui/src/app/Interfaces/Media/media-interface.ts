export enum MediaType {
  Image = 'Image',
  Video = 'Video',
  Document = 'Document',
}

export interface Media {
  id: number;
  filePath: string;
  mediaType: MediaType;
  createdAt: string;
  userId?: string;
  ideaId?: number;
  commentId?: number;
  projectId?: number;
  timesheetId?: number;
}

export interface MediaDto {
  file: File;
  mediaType: MediaType;
}

export interface UploadMediaRequest {
  file: File;
  mediaType: MediaType;
  ideaId?: number;
  commentId?: number;
  projectId?: number;
  timesheetId?: number;
}

export interface ViewMediaRequest {
  ideaId?: number;
  commentId?: number;
  projectId?: number;
  timesheetId?: number;
}
