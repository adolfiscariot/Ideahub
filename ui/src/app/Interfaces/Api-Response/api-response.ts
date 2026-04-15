export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  status?: boolean;
  errors?: string[] | null;
}
