#include <SPI.h>
#include <MFRC522.h>

// Pin configuration for MFRC522
#define SS_PIN 10  // SDA pin on MFRC522
#define RST_PIN 9  // RST pin on MFRC522

MFRC522 mfrc522(SS_PIN, RST_PIN);  // Create MFRC522 instance

void setup() {
  Serial.begin(9600);  // Initialize serial communication
  SPI.begin();         // Init SPI buse
  mfrc522.PCD_Init();  // Init MFRC522
  Serial.println("Place your NFC tag near the reader...");
}

void loop() {
  // Look for new cards
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  // Select one of the cards
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Print UID
  Serial.print("UID tag: ");
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    Serial.print(mfrc522.uid.uidByte[i] < 0x10 ? " 0" : " ");
    Serial.print(mfrc522.uid.uidByte[i], HEX);
  }
  Serial.println();

  // Halt PICC
  mfrc522.PICC_HaltA();
}
