import 'server-only';

import { db } from '../../lib/db';
import { users, sessions, emailVerificationCodes } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Database Test Manager
 * Provides isolated database operations for testing with proper cleanup
 */
class DatabaseTestManager {
  constructor() {
    this.createdUsers = [];
    this.createdSessions = [];
    this.createdEmailCodes = [];
  }

  /**
   * Create a test user in the database
   * @param {Object} userData - User data to insert
   * @returns {Promise<Object>} Created user
   */
  async createTestUser(userData) {
    const [user] = await db.insert(users).values(userData).returning();
    this.createdUsers.push(user.id);
    return user;
  }

  /**
   * Create a test session in the database
   * @param {Object} sessionData - Session data to insert
   * @returns {Promise<Object>} Created session
   */
  async createTestSession(sessionData) {
    const [session] = await db.insert(sessions).values(sessionData).returning();
    this.createdSessions.push(session.id);
    return session;
  }

  /**
   * Create a test email verification code in the database
   * @param {Object} codeData - Email verification code data to insert
   * @returns {Promise<Object>} Created email verification code
   */
  async createTestEmailCode(codeData) {
    const [code] = await db.insert(emailVerificationCodes).values(codeData).returning();
    this.createdEmailCodes.push(code.id);
    return code;
  }

  /**
   * Get a user by ID from the database
   * @param {number} userId - User ID to retrieve
   * @returns {Promise<Object|null>} User or null if not found
   */
  async getUserById(userId) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user || null;
  }

  /**
   * Get a user by email from the database
   * @param {string} email - Email to search for
   * @returns {Promise<Object|null>} User or null if not found
   */
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user || null;
  }

  /**
   * Get a session by ID from the database
   * @param {string} sessionId - Session ID to retrieve
   * @returns {Promise<Object|null>} Session or null if not found
   */
  async getSessionById(sessionId) {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
    return session || null;
  }

  /**
   * Get sessions for a user from the database
   * @param {number} userId - User ID to get sessions for
   * @returns {Promise<Array>} Array of sessions
   */
  async getSessionsByUserId(userId) {
    return await db.select().from(sessions).where(eq(sessions.userId, userId));
  }

  /**
   * Get email verification codes for a user
   * @param {number} userId - User ID to get codes for
   * @returns {Promise<Array>} Array of email verification codes
   */
  async getEmailCodesByUserId(userId) {
    return await db.select().from(emailVerificationCodes).where(eq(emailVerificationCodes.userId, userId));
  }

  /**
   * Update a user in the database
   * @param {number} userId - User ID to update
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(userId, updates) {
    const [user] = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  /**
   * Delete a user from the database
   * @param {number} userId - User ID to delete
   * @returns {Promise<void>}
   */
  async deleteUser(userId) {
    await db.delete(users).where(eq(users.id, userId));
    // Remove from tracking
    this.createdUsers = this.createdUsers.filter(id => id !== userId);
  }

  /**
   * Delete a session from the database
   * @param {string} sessionId - Session ID to delete
   * @returns {Promise<void>}
   */
  async deleteSession(sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    // Remove from tracking
    this.createdSessions = this.createdSessions.filter(id => id !== sessionId);
  }

  /**
   * Delete an email verification code from the database
   * @param {number} codeId - Code ID to delete
   * @returns {Promise<void>}
   */
  async deleteEmailCode(codeId) {
    await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.id, codeId));
    // Remove from tracking
    this.createdEmailCodes = this.createdEmailCodes.filter(id => id !== codeId);
  }

  /**
   * Clean up all test data created by this manager
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      // Clean up email verification codes first (foreign key constraints)
      for (const codeId of this.createdEmailCodes) {
        await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.id, codeId));
      }

      // Clean up sessions
      for (const sessionId of this.createdSessions) {
        await db.delete(sessions).where(eq(sessions.id, sessionId));
      }

      // Clean up users last
      for (const userId of this.createdUsers) {
        await db.delete(users).where(eq(users.id, userId));
      }

      // Reset tracking arrays
      this.createdUsers = [];
      this.createdSessions = [];
      this.createdEmailCodes = [];
    } catch (error) {
      console.error('Database cleanup error:', error);
      // Reset tracking arrays even if cleanup fails
      this.createdUsers = [];
      this.createdSessions = [];
      this.createdEmailCodes = [];
    }
  }

  /**
   * Check if the database connection is working
   * @returns {Promise<boolean>} True if connection is working
   */
  async isConnected() {
    try {
      // Simple query to test connection
      await db.select().from(users).limit(1);
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}

/**
 * Create a new database test manager instance
 * @returns {DatabaseTestManager} New database test manager
 */
export const createDatabaseTestManager = () => {
  return new DatabaseTestManager();
};

/**
 * Global database test manager for shared use
 */
export const globalDatabaseTestManager = new DatabaseTestManager();

export default DatabaseTestManager;