import type { Metadata } from 'next';
import { requireVerifiedSession } from '@/lib/auth/server';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard — Fancy Planties',
  description: 'Overview of your plant collection, care tasks, and propagation progress.',
};

export default async function DashboardPage() {
  const { user } = await requireVerifiedSession();

  return (
    <DashboardClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt.toISOString()
      }}
    />
  );
}