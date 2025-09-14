import { POST as signinHandler } from "@/app/api/auth/signin/route";
import { POST as signoutHandler } from "@/app/api/auth/signout/route";
import { POST as signupHandler } from "@/app/api/auth/signup/route";
import { signIn, signOut, signUpUnverified } from "@/lib/auth";
import { withRateLimit } from "@/lib/auth/middleware";
import {
  clearSessionCookie,
  setSessionCookie,
  validateRequest,
} from "@/lib/auth/server";
import {
  signInSchema,
  signUpSchema,
  validateInput,
} from "@/lib/auth/validation";
import {
  EmailServiceError,
  sendEmailWithRetry,
} from "@/lib/services/email-service";
import { emailVerificationCodeService } from "@/lib/services/email-verification-code-service";
import { createEmailService } from "@/lib/services/resend-email-service";
import { NextRequest } from "next/server";

// Mock all dependencies
jest.mock("@/lib/auth");
jest.mock("@/lib/auth/server");
jest.mock("@/lib/auth/validation");
jest.mock("@/lib/auth/middleware");
jest.mock("@/lib/services/email-verification-code-service");
jest.mock("@/lib/services/email-service");
jest.mock("@/lib/services/resend-email-service");

// Type the mocked functions
const mockSignUpUnverified = signUpUnverified as jest.MockedFunction<
  typeof signUpUnverified
>;
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockValidateRequest = validateRequest as jest.MockedFunction<
  typeof validateRequest
>;
const mockSetSessionCookie = setSessionCookie as jest.MockedFunction<
  typeof setSessionCookie
>;
const mockClearSessionCookie = clearSessionCookie as jest.MockedFunction<
  typeof clearSessionCookie
>;
const mockValidateInput = validateInput as jest.MockedFunction<
  typeof validateInput
>;
const mockWithRateLimit = withRateLimit as jest.MockedFunction<
  typeof withRateLimit
>;
const mockEmailVerificationCodeService =
  emailVerificationCodeService as jest.Mocked<
    typeof emailVerificationCodeService
  >;
const mockSendEmailWithRetry = sendEmailWithRetry as jest.MockedFunction<
  typeof sendEmailWithRetry
>;
const mockCreateEmailService = createEmailService as jest.MockedFunction<
  typeof createEmailService
>;

describe("Authentication API Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default rate limit mock - just calls the handler
    mockWithRateLimit.mockImplementation(async (request, handler) => {
      return handler(request);
    });
  });

  describe("POST /api/auth/signup", () => {
    const validSignupData = {
      email: "test@example.com",
      password: "Password123",
      name: "Test User",
    };

    const mockUser = {
      id: 1,
      email: "test@example.com",
      name: "Test User",
      isEmailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      hashedPassword: "hashed_password",
      isCurator: false,
    };

    it("should create a new user successfully", async () => {
      // Mock validation success
      mockValidateInput.mockReturnValue({
        success: true,
        data: validSignupData,
      });

      // Mock user creation (new user)
      const newUser = { ...mockUser, createdAt: new Date() };
      mockSignUpUnverified.mockResolvedValue(newUser);

      // Mock email verification
      mockEmailVerificationCodeService.generateCode.mockResolvedValue("123456");
      mockCreateEmailService.mockReturnValue({} as any);
      mockSendEmailWithRetry.mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(validSignupData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await signupHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("Account created successfully");
      expect(data.requiresVerification).toBe(true);
      expect(data.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        isEmailVerified: mockUser.isEmailVerified,
      });

      expect(mockSignUpUnverified).toHaveBeenCalledWith(
        validSignupData.email,
        validSignupData.password,
        validSignupData.name
      );
      expect(
        mockEmailVerificationCodeService.generateCode
      ).toHaveBeenCalledWith(mockUser.id);
      expect(mockSendEmailWithRetry).toHaveBeenCalled();
    });

    it("should handle existing unverified user", async () => {
      mockValidateInput.mockReturnValue({
        success: true,
        data: validSignupData,
      });

      // Mock existing user (created more than 1 second ago)
      const existingUser = {
        ...mockUser,
        createdAt: new Date(Date.now() - 2000), // 2 seconds ago
      };
      mockSignUpUnverified.mockResolvedValue(existingUser);

      mockEmailVerificationCodeService.generateCode.mockResolvedValue("123456");
      mockCreateEmailService.mockReturnValue({} as any);
      mockSendEmailWithRetry.mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(validSignupData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await signupHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("Verification email resent");
      expect(data.requiresVerification).toBe(true);
    });

    it("should return validation errors for invalid input", async () => {
      const invalidData = {
        email: "invalid-email",
        password: "123",
        name: "",
      };

      mockValidateInput.mockReturnValue({
        success: false,
        errors: {
          email: "Please enter a valid email address",
          password: "Password must be at least 8 characters long",
          name: "Name is required",
        },
      });

      const request = new NextRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(invalidData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await signupHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.errors).toEqual({
        email: "Please enter a valid email address",
        password: "Password must be at least 8 characters long",
        name: "Name is required",
      });
    });

    it("should handle existing verified user error", async () => {
      mockValidateInput.mockReturnValue({
        success: true,
        data: validSignupData,
      });

      mockSignUpUnverified.mockRejectedValue(new Error("User already exists"));

      const request = new NextRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(validSignupData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await signupHandler(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("An account with this email already exists");
    });

    it("should handle email service errors gracefully", async () => {
      mockValidateInput.mockReturnValue({
        success: true,
        data: validSignupData,
      });

      mockSignUpUnverified.mockResolvedValue(mockUser);
      mockEmailVerificationCodeService.generateCode.mockResolvedValue("123456");
      mockCreateEmailService.mockReturnValue({} as any);

      const emailError = new EmailServiceError(
        "Failed to send email",
        "API_ERROR" as const
      );
      mockSendEmailWithRetry.mockRejectedValue(emailError);

      const request = new NextRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(validSignupData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await signupHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.requiresVerification).toBe(true);
      expect(data.emailError).toContain(
        "Failed to send verification email. Please try resending the verification code."
      );
    });

    it("should handle internal server errors", async () => {
      mockValidateInput.mockReturnValue({
        success: true,
        data: validSignupData,
      });

      mockSignUpUnverified.mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(validSignupData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await signupHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("POST /api/auth/signin", () => {
    const validSigninData = {
      email: "test@example.com",
      password: "Password123",
    };

    const mockUser = {
      id: 1,
      email: "test@example.com",
      name: "Test User",
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      hashedPassword: "hashed_password",
      isCurator: false,
    };

    const mockSession = {
      id: "session_123",
      userId: 1,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };

    it("should sign in user successfully with verified email", async () => {
      mockValidateInput.mockReturnValue({
        success: true,
        data: validSigninData,
      });

      mockSignIn.mockResolvedValue({
        user: mockUser,
        session: mockSession,
      });

      mockSetSessionCookie.mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost/api/auth/signin", {
        method: "POST",
        body: JSON.stringify(validSigninData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await signinHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        isEmailVerified: mockUser.isEmailVerified,
      });
      expect(data.requiresVerification).toBeUndefined();

      expect(mockSignIn).toHaveBeenCalledWith(
        validSigninData.email,
        validSigninData.password
      );
      expect(mockSetSessionCookie).toHaveBeenCalledWith(mockSession.id);
    });

    it("should handle unverified user signin", async () => {
      mockValidateInput.mockReturnValue({
        success: true,
        data: validSigninData,
      });

      const unverifiedUser = { ...mockUser, isEmailVerified: false };
      mockSignIn.mockResolvedValue({
        user: unverifiedUser,
        session: mockSession,
      });

      mockSetSessionCookie.mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost/api/auth/signin", {
        method: "POST",
        body: JSON.stringify(validSigninData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await signinHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.requiresVerification).toBe(true);
      expect(data.user.isEmailVerified).toBe(false);
    });

    it("should return validation errors for invalid input", async () => {
      const invalidData = {
        email: "invalid-email",
        password: "",
      };

      mockValidateInput.mockReturnValue({
        success: false,
        errors: {
          email: "Please enter a valid email address",
          password: "Password is required",
        },
      });

      const request = new NextRequest("http://localhost/api/auth/signin", {
        method: "POST",
        body: JSON.stringify(invalidData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await signinHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.errors).toEqual({
        email: "Please enter a valid email address",
        password: "Password is required",
      });
    });

    it("should handle invalid credentials", async () => {
      mockValidateInput.mockReturnValue({
        success: true,
        data: validSigninData,
      });

      mockSignIn.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/auth/signin", {
        method: "POST",
        body: JSON.stringify(validSigninData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await signinHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Invalid email or password");
    });

    it("should handle internal server errors", async () => {
      mockValidateInput.mockReturnValue({
        success: true,
        data: validSigninData,
      });

      mockSignIn.mockRejectedValue(new Error("Database connection failed"));

      const request = new NextRequest("http://localhost/api/auth/signin", {
        method: "POST",
        body: JSON.stringify(validSigninData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await signinHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("POST /api/auth/signout", () => {
    const mockUser = {
      id: 1,
      email: "test@example.com",
      name: "Test User",
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      hashedPassword: "hashed_password",
      isCurator: false,
    };

    const mockSession = {
      id: "session_123",
      userId: 1,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    it("should sign out user successfully", async () => {
      mockValidateRequest.mockResolvedValue({
        user: mockUser,
        session: mockSession,
      });

      mockSignOut.mockResolvedValue(undefined);
      mockClearSessionCookie.mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost/api/auth/signout", {
        method: "POST",
      });

      const response = await signoutHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Signed out successfully");

      expect(mockSignOut).toHaveBeenCalledWith(mockSession.id);
      expect(mockClearSessionCookie).toHaveBeenCalled();
    });

    it("should handle unauthenticated signout request", async () => {
      mockValidateRequest.mockResolvedValue({
        user: null,
        session: null,
      });

      const request = new NextRequest("http://localhost/api/auth/signout", {
        method: "POST",
      });

      const response = await signoutHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("No active session");

      expect(mockSignOut).not.toHaveBeenCalled();
      expect(mockClearSessionCookie).not.toHaveBeenCalled();
    });

    it("should handle internal server errors", async () => {
      mockValidateRequest.mockResolvedValue({
        user: mockUser,
        session: mockSession,
      });

      mockSignOut.mockRejectedValue(new Error("Database connection failed"));

      const request = new NextRequest("http://localhost/api/auth/signout", {
        method: "POST",
      });

      const response = await signoutHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should handle session cleanup errors gracefully", async () => {
      mockValidateRequest.mockResolvedValue({
        user: mockUser,
        session: mockSession,
      });

      mockSignOut.mockResolvedValue(undefined);
      mockClearSessionCookie.mockRejectedValue(new Error("Cookie error"));

      const request = new NextRequest("http://localhost/api/auth/signout", {
        method: "POST",
      });

      const response = await signoutHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("Rate Limiting", () => {
    it("should apply rate limiting to signup endpoint", async () => {
      const rateLimitError = new Error("Rate limit exceeded");
      mockWithRateLimit.mockRejectedValue(rateLimitError);

      const request = new NextRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "Password123",
          name: "Test User",
        }),
        headers: { "Content-Type": "application/json" },
      });

      await expect(signupHandler(request)).rejects.toThrow(
        "Rate limit exceeded"
      );
      expect(mockWithRateLimit).toHaveBeenCalled();
    });

    it("should apply rate limiting to signin endpoint", async () => {
      const rateLimitError = new Error("Rate limit exceeded");
      mockWithRateLimit.mockRejectedValue(rateLimitError);

      const request = new NextRequest("http://localhost/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "Password123",
        }),
        headers: { "Content-Type": "application/json" },
      });

      await expect(signinHandler(request)).rejects.toThrow(
        "Rate limit exceeded"
      );
      expect(mockWithRateLimit).toHaveBeenCalled();
    });
  });

  describe("Input Validation", () => {
    it("should validate signup input with proper schema", async () => {
      mockValidateInput.mockReturnValue({
        success: true,
        data: {
          email: "test@example.com",
          password: "Password123",
          name: "Test User",
        },
      });

      mockSignUpUnverified.mockResolvedValue({
        id: 1,
        email: "test@example.com",
        name: "Test User",
        isEmailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        hashedPassword: "hashed_password",
        isCurator: false,
      });

      mockEmailVerificationCodeService.generateCode.mockResolvedValue("123456");
      mockCreateEmailService.mockReturnValue({} as any);
      mockSendEmailWithRetry.mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "Password123",
          name: "Test User",
        }),
        headers: { "Content-Type": "application/json" },
      });

      await signupHandler(request);

      expect(mockValidateInput).toHaveBeenCalledWith(signUpSchema, {
        email: "test@example.com",
        password: "Password123",
        name: "Test User",
      });
    });

    it("should validate signin input with proper schema", async () => {
      mockValidateInput.mockReturnValue({
        success: true,
        data: {
          email: "test@example.com",
          password: "Password123",
        },
      });

      mockSignIn.mockResolvedValue({
        user: {
          id: 1,
          email: "test@example.com",
          name: "Test User",
          isEmailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          hashedPassword: "hashed_password",
          isCurator: false,
        },
        session: {
          id: "session_123",
          userId: 1,
          expiresAt: new Date(),
        },
      });

      mockSetSessionCookie.mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "Password123",
        }),
        headers: { "Content-Type": "application/json" },
      });

      await signinHandler(request);

      expect(mockValidateInput).toHaveBeenCalledWith(signInSchema, {
        email: "test@example.com",
        password: "Password123",
      });
    });
  });
});
