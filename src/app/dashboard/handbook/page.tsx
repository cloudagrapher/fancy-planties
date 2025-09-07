import { requireAuthSession } from '@/lib/auth/server';
import HandbookDashboard from '@/components/handbook/HandbookDashboard';
import { db } from '@/lib/db';
import { careGuides } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export default async function HandbookPage() {
  const { user } = await requireAuthSession();
  
  // Get user's care guides directly from database
  const userCareGuides = await db
    .select()
    .from(careGuides)
    .where(eq(careGuides.userId, user.id))
    .orderBy(desc(careGuides.updatedAt));
  
  return (
    <div className="min-h-screen pb-16 sm:pb-0 bg-gradient-to-b from-emerald-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <HandbookDashboard careGuides={userCareGuides} userId={user.id} />
      </div>
    </div>
  );
}