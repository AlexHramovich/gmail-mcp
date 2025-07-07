import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GmailClient {
  private gmail: gmail_v1.Gmail | null = null;
  private auth: OAuth2Client;
  private accountEmail: string;
  
  constructor(auth: OAuth2Client, accountEmail: string) {
    this.auth = auth;
    this.accountEmail = accountEmail;
    this.gmail = google.gmail({ version: 'v1', auth: auth as any });
  }

  getAccountEmail(): string {
    return this.accountEmail;
  }

  async sendEmail(params: {
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
  }): Promise<string> {
    const { to, subject, body, cc, bcc } = params;
    
    const messageParts = [
      `To: ${to.join(', ')}`,
      `Subject: ${subject}`,
    ];
    
    if (cc?.length) messageParts.push(`Cc: ${cc.join(', ')}`);
    if (bcc?.length) messageParts.push(`Bcc: ${bcc.join(', ')}`);
    
    messageParts.push(
      'Content-Type: text/plain; charset=utf-8',
      '',
      body
    );
    
    const email = messageParts.join('\r\n');
    const encodedEmail = Buffer.from(email).toString('base64url');
    
    const res = await this.gmail!.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });
    
    return res.data.id!;
  }

  async searchEmails(query: string, maxResults: number = 10): Promise<any> {
    const res = await this.gmail!.users.messages.list({
      userId: 'me',
      q: query,
      maxResults
    });
    
    const messages = await Promise.all(
      (res.data.messages || []).map(async (msg) => {
        const details = await this.getMessage(msg.id!);
        return {
          id: msg.id,
          threadId: msg.threadId,
          snippet: details.snippet,
          subject: this.extractHeader(details, 'Subject'),
          from: this.extractHeader(details, 'From'),
          date: this.extractHeader(details, 'Date')
        };
      })
    );
    
    return {
      messages,
      resultSizeEstimate: res.data.resultSizeEstimate,
      nextPageToken: res.data.nextPageToken
    };
  }

  async getMessage(messageId: string): Promise<any> {
    const res = await this.gmail!.users.messages.get({
      userId: 'me',
      id: messageId
    });
    return res.data;
  }

  private extractHeader(message: any, headerName: string): string {
    const header = message.payload?.headers?.find(
      (h: any) => h.name.toLowerCase() === headerName.toLowerCase()
    );
    return header?.value || '';
  }
}