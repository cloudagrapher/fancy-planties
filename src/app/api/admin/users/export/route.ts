import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireCuratorSession } from '@/lib/auth/server';
import { AdminUserQueries } from '@/lib/db/queries/admin-users';
import { AuditLogger, AUDIT_ACTIONS } from '@/lib/services/audit-logger';
import { z } from 'zod';

const exportSchema = z.object({
  userIds: z.array(z.number()).optional(),
  format: z.enum(['json', 'csv']).default('csv'),
  filters: z.object({
    search: z.string().optional(),
    curatorStatus: z.enum(['all', 'curators', 'users']).optional(),
    emailVerified: z.boolean().optional(),
  }).optional(),
});

function convertToCSV(users: any[]): string {
  if (users.length === 0) return '';

  const headers = [
    'ID',
    'Name',
    'Email',
    'Is Curator',
    'Email Verified',
    'Plant Count',
    'Propagation Count',
    'Care Entries Count',
    'Last Active',
    'Created At',
    'Updated At'
  ];

  const rows = users.map(user => [
    user.id,
    user.name,
    user.email,
    user.isCurator ? 'Yes' : 'No',
    user.isEmailVerified ? 'Yes' : 'No',
    user.plantCount,
    user.propagationCount,
    user.careEntriesCount,
    user.lastActive ? user.lastActive.toISOString() : '',
    user.createdAt.toISOString(),
    user.updatedAt.toISOString()
  ]);

  return [headers, ...rows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireCuratorSession();
    const body = await request.json();
    const { userIds, format, filters } = exportSchema.parse(body);

    const users = await AdminUserQueries.exportUsers(userIds, filters);

    // Log the export operation
    await AuditLogger.logSystemAction(
      AUDIT_ACTIONS.DATA_EXPORT,
      user.id,
      {
        entityType: 'users',
        format,
        userIds: userIds || 'all',
        filters,
        exportedCount: users.length,
      }
    );

    if (format === 'csv') {
      const csv = convertToCSV(users);
      const filename = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } else {
      const filename = `users-export-${new Date().toISOString().split('T')[0]}.json`;
      
      return new NextResponse(JSON.stringify(users, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }
  } catch (error) {
    console.error('Failed to export users:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to export users' },
      { status: 500 }
    );
  }
}