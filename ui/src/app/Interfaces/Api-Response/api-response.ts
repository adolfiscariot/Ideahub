export interface ApiResponse<T = any> {
  status: boolean;
  message: string;
  data: T | null;
  errors: string[] | null;
}
