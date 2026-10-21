/*
 * SafePlant AIoT — ESP32 Hardware Edge Firmware
 *
 * Target: ESP32-WROOM-32 / NodeMCU-32S
 * Sensors:
 *   - DHT11: Temperature & Relative Humidity (GPIO 4)
 *   - MQ-2: Raw Gas & Smoke Detection (Analog ADC1_CH0 / GPIO 36)
 *           NOTE: Output is uncalibrated 12-bit ADC (0–4095).
 *           Does not detect chlorine; not calibrated ppm without controlled chamber curve.
 *   - KY-026: Optical Infrared Flame Detection (Digital GPIO 15, Active LOW)
 * Actuators:
 *   - Buzzer: Active Piezo Buzzer (GPIO 18)
 *   - Exhaust Fan Relay: Low-voltage transistor/relay module (GPIO 19)
 *           NOTE: Physical feedback sensor unequipped on hardware.
 *           Actuator states represent commanded states.
 *
 * Networking:
 *   - Wi-Fi 802.11 b/g/n with automatic reconnection
 *   - HTTP POST JSON Telemetry payload to FastAPI backend
 *   - Parses commanded actuator response from backend
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ============================================================================
// 1. CONFIGURATION: Wi-Fi & FastAPI Backend LAN IP
// ============================================================================
// Replace with your local Wi-Fi credentials
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// IMPORTANT: Replace with your Laptop's LAN IPv4 address (e.g., 192.168.1.105)
// NEVER use "localhost" or "127.0.0.1" from ESP32 hardware!
const char* BACKEND_URL   = "http://192.168.1.105:8000/api/telemetry";

// Telemetry transmit interval (milliseconds)
const unsigned long TRANSMIT_INTERVAL_MS = 3000;

// Device Identification
const char* DEVICE_ID = "ESP32_SAFEPLANT_GATEWAY_01";

// ============================================================================
// 2. HARDWARE PIN DEFINITIONS
// ============================================================================
#define PIN_DHT11       4   // Digital Pin 4: DHT11 Data line
#define PIN_MQ2_ADC    36   // Analog Pin 36 (ADC1_CH0 / VP): MQ-2 Analog Output
#define PIN_FLAME_DIG  15   // Digital Pin 15: KY-026 Optical Flame (Active LOW)
#define PIN_BUZZER     18   // Digital Pin 18: Commanded Buzzer
#define PIN_RELAY_FAN  19   // Digital Pin 19: Commanded Exhaust Fan Relay

#define DHTTYPE DHT11
DHT dht(PIN_DHT11, DHTTYPE);

// Tracking variables
unsigned long lastTransmitTime = 0;
String currentBuzzerCommand = "OFF";
String currentRelayCommand  = "OFF";

// ============================================================================
// 3. SETUP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==================================================");
  Serial.println("  SafePlant AIoT — ESP32 Industrial Gateway v2.4.1");
  Serial.println("==================================================");

  // Initialize GPIO Pins
  pinMode(PIN_FLAME_DIG, INPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_RELAY_FAN, OUTPUT);

  // Initial Safe State (Commanded OFF)
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_RELAY_FAN, LOW);

  // Configure ADC for MQ-2 (12-bit: 0 to 4095, 3.3V attenuation)
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // Initialize DHT11
  dht.begin();
  Serial.println("[HW] Sensors initialized (DHT11: GPIO4, MQ-2: GPIO36, Flame: GPIO15)");
  Serial.println("[HW] Actuators initialized (Buzzer: GPIO18, Fan Relay: GPIO19)");

  // Connect to Local Wi-Fi
  connectWiFi();
}

// ============================================================================
// 4. MAIN LOOP
// ============================================================================
void loop() {
  // Ensure Wi-Fi remains connected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[NET] Wi-Fi connection lost. Reconnecting...");
    connectWiFi();
  }

  // Periodic Telemetry Transmission
  unsigned long now = millis();
  if (now - lastTransmitTime >= TRANSMIT_INTERVAL_MS) {
    lastTransmitTime = now;
    readAndTransmitTelemetry();
  }

  delay(50);
}

// ============================================================================
// 5. WI-FI CONNECTION HANDLER
// ============================================================================
void connectWiFi() {
  Serial.printf("[NET] Connecting to Wi-Fi SSID: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - startAttempt) < 15000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[NET] Wi-Fi Connected!");
    Serial.printf("[NET] ESP32 Assigned IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[NET] RSSI: %d dBm\n", WiFi.RSSI());
    Serial.printf("[NET] Configured Backend: %s\n", BACKEND_URL);
  } else {
    Serial.println("\n[NET] Wi-Fi connection failed. Will retry in loop.");
  }
}

// ============================================================================
// 6. SENSOR ACQUISITION & TELEMETRY TRANSMISSION
// ============================================================================
void readAndTransmitTelemetry() {
  // 1. Read DHT11 Temperature and Humidity
  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();

  // 2. Read MQ-2 Raw Analog 12-bit ADC (Uncalibrated analog, 0–4095)
  // Average multiple ADC samples to suppress electrical noise
  long adcAccumulator = 0;
  for (int i = 0; i < 8; i++) {
    adcAccumulator += analogRead(PIN_MQ2_ADC);
    delay(2);
  }
  float gasRaw = adcAccumulator / 8.0f;

  // 3. Read Optical Flame Sensor (KY-026: Active LOW on flame detection)
  int flameRaw = digitalRead(PIN_FLAME_DIG);
  int flameDetected = (flameRaw == LOW) ? 1 : 0; // 1 = Flame present, 0 = Clear

  // 4. Signal RSSI
  int wifiRssi = WiFi.RSSI();

  // Check DHT11 validity
  bool dhtValid = !isnan(temperature) && !isnan(humidity);
  if (!dhtValid) {
    Serial.println("[WARN] DHT11 read timeout. Reporting null for temperature/humidity.");
  }

  // 5. Construct JSON Payload using ArduinoJson
  StaticJsonDocument<512> doc;
  doc["device_id"]   = DEVICE_ID;
  if (dhtValid) {
    doc["temperature"] = serialized(String(temperature, 1));
    doc["humidity"]    = serialized(String(humidity, 1));
  } else {
    doc["temperature"] = nullptr;
    doc["humidity"]    = nullptr;
  }
  doc["gas"]         = gasRaw; // Raw 12-bit ADC value
  doc["flame"]       = flameDetected;
  doc["relay"]       = currentRelayCommand;
  doc["buzzer"]      = currentBuzzerCommand;
  doc["rssi"]        = wifiRssi;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  Serial.printf("[TELEMETRY] Sending: %s\n", jsonPayload.c_str());

  // 6. Transmit HTTP POST to FastAPI Backend
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(4000);

    int httpCode = http.POST(jsonPayload);

    if (httpCode > 0) {
      String response = http.getString();
      Serial.printf("[HTTP] Status: %d | Response: %s\n", httpCode, response.c_str());

      // Parse commanded actuator states from backend response
      StaticJsonDocument<256> respDoc;
      DeserializationError err = deserializeJson(respDoc, response);
      if (!err) {
        if (respDoc.containsKey("relay_state")) {
          String commandedRelay = respDoc["relay_state"].as<String>();
          applyRelayState(commandedRelay);
        }
        if (respDoc.containsKey("buzzer_state")) {
          String commandedBuzzer = respDoc["buzzer_state"].as<String>();
          applyBuzzerState(commandedBuzzer);
        }
      }
    } else {
      Serial.printf("[HTTP] POST failed, error: %s\n", http.errorToString(httpCode).c_str());
      Serial.printf("[HINT] Ensure FastAPI is running on your laptop at %s\n", BACKEND_URL);
    }
    http.end();
  }
}

// ============================================================================
// 7. ACTUATOR EXECUTION (Commanded)
// ============================================================================
void applyRelayState(String state) {
  currentRelayCommand = state;
  if (state == "ON") {
    digitalWrite(PIN_RELAY_FAN, HIGH);
  } else {
    digitalWrite(PIN_RELAY_FAN, LOW);
  }
}

void applyBuzzerState(String state) {
  currentBuzzerCommand = state;
  if (state == "ON") {
    digitalWrite(PIN_BUZZER, HIGH);
  } else {
    digitalWrite(PIN_BUZZER, LOW);
  }
}
