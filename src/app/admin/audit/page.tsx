import 'server-only';
import { requireAdminAccess } from '@/lib/auth/admin-middleware';
import { AuditLogQueries } from '@/lib/db/queries/audit-logs';
import OptimizedAuditLogViewer from '@/components/admin/OptimizedAuditLogViewer';
import AdminErrorBoundary from '@/components/admin/AdminErrorBoundary';

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

export default async function AdminAudit({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminAccess();
  
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const pageSize = parseInt(params.pageSize || '50');
  
  // Build filters from search params
  const filters = {
    action: params.action,
    entityType: params.entityType,
    performedBy: params.performedBy ? parseInt(params.performedBy) : undefined,
    startDate: params.startDate ? new Date(params.startDate) : undefined,
    endDate: params.endDate ? new Date(params.endDate) : undefined,
    success: params.success === 'true' ? true : params.success === 'false' ? false : undefined,
    search: params.search,
  };

  const { logs, totalCount } = await AuditLogQueries.getPaginatedAuditLogs(
    filters,
    page,
    pageSize
  );

  // Transform logs to match expected format
  const transformedLogs = logs.map(log => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    performedBy: log.performedBy,
    performedByName: log.performedByUser?.name,
    timestamp: log.timestamp.toISOString(),
    details: log.details,
    ipAddress: log.ipAddress,
    success: log.success,
  }));

  return (
    <AdminErrorBoundary>
      <OptimizedAuditLogViewer
        initialLogs={transformedLogs}
        initialTotalCount={totalCount}
        initialPage={page}
        pageSize={pageSize}
      />
    </AdminErrorBoundary>
  );
}