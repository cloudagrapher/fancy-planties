import { requireVerifiedSession } from '@/lib/auth/server';
import PlantsPageClient from './PlantsPageClient';

export default async function PlantsPage() {
  const { user } = await requireVerifiedSession();

  return <PlantsPageClient userId={user.id} />;
}