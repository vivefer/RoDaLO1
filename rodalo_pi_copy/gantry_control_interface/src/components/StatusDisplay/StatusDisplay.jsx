import React from 'react';
import './StatusDisplay.css';

const StatusDisplay = ({ 
  position, 
  stepSize, 
  isScanning, 
  isPaused,
  totalPoints, 
  dataSource,
  arduinoConnected,
  scanProgress,
  lastSensorReading,
  connectionTime
}) => {
  
  // Calculate real-world position
  const realPosition = {
    x: position.x * stepSize,
    y: position.y * stepSize
  };

  // Calculate scan completion percentage
  const getCompletionPercentage = () => {
    if (!scanProgress) return 0;
    return Math.round((scanProgress.current / scanProgress.total) * 100);
  };

  // Format uptime/connection time
  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const elapsed = Date.now() - new Date(timestamp).getTime();
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Get system status info
  const getSystemStatus = () => {
    if (dataSource === 'live' && !arduinoConnected) {
      return { status: 'disconnected', message: 'Arduino Disconnected', color: 'red' };
    }
    if (isScanning) {
      return { status: 'scanning', message: 'Active Scanning', color: 'green' };
    }
    if (isPaused) {
      return { status: 'paused', message: 'Scan Paused', color: 'orange' };
    }
    if (dataSource === 'live' && arduinoConnected) {
      return { status: 'ready', message: 'Ready to Scan', color: 'blue' };
    }
    if (dataSource === 'demo') {
      return { status: 'demo', message: 'Demo Mode', color: 'purple' };
    }
    if (dataSource === 'historical') {
      return { status: 'historical', message: 'Historical Data', color: 'gray' };
    }
    return { status: 'unknown', message: 'Unknown State', color: 'gray' };
  };

  const systemStatus = getSystemStatus();

  return (
    <div className="status-display">
      <h3>System Status</h3>
      
      {/* Main Status Indicator */}
      <div className="status-section">
        <div className={`status-indicator ${systemStatus.status}`}>
          <div className="status-dot" style={{ backgroundColor: systemStatus.color }}></div>
          <span className="status-text">{systemStatus.message}</span>
        </div>
      </div>

      {/* Connection Status (Live Mode Only) */}
      {dataSource === 'live' && (
        <div className="status-section">
          <h4>Arduino Connection</h4>
          <div className="status-grid">
            <div className="status-item">
              <span className="label">Status:</span>
              <span className={`value ${arduinoConnected ? 'connected' : 'disconnected'}`}>
                {arduinoConnected ? '✅ Connected' : '❌ Disconnected'}
              </span>
            </div>
            {arduinoConnected && connectionTime && (
              <div className="status-item">
                <span className="label">Connected for:</span>
                <span className="value">{formatTime(connectionTime)}</span>
              </div>
            )}
            {lastSensorReading && (
              <div className="status-item">
                <span className="label">Last Reading:</span>
                <span className="value">{lastSensorReading.toFixed(1)}cm</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Position Information */}
      <div className="status-section">
        <h4>Current Position</h4>
        <div className="status-grid">
          <div className="status-item">
            <span className="label">Grid Position:</span>
            <span className="value">({position.x}, {position.y})</span>
          </div>
          <div className="status-item">
            <span className="label">Real Position:</span>
            <span className="value">({realPosition.x}cm, {realPosition.y}cm)</span>
          </div>
          <div className="status-item">
            <span className="label">Step Size:</span>
            <span className="value">{stepSize}cm</span>
          </div>
        </div>
      </div>

      {/* Scanning Information */}
      <div className="status-section">
        <h4>Scan Information</h4>
        <div className="status-grid">
          <div className="status-item">
            <span className="label">Data Source:</span>
            <span className={`value source-${dataSource}`}>
              {dataSource.charAt(0).toUpperCase() + dataSource.slice(1)}
            </span>
          </div>
          <div className="status-item">
            <span className="label">Total Points:</span>
            <span className="value">{totalPoints.toLocaleString()}</span>
          </div>
          {isScanning && scanProgress && (
            <div className="status-item full-width">
              <span className="label">Scan Progress:</span>
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${getCompletionPercentage()}%` }}
                  ></div>
                </div>
                <span className="progress-text">
                  {scanProgress.current}/{scanProgress.total} ({getCompletionPercentage()}%)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data Source Specific Information */}
      {dataSource === 'live' && (
        <div className="status-section">
          <h4>Live Data Stream</h4>
          <div className="status-grid">
            <div className="status-item">
              <span className="label">Mode:</span>
              <span className="value">Real-time Arduino</span>
            </div>
            {isScanning && (
              <div className="status-item">
                <span className="label">Scan Status:</span>
                <span className="value scanning">🔴 LIVE SCANNING</span>
              </div>
            )}
          </div>
        </div>
      )}

      {dataSource === 'demo' && (
        <div className="status-section">
          <h4>Demo Mode</h4>
          <div className="status-grid">
            <div className="status-item">
              <span className="label">Mode:</span>
              <span className="value">Simulated Data</span>
            </div>
            <div className="status-item">
              <span className="label">Purpose:</span>
              <span className="value">Testing & Demonstration</span>
            </div>
          </div>
        </div>
      )}

      {dataSource === 'historical' && (
        <div className="status-section">
          <h4>Historical Data</h4>
          <div className="status-grid">
            <div className="status-item">
              <span className="label">Mode:</span>
              <span className="value">Archived Scan</span>
            </div>
            <div className="status-item">
              <span className="label">Controls:</span>
              <span className="value">View Only</span>
            </div>
          </div>
        </div>
      )}

      {/* System Performance (Live Mode) */}
      {dataSource === 'live' && arduinoConnected && (
        <div className="status-section">
          <h4>Performance</h4>
          <div className="status-grid">
            <div className="status-item">
              <span className="label">Data Rate:</span>
              <span className="value">Real-time</span>
            </div>
            <div className="status-item">
              <span className="label">Communication:</span>
              <span className="value">Serial + WebSocket</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusDisplay;
