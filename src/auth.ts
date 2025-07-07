import { OAuth2Client } from 'google-auth-library';

export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface TokenData {
  type: string;
  client_id: string;
  client_secret: string;
  refresh_token: string;
}

export class AuthManager {
  private auth: OAuth2Client;
  
  constructor(config: AuthConfig) {
    this.auth = new OAuth2Client(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  async refreshTokenIfNeeded(): Promise<void> {
    if (this.auth?.credentials.expiry_date && 
        Date.now() >= this.auth.credentials.expiry_date) {
      try {
        const { credentials } = await this.auth.refreshAccessToken();
        this.auth.setCredentials(credentials);
      } catch (error) {
        console.error('Token refresh failed, need re-authentication');
        throw error;
      }
    }
  }

  getAuthClient(): OAuth2Client {
    return this.auth;
  }
}