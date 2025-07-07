export interface EmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
}

export interface SendEmailParams {
  to: string[];
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
}

export interface SearchEmailsResult {
  messages: EmailMessage[];
  resultSizeEstimate: number;
  nextPageToken?: string;
}

export interface GmailCredentials {
  type: string;
  client_id: string;
  client_secret: string;
  refresh_token: string;
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailPayload {
  headers: GmailHeader[];
  body?: {
    data?: string;
  };
  parts?: GmailPayload[];
}

export interface GmailMessageData {
  id: string;
  threadId: string;
  snippet: string;
  payload: GmailPayload;
}

export interface AccountInfo {
  email: string;
  addedAt: string;
  lastUsed?: string;
  isDefault: boolean;
}