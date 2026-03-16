import type { Metadata } from 'next';
import { requireVerifiedSession } from '@/lib/auth/server';
import { DataImport } from '@/components/import/DataImport';
import ExportMyData from '@/components/profile/ExportMyData';
import LogoutButton from '@/components/auth/LogoutButton';
import { User, Database } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Profile — Fancy Planties',
  description: 'Manage your account settings and import or export plant data.',
};

export default async function ProfilePage() {
  const { user } = await requireVerifiedSession();

  return (
    <div className="page">
      <div className="container">
        <div className="page-content">
          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Profile</h1>
              <p className="text-neutral-600 text-sm">
                Manage your account and plant data
              </p>
            </div>
          </div>

          {/* User Info Card */}
          <div className="card card--flat mb-6">
            <div className="card-header">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-primary-100 rounded-lg">
                  <User className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">Account Information</h2>
                  <p className="text-sm text-neutral-600">Your profile details</p>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-neutral-700">Name</label>
                  <p className="text-neutral-900">{user.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700">Email</label>
                  <p className="text-neutral-900">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700">Member Since</label>
                  <p className="text-neutral-900">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-200">
                <LogoutButton className="btn btn--danger btn--sm">
                  Sign Out of Account
                </LogoutButton>
              </div>
            </div>
          </div>

          {/* Export My Data */}
          <div className="card card--flat mb-6">
            <div className="card-header">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">Your Data</h2>
                  <p className="text-sm text-neutral-600">Export your plant collection</p>
                </div>
              </div>
            </div>
            <div className="card-body">
              <ExportMyData />
            </div>
          </div>

          {/* Data Import Section */}
          <div className="card card--flat">
            <div className="card-body">
              <DataImport />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
