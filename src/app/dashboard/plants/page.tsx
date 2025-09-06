import { requireAuthSession } from '@/lib/auth/server';
import PlantsPageClient from './PlantsPageClient';

export default async function PlantsPage() {
  const { user } = await requireAuthSession();

  return <PlantsPageClient userId={user.id} />;
}