const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const gantryRoutes = require('./routes/gantry');

const app = express();
const server = http.createServer(app);
const PORT = 3001;

// Socket.IO setup with CORS
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // React development server
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/gantry', gantryRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

// Arduino Serial Communication
let arduinoPort = null;
let parser = null;

// Auto-detect Arduino port
async function findArduinoPort() {
  try {
    const { SerialPort } = require('serialport');
    const ports = await SerialPort.list();
    
    console.log('🔍 Scanning for Arduino...');
    
    // Arduino identifiers
    const arduinoIdentifiers = ['Arduino', 'CH340', 'CP210', 'FT232', '2341', 'wch.cn'];
    
    for (const port of ports) {
      const portInfo = `${port.path} ${port.manufacturer || ''} ${port.vendorId || ''}`.toUpperCase();
      
      for (const identifier of arduinoIdentifiers) {
        if (portInfo.includes(identifier.toUpperCase())) {
          console.log(`✅ Found Arduino on ${port.path}: ${port.manufacturer || 'Unknown'}`);
          return port.path;
        }
      }
    }
    
    console.log('❓ No Arduino automatically detected. Available ports:');
    ports.forEach((port, index) => {
      console.log(`  ${index}: ${port.path} - ${port.manufacturer || 'Unknown'}`);
    });
    
  } catch (error) {
    console.error('❌ Error scanning ports:', error.message);
  }
  
  return null;
}

// Initialize Arduino connection
async function initializeArduino() {
  const portPath = await findArduinoPort();
  
  if (!portPath) {
    console.log('⚠️  Arduino not found. Serial communication disabled.');
    return false;
  }
  
  try {
    arduinoPort = new SerialPort({
      path: portPath,
      baudRate: 9600,
    });
    
    parser = arduinoPort.pipe(new ReadlineParser({ delimiter: '\n' }));
    
    // Handle Arduino data
    parser.on('data', (line) => {
      const trimmedLine = line.trim();
      
      if (trimmedLine) {
        console.log('📡 Arduino:', trimmedLine);
        
        // Broadcast raw Arduino data to all connected clients
        io.emit('arduino-data', {
          raw: trimmedLine,
          timestamp: new Date().toISOString()
        });
        
        // Try to parse JSON data for structured broadcasting
        if (trimmedLine.startsWith('{')) {
          try {
            const data = JSON.parse(trimmedLine);
            
            // Broadcast parsed sensor data
            if (data.x !== undefined && data.y !== undefined && data.z !== undefined) {
              io.emit('sensor-data', {
                ...data,
                serverTimestamp: new Date().toISOString()
              });
            }
            
            // Broadcast status messages
            if (data.status) {
              io.emit('arduino-status', {
                status: data.status,
                message: data.message || '',
                timestamp: new Date().toISOString()
              });
            }
            
          } catch (parseError) {
            console.log('⚠️  JSON parse error:', parseError.message);
          }
        }
      }
    });
    
    arduinoPort.on('open', () => {
      console.log('✅ Arduino connected successfully');
      io.emit('connection-status', { 
        connected: true, 
        port: portPath,
        timestamp: new Date().toISOString()
      });
    });
    
    arduinoPort.on('error', (err) => {
      console.error('❌ Arduino connection error:', err.message);
      io.emit('connection-status', { 
        connected: false, 
        error: err.message,
        timestamp: new Date().toISOString()
      });
    });
    
    arduinoPort.on('close', () => {
      console.log('🔌 Arduino connection closed');
      io.emit('connection-status', { 
        connected: false,
        timestamp: new Date().toISOString()
      });
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to connect to Arduino:', error.message);
    return false;
  }
}

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔗 New client connected:', socket.id);
  
  // Send current connection status to new client
  socket.emit('connection-status', {
    connected: arduinoPort && arduinoPort.isOpen,
    port: arduinoPort?.path || null,
    timestamp: new Date().toISOString()
  });
  
  // Handle client disconnect
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
  
  // Handle commands from client (for future use)
  socket.on('send-command', (command) => {
    if (arduinoPort && arduinoPort.isOpen) {
      console.log('📤 Sending command to Arduino:', command);
      arduinoPort.write(`${command}\n`);
    } else {
      socket.emit('error', { message: 'Arduino not connected' });
    }
  });
});

// Add historical data endpoint
app.get('/api/data/historical', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Look for JSON data files in current directory
    const files = fs.readdirSync('.')
      .filter(file => file.startsWith('gantry_scan_') && file.endsWith('.json'))
      .map(file => {
        const stats = fs.statSync(file);
        return {
          filename: file,
          created: stats.birthtime,
          size: stats.size
        };
      })
      .sort((a, b) => b.created - a.created); // Most recent first
    
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list data files' });
  }
});

// Load specific historical data file
app.get('/api/data/historical/:filename', (req, res) => {
  const fs = require('fs');
  const filename = req.params.filename;
  
  // Security check
  if (!filename.match(/^gantry_scan_\d{8}_\d{6}\.json$/)) {
    return res.status(400).json({ error: 'Invalid filename format' });
  }
  
  try {
    const data = fs.readFileSync(filename, 'utf8');
    const lines = data.split('\n').filter(line => line.trim());
    const scanData = [];
    
    lines.forEach(line => {
      try {
        const parsed = JSON.parse(line);
        if (parsed.x !== undefined && parsed.y !== undefined && parsed.z !== undefined) {
          scanData.push(parsed);
        }
      } catch (e) {
        // Skip invalid lines
      }
    });
    
    res.json({ 
      filename,
      totalPoints: scanData.length,
      scanData 
    });
    
  } catch (error) {
    res.status(404).json({ error: 'File not found or read error' });
  }
});

// Start server and initialize Arduino
server.listen(PORT, async () => {
  console.log(`🚀 Gantry Control Server running on port ${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket server ready for real-time communication`);
  
  // Initialize Arduino connection
  await initializeArduino();
});
