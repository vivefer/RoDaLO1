// === Stepper Motor A Pins ===
const int StepA = 3;
const int DirA  = 5;
// === Stepper Motor B Pins ===
const int StepB = 6;
const int DirB  = 7;
// stepperA limit switch
const int switchA1 = 8;  // Home switch
const int switchA2 = 9; // Far end switch
// stepperA limit switch
const int switchB1 = 10; // Home switch
const int switchB2 = 11; // Far end switch
//ultrasonic pins
const int trig = 12; //trig pin 
const int echo = 2; //echo pin

float distance = 0;
float duration = 0;

// Position tracking
int currentX = 0;
int currentY = 0;
int stepSize = 5; // 5cm per step 

// Command handling variables
String inputCommand = "";
bool isAutoScanning = false;
bool emergencyStop = false;

// Auto scan variables
int scanX = 0;
int scanY = 0;
int maxX = 17; // Grid size
int maxY = 18;

// === Move Stepper A ===
void moveA(int n) {
  if (emergencyStop) return; // Safety check
  
  if (n > 0) {
    digitalWrite(DirA, LOW);
    currentX += n;
  } else {
    digitalWrite(DirA, HIGH);
    currentX += n; // n is already negative
    n = -n;
  }
  
  int lim = n * 100;
  for (int x = 0; x < lim; x++) {
    if (emergencyStop) return; // Safety check during movement
    digitalWrite(StepA, HIGH);
    delayMicroseconds(800);
    digitalWrite(StepA, LOW);
    delayMicroseconds(800);
  }
  delay(100);
}

// === Move Stepper B ===
void moveB(int n) {
  if (emergencyStop) return; // Safety check
  
  if (n > 0) {
    digitalWrite(DirB, HIGH);
    currentY += n;
  } else {
    digitalWrite(DirB, LOW);
    currentY += n;
    n = -n;
  }
  
  int lim = n * 100;
  for (int x = 0; x < lim; x++) {
    if (emergencyStop) return; // Safety check during movement
    digitalWrite(StepB, HIGH);
    delayMicroseconds(800);
    digitalWrite(StepB, LOW);
    delayMicroseconds(800);
  }
  delay(100);
}

// === Home Stepper A ===
void homeA() {
  digitalWrite(switchA2, HIGH);
  digitalWrite(DirA, HIGH); // Move toward home
  while (digitalRead(switchA1) == HIGH && !emergencyStop) {
    digitalWrite(StepA, HIGH);
    delayMicroseconds(1000);
    digitalWrite(StepA, LOW);
    delayMicroseconds(1000);
  }
  digitalWrite(switchA2, LOW);
  if (!emergencyStop) {
    moveA(1);
    currentX = 0; // Reset position
  }
  delay(200);
}

// === Home Stepper B ===
void homeB() {
  digitalWrite(switchB2, HIGH);
  digitalWrite(DirB, LOW); // Move toward home
  while (digitalRead(switchB1) == HIGH && !emergencyStop) {
    digitalWrite(StepB, HIGH);
    delayMicroseconds(1000);
    digitalWrite(StepB, LOW);
    delayMicroseconds(1000);
  }
  digitalWrite(switchB2, LOW);
  if (!emergencyStop) {
    moveB(1);
    currentY = 0; // Reset position
  }
  delay(200);
}

// === take ultrasonic data ===
void data() {
  digitalWrite(trig, LOW);  
  delayMicroseconds(2);  
  digitalWrite(trig, HIGH);  
  delayMicroseconds(10);  
  digitalWrite(trig, LOW);  

  duration = pulseIn(echo, HIGH);
  distance = (duration * 0.0343) / 2;

  // Output in JSON format
  Serial.print("{\"x\":");
  Serial.print(currentX * stepSize);
  Serial.print(",\"y\":");
  Serial.print(currentY * stepSize);
  Serial.print(",\"z\":");
  Serial.print(distance);
  Serial.print(",\"gridX\":");
  Serial.print(currentX);
  Serial.print(",\"gridY\":");
  Serial.print(currentY);
  Serial.print(",\"timestamp\":");
  Serial.print(millis());
  Serial.println("}");
}

// === Process Serial Commands ===
void processCommand(String command) {
  command.trim(); // Remove whitespace
  
  if (command == "START_SCAN") {
    isAutoScanning = true;
    emergencyStop = false;
    scanX = 0;
    scanY = 0;
    /*scanRow = 0;    // Add this
    scanCol = 0;
    scanComplete = false;*/
    Serial.println("{\"status\":\"scanning\",\"message\":\"Auto scan started\"}");
    
  } else if (command == "STOP_SCAN" || command == "PAUSE_SCAN") {
    isAutoScanning = false;
    Serial.println("{\"status\":\"paused\",\"message\":\"Scan paused\"}");
    
  } else if (command == "RESUME_SCAN") {
    if (!emergencyStop) {
      isAutoScanning = true;
      Serial.println("{\"status\":\"scanning\",\"message\":\"Scan resumed\"}");
    }
    
  } else if (command == "EMERGENCY_STOP") {
    isAutoScanning = false;
    emergencyStop = true;
    Serial.println("{\"status\":\"emergency\",\"message\":\"Emergency stop activated\"}");
    
    // Return to home position
    homeB();
    homeA();
    Serial.println("{\"status\":\"ready\",\"message\":\"Returned to home position\"}");
    emergencyStop = false;
    
  } else if (command == "HOME") {
    isAutoScanning = false;
    homeB();
    homeA();
    Serial.println("{\"status\":\"ready\",\"message\":\"Homing completed\"}");
    
  } else if (command == "MOVE_X_PLUS") {
    if (!isAutoScanning && currentX < maxX - 1) {
      moveA(1);
      Serial.println("{\"status\":\"moved\",\"message\":\"Moved X+\"}");
    }
    
  } else if (command == "MOVE_X_MINUS") {
    if (!isAutoScanning && currentX > 0) {
      moveA(-1);
      Serial.println("{\"status\":\"moved\",\"message\":\"Moved X-\"}");
    }
    
  } else if (command == "MOVE_Y_PLUS") {
    if (!isAutoScanning && currentY < maxY - 1) {
      moveB(1);
      Serial.println("{\"status\":\"moved\",\"message\":\"Moved Y+\"}");
    }
    
  } else if (command == "MOVE_Y_MINUS") {
    if (!isAutoScanning && currentY > 0) {
      moveB(-1);
      Serial.println("{\"status\":\"moved\",\"message\":\"Moved Y-\"}");
    }
    
  } else if (command.startsWith("MOVE_TO_X:")) {
    int targetX = command.substring(10).toInt();
    if (!isAutoScanning && targetX >= 0 && targetX < maxX) {
      int diff = targetX - currentX;
      moveA(diff);
      Serial.println("{\"status\":\"moved\",\"message\":\"Moved to X position\"}");
    }
    
  } else if (command.startsWith("MOVE_TO_Y:")) {
    int targetY = command.substring(10).toInt();
    if (!isAutoScanning && targetY >= 0 && targetY < maxY) {
      int diff = targetY - currentY;
      moveB(diff);
      Serial.println("{\"status\":\"moved\",\"message\":\"Moved to Y position\"}");
    }
    
  } else if (command == "SCAN_POINT") {
    if (!isAutoScanning) {
      data();
      Serial.println("{\"status\":\"scanned\",\"message\":\"Single point scanned\"}");
    }
    
  } else if (command == "GET_STATUS") {
    Serial.print("{\"status\":\"");
    if (isAutoScanning) Serial.print("scanning");
    else if (emergencyStop) Serial.print("emergency");
    else Serial.print("ready");
    Serial.print("\",\"message\":\"Position (");
    Serial.print(currentX);
    Serial.print(",");
    Serial.print(currentY);
    Serial.println(")\"}");
    
  } else {
    Serial.println("{\"status\":\"error\",\"message\":\"Unknown command\"}");
  }
}

// === Auto Scan Function ===
void performAutoScan() {
  if (!isAutoScanning || emergencyStop) return;
  
  // Take measurement at current position first
  data();
  delay(500);
  
  // Update scan position
  scanX++;
  
  // Check if end of row (after 17 moves in X direction)
  if (scanX >= maxX) {
    scanX = 0;
    scanY++;
    
    // Check if scan complete
    if (scanY >= maxY) {
      isAutoScanning = false;
      Serial.println("{\"status\":\"complete\",\"message\":\"Full scan completed\"}");
      
      // Return to start position
      homeB();
      homeA();
      scanX = 0;
      scanY = 0;
      return;
    }
    
    // Move to next row
    moveB(1);
    delay(500);
  } else {
    // Move to next position in current row
    if (scanY % 2 == 0) {
      moveA(1);  // Move right on even rows
    } else {
      moveA(-1); // Move left on odd rows for zigzag path
    }
  }
}


void setup() {
  pinMode(StepA, OUTPUT);
  pinMode(DirA, OUTPUT);
  pinMode(StepB, OUTPUT);
  pinMode(DirB, OUTPUT);

  pinMode(switchA1, INPUT);
  pinMode(switchA2, OUTPUT);
  pinMode(switchB1, INPUT);
  pinMode(switchB2, OUTPUT);

  pinMode(trig, OUTPUT);
  pinMode(echo, INPUT);

  delay(500);

  Serial.begin(9600);
  
  // Status message in JSON format
  Serial.println("{\"status\":\"initializing\",\"message\":\"Arduino gantry starting up\"}");

  homeB();
  homeA();
  Serial.println("{\"status\":\"ready\",\"message\":\"Homing complete - Ready for commands\"}");
}

void loop() {
  // Check for serial commands
  if (Serial.available() > 0) {
    char incomingChar = Serial.read();
    
    if (incomingChar == '\n' || incomingChar == '\r') {
      if (inputCommand.length() > 0) {
        processCommand(inputCommand);
        inputCommand = ""; // Clear command buffer
      }
    } else {
      inputCommand += incomingChar;
    }
  }
  
  // Handle auto scanning
  if (isAutoScanning) {
    performAutoScan();
  }
  
  
  // Small delay to prevent overwhelming the serial buffer
  delay(50);
}
