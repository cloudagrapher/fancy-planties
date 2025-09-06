import { eq, lte } from 'drizzle-orm';
import { db } from '../index';
import { sessions, type Session, type NewSession } from '../schema';

// Session CRUD operations for Lucia auth
export class SessionQueries {
  // Create a new session
  static async create(sessionData: NewSession): Promise<Session> {
    try {
      const [session] = await db.insert(sessions).values(sessionData).returning();
      return session;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw new Error('Failed to create session');
    }
  }

  // Get session by ID
  static async getById(id: string): Promise<Session | null> {
    try {
      const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
      return session || null;
    } catch (error) {
      console.error('Failed to get session by ID:', error);
      throw new Error('Failed to get session');
    }
  }

  // Get all sessions for a user
  static async getByUserId(userId: number): Promise<Session[]> {
    try {
      return await db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, userId));
    } catch (error) {
      console.error('Failed to get sessions by user ID:', error);
      throw new Error('Failed to get sessions');
    }
  }

  // Update session expiration
  static async updateExpiration(id: string, expiresAt: Date): Promise<Session> {
    try {
      const [session] = await db
        .update(sessions)
        .set({ expiresAt })
        .where(eq(sessions.id, id))
        .returning();
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      return session;
    } catch (error) {
      console.error('Failed to update session expiration:', error);
      throw new Error('Failed to update session');
    }
  }

  // Delete session by ID
  static async delete(id: string): Promise<boolean> {
    try {
      const result = await db.delete(sessions).where(eq(sessions.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw new Error('Failed to delete session');
    }
  }

  // Delete all sessions for a user
  static async deleteByUserId(userId: number): Promise<number> {
    try {
      const result = await db.delete(sessions).where(eq(sessions.userId, userId));
      return result.rowCount;
    } catch (error) {
      console.error('Failed to delete sessions by user ID:', error);
      throw new Error('Failed to delete sessions');
    }
  }

  // Delete expired sessions
  static async deleteExpired(): Promise<number> {
    try {
      const now = new Date();
      const result = await db.delete(sessions).where(lte(sessions.expiresAt, now));
      return result.rowCount;
    } catch (error) {
      console.error('Failed to delete expired sessions:', error);
      throw new Error('Failed to delete expired sessions');
    }
  }

  // Check if session is valid (exists and not expired)
  static async isValid(id: string): Promise<boolean> {
    try {
      const session = await this.getById(id);
      if (!session) return false;
      
      const now = new Date();
      return session.expiresAt > now;
    } catch (error) {
      console.error('Failed to check session validity:', error);
      return false;
    }
  }

  // Cleanup expired sessions (utility function for maintenance)
  static async cleanup(): Promise<{ deletedCount: number }> {
    try {
      const deletedCount = await this.deleteExpired();
      console.log(`Cleaned up ${deletedCount} expired sessions`);
      return { deletedCount };
    } catch (error) {
      console.error('Failed to cleanup sessions:', error);
      throw new Error('Failed to cleanup sessions');
    }
  }
}