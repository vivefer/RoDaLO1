import React, { useState, useEffect } from 'react';
import './ControlPanel.css';

const ControlPanel = ({ 
  onCommand, 
  currentPosition, 
  gridSize, 
  isScanning, 
  isPaused,
  onStartScan, 
  onStopScan, 
  onResumeScan,
  dataSource,
  arduinoConnected,
  socket // Add socket for direct Arduino commands
}) => {
  const [targetX, setTargetX] = useState('');
  const [targetY, setTargetY] = useState('');
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (isScanning) {
      const total = gridSize.x * gridSize.y;
      const current = currentPosition.y * gridSize.x + currentPosition.x + 1;
      setScanProgress({ current, total });
    }
  }, [currentPosition, gridSize, isScanning]);

  // Arduino command sender
  const sendArduinoCommand = (command) => {
    if (dataSource === 'live' && arduinoConnected && socket) {
      socket.emit('send-command', command);
    } else if (dataSource === 'demo') {
      // Use existing onCommand for demo mode
      onCommand(command);
    }
  };

  // Movement Controls
  const handleMoveXPlus = () => {
    if (currentPosition.x < gridSize.x - 1 && !isScanning) {
      if (dataSource === 'live') {
        sendArduinoCommand('MOVE_X_PLUS');
      } else {
        onCommand('moveX');
      }
    }
  };

  const handleMoveXMinus = () => {
    if (currentPosition.x > 0 && !isScanning) {
      if (dataSource === 'live') {
        sendArduinoCommand('MOVE_X_MINUS');
      } else {
        onCommand('moveX', -1);
      }
    }
  };

  const handleMoveYPlus = () => {
    if (currentPosition.y < gridSize.y - 1 && !isScanning) {
      if (dataSource === 'live') {
        sendArduinoCommand('MOVE_Y_PLUS');
      } else {
        onCommand('moveY');
      }
    }
  };

  const handleMoveYMinus = () => {
    if (currentPosition.y > 0 && !isScanning) {
      if (dataSource === 'live') {
        sendArduinoCommand('MOVE_Y_MINUS');
      } else {
        onCommand('moveY', -1);
      }
    }
  };

  // Position Jump Controls
  const handleMoveToCrossSection = () => {
    const y = parseInt(targetY);
    if (y >= 0 && y < gridSize.y && !isScanning) {
      if (dataSource === 'live') {
        sendArduinoCommand(`MOVE_TO_Y:${y}`);
      } else {
        onCommand('moveToCrossSection', y);
      }
      setTargetY('');
    }
  };

  const handleMoveToDivision = () => {
    const x = parseInt(targetX);
    if (x >= 0 && x < gridSize.x && !isScanning) {
      if (dataSource === 'live') {
        sendArduinoCommand(`MOVE_TO_X:${x}`);
      } else {
        onCommand('moveToDivision', x);
      }
      setTargetX('');
    }
  };

  // Home Control
  const handleHome = () => {
    if (!isScanning) {
      if (dataSource === 'live') {
        sendArduinoCommand('HOME');
      } else {
        onCommand('home');
      }
    }
  };

  // Scan Controls
  const handleStartScan = () => {
    if (dataSource === 'live') {
      sendArduinoCommand('START_SCAN');
    } else {
      onStartScan();
    }
  };

  const handleStopScan = () => {
    if (dataSource === 'live') {
      sendArduinoCommand('STOP_SCAN');
    } else {
      onStopScan();
    }
  };

  const handleResumeScan = () => {
    if (dataSource === 'live') {
      sendArduinoCommand('RESUME_SCAN');
    } else {
      onResumeScan();
    }
  };

  // Emergency Stop
  const handleEmergencyStop = () => {
    if (dataSource === 'live') {
      sendArduinoCommand('EMERGENCY_STOP');
    } else {
      onCommand('emergencyStop');
    }
  };

  // Single Point Scan
  const handleScanPoint = () => {
    if (!isScanning) {
      if (dataSource === 'live') {
        sendArduinoCommand('SCAN_POINT');
      } else {
        onCommand('scanPoint');
      }
    }
  };

  // Check if controls should be disabled
  const isControlsDisabled = (dataSource === 'live' && !arduinoConnected) || dataSource === 'historical';

  return (
    <div className="control-panel">
      <h2>Gantry Controls</h2>
      
      {/* Connection Status */}
      <div className="control-section">
        <h3>System Status</h3>
        <div className="status-indicators">
          <div className={`status-badge ${arduinoConnected ? 'connected' : 'disconnected'}`}>
            Arduino: {arduinoConnected ? '✅ Connected' : '❌ Disconnected'}
          </div>
          <div className={`status-badge mode-${dataSource}`}>
            Mode: {dataSource.charAt(0).toUpperCase() + dataSource.slice(1)}
          </div>
        </div>
      </div>

      {/* Basic Movement */}
      <div className="control-section">
        <h3>Manual Movement</h3>
        <div className="movement-grid">
          <div className="movement-row">
            <div></div>
            <button 
              className="control-btn move-btn"
              onClick={handleMoveYPlus}
              disabled={isControlsDisabled || isScanning || currentPosition.y >= gridSize.y - 1}
              title="Move Y+"
            >
              Y+
            </button>
            <div></div>
          </div>
          <div className="movement-row">
            <button 
              className="control-btn move-btn"
              onClick={handleMoveXMinus}
              disabled={isControlsDisabled || isScanning || currentPosition.x <= 0}
              title="Move X-"
            >
              X-
            </button>
            <button 
              className="control-btn home-btn"
              onClick={handleHome}
              disabled={isControlsDisabled || isScanning}
              title="Home Position"
            >
              🏠 HOME
            </button>
            <button 
              className="control-btn move-btn"
              onClick={handleMoveXPlus}
              disabled={isControlsDisabled || isScanning || currentPosition.x >= gridSize.x - 1}
              title="Move X+"
            >
              X+
            </button>
          </div>
          <div className="movement-row">
            <div></div>
            <button 
              className="control-btn move-btn"
              onClick={handleMoveYMinus}
              disabled={isControlsDisabled || isScanning || currentPosition.y <= 0}
              title="Move Y-"
            >
              Y-
            </button>
            <div></div>
          </div>
        </div>
      </div>

      {/* Position Controls */}
      <div className="control-section">
        <h3>Position Jump</h3>
        <div className="input-group">
          <label>Move to X Division:</label>
          <div className="input-with-btn">
            <input
              type="number"
              value={targetX}
              onChange={(e) => setTargetX(e.target.value)}
              placeholder={`0-${gridSize.x - 1}`}
              min="0"
              max={gridSize.x - 1}
              disabled={isControlsDisabled || isScanning}
            />
            <button 
              className="control-btn"
              onClick={handleMoveToDivision}
              disabled={!targetX || isControlsDisabled || isScanning}
            >
              Go X
            </button>
          </div>
        </div>

        <div className="input-group">
          <label>Move to Y Cross Section:</label>
          <div className="input-with-btn">
            <input
              type="number"
              value={targetY}
              onChange={(e) => setTargetY(e.target.value)}
              placeholder={`0-${gridSize.y - 1}`}
              min="0"
              max={gridSize.y - 1}
              disabled={isControlsDisabled || isScanning}
            />
            <button 
              className="control-btn"
              onClick={handleMoveToCrossSection}
              disabled={!targetY || isControlsDisabled || isScanning}
            >
              Go Y
            </button>
          </div>
        </div>
      </div>

      {/* Scanning Controls */}
      <div className="control-section">
        <h3>Scanning Operations</h3>
        
        {/* Single Point Scan */}
        <button 
          className="control-btn scan-point-btn"
          onClick={handleScanPoint}
          disabled={isControlsDisabled || isScanning}
        >
          📍 Scan Current Point
        </button>

        {/* Full Scan Controls */}
        {!isScanning && !isPaused ? (
          <button 
            className="control-btn scan-btn"
            onClick={handleStartScan}
            disabled={isControlsDisabled}
          >
            🚀 Start Full Scan
          </button>
        ) : isPaused ? (
          <div className="scan-control-group">
            <button 
              className="control-btn resume-btn"
              onClick={handleResumeScan}
              disabled={isControlsDisabled}
            >
              ▶️ Resume Scan
            </button>
            <button 
              className="control-btn scan-btn"
              onClick={handleStartScan}
              disabled={isControlsDisabled}
            >
              🔄 Start New Scan
            </button>
          </div>
        ) : (
          <div className="scanning-active">
            <button 
              className="control-btn stop-btn"
              onClick={handleStopScan}
              disabled={isControlsDisabled}
            >
              ⏸️ Pause Scan
            </button>
            
            {/* Scan Progress */}
            <div className="scan-progress">
              <div className="progress-info">
                Progress: {scanProgress.current}/{scanProgress.total} points
                ({Math.round((scanProgress.current / scanProgress.total) * 100)}%)
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Stop */}
        <button 
          className="control-btn emergency-btn"
          onClick={handleEmergencyStop}
          title="Emergency Stop - Immediately halt all operations"
        >
          🛑 EMERGENCY STOP
        </button>
      </div>

      {/* Disabled State Message */}
      {isControlsDisabled && (
        <div className="control-section disabled-message">
          <div className="warning-message">
            {dataSource === 'live' && !arduinoConnected ? (
              <>⚠️ Arduino not connected. Controls disabled.</>
            ) : dataSource === 'historical' ? (
              <>📁 Historical data mode. Controls disabled.</>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
