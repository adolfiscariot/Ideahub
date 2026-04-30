export interface CurrentUser {
  id: string;
  email: string;
  roles: string[];
}

export interface AuthData {
  accessToken: string;
  passwordSetupRequired?: boolean;
}

export interface ProfileResponse {
  status: boolean;
  message: string;
  data: {
    id: string;
    email: string;
    displayName: string;
    roles: string[];
  };
}
