import 'server-only';

import { db } from '../../lib/db';
import { users, sessions, emailVerificationCodes, plants, plantInstances, propagations, careHistory } from '../../lib/db/schema';
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
    this.createdPlants = [];
    this.createdPlantInstances = [];
    this.createdPropagations = [];
    this.createdCareHistory = [];
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
   * Create a test plant in the database
   * @param {Object} plantData - Plant data to insert
   * @returns {Promise<Object>} Created plant
   */
  async createTestPlant(plantData) {
    const [plant] = await db.insert(plants).values(plantData).returning();
    this.createdPlants.push(plant.id);
    return plant;
  }

  /**
   * Create a test plant instance in the database
   * @param {Object} instanceData - Plant instance data to insert
   * @returns {Promise<Object>} Created plant instance
   */
  async createTestPlantInstance(instanceData) {
    const [instance] = await db.insert(plantInstances).values(instanceData).returning();
    this.createdPlantInstances.push(instance.id);
    return instance;
  }

  /**
   * Create a test propagation in the database
   * @param {Object} propagationData - Propagation data to insert
   * @returns {Promise<Object>} Created propagation
   */
  async createTestPropagation(propagationData) {
    const [propagation] = await db.insert(propagations).values(propagationData).returning();
    this.createdPropagations.push(propagation.id);
    return propagation;
  }

  /**
   * Create a test care history record in the database
   * @param {Object} careData - Care history data to insert
   * @returns {Promise<Object>} Created care history record
   */
  async createTestCareHistory(careData) {
    const [care] = await db.insert(careHistory).values(careData).returning();
    this.createdCareHistory.push(care.id);
    return care;
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
      // Clean up in reverse order of dependencies to respect foreign key constraints
      
      // 1. Care history (references plant instances and users)
      for (const careId of this.createdCareHistory) {
        try {
          await db.delete(careHistory).where(eq(careHistory.id, careId));
        } catch (error) {
          // Ignore if record doesn't exist
          if (!error.message.includes('no rows')) {
            console.warn(`Failed to delete care history ${careId}:`, error.message);
          }
        }
      }

      // 2. Propagations (references plant instances, plants, and users)
      for (const propagationId of this.createdPropagations) {
        try {
          await db.delete(propagations).where(eq(propagations.id, propagationId));
        } catch (error) {
          if (!error.message.includes('no rows')) {
            console.warn(`Failed to delete propagation ${propagationId}:`, error.message);
          }
        }
      }

      // 3. Plant instances (references plants and users)
      for (const instanceId of this.createdPlantInstances) {
        try {
          await db.delete(plantInstances).where(eq(plantInstances.id, instanceId));
        } catch (error) {
          if (!error.message.includes('no rows')) {
            console.warn(`Failed to delete plant instance ${instanceId}:`, error.message);
          }
        }
      }

      // 4. Plants (references users)
      for (const plantId of this.createdPlants) {
        try {
          await db.delete(plants).where(eq(plants.id, plantId));
        } catch (error) {
          if (!error.message.includes('no rows')) {
            console.warn(`Failed to delete plant ${plantId}:`, error.message);
          }
        }
      }

      // 5. Email verification codes (references users)
      for (const codeId of this.createdEmailCodes) {
        try {
          await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.id, codeId));
        } catch (error) {
          if (!error.message.includes('no rows')) {
            console.warn(`Failed to delete email code ${codeId}:`, error.message);
          }
        }
      }

      // 6. Sessions (references users)
      for (const sessionId of this.createdSessions) {
        try {
          await db.delete(sessions).where(eq(sessions.id, sessionId));
        } catch (error) {
          if (!error.message.includes('no rows')) {
            console.warn(`Failed to delete session ${sessionId}:`, error.message);
          }
        }
      }

      // 7. Users (no dependencies)
      for (const userId of this.createdUsers) {
        try {
          await db.delete(users).where(eq(users.id, userId));
        } catch (error) {
          if (!error.message.includes('no rows')) {
            console.warn(`Failed to delete user ${userId}:`, error.message);
          }
        }
      }

      // Reset tracking arrays
      this.createdUsers = [];
      this.createdSessions = [];
      this.createdEmailCodes = [];
      this.createdPlants = [];
      this.createdPlantInstances = [];
      this.createdPropagations = [];
      this.createdCareHistory = [];
    } catch (error) {
      console.error('Database cleanup error:', error);
      // Reset tracking arrays even if cleanup fails
      this.createdUsers = [];
      this.createdSessions = [];
      this.createdEmailCodes = [];
      this.createdPlants = [];
      this.createdPlantInstances = [];
      this.createdPropagations = [];
      this.createdCareHistory = [];
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