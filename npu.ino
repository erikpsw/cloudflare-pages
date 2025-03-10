#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>

const char* ssid = "ljz";      // WiFi名称
const char* password = "12345678";  // WiFi密码

ESP8266WebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(81);
Adafruit_MPU6050 mpu;

unsigned long lastSendTime = 0;
const unsigned long sendInterval = 100; // 每100ms发送一次数据

void setup() {
  Serial.begin(115200);
  Serial.println("\nMPU6050 WebSocket 服务器");
  
  // 使用NodeMCU的自定义引脚初始化I2C
  Wire.begin(12, 14);  // SDA = D6 = GPIO12, SCL = D5 = GPIO14
  
  // 连接WiFi
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
  Serial.print("子网掩码: ");
  Serial.println(WiFi.subnetMask());
  Serial.print("网关IP: ");
  Serial.println(WiFi.gatewayIP());
  Serial.print("信号强度: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");

  // 初始化MPU6050
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
  
  // 处理HTTP根请求，提供一个基本的HTML页面
  server.on("/", HTTP_GET, []() {
    String html = "<html><head><title>MPU6050 传感器数据</title></head>"
                  "<body><h1>MPU6050 WebSocket 服务器</h1>"
                  "<p>WebSocket地址: ws://" + WiFi.localIP().toString() + ":81</p>"
                  "<p>ESP8266 IP地址: " + WiFi.localIP().toString() + "</p>"
                  "<p>将此IP地址输入到前端应用中以连接传感器</p>"
                  "</body></html>";
    server.send(200, "text/html", html);
  });

  // 启动HTTP服务器和WebSocket服务器
  server.begin();
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  
  Serial.println("HTTP服务器已启动");
  Serial.println("WebSocket服务器已启动，端口81");
}

void loop() {
  webSocket.loop();
  server.handleClient();
  
  // 定期发送传感器数据
  unsigned long currentMillis = millis();
  if (currentMillis - lastSendTime >= sendInterval) {
    lastSendTime = currentMillis;
    sendSensorData();
  }
}

void sendSensorData() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  
  // 创建JSON文档
  DynamicJsonDocument doc(1024);
  
  doc["accel"]["x"] = a.acceleration.x;
  doc["accel"]["y"] = a.acceleration.y;
  doc["accel"]["z"] = a.acceleration.z;
  
  doc["gyro"]["x"] = g.gyro.x * RAD_TO_DEG; // 从rad/s转换为deg/s
  doc["gyro"]["y"] = g.gyro.y * RAD_TO_DEG;
  doc["gyro"]["z"] = g.gyro.z * RAD_TO_DEG;
  
  doc["temp"] = temp.temperature;
  
  // 将JSON序列化为字符串
  String jsonString;
  serializeJson(doc, jsonString);
  
  // 将传感器数据广播给所有连接的客户端
  webSocket.broadcastTXT(jsonString);
  
  // 调试输出
  Serial.print("发送数据: ");
  Serial.println(jsonString);
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("[%u] 客户端断开连接!\n", num);
      break;
    case WStype_CONNECTED:
      {
        IPAddress ip = webSocket.remoteIP(num);
        Serial.printf("[%u] 客户端已连接，IP %d.%d.%d.%d\n", num, ip[0], ip[1], ip[2], ip[3]);
      }
      break;
    case WStype_TEXT:
      Serial.printf("[%u] 收到文本: %s\n", num, payload);
      break;
  }
}
