'use client';

import { useAdminDashboardStats } from '@/lib/hooks/useAdminQueries';

export default function OptimizedDashboard() {
  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useAdminDashboardStats();

  if (error) {
    return (
      <div className="optimized-dashboard-error">
        <h1>Admin Dashboard</h1>
        <div className="error-message">
          <p>Failed to load dashboard statistics: {error.message}</p>
          <button onClick={() => refetch()}>Retry</button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="optimized-dashboard-loading">
        <h1>Admin Dashboard</h1>
        <div className="loading-overlay">Loading dashboard statistics...</div>
      </div>
    );
  }

  return (
    <div className="optimized-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p>System overview and key metrics</p>
      </div>

      {/* User Statistics */}
      <div className="stats-section">
        <h2>User Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon user-icon">👥</div>
            <div className="stat-content">
              <div className="stat-value">{stats?.users.total || 0}</div>
              <div className="stat-label">Total Users</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon curator-icon">👑</div>
            <div className="stat-content">
              <div className="stat-value">{stats?.users.curators || 0}</div>
              <div className="stat-label">Curators</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon new-user-icon">✨</div>
            <div className="stat-content">
              <div className="stat-value">{stats?.users.newThisMonth || 0}</div>
              <div className="stat-label">New This Month</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon active-icon">🟢</div>
            <div className="stat-content">
              <div className="stat-value">{stats?.users.activeThisWeek || 0}</div>
              <div className="stat-label">Active This Week</div>
            </div>
          </div>
        </div>
      </div>

      {/* Plant Statistics */}
      <div className="stats-section">
        <h2>Plant Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon plant-icon">🌱</div>
            <div className="stat-content">
              <div className="stat-value">{stats?.plants.total || 0}</div>
              <div className="stat-label">Total Plants</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon verified-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{stats?.plants.verified || 0}</div>
              <div className="stat-label">Verified Plants</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon pending-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-value">{stats?.plants.pendingApproval || 0}</div>
              <div className="stat-label">Pending Approval</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon submitted-icon">📤</div>
            <div className="stat-content">
              <div className="stat-value">{stats?.plants.submittedThisMonth || 0}</div>
              <div className="stat-label">Submitted This Month</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="activity-section">
        <h2>Recent Activity</h2>
        <div className="activity-grid">
          <div className="activity-card">
            <h3>Recent Registrations</h3>
            <div className="activity-list">
              {stats?.activity.recentRegistrations?.slice(0, 5).map((user: any) => (
                <div key={user.id} className="activity-item">
                  <div className="activity-icon">👤</div>
                  <div className="activity-content">
                    <div className="activity-title">{user.name}</div>
                    <div className="activity-subtitle">{user.email}</div>
                  </div>
                  <div className="activity-time">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
              )) || []}
              {(!stats?.activity.recentRegistrations || stats.activity.recentRegistrations.length === 0) && (
                <div className="activity-empty">No recent registrations</div>
              )}
            </div>
          </div>

          <div className="activity-card">
            <h3>Recent Plant Submissions</h3>
            <div className="activity-list">
              {stats?.activity.recentSubmissions?.slice(0, 5).map((plant: any) => (
                <div key={plant.id} className="activity-item">
                  <div className="activity-icon">🌿</div>
                  <div className="activity-content">
                    <div className="activity-title">{plant.commonName}</div>
                    <div className="activity-subtitle">{plant.genus} {plant.species}</div>
                  </div>
                  <div className="activity-time">
                    {new Date(plant.createdAt).toLocaleDateString()}
                  </div>
                </div>
              )) || []}
              {(!stats?.activity.recentSubmissions || stats.activity.recentSubmissions.length === 0) && (
                <div className="activity-empty">No recent submissions</div>
              )}
            </div>
          </div>

          <div className="activity-card">
            <h3>Recent Approvals</h3>
            <div className="activity-list">
              {stats?.activity.recentApprovals?.slice(0, 5).map((approval: any) => (
                <div key={approval.plantId} className="activity-item">
                  <div className="activity-icon">✅</div>
                  <div className="activity-content">
                    <div className="activity-title">Plant Approved</div>
                    <div className="activity-subtitle">by {approval.curatorName}</div>
                  </div>
                  <div className="activity-time">
                    {approval.notes && <div className="activity-notes">{approval.notes}</div>}
                  </div>
                </div>
              )) || []}
              {(!stats?.activity.recentApprovals || stats.activity.recentApprovals.length === 0) && (
                <div className="activity-empty">No recent approvals</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="system-section">
        <h2>System Health</h2>
        <div className="system-grid">
          <div className="system-card">
            <h3>Database</h3>
            <div className="system-metrics">
              <div className="metric">
                <span className="metric-label">Size:</span>
                <span className="metric-value">{stats?.systemHealth.databaseSize || 'Unknown'}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Connections:</span>
                <span className="metric-value">{stats?.systemHealth.activeConnections || 0}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Last Backup:</span>
                <span className="metric-value">
                  {stats?.systemHealth.lastBackup 
                    ? new Date(stats.systemHealth.lastBackup).toLocaleDateString()
                    : 'Never'
                  }
                </span>
              </div>
            </div>
          </div>

          <div className="system-card">
            <h3>Alerts</h3>
            <div className="alerts-list">
              {stats?.systemHealth.alerts?.map((alert: any, index: number) => (
                <div key={index} className={`alert alert-${alert.severity}`}>
                  <div className="alert-icon">
                    {alert.severity === 'critical' ? '🚨' : 
                     alert.severity === 'warning' ? '⚠️' : 'ℹ️'}
                  </div>
                  <div className="alert-content">
                    <div className="alert-title">{alert.title}</div>
                    <div className="alert-message">{alert.message}</div>
                  </div>
                </div>
              )) || []}
              {(!stats?.systemHealth.alerts || stats.systemHealth.alerts.length === 0) && (
                <div className="alerts-empty">No active alerts</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}