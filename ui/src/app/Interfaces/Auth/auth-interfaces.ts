export interface CurrentUser {
  id: string;
  email: string;
  roles: string[];
}

export interface AuthData {
  accessToken: string;
  passwordSetupRequired?: boolean;
}
