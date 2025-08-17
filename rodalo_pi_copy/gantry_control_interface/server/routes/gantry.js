const express = require('express');
const router = express.Router();

// Mock gantry state
let gantryState = {
  position: { x: 0, y: 0 },
  isScanning: false,
  lastCommand: null,
  timestamp: new Date()
};

// Command handlers
const commandHandlers = {
  moveX: () => {
    gantryState.position.x += 1;
    return `Moved X to position ${gantryState.position.x}`;
  },
  
  moveY: () => {
    gantryState.position.y += 1;
    return `Moved Y to position ${gantryState.position.y}`;
  },
  
  moveToCrossSection: (value) => {
    gantryState.position.y = parseInt(value);
    return `Moved to cross section Y=${value}`;
  },
  
  moveToDivision: (value) => {
    gantryState.position.x = parseInt(value);
    return `Moved to division X=${value}`;
  },
  
  startScan: () => {
    gantryState.isScanning = true;
    setTimeout(() => {
      gantryState.isScanning = false;
    }, 5000); // Simulate 5-second scan
    return 'Started full scan operation';
  },
  
  emergencyStop: () => {
    gantryState.isScanning = false;
    return '🛑 EMERGENCY STOP ACTIVATED';
  }
};

// POST /api/gantry/:command
router.post('/:command', (req, res) => {
  const { command } = req.params;
  const { value } = req.body;
  
  try {
    if (commandHandlers[command]) {
      const message = commandHandlers[command](value);
      gantryState.lastCommand = command;
      gantryState.timestamp = new Date();
      
      console.log(`📟 Command executed: ${command}${value ? ` (${value})` : ''}`);
      
      res.json({
        success: true,
        message,
        gantryState
      });
    } else {
      res.status(400).json({
        success: false,
        message: `Unknown command: ${command}`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error executing command: ${error.message}`
    });
  }
});

// GET /api/gantry/status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    gantryState,
    timestamp: new Date()
  });
});

module.exports = router;
