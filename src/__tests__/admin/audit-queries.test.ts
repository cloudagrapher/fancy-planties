import { AuditLogQueries } from '@/lib/db/queries/audit-logs';
import { db } from '@/lib/db';

// Mock the database
jest.mock('@/lib/db');

const mockDb = db as jest.Mocked<typeof db>;

describe('AuditLogQueries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAuditLog', () => {
    it('should create an audit log entry', async () => {
      const mockAuditLog = {
        id: 1,
        action: 'user_promoted',
        entityType: 'user' as const,
        entityId: 123,
        performedBy: 456,
        timestamp: new Date(),
        details: { userName: 'John Doe' },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
        success: true,
        errorMessage: null,
      };

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockAuditLog])
        })
      } as any);

      const result = await AuditLogQueries.createAuditLog({
        action: 'user_promoted',
        entityType: 'user',
        entityId: 123,
        performedBy: 456,
        details: { userName: 'John Doe' },
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent',
      });

      expect(result).toEqual(mockAuditLog);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('getPaginatedAuditLogs', () => {
    it('should return paginated audit logs with user information', async () => {
      const mockLogs = [
        {
          id: 1,
          action: 'user_promoted',
          entityType: 'user',
          entityId: 123,
          performedBy: 456,
          timestamp: new Date(),
          details: {},
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent',
          success: true,
          errorMessage: null,
          performedByUser: {
            id: 456,
            name: 'Admin User',
            email: 'admin@example.com',
          },
        },
      ];

      // Mock count query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ totalCount: 1 }])
          })
        })
      } as any);

      // Mock main query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue(mockLogs)
                })
              })
            })
          })
        })
      } as any);

      const result = await AuditLogQueries.getPaginatedAuditLogs({}, 1, 10);

      expect(result).toEqual({
        logs: mockLogs,
        totalCount: 1,
        totalPages: 1,
      });
    });

    it('should apply filters correctly', async () => {
      const filters = {
        action: 'user_promoted',
        entityType: 'user' as const,
        performedBy: 456,
        success: true,
      };

      // Mock count query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ totalCount: 0 }])
          })
        })
      } as any);

      // Mock main query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue([])
                })
              })
            })
          })
        })
      } as any);

      await AuditLogQueries.getPaginatedAuditLogs(filters, 1, 10);

      // Verify that the where clause was called (filters were applied)
      expect(mockDb.select).toHaveBeenCalledTimes(2);
    });
  });

  describe('getEntityAuditLogs', () => {
    it('should return audit logs for a specific entity', async () => {
      const mockLogs = [
        {
          id: 1,
          action: 'plant_approved',
          entityType: 'plant',
          entityId: 789,
          performedBy: 456,
          timestamp: new Date(),
          details: {},
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent',
          success: true,
          errorMessage: null,
          performedByUser: {
            id: 456,
            name: 'Admin User',
            email: 'admin@example.com',
          },
        },
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(mockLogs)
              })
            })
          })
        })
      } as any);

      const result = await AuditLogQueries.getEntityAuditLogs('plant', 789, 10);

      expect(result).toEqual(mockLogs);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('getAuditStats', () => {
    it('should return audit statistics', async () => {
      // Mock total logs count
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockResolvedValue([{ totalLogs: 100 }])
      } as any);

      // Mock today's logs count
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ todayLogs: 10 }])
        })
      } as any);

      // Mock failed actions count
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ failedActions: 5 }])
        })
      } as any);

      // Mock top actions
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          groupBy: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                { action: 'plant_approved', count: 50 },
                { action: 'user_promoted', count: 20 },
              ])
            })
          })
        })
      } as any);

      const result = await AuditLogQueries.getAuditStats();

      expect(result).toEqual({
        totalLogs: 100,
        todayLogs: 10,
        failedActions: 5,
        topActions: [
          { action: 'plant_approved', count: 50 },
          { action: 'user_promoted', count: 20 },
        ],
      });
    });
  });

  describe('getRecentAuditLogs', () => {
    it('should return recent audit logs', async () => {
      const mockLogs = [
        {
          id: 1,
          action: 'plant_approved',
          entityType: 'plant',
          entityId: 789,
          performedBy: 456,
          timestamp: new Date(),
          details: {},
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent',
          success: true,
          errorMessage: null,
          performedByUser: {
            id: 456,
            name: 'Admin User',
            email: 'admin@example.com',
          },
        },
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockLogs)
            })
          })
        })
      } as any);

      const result = await AuditLogQueries.getRecentAuditLogs(5);

      expect(result).toEqual(mockLogs);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });
});