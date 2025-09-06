import { eq } from 'drizzle-orm';
import { db } from '../index';
import { users, type User, type NewUser } from '../schema';

// User CRUD operations
export class UserQueries {
  // Create a new user
  static async create(userData: NewUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(userData).returning();
      return user;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw new Error('Failed to create user');
    }
  }

  // Get user by ID
  static async getById(id: number): Promise<User | null> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || null;
    } catch (error) {
      console.error('Failed to get user by ID:', error);
      throw new Error('Failed to get user');
    }
  }

  // Get user by email
  static async getByEmail(email: string): Promise<User | null> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user || null;
    } catch (error) {
      console.error('Failed to get user by email:', error);
      throw new Error('Failed to get user');
    }
  }

  // Update user
  static async update(id: number, userData: Partial<NewUser>): Promise<User> {
    try {
      const [user] = await db
        .update(users)
        .set({ ...userData, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user;
    } catch (error) {
      console.error('Failed to update user:', error);
      throw new Error('Failed to update user');
    }
  }

  // Delete user (soft delete by deactivating)
  static async delete(id: number): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id));
      return result.length > 0;
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw new Error('Failed to delete user');
    }
  }

  // Check if email exists
  static async emailExists(email: string): Promise<boolean> {
    try {
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email));
      return !!user;
    } catch (error) {
      console.error('Failed to check email existence:', error);
      throw new Error('Failed to check email');
    }
  }
}