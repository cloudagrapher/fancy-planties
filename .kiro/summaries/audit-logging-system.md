# Audit Logging System Implementation

## Overview

The audit logging system provides comprehensive tracking of all administrative actions within the Fancy Planties application. This system ensures accountability, security monitoring, and compliance by recording detailed information about every admin operation.

## Database Schema

### Audit Logs Table

The `audit_logs` table captures the following information:

```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,                    -- Action performed (e.g., 'user_promoted', 'plant_approved')
  entity_type TEXT NOT NULL,               -- Type of entity affected (user, plant, plant_instance, propagation, system)
  entity_id INTEGER,                       -- ID of affected entity (nullable for system actions)
  performed_by INTEGER NOT NULL,           -- User ID of the curator who performed the action
  timestamp TIMESTAMP DEFAULT NOW(),       -- When the action occurred
  details JSONB DEFAULT '{}',              -- Additional context and metadata
  ip_address TEXT,                         -- Client IP address
  user_agent TEXT,                         -- Browser/client information
  success BOOLEAN DEFAULT TRUE,            -- Whether the action succeeded
  error_message TEXT,                      -- Error details if action failed
  
  FOREIGN KEY (performed_by) REFERENCES users(id)
);
```

### Indexes for Performance

The table includes comprehensive indexing for efficient querying:

- `audit_logs_action_idx` - Filter by action type
- `audit_logs_entity_type_idx` - Filter by entity type
- `audit_logs_entity_id_idx` - Filter by specific entity
- `audit_logs_performed_by_idx` - Filter by curator
- `audit_logs_timestamp_idx` - Time-based queries
- `audit_logs_success_idx` - Filter by success/failure
- `audit_logs_entity_type_id_idx` - Composite index for entity queries
- `audit_logs_performed_by_timestamp_idx` - Curator activity over time

## Implementation Features

### Automatic Logging

All admin actions are automatically logged through middleware and service layers:

```typescript
// Example: User promotion with audit logging
export async function promoteUserToCurator(targetUserId: number, curatorId: number) {
  try {
    // Perform the action
    await db.update(users)
      .set({ isCurator: true })
      .where(eq(users.id, targetUserId));
    
    // Log successful action
    await auditLogger.logAction(
      'user_promoted',
      'user',
      targetUserId,
      curatorId,
      { previousRole: 'user', newRole: 'curator' }
    );
  } catch (error) {
    // Log failed action
    await auditLogger.logAction(
      'user_promotion_failed',
      'user',
      targetUserId,
      curatorId,
      { targetUserId },
      undefined,
      false,
      error.message
    );
    throw error;
  }
}
```

### Tracked Actions

The system logs the following types of administrative actions:

#### User Management
- `user_promoted` - User promoted to curator
- `user_demoted` - Curator privileges revoked
- `user_created` - New user account created by admin
- `user_deleted` - User account deleted
- `user_updated` - User profile modified by admin

#### Plant Management
- `plant_approved` - User-submitted plant approved
- `plant_rejected` - User-submitted plant rejected
- `plant_created` - New plant taxonomy created
- `plant_updated` - Plant information modified
- `plant_deleted` - Plant taxonomy removed
- `plant_merged` - Duplicate plants merged

#### System Actions
- `system_backup` - Database backup created
- `system_maintenance` - Maintenance operations
- `system_config_changed` - System configuration modified
- `bulk_operation` - Bulk operations performed

### Security Features

#### IP Address Tracking
- Captures client IP address from various headers (X-Forwarded-For, X-Real-IP, CF-Connecting-IP)
- Handles proxy and CDN scenarios
- Useful for detecting suspicious activity patterns

#### User Agent Logging
- Records browser and client information
- Helps identify automated vs manual actions
- Assists in security investigations

#### Request Context
- Links audit entries to specific HTTP requests
- Preserves session information
- Enables correlation with other logs

## API Endpoints

### Query Audit Logs
```http
GET /api/admin/audit-logs
```

**Query Parameters:**
- `action` - Filter by action type
- `entityType` - Filter by entity type
- `entityId` - Filter by specific entity
- `performedBy` - Filter by curator
- `success` - Filter by success/failure
- `startDate` / `endDate` - Date range filtering
- `limit` / `offset` - Pagination

### Create Audit Entry
```http
POST /api/admin/audit-logs
```

**Request Body:**
```json
{
  "action": "plant_rejected",
  "entityType": "plant",
  "entityId": 124,
  "details": {
    "reason": "Duplicate entry",
    "existingPlantId": 45
  }
}
```

## Admin Dashboard Integration

### Audit Log Viewer
- Filterable table with all audit entries
- Real-time updates for new actions
- Detailed view for each log entry
- Export functionality for compliance

### Activity Monitoring
- Recent activity dashboard
- Curator activity summaries
- Suspicious activity alerts
- Performance metrics

### Compliance Features
- Retention policy management
- Data export for audits
- Search and filtering capabilities
- Detailed reporting tools

## Security Considerations

### Data Protection
- Sensitive information is not logged in details field
- Personal data is anonymized where possible
- Access restricted to curators only
- Audit logs themselves are immutable

### Performance Impact
- Asynchronous logging to minimize latency
- Efficient indexing for fast queries
- Automatic cleanup of old entries
- Batch operations for bulk logging

### Monitoring
- Failed logging attempts are tracked
- System alerts for audit system failures
- Regular integrity checks
- Backup and recovery procedures

## Future Enhancements

### Planned Features
1. **Real-time Notifications** - Instant alerts for critical actions
2. **Advanced Analytics** - Pattern detection and anomaly alerts
3. **Integration APIs** - Export to external SIEM systems
4. **Automated Responses** - Trigger actions based on audit events
5. **Enhanced Filtering** - More sophisticated query capabilities

### Compliance Extensions
1. **GDPR Compliance** - Data subject request tracking
2. **SOX Compliance** - Financial control auditing
3. **HIPAA Compliance** - Healthcare data protection (if applicable)
4. **Custom Retention** - Configurable retention policies

## Migration Information

- **Migration File**: `drizzle/0009_audit_logs.sql`
- **Applied**: Automatically during database setup
- **Dependencies**: Requires `users` table for foreign key constraint
- **Rollback**: Not recommended due to audit trail importance

## Testing

### Unit Tests
- Audit logger service functionality
- Error handling and edge cases
- Performance under load

### Integration Tests
- End-to-end admin action logging
- API endpoint functionality
- Database constraint validation

### Security Tests
- Access control verification
- Data sanitization checks
- Injection attack prevention

This audit logging system provides a robust foundation for administrative accountability and security monitoring in the Fancy Planties application.