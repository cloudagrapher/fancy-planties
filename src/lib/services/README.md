# Email Service

This module provides email functionality for the Fancy Planties application, specifically for sending verification codes during user registration.

## Setup

### Environment Variables

The following environment variables must be configured:

```bash
# Required
RESEND_API_KEY=re_xxxxxxxxxx

# Optional (with defaults)
FROM_EMAIL=send.mail.fancy-planties.cloudagrapher.com
FROM_NAME=Fancy Planties
VERIFICATION_CODE_EXPIRY_MINUTES=10
MAX_VERIFICATION_ATTEMPTS=5
RESEND_COOLDOWN_SECONDS=60
MAX_RESEND_PER_HOUR=5
```

### Domain Configuration

For production use with Resend:

1. Add domain `fancy-planties.cloudagrapher.com` in Resend dashboard
2. Configure DNS records as provided by Resend:
   - SPF record for sender authentication
   - DKIM record for email signing  
   - DMARC record for email policy
3. Verify domain ownership in Resend
4. Use `send.mail.fancy-planties.cloudagrapher.com` as FROM_EMAIL

## Usage

### Basic Usage

```typescript
import { createEmailService } from '@/lib/services/email';

const emailService = createEmailService();

try {
  const success = await emailService.sendVerificationEmail(
    'user@example.com',
    '123456',
    'John Doe'
  );
  
  if (success) {
    console.log('Verification email sent successfully');
  }
} catch (error) {
  console.error('Failed to send email:', error);
}
```

### Error Handling

```typescript
import { createEmailService, EmailServiceError } from '@/lib/services/email';
import { getEmailErrorMessage } from '@/lib/utils/email-errors';

const emailService = createEmailService();

try {
  await emailService.sendVerificationEmail(email, code, name);
} catch (error) {
  if (error instanceof EmailServiceError) {
    switch (error.code) {
      case 'QUOTA_EXCEEDED':
        // Handle quota exceeded
        break;
      case 'INVALID_EMAIL':
        // Handle invalid email
        break;
      case 'NETWORK_ERROR':
        // Handle network issues
        break;
      case 'API_ERROR':
        // Handle API errors
        break;
    }
  }
  
  // Get user-friendly error message
  const userMessage = getEmailErrorMessage(error);
  return { error: userMessage };
}
```

## Features

- **Retry Logic**: Automatically retries failed requests with exponential backoff
- **Error Classification**: Categorizes errors for appropriate handling
- **Development Logging**: Logs verification codes in development mode
- **HTML Email Template**: Professional-looking verification emails
- **Type Safety**: Full TypeScript support with proper error types

## Testing

Run email service tests:

```bash
npm test -- --testPathPatterns="email"
```

## Email Template

The service includes a responsive HTML email template with:

- Professional styling matching the Fancy Planties brand
- Clear verification code display
- Step-by-step instructions
- Security warnings about code expiration
- Mobile-responsive design

## Security Considerations

- Verification codes are only logged in development mode
- Retry logic prevents abuse while ensuring delivery
- Error messages don't expose sensitive information
- Email service API keys are kept secure in environment variables