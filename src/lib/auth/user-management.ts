import 'server-only';

import { db } from '../db';
import { users } from '../db/schema';
import { eq, and, ne } from 'drizzle-orm';

/**
 * Promote a user to curator status
 * Only curators can perform this action
 */
export async function promoteUserToCurator(userId: number, curatorId: number): Promise<boolean> {
  try {
    // Verify the acting user is a curator
    const [curator] = await db.select().from(users).where(
      and(eq(users.id, curatorId), eq(users.isCurator, true))
    );
    
    if (!curator) {
      throw new Error('Only curators can promote users');
    }
    
    // Update user to curator status
    const [updatedUser] = await db
      .update(users)
      .set({ 
        isCurator: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    return !!updatedUser;
  } catch (error) {
    console.error('Error promoting user to curator:', error);
    return false;
  }
}

/**
 * Demote a curator to regular user status
 * Curators cannot demote themselves
 */
export async function demoteUserFromCurator(userId: number, curatorId: number): Promise<boolean> {
  try {
    // Prevent self-demotion
    if (userId === curatorId) {
      throw new Error('Curators cannot demote themselves');
    }
    
    // Verify the acting user is a curator
    const [curator] = await db.select().from(users).where(
      and(eq(users.id, curatorId), eq(users.isCurator, true))
    );
    
    if (!curator) {
      throw new Error('Only curators can demote users');
    }
    
    // Update user to remove curator status
    const [updatedUser] = await db
      .update(users)
      .set({ 
        isCurator: false,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    
    return !!updatedUser;
  } catch (error) {
    console.error('Error demoting user from curator:', error);
    return false;
  }
}

/**
 * Get all curators in the system
 */
export async function getAllCurators() {
  try {
    return await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      isEmailVerified: users.isEmailVerified,
    }).from(users).where(eq(users.isCurator, true));
  } catch (error) {
    console.error('Error fetching curators:', error);
    return [];
  }
}

/**
 * Check if there would be any curators left after demoting a user
 * Prevents system from having no curators
 */
export async function wouldLeaveCurators(userId: number): Promise<boolean> {
  try {
    const curators = await db.select({ id: users.id })
      .from(users)
      .where(and(eq(users.isCurator, true), ne(users.id, userId)));
    
    return curators.length > 0;
  } catch (error) {
    console.error('Error checking remaining curators:', error);
    return false;
  }
}