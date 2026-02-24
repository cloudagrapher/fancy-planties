import type { Metadata } from 'next';
import { requireVerifiedSession } from '@/lib/auth/server';
import PlantsPageClient from './PlantsPageClient';

export const metadata: Metadata = {
  title: 'My Plants — Fancy Planties',
  description: 'Manage your plant collection, track care schedules, and view plant details.',
};

export default async function PlantsPage() {
  const { user } = await requireVerifiedSession();

  return <PlantsPageClient userId={user.id} />;
}