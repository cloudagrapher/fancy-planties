import { requireAuthSession } from '@/lib/auth/server';
import { DataImport } from '@/components/import/DataImport';
import LogoutButton from '@/components/auth/LogoutButton';
import { User, Database, FileText, Download, Upload } from 'lucide-react';

export default async function ProfilePage() {
  const { user } = await requireAuthSession();

  return (
    <div className="page">
      <div className="container">
        <div className="page-content">
          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Profile</h1>
              <p className="text-neutral-600 text-sm">
                Manage your account and import plant data
              </p>
            </div>
          </div>

          {/* User Info Card */}
          <div className="card card--flat" style={{ marginBottom: '24px' }}>
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
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                <LogoutButton className="btn btn--danger btn--sm">
                  Sign Out of Account
                </LogoutButton>
              </div>
            </div>
          </div>

          {/* Data Management Section */}
          <div className="card card--flat">
            <div className="card-header">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-mint-100 rounded-lg">
                  <Database className="w-6 h-6 text-mint-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">Data Management</h2>
                  <p className="text-sm text-neutral-600">Import and export your plant data</p>
                </div>
              </div>
            </div>
            <div className="card-body">
              <DataImport />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card card--flat" style={{ marginTop: '24px' }}>
            <div className="card-header">
              <h3 className="text-lg font-semibold text-neutral-900">Quick Actions</h3>
              <p className="text-sm text-neutral-600">Common profile tasks</p>
            </div>
            <div className="card-body">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Download className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-neutral-900">Export Data</h4>
                      <p className="text-sm text-neutral-600">Download your plant collection</p>
                    </div>
                  </div>
                  <button className="btn btn--sm btn--outline">
                    Export
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Upload className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-neutral-900">Bulk Import</h4>
                      <p className="text-sm text-neutral-600">Import multiple plants at once</p>
                    </div>
                  </div>
                  <button className="btn btn--sm btn--outline">
                    Import
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-neutral-900">Data Templates</h4>
                      <p className="text-sm text-neutral-600">Download CSV templates</p>
                    </div>
                  </div>
                  <button className="btn btn--sm btn--outline">
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}