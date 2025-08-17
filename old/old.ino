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

// === Move Stepper A ===
void moveA(int n) {
  if (n > 0) digitalWrite(DirA, LOW);
  else {
    digitalWrite(DirA, HIGH);
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
  if (n > 0) digitalWrite(DirB, HIGH);
  else {
    digitalWrite(DirB, LOW);
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

  delay(200);
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

  delay(500);

  homeB();
  homeA();
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
      delay(1000);
    }
    moveB(1); // Move down one step to next row
    delay(1000);
  }
  moveA(-17);
  moveB(-18);
}
