import { ResendEmailService, EmailServiceError } from '../email';

// Mock Resend
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn(),
    },
  })),
}));

describe('ResendEmailService', () => {
  let emailService: ResendEmailService;
  let mockResend: any;

  beforeEach(() => {
    const { Resend } = require('resend');
    mockResend = {
      emails: {
        send: jest.fn(),
      },
    };
    Resend.mockImplementation(() => mockResend);

    emailService = new ResendEmailService({
      apiKey: 'test-api-key',
      fromEmail: 'test@example.com',
      fromName: 'Test App',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendVerificationEmail', () => {
    it('should send email successfully', async () => {
      mockResend.emails.send.mockResolvedValue({
        data: { id: 'email-id-123' },
        error: null,
      });

      const result = await emailService.sendVerificationEmail(
        'user@example.com',
        '123456',
        'John Doe'
      );

      expect(result).toBe(true);
      expect(mockResend.emails.send).toHaveBeenCalledWith({
        from: 'Test App <test@example.com>',
        to: ['user@example.com'],
        subject: 'Verify your email address',
        html: expect.stringContaining('123456'),
      });
    });

    it('should include user name in email template', async () => {
      mockResend.emails.send.mockResolvedValue({
        data: { id: 'email-id-123' },
        error: null,
      });

      await emailService.sendVerificationEmail(
        'user@example.com',
        '123456',
        'John Doe'
      );

      const callArgs = mockResend.emails.send.mock.calls[0][0];
      expect(callArgs.html).toContain('Hi John Doe,');
      expect(callArgs.html).toContain('123456');
    });

    it('should retry on API errors', async () => {
      mockResend.emails.send
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          data: { id: 'email-id-123' },
          error: null,
        });

      const result = await emailService.sendVerificationEmail(
        'user@example.com',
        '123456',
        'John Doe'
      );

      expect(result).toBe(true);
      expect(mockResend.emails.send).toHaveBeenCalledTimes(2);
    });

    it('should throw EmailServiceError on Resend API error', async () => {
      mockResend.emails.send.mockResolvedValue({
        data: null,
        error: { message: 'Invalid email address' },
      });

      await expect(
        emailService.sendVerificationEmail('invalid-email', '123456', 'John Doe')
      ).rejects.toThrow(EmailServiceError);
    });

    it('should not retry on invalid email error', async () => {
      mockResend.emails.send.mockResolvedValue({
        data: null,
        error: { message: 'Invalid email address' },
      });

      await expect(
        emailService.sendVerificationEmail('invalid-email', '123456', 'John Doe')
      ).rejects.toThrow(EmailServiceError);

      expect(mockResend.emails.send).toHaveBeenCalledTimes(1);
    });

    it('should throw error after max retries', async () => {
      mockResend.emails.send.mockRejectedValue(new Error('Network error'));

      await expect(
        emailService.sendVerificationEmail('user@example.com', '123456', 'John Doe')
      ).rejects.toThrow('Network error');

      expect(mockResend.emails.send).toHaveBeenCalledTimes(3);
    });
  });
});