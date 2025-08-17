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


// === Move Stepper A ===
void moveA(int n) {
  if (n > 0) {digitalWrite(DirA, LOW);
  currentX += n;}
  else {
    digitalWrite(DirA, HIGH);
    currentX += n; // n is already negative
    n = -n;
  }
  int lim = n * 100;
  for (int x = 0; x < lim; x++) {
    digitalWrite(StepA, HIGH);
    delayMicroseconds(800);
    digitalWrite(StepA, LOW);
    delayMicroseconds(800);
  }
  delay(100);
}

// === Move Stepper B ===
void moveB(int n) {
  if (n > 0){ digitalWrite(DirB, HIGH);
  currentY += n;} // Update position}
  else {
    digitalWrite(DirB, LOW);
    currentY += n;
    n = -n;
  }
  int lim = n * 100;
  for (int x = 0; x < lim; x++) {
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
  while (digitalRead(switchA1) == HIGH) {
    digitalWrite(StepA, HIGH);
    delayMicroseconds(1000);
    digitalWrite(StepA, LOW);
    delayMicroseconds(1000);
  }
  digitalWrite(switchA2, LOW);
  moveA(1);
  currentX = 0; // Reset position
  delay(200);
}

// === Home Stepper B ===
void homeB() {
  digitalWrite(switchB2, HIGH);
  digitalWrite(DirB, LOW); // Move toward home
  while (digitalRead(switchB1) == HIGH) {
    digitalWrite(StepB, HIGH);
    delayMicroseconds(1000);
    digitalWrite(StepB, LOW);
    delayMicroseconds(1000);
  }
  digitalWrite(switchB2,LOW);
  moveB(1);
  currentY = 0; // Reset position
  delay(200);
}
// === take ultrasonic data ===
void data(){
    digitalWrite(trig, LOW);  
    delayMicroseconds(2);  
    digitalWrite(trig, HIGH);  
    delayMicroseconds(10);  
    digitalWrite(trig, LOW);  

    duration = pulseIn(echo, HIGH);
    distance = (duration*.0343)/2;

    //Serial.println(distance);
    //Serial.println("data:");
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
  //Status message in JSON format
  Serial.println("{\"status\":\"initializing\",\"message\":\"Arduino gantry starting up\"}");

  homeB();
  homeA();
  Serial.println("{\"status\":\"ready\",\"message\":\"Homing complete - Ready to scan\"}");
}
void loop() {
  // Move through a grid of 17 rows and 18 columns
  for (int i = 0; i < 18; i++) {
    for (int j = 0; j < 17; j++) {
      if (i % 2 == 0) {
        moveA(1);  // Move right on even rows
      } else {
        moveA(-1); // Move left on odd rows for zigzag path
      }
      data();
      delay(1000);
    }
    moveB(1); // Move down one step to next row
    delay(1000);
  }
  moveA(-17);
  moveB(-18);
}
