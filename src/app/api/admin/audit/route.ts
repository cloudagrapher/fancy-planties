import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { validateCuratorRequest } from '@/lib/auth/server';
import { AuditLogQueries, type AuditLogFilters } from '@/lib/db/queries/audit-logs';

export async function GET(request: NextRequest) {
  try {
    // Validate curator access
    const { user } = await validateCuratorRequest();
    
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100); // Max 100 per page
    
    // Build filters
    const filters: AuditLogFilters = {};
    
    if (searchParams.get('action')) {
      filters.action = searchParams.get('action')!;
    }
    
    if (searchParams.get('entityType')) {
      filters.entityType = searchParams.get('entityType') as any;
    }
    
    if (searchParams.get('performedBy')) {
      filters.performedBy = parseInt(searchParams.get('performedBy')!);
    }
    
    if (searchParams.get('startDate')) {
      filters.startDate = new Date(searchParams.get('startDate')!);
    }
    
    if (searchParams.get('endDate')) {
      filters.endDate = new Date(searchParams.get('endDate')!);
    }
    
    if (searchParams.get('success')) {
      filters.success = searchParams.get('success') === 'true';
    }
    
    if (searchParams.get('search')) {
      filters.search = searchParams.get('search')!;
    }

    // Get audit logs
    const result = await AuditLogQueries.getPaginatedAuditLogs(filters, page, pageSize);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}