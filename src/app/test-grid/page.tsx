export default function TestGridPage() {
  return (
    <div className="page">
      <div className="container">
        <div className="page-content">
          <h1>Grid Layout Test</h1>
          
          <h2>Dashboard Stats Grid Test</h2>
          <div className="dashboard-stats-grid">
            <div className="stat-card card--mint">
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🌱</div>
              <h3>Plants</h3>
              <p>Manage your plant collection</p>
              <div className="stat-value">1</div>
              <div className="stat-label">active plants</div>
            </div>
            
            <div className="stat-card card--salmon">
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💧</div>
              <h3>Care Tasks</h3>
              <p>Track care schedules</p>
              <div className="stat-value">0</div>
              <div className="stat-label">due today</div>
            </div>
            
            <div className="stat-card card--lavender">
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🌿</div>
              <h3>Propagations</h3>
              <p>Monitor propagation progress</p>
              <div className="stat-value">18</div>
              <div className="stat-label">active</div>
            </div>
            
            <div className="stat-card card--neutral">
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📊</div>
              <h3>Success Rate</h3>
              <p>Propagation success</p>
              <div className="stat-value">0</div>
              <div className="stat-label">%</div>
            </div>
          </div>
          
          <h2>Regular Stats Grid Test</h2>
          <div className="stats-grid">
            <div className="stat-card card--mint">
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🌱</div>
              <h3>Plants</h3>
              <p>Manage your plant collection</p>
              <div className="stat-value">1</div>
              <div className="stat-label">active plants</div>
            </div>
            
            <div className="stat-card card--salmon">
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💧</div>
              <h3>Care Tasks</h3>
              <p>Track care schedules</p>
              <div className="stat-value">0</div>
              <div className="stat-label">due today</div>
            </div>
            
            <div className="stat-card card--lavender">
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🌿</div>
              <h3>Propagations</h3>
              <p>Monitor propagation progress</p>
              <div className="stat-value">18</div>
              <div className="stat-label">active</div>
            </div>
            
            <div className="stat-card card--neutral">
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📊</div>
              <h3>Success Rate</h3>
              <p>Propagation success</p>
              <div className="stat-value">0</div>
              <div className="stat-label">%</div>
            </div>
          </div>
          
          <h2>Inline Style Test (Should Work)</h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div className="stat-card card--mint">
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🌱</div>
              <h3>Plants</h3>
              <p>Manage your plant collection</p>
              <div className="stat-value">1</div>
              <div className="stat-label">active plants</div>
            </div>
            
            <div className="stat-card card--salmon">
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💧</div>
              <h3>Care Tasks</h3>
              <p>Track care schedules</p>
              <div className="stat-value">0</div>
              <div className="stat-label">due today</div>
            </div>
            
            <div className="stat-card card--lavender">
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🌿</div>
              <h3>Propagations</h3>
              <p>Monitor propagation progress</p>
              <div className="stat-value">18</div>
              <div className="stat-label">active</div>
            </div>
            
            <div className="stat-card card--neutral">
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📊</div>
              <h3>Success Rate</h3>
              <p>Propagation success</p>
              <div className="stat-value">0</div>
              <div className="stat-label">%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}