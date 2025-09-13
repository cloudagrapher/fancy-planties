'use client';

import { useState, useEffect } from 'react';
import type { AdminDashboardStats } from '@/lib/db/queries/admin-analytics';

interface AdminDashboardClientProps {
  initialStats: AdminDashboardStats;
}

export default function AdminDashboardClient({ initialStats }: AdminDashboardClientProps) {
  const [stats, setStats] = useState(initialStats);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshStats = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/admin/dashboard-stats');
      if (response.ok) {
        const newStats = await response.json();
        setStats(newStats);
      }
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(refreshStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <h1>Admin Dashboard</h1>
        <button 
          onClick={refreshStats}
          disabled={isRefreshing}
          className="refresh-button"
        >
          {isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <h3>👥 Users</h3>
          </div>
          <div className="metric-content">
            <div className="metric-primary">{stats.users.total}</div>
            <div className="metric-details">
              <div>Curators: {stats.users.curators}</div>
              <div>Verified: {stats.users.emailVerified}</div>
              <div>New this month: {stats.users.newThisMonth}</div>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <h3>🌱 Plants</h3>
          </div>
          <div className="metric-content">
            <div className="metric-primary">{stats.plants.total}</div>
            <div className="metric-details">
              <div>Verified: {stats.plants.verified}</div>
              <div className="metric-pending">
                Pending: {stats.plants.pendingApproval}
              </div>
              <div>New this month: {stats.plants.submittedThisMonth}</div>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <h3>📊 Activity</h3>
          </div>
          <div className="metric-content">
            <div className="metric-primary">{stats.activity.totalInstances}</div>
            <div className="metric-label">Plant Instances</div>
            <div className="metric-details">
              <div>Propagations: {stats.activity.totalPropagations}</div>
              <div>Care entries: {stats.activity.totalCareEntries}</div>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <h3>⚡ System</h3>
          </div>
          <div className="metric-content">
            <div className="metric-primary">{stats.systemHealth.activeSessions}</div>
            <div className="metric-label">Active Sessions</div>
            <div className="metric-details">
              <div>Weekly registrations: {stats.systemHealth.lastWeekRegistrations}</div>
              <div>Weekly submissions: {stats.systemHealth.lastWeekSubmissions}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="activity-section">
        <div className="activity-grid">
          <div className="activity-card">
            <h3>Recent User Registrations</h3>
            <div className="activity-list">
              {stats.activity.recentRegistrations.length > 0 ? (
                stats.activity.recentRegistrations.slice(0, 5).map((user) => (
                  <div key={user.id} className="activity-item">
                    <div className="activity-main">
                      <span className="activity-name">{user.name}</span>
                      <span className="activity-email">{user.email}</span>
                    </div>
                    <div className="activity-meta">
                      <span className="activity-date">
                        {formatDateTime(user.createdAt.toString())}
                      </span>
                      {user.isCurator && (
                        <span className="curator-badge">Curator</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-activity">No recent registrations</div>
              )}
            </div>
          </div>

          <div className="activity-card">
            <h3>Recent Plant Submissions</h3>
            <div className="activity-list">
              {stats.activity.recentSubmissions.length > 0 ? (
                stats.activity.recentSubmissions.slice(0, 5).map((plant) => (
                  <div key={plant.id} className="activity-item">
                    <div className="activity-main">
                      <span className="activity-name">{plant.commonName}</span>
                      <span className="activity-taxonomy">
                        {plant.genus} {plant.species}
                        {plant.cultivar && ` '${plant.cultivar}'`}
                      </span>
                    </div>
                    <div className="activity-meta">
                      <span className="activity-date">
                        {formatDateTime(plant.createdAt.toString())}
                      </span>
                      <span className={`status-badge ${plant.isVerified ? 'verified' : 'pending'}`}>
                        {plant.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-activity">No recent submissions</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <a href="/admin/plants/pending" className="action-button primary">
            Review Pending Plants ({stats.plants.pendingApproval})
          </a>
          <a href="/admin/users" className="action-button">
            Manage Users
          </a>
          <a href="/admin/plants" className="action-button">
            Manage Plants
          </a>
          <a href="/admin/audit" className="action-button">
            View Audit Logs
          </a>
        </div>
      </div>
    </div>
  );
}