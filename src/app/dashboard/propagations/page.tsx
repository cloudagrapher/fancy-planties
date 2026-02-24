import type { Metadata } from 'next';
import { requireVerifiedSession } from '@/lib/auth/server';
import PropagationDashboard from '@/components/propagations/PropagationDashboard';

export const metadata: Metadata = {
  title: 'Propagations — Fancy Planties',
  description: 'Track and manage your plant propagations from start to finish.',
};

export default async function PropagationsPage() {
  await requireVerifiedSession();

  return (
    <div className="page">
      <div className="container">
        <div className="page-content">
          <PropagationDashboard />
        </div>
      </div>
    </div>
  );
}