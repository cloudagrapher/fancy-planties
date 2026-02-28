/**
 * Shared admin dashboard types used by both server queries and client hooks.
 */

export interface AdminDashboardRecentUser {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

export interface AdminDashboardRecentPlant {
  id: number;
  commonName: string;
  genus: string;
  species: string;
  createdAt: Date;
}

export interface AdminDashboardRecentApproval {
  plantId: number;
  curatorName: string;
  notes?: string;
}

export interface AdminDashboardAlert {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
}

export interface AdminDashboardStats {
  users: {
    total: number;
    curators: number;
    newThisMonth: number;
    activeThisWeek: number;
  };
  plants: {
    total: number;
    verified: number;
    pendingApproval: number;
    submittedThisMonth: number;
  };
  activity: {
    recentRegistrations: AdminDashboardRecentUser[];
    recentSubmissions: AdminDashboardRecentPlant[];
    recentApprovals: AdminDashboardRecentApproval[];
  };
  systemHealth: {
    databaseSize: string;
    activeConnections: number;
    lastBackup?: Date;
    alerts: AdminDashboardAlert[];
  };
}
