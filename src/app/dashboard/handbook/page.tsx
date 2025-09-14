import { requireVerifiedSession } from '@/lib/auth/server';
import HandbookDashboard from '@/components/handbook/HandbookDashboard';
import { db } from '@/lib/db';
import { careGuides } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export default async function HandbookPage() {
  const { user } = await requireVerifiedSession();
  
  // Get user's care guides directly from database
  const userCareGuides = await db
    .select()
    .from(careGuides)
    .where(eq(careGuides.userId, user.id))
    .orderBy(desc(careGuides.updatedAt));
  
  return (
    <div className="page">
      <div className="container">
        <div className="page-content">
          <HandbookDashboard careGuides={userCareGuides} userId={user.id} />
        </div>
      </div>
    </div>
  );
}