import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import ControlPanel from './components/ControlPanel';
import ScatterPlot3D from './components/ThreeVisualization';
import StatusDisplay from './components/StatusDisplay';
import MessageLog from './components/MessageLog';
import { sendCommand } from './utils/api';
import './App.css';

const GRID_SIZE_X = 20;
const GRID_SIZE_Y = 15;
const STEP_SIZE = 5; // 5cm steps
const SOCKET_URL = 'http://localhost:3001';

function App() {
  const [scanData, setScanData] = useState([]);
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  const [messages, setMessages] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanInterval, setScanInterval] = useState(null);
  const [cameraView, setCameraView] = useState('reset');
  const [scanState, setScanState] = useState({ x: 0, y: 0, isPaused: false });
  
  // Arduino connection and data source management
  const [socket, setSocket] = useState(null);
  const [arduinoConnected, setArduinoConnected] = useState(false);
  const [dataSource, setDataSource] = useState('demo'); // 'live', 'historical', 'demo'
  const [historicalFiles, setHistoricalFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [connectionTime, setConnectionTime] = useState(null);
  const [lastSensorReading, setLastSensorReading] = useState(null);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });

  const addMessage = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setMessages(prev => [...prev.slice(-9), { text: message, time: timestamp }]);
  };

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Arduino connection status
    newSocket.on('connection-status', (status) => {
      setArduinoConnected(status.connected);
      if (status.connected) {
        setConnectionTime(status.timestamp);
        addMessage(`✅ Arduino connected on ${status.port}`);
      } else {
        setConnectionTime(null);
        addMessage(`❌ Arduino disconnected: ${status.error || 'Unknown error'}`);
      }
    });

    // Live Arduino sensor data
    newSocket.on('sensor-data', (data) => {
      if (dataSource === 'live') {
        // Add real Arduino sensor data to scan data
        setScanData(prev => [...prev, {
          x: data.x,
          y: data.y,
          z: data.z,
          gridX: data.gridX,
          gridY: data.gridY,
          timestamp: data.timestamp,
          serverTimestamp: data.serverTimestamp
        }]);
        
        // Update current position and sensor reading
        setCurrentPosition({ x: data.gridX, y: data.gridY });
        setLastSensorReading(data.z);
        
        addMessage(`📡 Live scan: (${data.gridX},${data.gridY}) - Height: ${data.z.toFixed(1)}cm`);
      }
    });

    // Arduino status messages
    newSocket.on('arduino-status', (status) => {
      addMessage(`🔧 Arduino: ${status.status} - ${status.message}`);
      
      // Handle scanning status
      if (status.status === 'ready') {
        setIsScanning(false);
        setScanState(prev => ({ ...prev, isPaused: false }));
      } else if (status.status === 'scanning') {
        setIsScanning(true);
        setScanState(prev => ({ ...prev, isPaused: false }));
      } else if (status.status === 'paused') {
        setIsScanning(false);
        setScanState(prev => ({ ...prev, isPaused: true }));
      } else if (status.status === 'complete') {
        setIsScanning(false);
        setScanState({ x: 0, y: 0, isPaused: false });
      }
    });

    // Raw Arduino data (for debugging)
    newSocket.on('arduino-data', (data) => {
      console.log('Raw Arduino data:', data.raw);
    });

    return () => {
      newSocket.close();
    };
  }, [dataSource]);

  // Update scan progress
  useEffect(() => {
    if (isScanning && scanData.length > 0) {
      const total = GRID_SIZE_X * GRID_SIZE_Y;
      const current = scanData.length;
      setScanProgress({ current, total });
    }
  }, [scanData, isScanning]);

  // Load historical files list
  const loadHistoricalFiles = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/data/historical');
      const result = await response.json();
      setHistoricalFiles(result.files);
    } catch (error) {
      addMessage('❌ Failed to load historical files');
    }
  };

  // Load specific historical file
  const loadHistoricalData = async (filename) => {
    try {
      const response = await fetch(`http://localhost:3001/api/data/historical/${filename}`);
      const result = await response.json();
      
      setScanData(result.scanData);
      setSelectedFile(filename);
      addMessage(`📁 Loaded ${result.totalPoints} points from ${filename}`);
      
      // Set position to last scanned point if available
      if (result.scanData.length > 0) {
        const lastPoint = result.scanData[result.scanData.length - 1];
        setCurrentPosition({ x: lastPoint.gridX || 0, y: lastPoint.gridY || 0 });
      }
      
    } catch (error) {
      addMessage(`❌ Failed to load ${filename}`);
    }
  };

  // Switch data source
  const switchDataSource = (source) => {
    setDataSource(source);
    setScanData([]); // Clear current data
    setCurrentPosition({ x: 0, y: 0 });
    setSelectedFile(null);
    setScanProgress({ current: 0, total: 0 });
    
    switch (source) {
      case 'live':
        if (arduinoConnected) {
          addMessage('🔴 Switched to Live Arduino data');
        } else {
          addMessage('⚠️ Arduino not connected - no live data available');
        }
        break;
      case 'historical':
        loadHistoricalFiles();
        addMessage('📁 Switched to Historical data mode');
        break;
      case 'demo':
        addMessage('🎮 Switched to Demo mode with simulated data');
        break;
    }
  };

  const generateScanPoint = (x, y) => {
    // Simulate sensor reading (only used in demo mode)
    const baseHeight = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 10 + 
                     Math.random() * 5 + 10;
    return {
      x: x * STEP_SIZE,
      y: y * STEP_SIZE,
      z: Math.max(0, baseHeight),
      gridX: x,
      gridY: y,
      timestamp: Date.now()
    };
  };

  const handleCommand = async (command, value = null) => {
    try {
      // Handle camera view commands locally
      if (['top', 'front', 'side', 'reset'].includes(command)) {
        setCameraView(command);
        addMessage(`Camera view changed to ${command}`);
        return;
      }

      // Handle emergency stop immediately
      if (command === 'emergencyStop') {
        if (scanInterval) {
          clearTimeout(scanInterval);
          setScanInterval(null);
        }
        setIsScanning(false);
        setScanState({ x: 0, y: 0, isPaused: false });
        setCurrentPosition({ x: 0, y: 0 });
        addMessage('🛑 EMERGENCY STOP - System reset to initial position');
        
        // Send emergency stop to Arduino if connected
        if (socket && arduinoConnected) {
          socket.emit('send-command', 'EMERGENCY_STOP');
        }
        
        await sendCommand(command, value);
        return;
      }

      // For other commands, handle based on data source
      if (dataSource === 'live' && arduinoConnected) {
        // Send command to Arduino via WebSocket
        socket.emit('send-command', command);
        addMessage(`📤 Command sent to Arduino: ${command}`);
      } else {
        // Use dummy API for demo/historical modes
        const response = await sendCommand(command, value);
        addMessage(response.message);
        
        // Update position based on command (demo mode only)
        if (dataSource === 'demo') {
          switch (command) {
            case 'moveX':
              if (currentPosition.x < GRID_SIZE_X - 1) {
                setCurrentPosition(prev => ({ ...prev, x: prev.x + 1 }));
              }
              break;
            case 'moveY':
              if (currentPosition.y < GRID_SIZE_Y - 1) {
                setCurrentPosition(prev => ({ ...prev, y: prev.y + 1 }));
              }
              break;
            case 'moveToCrossSection':
              setCurrentPosition(prev => ({ ...prev, y: parseInt(value) }));
              break;
            case 'moveToDivision':
              setCurrentPosition(prev => ({ ...prev, x: parseInt(value) }));
              break;
          }
        }
      }
    } catch (error) {
      addMessage(`Error: ${error.message}`);
    }
  };

  const startFullScan = () => {
    if (dataSource === 'live' && arduinoConnected) {
      // Send scan start command to Arduino
      socket.emit('send-command', 'START_SCAN');
      addMessage('📡 Starting live Arduino scan...');
      setIsScanning(true);
      setScanData([]); // Clear previous data
    } else if (dataSource === 'demo') {
      // Demo mode scanning
      setIsScanning(true);
      setCurrentPosition({ x: 0, y: 0 });
      setScanState({ x: 0, y: 0, isPaused: false });
      setScanData([]);
      addMessage('🎮 Starting demo scan from position (0,0)');
      
      executeDemoScan(0, 0);
    } else {
      addMessage('⚠️ Cannot start scan: Switch to Live or Demo mode');
    }
  };

  const executeDemoScan = (currentX, currentY) => {
    if (!isScanning || scanState.isPaused || dataSource !== 'demo') {
      return;
    }

    const newPoint = generateScanPoint(currentX, currentY);
    setScanData(prev => [...prev, newPoint]);
    setCurrentPosition({ x: currentX, y: currentY });
    setScanState({ x: currentX, y: currentY, isPaused: false });
    
    addMessage(`🎮 Demo scan: (${currentX},${currentY}) - Height: ${newPoint.z.toFixed(1)}cm`);
    
    let nextX = currentX + 1;
    let nextY = currentY;
    
    if (nextX >= GRID_SIZE_X) {
      nextX = 0;
      nextY++;
      
      if (nextY >= GRID_SIZE_Y) {
        setIsScanning(false);
        setScanState({ x: 0, y: 0, isPaused: false });
        addMessage('🎮 Demo scan completed!');
        return;
      }
    }
    
    const timeoutId = setTimeout(() => {
      executeDemoScan(nextX, nextY);
    }, 1000);
    
    setScanInterval(timeoutId);
  };

  const stopScan = () => {
    if (dataSource === 'live' && arduinoConnected) {
      socket.emit('send-command', 'STOP_SCAN');
      addMessage('📡 Stopping Arduino scan...');
    }
    
    if (scanInterval) {
      clearTimeout(scanInterval);
      setScanInterval(null);
    }
    setIsScanning(false);
    setScanState(prev => ({ ...prev, isPaused: true }));
    addMessage('⏸️ Scan paused');
  };

  const resumeScan = () => {
    if (dataSource === 'live' && arduinoConnected) {
      socket.emit('send-command', 'RESUME_SCAN');
      addMessage('📡 Resuming Arduino scan...');
    } else if (dataSource === 'demo' && scanState.isPaused) {
      setIsScanning(true);
      setScanState(prev => ({ ...prev, isPaused: false }));
      addMessage('▶️ Resuming demo scan...');
      executeDemoScan(scanState.x, scanState.y);
    }
  };

  const handleScanPoint = () => {
    if (dataSource === 'live' && arduinoConnected) {
      socket.emit('send-command', 'SCAN_POINT');
      addMessage('📡 Single point scan requested');
    } else if (dataSource === 'demo') {
      const newPoint = generateScanPoint(currentPosition.x, currentPosition.y);
      setScanData(prev => [...prev, newPoint]);
      addMessage(`🎮 Point scanned at (${currentPosition.x},${currentPosition.y}) - Height: ${newPoint.z.toFixed(1)}cm`);
    }
  };

  // Cleanup scan interval on unmount
  useEffect(() => {
    return () => {
      if (scanInterval) {
        clearTimeout(scanInterval);
      }
    };
  }, [scanInterval]);

  return (
    <div className="app">
      {/* Connection Status Overlay */}
      {dataSource === 'live' && (
        <div className="connection-overlay">
          <div className={`connection-status-badge ${arduinoConnected ? 'connected' : 'disconnected'}`}>
            {arduinoConnected ? '✅ Arduino Connected' : '❌ Arduino Disconnected'}
          </div>
        </div>
      )}

      {/* Live Data Indicator */}
      {dataSource === 'live' && isScanning && (
        <div className="live-data-indicator">
          🔴 LIVE SCANNING
        </div>
      )}

      <div className="left-panel">
        {/* Data Source Controls */}
        <div className="data-source-controls">
          <h3>Data Source</h3>
          <div className="source-buttons">
            <button 
              className={`source-btn ${dataSource === 'live' ? 'active' : ''}`}
              onClick={() => switchDataSource('live')}
              disabled={!arduinoConnected && dataSource !== 'live'}
            >
              🔴 Live Arduino {arduinoConnected ? '✅' : '❌'}
            </button>
            <button 
              className={`source-btn ${dataSource === 'demo' ? 'active' : ''}`}
              onClick={() => switchDataSource('demo')}
            >
              🎮 Demo Mode
            </button>
            <button 
              className={`source-btn ${dataSource === 'historical' ? 'active' : ''}`}
              onClick={() => switchDataSource('historical')}
            >
              📁 Historical Data
            </button>
          </div>
          
          {/* Historical file selection */}
          {dataSource === 'historical' && (
            <div className="historical-files">
              <h4>Available Scan Files:</h4>
              {historicalFiles.length > 0 ? (
                <select 
                  value={selectedFile || ''} 
                  onChange={(e) => loadHistoricalData(e.target.value)}
                >
                  <option value="">Select a scan file...</option>
                  {historicalFiles.map(file => (
                    <option key={file.filename} value={file.filename}>
                      {file.filename} ({new Date(file.created).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              ) : (
                <p>No scan files found</p>
              )}
            </div>
          )}
        </div>

        <ControlPanel 
          onCommand={handleCommand}
          currentPosition={currentPosition}
          gridSize={{ x: GRID_SIZE_X, y: GRID_SIZE_Y }}
          isScanning={isScanning}
          isPaused={scanState.isPaused}
          onStartScan={startFullScan}
          onStopScan={stopScan}
          onResumeScan={resumeScan}
          onScanPoint={handleScanPoint}
          dataSource={dataSource}
          arduinoConnected={arduinoConnected}
          socket={socket}
        />
        
        <StatusDisplay 
          position={currentPosition}
          stepSize={STEP_SIZE}
          isScanning={isScanning}
          isPaused={scanState.isPaused}
          totalPoints={scanData.length}
          dataSource={dataSource}
          arduinoConnected={arduinoConnected}
          scanProgress={scanProgress}
          lastSensorReading={lastSensorReading}
          connectionTime={connectionTime}
        />
        
        <MessageLog messages={messages} />
      </div>
      
      <div className="right-panel">
        <ScatterPlot3D 
          scanData={scanData}
          currentPosition={currentPosition}
          gridSize={{ x: GRID_SIZE_X, y: GRID_SIZE_Y }}
          stepSize={STEP_SIZE}
          cameraView={cameraView}
          onCameraViewChange={handleCommand}
          dataSource={dataSource}
          arduinoConnected={arduinoConnected}
          isScanning={isScanning}
          onScanPoint={handleScanPoint}
        />
      </div>
    </div>
  );
}

export default App;
