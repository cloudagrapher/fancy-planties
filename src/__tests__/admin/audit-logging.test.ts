import { AuditLogger, AUDIT_ACTIONS } from '@/lib/services/audit-logger';
import { AuditLogQueries } from '@/lib/db/queries/audit-logs';

// Mock the database queries
jest.mock('@/lib/db/queries/audit-logs');

const mockAuditLogQueries = AuditLogQueries as jest.Mocked<typeof AuditLogQueries>;

describe('AuditLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuditLogQueries.createAuditLog.mockResolvedValue({
      id: 1,
      action: 'test_action',
      entityType: 'user',
      entityId: 1,
      performedBy: 1,
      timestamp: new Date(),
      details: {},
      ipAddress: '192.168.1.1',
      userAgent: 'test-agent',
      success: true,
      errorMessage: null,
    });
  });

  describe('logAction', () => {
    it('should handle logging errors gracefully', async () => {
      mockAuditLogQueries.createAuditLog.mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should not throw
      await expect(AuditLogger.logAction({
        action: 'test_action',
        entityType: 'user',
        performedBy: 1,
      })).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to create audit log:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('logUserAction', () => {
    it('should call logAction with correct parameters for user promotion', async () => {
      const logActionSpy = jest.spyOn(AuditLogger, 'logAction').mockResolvedValue();

      await AuditLogger.logUserAction(
        AUDIT_ACTIONS.USER_PROMOTED,
        123,
        456,
        { userName: 'John Doe' }
      );

      expect(logActionSpy).toHaveBeenCalledWith({
        action: 'user_promoted',
        entityType: 'user',
        entityId: 123,
        performedBy: 456,
        details: { userName: 'John Doe' },
      });

      logActionSpy.mockRestore();
    });

    it('should call logAction with correct parameters for user demotion', async () => {
      const logActionSpy = jest.spyOn(AuditLogger, 'logAction').mockResolvedValue();

      await AuditLogger.logUserAction(
        AUDIT_ACTIONS.USER_DEMOTED,
        123,
        456,
        { userName: 'Jane Doe' }
      );

      expect(logActionSpy).toHaveBeenCalledWith({
        action: 'user_demoted',
        entityType: 'user',
        entityId: 123,
        performedBy: 456,
        details: { userName: 'Jane Doe' },
      });

      logActionSpy.mockRestore();
    });
  });

  describe('logPlantAction', () => {
    it('should call logAction with correct parameters for plant approval', async () => {
      const logActionSpy = jest.spyOn(AuditLogger, 'logAction').mockResolvedValue();

      await AuditLogger.logPlantAction(
        AUDIT_ACTIONS.PLANT_APPROVED,
        789,
        456,
        { plantName: 'Monstera deliciosa' }
      );

      expect(logActionSpy).toHaveBeenCalledWith({
        action: 'plant_approved',
        entityType: 'plant',
        entityId: 789,
        performedBy: 456,
        details: { plantName: 'Monstera deliciosa' },
      });

      logActionSpy.mockRestore();
    });

    it('should call logAction with correct parameters for plant rejection', async () => {
      const logActionSpy = jest.spyOn(AuditLogger, 'logAction').mockResolvedValue();

      await AuditLogger.logPlantAction(
        AUDIT_ACTIONS.PLANT_REJECTED,
        789,
        456,
        { plantName: 'Invalid plant', reason: 'Duplicate entry' }
      );

      expect(logActionSpy).toHaveBeenCalledWith({
        action: 'plant_rejected',
        entityType: 'plant',
        entityId: 789,
        performedBy: 456,
        details: { plantName: 'Invalid plant', reason: 'Duplicate entry' },
      });

      logActionSpy.mockRestore();
    });
  });

  describe('logSystemAction', () => {
    it('should call logAction with correct parameters for bulk operations', async () => {
      const logActionSpy = jest.spyOn(AuditLogger, 'logAction').mockResolvedValue();

      await AuditLogger.logSystemAction(
        AUDIT_ACTIONS.BULK_OPERATION,
        456,
        { operation: 'bulk_verify', count: 10 }
      );

      expect(logActionSpy).toHaveBeenCalledWith({
        action: 'bulk_operation',
        entityType: 'system',
        performedBy: 456,
        details: { operation: 'bulk_verify', count: 10 },
      });

      logActionSpy.mockRestore();
    });
  });

  describe('logFailedAction', () => {
    it('should call logAction with correct parameters for failed actions', async () => {
      const logActionSpy = jest.spyOn(AuditLogger, 'logAction').mockResolvedValue();
      const error = new Error('Operation failed');
      
      await AuditLogger.logFailedAction(
        'test_action',
        'user',
        456,
        error,
        123,
        { context: 'test' }
      );

      expect(logActionSpy).toHaveBeenCalledWith({
        action: 'test_action',
        entityType: 'user',
        entityId: 123,
        performedBy: 456,
        details: { context: 'test' },
        success: false,
        errorMessage: 'Operation failed',
      });

      logActionSpy.mockRestore();
    });
  });

  describe('withAuditLog', () => {
    it('should log successful operations', async () => {
      const logActionSpy = jest.spyOn(AuditLogger, 'logAction').mockResolvedValue();
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await AuditLogger.withAuditLog(
        'test_operation',
        'user',
        456,
        operation,
        123,
        { context: 'test' }
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
      expect(logActionSpy).toHaveBeenCalledWith({
        action: 'test_operation',
        entityType: 'user',
        entityId: 123,
        performedBy: 456,
        details: { context: 'test' },
        success: true,
      });

      logActionSpy.mockRestore();
    });

    it('should log failed operations and re-throw error', async () => {
      const logFailedActionSpy = jest.spyOn(AuditLogger, 'logFailedAction').mockResolvedValue();
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(AuditLogger.withAuditLog(
        'test_operation',
        'user',
        456,
        operation,
        123,
        { context: 'test' }
      )).rejects.toThrow('Operation failed');

      expect(operation).toHaveBeenCalled();
      expect(logFailedActionSpy).toHaveBeenCalledWith(
        'test_operation',
        'user',
        456,
        error,
        123,
        { context: 'test' }
      );

      logFailedActionSpy.mockRestore();
    });
  });

  describe('AUDIT_ACTIONS constants', () => {
    it('should have all required action constants', () => {
      expect(AUDIT_ACTIONS.USER_PROMOTED).toBe('user_promoted');
      expect(AUDIT_ACTIONS.USER_DEMOTED).toBe('user_demoted');
      expect(AUDIT_ACTIONS.PLANT_APPROVED).toBe('plant_approved');
      expect(AUDIT_ACTIONS.PLANT_REJECTED).toBe('plant_rejected');
      expect(AUDIT_ACTIONS.BULK_OPERATION).toBe('bulk_operation');
      expect(AUDIT_ACTIONS.SYSTEM_BACKUP).toBe('system_backup');
    });
  });
});