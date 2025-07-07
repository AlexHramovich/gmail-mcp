# Building a Local Gmail MCP Server in TypeScript

## OAuth 2.0 Desktop Flow: The Simplest Authentication for Personal Use

For personal Gmail access, **OAuth 2.0 Desktop Application Flow** emerges as the clear winner over service accounts. This approach requires minimal setup, provides secure access to your own Gmail account, and offers the best developer experience for local applications. Service accounts, while powerful for enterprise scenarios, require Google Workspace and domain-wide delegation - making them unsuitable for personal Gmail accounts.

The desktop flow works by opening a browser for one-time user consent, then storing refresh tokens locally for seamless future access. Google's official Node.js libraries handle token refresh automatically, eliminating the complexity of manual token management.

## Complete Project Setup

### Essential Dependencies and Package Configuration

```json
{
  "name": "gmail-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "description": "Gmail MCP Server for personal use",
  "main": "build/index.js",
  "bin": {
    "gmail-mcp": "./build/index.js"
  },
  "scripts": {
    "build": "tsc && chmod +x build/index.js",
    "dev": "tsx watch src/index.ts",
    "inspect": "npx @modelcontextprotocol/inspector build/index.js",
    "test": "vitest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.15.0",
    "googleapis": "^128.0.0",
    "@google-cloud/local-auth": "^2.1.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.8.0",
    "tsx": "^4.0.0"
  }
}
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build"]
}
```

### Project Structure

```
gmail-mcp-server/
├── src/
│   ├── index.ts          # Main server entry point
│   ├── gmail-client.ts   # Gmail API wrapper
│   ├── auth.ts           # OAuth authentication
│   └── types.ts          # TypeScript interfaces
├── build/                # Compiled JavaScript
├── credentials.json      # Google OAuth credentials
├── token.json           # Stored access tokens
├── package.json
├── tsconfig.json
└── README.md
```

## Google Cloud Console Setup

Setting up OAuth credentials requires just a few steps in the Google Cloud Console:

1. **Create a new project** at [console.cloud.google.com](https://console.cloud.google.com/)
2. **Enable Gmail API**: Navigate to APIs & Services → Library → Search "Gmail API" → Enable
3. **Configure OAuth consent screen**:
   - Select "External" user type for personal use
   - Fill in app name and support email
   - Add your Gmail address as a test user
4. **Create credentials**:
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth client ID"
   - Select "Desktop application"
   - Download JSON file as `credentials.json`

## Core Implementation

### Main Server Implementation (src/index.ts)

```typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { GmailClient } from "./gmail-client.js";

const server = new McpServer({
  name: "gmail-mcp-server",
  version: "1.0.0"
});

const gmailClient = new GmailClient();

// Initialize on startup
await gmailClient.authenticate();

// Send Email Tool
server.tool(
  "send_email",
  {
    to: z.array(z.string().email()).describe("Recipient email addresses"),
    subject: z.string().describe("Email subject"),
    body: z.string().describe("Email body content"),
    cc: z.array(z.string().email()).optional(),
    bcc: z.array(z.string().email()).optional()
  },
  async ({ to, subject, body, cc, bcc }) => {
    try {
      const messageId = await gmailClient.sendEmail({ to, subject, body, cc, bcc });
      return {
        content: [{
          type: "text",
          text: `Email sent successfully. Message ID: ${messageId}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Search Emails Tool
server.tool(
  "search_emails",
  {
    query: z.string().describe("Gmail search query"),
    maxResults: z.number().optional().default(10)
  },
  async ({ query, maxResults }) => {
    try {
      const results = await gmailClient.searchEmails(query, maxResults);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(results, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Read Email Tool
server.tool(
  "read_email",
  {
    messageId: z.string().describe("Gmail message ID")
  },
  async ({ messageId }) => {
    try {
      const message = await gmailClient.getMessage(messageId);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(message, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Gmail Client with OAuth Authentication (src/gmail-client.ts)

```typescript
import { google, gmail_v1 } from 'googleapis';
import { authenticate } from '@google-cloud/local-auth';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs/promises';
import * as path from 'path';

export class GmailClient {
  private gmail: gmail_v1.Gmail | null = null;
  private auth: OAuth2Client | null = null;
  
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify'
  ];
  
  private readonly TOKEN_PATH = path.join(process.cwd(), 'token.json');
  private readonly CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

  async authenticate(): Promise<void> {
    // Try to load saved credentials
    let client = await this.loadSavedCredentials();
    
    if (!client) {
      // Authenticate for the first time
      client = await authenticate({
        scopes: this.SCOPES,
        keyfilePath: this.CREDENTIALS_PATH,
      });
      
      if (client.credentials) {
        await this.saveCredentials(client);
      }
    }
    
    this.auth = client;
    this.gmail = google.gmail({ version: 'v1', auth: client });
  }

  private async loadSavedCredentials(): Promise<OAuth2Client | null> {
    try {
      const content = await fs.readFile(this.TOKEN_PATH, 'utf8');
      const credentials = JSON.parse(content);
      return google.auth.fromJSON(credentials);
    } catch (err) {
      return null;
    }
  }

  private async saveCredentials(client: OAuth2Client): Promise<void> {
    const content = await fs.readFile(this.CREDENTIALS_PATH, 'utf8');
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    
    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    
    await fs.writeFile(this.TOKEN_PATH, payload);
  }

  async sendEmail(params: {
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
  }): Promise<string> {
    const { to, subject, body, cc, bcc } = params;
    
    // Create email in RFC 2822 format
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
    
    // Fetch details for each message
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
```

## Claude Desktop Integration

To use your Gmail MCP server with Claude Desktop, add this configuration to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or the equivalent path on your OS:

```json
{
  "mcpServers": {
    "gmail": {
      "command": "node",
      "args": ["/absolute/path/to/gmail-mcp-server/build/index.js"]
    }
  }
}
```

## Local Development and Testing

### Using the MCP Inspector

The MCP Inspector provides an interactive way to test your server during development:

```bash
# Build the TypeScript code
npm run build

# Test with the inspector
npx @modelcontextprotocol/inspector build/index.js

# The inspector opens a web interface where you can:
# - View available tools
# - Test tool calls with different parameters
# - See request/response payloads
# - Debug authentication issues
```

### Development Workflow

1. **Initial Setup**:
   ```bash
   # Clone and install dependencies
   npm install
   
   # Place credentials.json in project root
   cp ~/Downloads/credentials.json .
   ```

2. **First Run**:
   ```bash
   # Build and run
   npm run build
   npm run inspect
   
   # On first run, you'll be prompted to authenticate
   # A browser window will open for OAuth consent
   # The token will be saved to token.json
   ```

3. **Development Mode**:
   ```bash
   # Use tsx for hot reloading during development
   npm run dev
   ```

## Security Best Practices for Local Use

### Credential Storage Patterns

For personal use, the simplest secure approach involves:

1. **File Permissions**: Set restrictive permissions on credential files
   ```bash
   chmod 600 credentials.json token.json
   ```

2. **Git Ignore**: Never commit credentials
   ```gitignore
   credentials.json
   token.json
   .env
   ```

3. **Token Refresh**: The Google library handles this automatically, but tokens expire after 6 months of inactivity

### Minimal Required Scopes

For basic email operations, use only these scopes:
- `gmail.readonly` - Read emails and labels
- `gmail.send` - Send emails
- `gmail.modify` - Modify labels (optional)

Avoid the full `https://mail.google.com/` scope unless absolutely necessary.

## Error Handling and Common Issues

### Authentication Errors

The most common issue is expired tokens. The Gmail client automatically refreshes tokens, but if refresh fails:

```typescript
async refreshTokenIfNeeded(): Promise<void> {
  if (this.auth?.credentials.expiry_date && 
      Date.now() >= this.auth.credentials.expiry_date) {
    try {
      const { credentials } = await this.auth.refreshAccessToken();
      await this.saveCredentials(this.auth);
    } catch (error) {
      console.error('Token refresh failed, need re-authentication');
      // Re-run the authentication flow
      await this.authenticate();
    }
  }
}
```

### Rate Limiting

Gmail API has quotas. Implement simple retry logic with exponential backoff:

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries) throw error;
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Advanced Email Operations

### Sending HTML Emails

```typescript
server.tool(
  "send_html_email",
  {
    to: z.array(z.string().email()),
    subject: z.string(),
    htmlBody: z.string().describe("HTML content"),
    plainText: z.string().optional()
  },
  async ({ to, subject, htmlBody, plainText }) => {
    const boundary = `boundary_${Date.now()}`;
    const messageParts = [
      `To: ${to.join(', ')}`,
      `Subject: ${subject}`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      plainText || 'This email requires HTML support',
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlBody,
      '',
      `--${boundary}--`
    ];
    
    const email = messageParts.join('\r\n');
    const encodedEmail = Buffer.from(email).toString('base64url');
    
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedEmail }
    });
    
    return {
      content: [{
        type: "text",
        text: `HTML email sent: ${res.data.id}`
      }]
    };
  }
);
```

### Label Management

```typescript
server.tool(
  "manage_labels",
  {
    messageId: z.string(),
    addLabels: z.array(z.string()).optional(),
    removeLabels: z.array(z.string()).optional()
  },
  async ({ messageId, addLabels, removeLabels }) => {
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: addLabels,
        removeLabelIds: removeLabels
      }
    });
    
    return {
      content: [{
        type: "text",
        text: "Labels updated successfully"
      }]
    };
  }
);
```

## Quick Start Guide

1. **Clone the starter template**:
   ```bash
   git clone https://github.com/your-repo/gmail-mcp-starter
   cd gmail-mcp-starter
   npm install
   ```

2. **Set up Google OAuth**:
   - Visit [console.cloud.google.com](https://console.cloud.google.com/)
   - Create project → Enable Gmail API → Create OAuth credentials
   - Download `credentials.json` to project root

3. **Build and authenticate**:
   ```bash
   npm run build
   npm run inspect  # Opens browser for OAuth consent
   ```

4. **Configure Claude Desktop**:
   - Add server configuration to Claude's config file
   - Restart Claude Desktop
   - Your Gmail tools are now available!

## Conclusion

Building a local Gmail MCP server in TypeScript for personal use is straightforward when focusing on the essentials. OAuth 2.0 desktop flow provides the simplest authentication path, requiring just a one-time browser consent. The combination of Google's official libraries and the MCP SDK handles most complexity, letting you focus on implementing the specific email operations you need.

The key to success is starting simple - implement basic read and send operations first, then gradually add features like search, labels, and HTML emails as needed. With proper error handling and the MCP Inspector for testing, you can have a functional Gmail integration running locally in under an hour.