#include <ESP8266WiFi.h>
#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>

const char* ssid = "ljz";
const char* password = "12345678";

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");
Adafruit_MPU6050 mpu;

unsigned long lastSendTime = 0;
const unsigned long sendInterval = 100;

void setup() {
  Serial.begin(115200);
  Serial.println("\nMPU6050 WebSocket 服务器 (Async)");
  
  // Initialize I2C
  Wire.begin(12, 14);  // SDA = D6 = GPIO12, SCL = D5 = GPIO14
  
  // Connect to WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  Serial.print("连接WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\n连接成功!");
  Serial.print("IP地址: ");
  Serial.println(WiFi.localIP());

  // Initialize MPU6050
  if (!mpu.begin()) {
    Serial.println("找不到MPU6050芯片");
    while (1) {
      delay(10);
    }
  }
  Serial.println("MPU6050已找到!");
  
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  
  // WebSocket event handler
  ws.onEvent(onWebSocketEvent);
  server.addHandler(&ws);

  // Route for root / web page
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    String html = "<html><head><title>MPU6050 传感器数据</title></head>"
                  "<body><h1>MPU6050 WebSocket 服务器</h1>"
                  "<p>WebSocket地址: ws://" + WiFi.localIP().toString() + "/ws</p>"
                  "<p>ESP8266 IP地址: " + WiFi.localIP().toString() + "</p>"
                  "<p>将此IP地址输入到前端应用中以连接传感器</p>"
                  "</body></html>";
    request->send(200, "text/html", html);
  });

  // Start server
  server.begin();
  Serial.println("HTTP服务器已启动");
}

void loop() {
  unsigned long currentMillis = millis();
  if (currentMillis - lastSendTime >= sendInterval) {
    lastSendTime = currentMillis;
    sendSensorData();
  }
  
  // Clean up WebSocket clients
  ws.cleanupClients();
}

void sendSensorData() {
  if (ws.count() > 0) { // Only send data if clients are connected
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);
    
    // Create JSON document
    DynamicJsonDocument doc(1024);
    
    doc["accel"]["x"] = a.acceleration.x;
    doc["accel"]["y"] = a.acceleration.y;
    doc["accel"]["z"] = a.acceleration.z;
    
    doc["gyro"]["x"] = g.gyro.x * RAD_TO_DEG;
    doc["gyro"]["y"] = g.gyro.y * RAD_TO_DEG;
    doc["gyro"]["z"] = g.gyro.z * RAD_TO_DEG;
    
    doc["temp"] = temp.temperature;
    
    // Serialize JSON to string
    String jsonString;
    serializeJson(doc, jsonString);
    
    // Send to all connected WebSocket clients
    ws.textAll(jsonString);
    
    // Debug output
    Serial.print("发送数据: ");
    Serial.println(jsonString);
  }
}

void onWebSocketEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, 
                      AwsEventType type, void *arg, uint8_t *data, size_t len) {
  switch (type) {
    case WS_EVT_CONNECT:
      Serial.printf("WebSocket client #%u connected from %s\n", client->id(), client->remoteIP().toString().c_str());
      break;
    case WS_EVT_DISCONNECT:
      Serial.printf("WebSocket client #%u disconnected\n", client->id());
      break;
    case WS_EVT_DATA:
      // Handle data received from client if needed
      break;
    case WS_EVT_PONG:
    case WS_EVT_ERROR:
      break;
  }
}
