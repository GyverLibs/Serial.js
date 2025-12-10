#include <Arduino.h>

void setup() {
    Serial.begin(115200);
    Serial.setTimeout(10);
}

void loop() {
    if (Serial.available()) {
        Serial.println(Serial.readString());
    }
}