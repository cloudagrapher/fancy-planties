import 'server-only';
import { requireAdminAccess } from '@/lib/auth/admin-middleware';
import { AuditLogQueries } from '@/lib/db/queries/audit-logs';
import OptimizedAuditLogViewer from '@/components/admin/OptimizedAuditLogViewer';

interface SearchParams {
  page?: string;
  pageSize?: string;
  action?: string;
  entityType?: 'user' | 'plant' | 'plant_instance' | 'propagation' | 'system';
  performedBy?: string;
  startDate?: string;
  endDate?: string;
  success?: string;
  search?: string;
}

export default async function OptimizedAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminAccess();
  
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const pageSize = parseInt(params.pageSize || '100'); // Larger page size for audit logs
  
  try {
    // Fetch minimal initial data for faster page load
    // React Query will handle subsequent data fetching with filters
    const { logs, totalCount } = await AuditLogQueries.getPaginatedAuditLogs(
      {}, // Empty filters for initial load
      page,
      pageSize
    );

    const stats = await AuditLogQueries.getAuditStats();

    return (
      <div className="optimized-audit-page">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Logs</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalLogs}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Today's Logs</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.todayLogs}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Failed Actions</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.failedActions}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Top Action</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {stats.topActions[0]?.action.replace(/_/g, ' ') || 'None'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {stats.topActions[0]?.count || 0} times
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Optimized Audit Log Viewer */}
          <OptimizedAuditLogViewer
            initialLogs={logs.map(log => ({
              id: log.id,
              action: log.action,
              entityType: log.entityType,
              entityId: log.entityId,
              performedBy: log.performedBy,
              performedByName: log.performedByUser?.name || 'Unknown',
              timestamp: log.timestamp.toISOString(),
              details: log.details,
              ipAddress: log.ipAddress,
              success: log.success,
            }))}
            initialTotalCount={totalCount}
            initialPage={page}
            pageSize={pageSize}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Failed to load optimized audit logs:', error);
    
    return (
      <div className="optimized-audit-error">
        <h1>Audit Logs</h1>
        <div className="error-message">
          <p>Failed to load audit logs. Please try refreshing the page.</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
}