# Gmail MCP Server User Guide

Complete guide for setting up and using the Gmail MCP Server with Claude Desktop.

## Overview

This Gmail MCP Server allows Claude Desktop to interact with your Gmail account through secure OAuth 2.0 authentication. You can send emails, search messages, read emails, and manage multiple Gmail accounts.

## Prerequisites

- **Node.js** (version 18 or higher)
- **Claude Desktop** application installed
- **Gmail account** with API access enabled
- **Google Cloud Console** project with Gmail API enabled

## Setup Instructions

### 1. Google Cloud Console Setup

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Gmail API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Gmail API" and enable it

3. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Choose "Desktop application"
   - Download the credentials JSON file
   - **Important**: This file will need to be placed in Claude Desktop's directory later

4. **Configure OAuth Consent Screen**:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Add your email as a test user
   - Set scopes: `https://www.googleapis.com/auth/gmail.readonly`, `https://www.googleapis.com/auth/gmail.send`

### 2. Project Setup

1. **Clone and Install**:
   ```bash
   git clone <repository-url>
   cd gmail-mcp
   npm install
   ```

2. **Add Google Credentials**:
   - Rename your downloaded credentials file to `credentials.json`
   - Place it in Claude Desktop's working directory (not the project directory)
   - **Location varies by OS**:
     - **macOS**: `~/Library/Application Support/Claude/`
     - **Windows**: `%APPDATA%\Claude\`
     - **Linux**: `~/.config/claude/`
   - **Important**: Never commit this file to version control

3. **Build the Project**:
   ```bash
   npm run build
   ```

4. **Test the Setup**:
   ```bash
   npm run inspect
   ```
   This opens the MCP Inspector for testing tools before connecting to Claude Desktop.

### 3. Claude Desktop Integration

1. **Locate Claude Desktop Config**:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/claude/claude_desktop_config.json`

2. **Update Configuration**:
   ```json
   {
     "mcpServers": {
       "gmail": {
         "command": "node",
         "args": ["/absolute/path/to/your/gmail-mcp/build/index.js"]
       }
     }
   }
   ```
   Replace `/absolute/path/to/your/gmail-mcp/` with the actual path to your project.

3. **Restart Claude Desktop**:
   - Close and reopen Claude Desktop
   - The Gmail MCP server should now be available

## First-Time Authentication

When you first use Gmail tools through Claude Desktop:

1. **Browser Authentication**:
   - A browser window will open automatically
   - Sign in with your Gmail account
   - Grant the requested permissions

2. **Token Storage**:
   - Authentication tokens are stored in the `accounts/` directory within Claude Desktop's directory
   - These tokens auto-refresh and are valid for 6 months of inactivity

## Available Tools

### Email Operations

**Send Email**:
```
Send an email to john@example.com with subject "Meeting Tomorrow" and body "Don't forget our meeting at 2 PM"
```

**Search Emails**:
```
Search for emails from support@company.com in the last week
```

**Read Email**:
```
Read the email with message ID [message-id]
```

### Account Management

**List Accounts**:
```
Show me all configured Gmail accounts
```

**Add Account**:
```
Add Gmail account jane@example.com
```

**Remove Account**:
```
Remove Gmail account old@example.com
```

**Set Default Account**:
```
Set primary@example.com as the default account
```

## Usage Examples

### Basic Email Operations

1. **Send a simple email**:
   ```
   Send an email to team@company.com with subject "Project Update" and tell them the project is on track
   ```

2. **Search for recent emails**:
   ```
   Find all emails from my manager in the last 3 days
   ```

3. **Read a specific email**:
   ```
   Read the latest email from notifications@github.com
   ```

### Multi-Account Usage

1. **Send from specific account**:
   ```
   Send an email from work@company.com to client@example.com about the project status
   ```

2. **Search in specific account**:
   ```
   Search for invoices in my personal@gmail.com account
   ```

### Advanced Gmail Search

Gmail search queries support operators like:
- `from:sender@example.com`
- `subject:meeting`
- `has:attachment`
- `newer_than:7d`
- `is:unread`

Example:
```
Search for unread emails with attachments from the last week
```

## Security & Privacy

### Authentication Security
- Uses OAuth 2.0 with minimal required scopes
- Tokens stored locally in encrypted format
- No passwords stored anywhere
- Automatic token refresh

### Data Privacy
- No email content is stored permanently
- All operations are performed locally
- No data sent to third parties
- Audit logs available in Claude Desktop

### Best Practices
- Set restrictive file permissions on `credentials.json` in Claude Desktop's directory
- Regularly review OAuth consent screen
- Remove unused accounts
- Monitor token usage in Google Cloud Console
- Keep `credentials.json` secure - it's stored in Claude Desktop's directory for access by the MCP server

## Troubleshooting

### Common Issues

**"No account specified and no default account set"**:
- Solution: Add an account using `add_account` tool or set a default account

**"Authentication failed"**:
- Check if `credentials.json` exists in Claude Desktop's directory (not the project directory)
- Verify Gmail API is enabled in Google Cloud Console
- Try removing and re-adding the account

**"Token expired"**:
- Tokens auto-refresh, but manual re-authentication may be needed
- Remove and re-add the account if issues persist

**Claude Desktop not detecting MCP server**:
- Verify the absolute path in config file
- Check that the build directory exists
- Restart Claude Desktop after config changes

### Development and Testing

**Test tools without Claude Desktop**:
```bash
npm run inspect
```

**Development mode with hot reload**:
```bash
npm run dev
```

**View server logs**:
- Check Claude Desktop logs for MCP server output
- Use Inspector tool for detailed request/response debugging

### File Structure

**Project Directory**:
```
gmail-mcp/
├── build/              # Compiled JavaScript (auto-generated)
├── src/                # TypeScript source code
├── package.json        # Project dependencies
└── CLAUDE.md          # Project instructions for Claude
```

**Claude Desktop Directory** (where credentials.json goes):
```
~/.config/claude/       # Linux
~/Library/Application Support/Claude/  # macOS
%APPDATA%\Claude\       # Windows
├── credentials.json    # Google OAuth credentials (you provide)
├── accounts/           # Account tokens (auto-generated when using tools)
└── claude_desktop_config.json  # Claude Desktop configuration
```

## Limitations

- **Rate limits**: Gmail API has daily quotas
- **Scope limitations**: Only read and send permissions
- **Token expiry**: Tokens expire after 6 months of inactivity
- **File attachments**: Not currently supported for sending
- **HTML emails**: Limited formatting support

## Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Test with the MCP Inspector (`npm run inspect`)
3. Review Google Cloud Console for API quotas and errors
4. Check Claude Desktop logs for MCP server messages

## Advanced Configuration

### Custom Scopes
Modify the scopes in `src/auth.ts` if you need additional Gmail permissions.

### Multiple Projects
You can run multiple instances for different Google Cloud projects by using different configuration names in Claude Desktop.

### Development
See `CLAUDE.md` for development guidelines and architecture details.