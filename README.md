# IoT Assignment 67070134

ระบบ IoT Full-stack แบบ Multi-tiered สำหรับตรวจวัดสภาพแวดล้อม ควบคุมอุปกรณ์ฮาร์ดแวร์ผ่านสวิตช์และ AI Chat Box (Model Context Protocol: MCP) พร้อมการส่งข้อมูลระยะไกลผ่านโครงข่าย LoRaWAN

---

## 1. อุปกรณ์ที่ใช้ (Hardware Components)

### 1.1 บอร์ดประมวลผลและโมดูลสื่อสาร (Controllers & Communication Modules)
* **Raspberry Pi 4 Model B:** ทำหน้าที่เป็น Main IoT Gateway, รัน Python Service สำหรับอ่านค่าเซนเซอร์, ควบคุม Actuator และให้บริการ FastMCP Server
* **Arduino UNO R4 WiFi:** ทำหน้าที่เป็น End-node Microcontroller อ่านค่าแอนะล็อกและควบคุมการส่งสัญญาณวิทยุ
* **Cytron LoRa RFM Shield (RFM95W / SX1276 ความถี่ 920-925 MHz):** ชิลด์สื่อสารไร้สาย LoRaWAN ติดตั้งบน Arduino สำหรับส่งข้อมูลไปยัง LoRa Gateway

### 1.2 เซนเซอร์และตัวแปลงสัญญาณ (Sensors & Transducers)
* **SHT31 Sensor Module:** เซนเซอร์ตรวจวัดอุณหภูมิและความชื้นสัมพัทธ์ในอากาศ ความแม่นยำสูง เชื่อมต่อผ่าน I2C Bus (Address 0x44)
* **HC-SR04 Ultrasonic Distance Sensor:** เซนเซอร์ตรวจวัดระยะทางด้วยคลื่นเสียงอัลตราโซนิก (ระยะตรวจจับ 2 ถึง 400 cm)
* **Potentiometer B20K (20kΩ):** ตัวต้านทานปรับค่าได้ 3 ขา สำหรับปรับแรงดันแอนะล็อกป้อนเข้าขา A0 ของ Arduino

### 1.3 อุปกรณ์แสดงผลและวงจรพื้นฐาน (Actuators & Circuit Components)
* **LED (Light Emitting Diode):** หลอดไฟแสดงสถานะ ควบคุมการเปิดปิดผ่าน GPIO Pin 18 ของ Raspberry Pi
* **Resistor 220Ω (หรือ 330Ω):** ตัวต้านทานจำกัดกระแสสำหรับหลอดไฟ LED
* **Resistor 1kΩ และ 2kΩ:** ตัวต้านทานสำหรับทำวงจรแบ่งแรงดัน (Voltage Divider) ลดแรงดันขา Echo ของ HC-SR04 จาก 5V ลงมาที่ 3.3V เพื่อความปลอดภัยของขา GPIO
* **Breadboard:** บอร์ดทดลองวงจรสำหรับเชื่อมต่อสายไฟและตัวต้านทาน
* **Jumper Wires:** สายเชื่อมต่อวงจร (Male-to-Male และ Male-to-Female)

### 1.4 อุปกรณ์สนับสนุน (Power & Accessories)
* **LoRa SMA Antenna:** เสาอากาศสำหรับติดตั้งเข้ากับขั้ว SMA บน Cytron LoRa Shield (ห้ามส่งสัญญาณโดยไม่ต่อเสาอากาศ)
* **Power Supply Adapter 5V 3A USB-C:** อะแดปเตอร์จ่ายไฟมาตรฐานสำหรับ Raspberry Pi 4
* **USB Cable (USB-C / USB-A):** สายเชื่อมต่อสำหรับอัปโหลดโปรแกรมจากคอมพิวเตอร์ไปยัง Arduino UNO R4 WiFi

---

## 2. การเชื่อมต่อวงจร (Hardware Wiring & Pinout Guide)

### 2.1 การต่อวงจรบน Raspberry Pi 4

| อุปกรณ์ | ขาบนอุปกรณ์ | ขาบน Raspberry Pi (Physical Pin / BCM GPIO) | ระดับแรงดันไฟ | หมายเหตุ |
| :--- | :--- | :--- | :--- | :--- |
| **SHT31** | VCC | Pin 1 (3.3V Power) | 3.3V | ใช้ไฟเลี้ยง 3.3V เท่านั้น |
| | GND | Pin 9 (Ground) | 0V | กราวด์ร่วม |
| | SDA | Pin 3 (BCM GPIO 2 / I2C1 SDA) | 3.3V | สื่อสารข้อมูล I2C Data |
| | SCL | Pin 5 (BCM GPIO 3 / I2C1 SCL) | 3.3V | สัญญาณนาฬิกา I2C Clock |
| **HC-SR04** | VCC | Pin 2 หรือ Pin 4 (5V Power) | 5V | เซนเซอร์อัลตราโซนิกต้องการไฟเลี้ยง 5V |
| | GND | Pin 6 (Ground) | 0V | กราวด์ร่วม |
| | Trig | Pin 16 (BCM GPIO 23) | 3.3V | ส่งสัญญาณพัลส์ Trigger 10us |
| | Echo | ต่อผ่าน Voltage Divider เข้า Pin 18 (BCM GPIO 24) | แปลง 5V เป็น 3.3V | ห้ามต่อตรง 5V เข้า GPIO 24 โดยเด็ดขาด |
| **LED** | Anode (+) | Pin 12 (BCM GPIO 18) | 3.3V Logic | ควบคุมเปิดปิดไฟ (HIGH / LOW) |
| | Cathode (-) | ต่อผ่าน Resistor 220Ω เข้า Pin 14 (Ground) | 0V | ต่อตัวต้านทานอนุกรมจำกัดกระแส |

> **ข้อควรระวังเรื่องระดับแรงดันไฟ (Voltage Safety Callout):**
> ขา GPIO ของ Raspberry Pi 4 รองรับระดับแรงดันลอจิกสูงสุดที่ **3.3V** เท่านั้น สัญญาณ Echo จากโมดูล HC-SR04 ส่งออกมาที่ **5V** จึงต้องต่อผ่านวงจรแบ่งแรงดัน (Voltage Divider: Resistor 1kΩ ต่ออนุกรมกับ Echo และ 2kΩ ต่อลงกราวด์ จากนั้นดึงจุดกึ่งกลางเข้า GPIO 24) เพื่อลดทอนแรงดันลงเหลือ 3.3V ป้องกันพอร์ต GPIO เสียหาย

---

### 2.2 การต่อวงจรบน Arduino UNO R4 WiFi + Cytron LoRa RFM Shield

* **การติดตั้ง Shield:** เสียบ Cytron LoRa RFM Shield ประกบลงบน Stack Header ของบอร์ด Arduino UNO R4 WiFi ให้ตรงขาทั้งหมด
* **การต่อ Potentiometer B20K:**
  * **ขา 1 (ขาริม):** ต่อเข้าขา 5V (หรือ 3.3V) บน Arduino
  * **ขา 2 (ขากลาง - Wiper):** ต่อเข้าขา Analog Input **A0** บน Arduino
  * **ขา 3 (ขาริม):** ต่อเข้าขา **GND** บน Arduino

> **บทบาทหน้าที่ของ Potentiometer B20K:**
> ตัวต้านทานปรับค่าได้ B20K ใช้สำหรับส่งค่าแรงดันแอนะล็อก 0 ถึง 5V เข้าสู่ขา A0 ของบอร์ด Arduino แปลงเป็นค่าดิจิทัล 10-bit (0 ถึง 1023) และนำไปคำนวณสเกลเป็นค่าเปอร์เซ็นต์ความชื้นจำลอง 0 ถึง 100% เพื่อแพ็กเกจลงใน Payload ของคลื่นวิทยุ LoRaWAN ส่งไปยัง Gateway

---

## 3. รายการ MQTT Topics ทั้งหมด (Topic Specifications)

ระบบสื่อสารผ่าน MQTT Broker ส่วนกลาง (`broker.hivemq.com:1883`) โดยใช้ Topic Prefix หลักคือ `iot/67070134`:

| Topic | ทิศทางข้อมูล | ผู้ส่ง (Publisher) | ผู้รับ (Subscriber) | รูปแบบ Payload / คำอธิบาย |
| :--- | :--- | :--- | :--- | :--- |
| **`iot/67070134/sensors`** | Publish | Raspberry Pi Service | Go Backend | ส่งค่า Telemetry อุณหภูมิ, ความชื้น และระยะทางแบบ Real-time ทุก 2 วินาที |
| **`iot/67070134/actuators/led`** | Publish / Subscribe | Go Backend / AI Chat | Raspberry Pi Service | ส่งคำสั่งควบคุมสวิตช์ไฟ LED (`ON` หรือ `OFF`) |
| **`iot/67070134/actuators/led/status`** | Publish | Raspberry Pi Service | Go Backend | ส่งสถานะยืนยันการทำงานของหลอดไฟ LED ล่าสุดกลับมายังเซิร์ฟเวอร์ |
| **`iot/67070134/lora`** | Publish | LoRa Bridge Service | Go Backend | ข้อมูล Telemetry ที่แปลงมาจาก LoRaWAN Uplink Packet |

---

### ตัวอย่างรูปแบบ Payload ของแต่ละ Topic

#### 1. Telemetry จากเซนเซอร์บน Raspberry Pi (`iot/67070134/sensors`)
```json
{
  "temperature": 32.1,
  "humidity": 90.8,
  "distance_cm": 194.7
}
```

#### 2. คำสั่งควบคุมสวิตช์ไฟ LED (`iot/67070134/actuators/led`)
```text
ON
```
*(หรือ `OFF` ส่งเป็น Plaintext String)*

#### 3. สถานะยืนยันของหลอดไฟ LED (`iot/67070134/actuators/led/status`)
```json
{
  "status": "ON"
}
```

#### 4. ข้อมูล Telemetry จาก LoRa Node (`iot/67070134/lora`)
```json
{
  "node_id": "lora-node-01",
  "humidity": 75.0,
  "battery_voltage": 3.28,
  "rssi": -85
}
```

---

## 4. การทำงานของระบบ (System Architecture & Data Flow)

### 4.1 แผนภาพสถาปัตยกรรมระบบ (Data Pipeline Flowchart)

```text
  +-------------------------------------------------------------+
  |                   Edge Hardware Layer                       |
  |                                                             |
  |  [ SHT31 (I2C) ]     [ HC-SR04 ]     [ LED (GPIO 18) ]      |
  |          \               /                   ^              |
  |           v             v                    |              |
  |       +-----------------------+              |              |
  |       | Raspberry Pi 4 Model B |              |              |
  |       | Python Daemon + MCP   |--------------+              |
  |       +-----------------------+                             |
  |                   |                                         |
  |  [ Potentiometer B20K ]                                     |
  |          | (Analog A0)                                      |
  |          v                                                  |
  |  [ Arduino R4 + LoRa Shield ]                               |
  |          | (LoRa RF 923.2 MHz AS923 OTAA)                   |
  |          v                                                  |
  |  [ KMITL LoRa Gateway ]                                     |
  |          | (UDP Packet Forwarder)                           |
  |          v                                                  |
  |  [ ChirpStack Server (lora.kmitl.ac.th) ]                   |
  +-------------------|-----------------------------------------+
                      |
                      | Internet / MQTT Uplink
                      v
  +-------------------------------------------------------------+
  |                   Broker & Bridge Layer                     |
  |                                                             |
  |  [ LoRa Bridge (lora_bridge.py) ] <---+                     |
  |          | (MQTT Publish)             |                     |
  |          v                            |                     |
  |  +----------------------------------+ |                     |
  |  | HiveMQ Public Broker (:1883)     | | (ChirpStack MQTT)   |
  |  | Topic: iot/67070134/#            | |                     |
  |  +----------------------------------+ |                     |
  |          ^                     ^      |                     |
  |          | Telemetry & Status  | LED Command                |
  +----------|---------------------|----------------------------+
             |                     |
             v                     v
  +-------------------------------------------------------------+
  |                   Backend Server Layer                      |
  |                                                             |
  |  +-------------------------------------------------------+  |
  |  | Go Backend Server (Port 8080)                         |  |
  |  | - Paho MQTT Client (Subscribe & Publish)              |  |
  |  | - Thread-safe In-Memory State & History Buffer        |  |
  |  | - REST API Endpoints (/api/sensors, /api/led, etc.)   |  |
  |  | - FastMCP Reverse Proxy (/api/mcp/call, /tools)       |  |
  |  +-------------------------------------------------------+  |
  +-------------------|-----------------------------------------+
                      |
                      | HTTP REST API (JSON)
                      v
  +-------------------------------------------------------------+
  |                   Presentation Layer                        |
  |                                                             |
  |  +-------------------------------------------------------+  |
  |  | Next.js 14 Web Dashboard (Port 3000)                  |  |
  |  | - Apple Liquid Glass UI & Dark / Light Theme          |  |
  |  | - Live Environmental Telemetry Cards                  |  |
  |  | - Real-time Temperature Trend Area Chart              |  |
  |  | - Zero-latency Optimistic LED Toggle Switch           |  |
  |  | - Conversational AI Chat Box with Dynamic MCP Tools   |  |
  |  +-------------------------------------------------------+  |
  +-------------------------------------------------------------+
```

---

### 4.2 รายละเอียดกระบวนการทำงานของแต่ละส่วน (Process Breakdown)

1. **การอ่านและรายงานข้อมูลสภาพแวดล้อม (Telemetry Pipeline):**
   * Service บน Raspberry Pi อ่านค่าอุณหภูมิและความชื้นจาก SHT31 และระยะทางจาก HC-SR04 ทุก 2 วินาที
   * แพ็กเกจข้อมูลเป็น JSON แล้ว Publish ไปยัง Topic `iot/67070134/sensors` บน HiveMQ Broker
   * Go Backend รับข้อมูลผ่าน MQTT Subscriber บันทึกลงหน่วยความจำ In-Memory State พร้อมจัดเก็บประวัติย้อนหลัง 100 จุด (History Buffer)
   * หน้าเว็บแดชบอร์ด Next.js ดึงข้อมูลผ่าน REST API `/api/sensors` และ `/api/history` มาแสดงผลบนการ์ดและกราฟเส้นแบบ Real-time

2. **การสั่งงานและควบคุมสวิตช์ไฟ LED (Actuator Control Pipeline):**
   * ผู้ใช้กดสวิตช์ไฟบนหน้าแดชบอร์ด ระบบจะแสดงผลตอบสนองทันทีแบบ Optimistic UI (0ms Latency) พร้อมส่ง HTTP POST `/api/led` ไปยัง Go Backend
   * Go Backend อัปเดตสถานะในหน่วยความจำทันที และ Publish คำสั่ง `ON` หรือ `OFF` ไปยัง Topic `iot/67070134/actuators/led`
   * Raspberry Pi รับคำสั่งแล้วสั่งจ่ายไฟไปยัง GPIO Pin 18 จากนั้น Publish สถานะยืนยันกลับมาที่ Topic `iot/67070134/actuators/led/status`

3. **การสื่อสารระยะไกล LoRaWAN (LoRa Node Pipeline):**
   * Arduino UNO R4 WiFi อ่านค่าแรงดันจาก Potentiometer B20K ที่ขา A0 คำนวณเป็นค่าเปอร์เซ็นต์ความชื้นจำลอง
   * ส่งสัญญาณวิทยุ LoRaWAN ความถี่ 923.2 MHz (AS923) แบบ Over-The-Air Activation (OTAA) ไปยัง Gateway ของ KMITL
   * เครือข่าย ChirpStack Server (`lora.kmitl.ac.th`) รับข้อมูลและถอดรหัส Payload
   * สคริปต์ `lora_bridge.py` ดึงข้อมูลจาก ChirpStack MQTT Forwarder นำมาแปลงเป็น JSON Format แล้วส่งต่อไปยัง Topic `iot/67070134/lora` บน HiveMQ เพื่อแสดงผลบนหน้าแดชบอร์ด

4. **การควบคุมอัจฉริยะผ่าน AI Chat Box (Model Context Protocol: MCP):**
   * ผู้ใช้สามารถพิมพ์คำสั่งสนทนาภาษาธรรมชาติหรือกด Quick Actions บนกล่องแชต AI
   * ตัว Client ค้นหา Tool Schema แบบไดนามิกผ่าน `/api/mcp/tools` และเรียกใช้งาน Tool ที่เกี่ยวข้องบน Raspberry Pi:
     * `read_pi_sensors`: อ่านค่าอุณหภูมิ ความชื้น และระยะทางล่าสุด
     * `control_pi_devices`: สั่งเปิดหรือปิดไฟ LED บนบอร์ด Pi
     * `read_lora_sensors`: ตรวจสอบสถานะการเชื่อมต่อและค่า Telemetry ล่าสุดของ LoRa Node
     * `publish_mqtt_command`: สั่ง Publish คำสั่งไปยัง MQTT Broker โดยตรง

---

## 5. เทคโนโลยีที่ใช้ (Tech Stack)

* **Hardware & Firmware:**
  * C++ / Arduino IDE (RadioHead / LoRaWAN LMIC OTAA Protocol Stack)
  * Raspberry Pi OS (Linux ARM64), Python 3.10+
* **Edge & Hardware Control:**
  * Python FastMCP (Model Context Protocol SDK)
  * Paho MQTT Python Client
  * RPi.GPIO (Digital Actuator Control)
  * smbus2 (I2C Protocol Driver สำหรับ SHT31)
* **Backend Server:**
  * Go 1.24 (Golang)
  * Paho MQTT Golang Client (`github.com/eclipse/paho.mqtt.golang`)
  * Standard Library `net/http` REST Router พร้อม Thread-safe Sync Mutex Store
* **Frontend Web Dashboard:**
  * Next.js 14 (App Router)
  * React 18, TypeScript
  * Tailwind CSS (Apple VisionOS Liquid Glass Design System)
  * Lucide React Icons
* **Brokers & Protocols:**
  * HiveMQ Public MQTT Broker (`broker.hivemq.com:1883`)
  * KMITL ChirpStack LoRaWAN Network Server (`lora.kmitl.ac.th`)
  * Reverse SSH Tunneling: `proxy.tunnl.gg` (สร้าง Public HTTPS URL สำหรับ FastMCP Server พอร์ต 8000)
  * REST API (JSON Schema)
  * Model Context Protocol (MCP Streamable HTTP / SSE)

---

## 6. วิธีการนำไปใช้งาน (Deployment & Running Instructions)

### 6.1 ข้อกำหนดเบื้องต้น (Prerequisites)
* คอมพิวเตอร์หรือเซิร์ฟเวอร์ติดตั้ง:
  * **Go:** เวอร์ชั่น 1.22 ขึ้นไป
  * **Node.js:** เวอร์ชั่น 18 ขึ้นไป และ npm
  * **Python:** เวอร์ชั่น 3.10 ขึ้นไป พร้อม `pip`
* Raspberry Pi 4 เชื่อมต่ออินเทอร์เน็ตและต่อวงจรฮาร์ดแวร์ตามตาราง Pinout เรียบร้อยแล้ว
* บอร์ด Arduino UNO R4 WiFi อัปโหลดโค้ด [`LoRa_Node_OTAA.ino`](file:///home/atompassakorn/Downloads/IoT-Assignment/lora-node/LoRa_Node_OTAA/LoRa_Node_OTAA.ino) พร้อมติดตั้งเสาอากาศเรียบร้อยแล้ว

---

### 6.2 ขั้นตอนการรันระบบ (เปิดแยก 5 หน้าต่าง Terminal)

#### Terminal 1: เริ่มต้น Raspberry Pi Hardware & MCP Service
*(รันบนบอร์ด Raspberry Pi 4 หรือเครื่องที่ต่อฮาร์ดแวร์)*
```bash
cd pi-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 mcp_service.py
```
*ระบบจะเริ่มอ่านค่าเซนเซอร์ SHT31, HC-SR04 และ Publish ข้อมูลเข้า HiveMQ Broker พร้อมเปิด Local MCP Server ที่พอร์ต 8000*

#### Terminal 2: เปิด Public Reverse SSH Tunnel สู่ภายนอก (tunnl.gg)
*(รันบน Raspberry Pi เพื่อให้ AI Client ภายนอกเข้าถึง MCP Server พอร์ต 8000 ได้)*
```bash
ssh -t -R 80:127.0.0.1:8000 stable@proxy.tunnl.gg
```
*คำสั่งนี้จะสร้าง Reverse SSH Tunnel ส่งต่อ Local Port 8000 ของ Raspberry Pi ออกสู่ Public Internet ผ่าน proxy.tunnl.gg เพื่อให้ได้ Public HTTPS Endpoint เช่น `https://silent-birch-9f14b5d6.tunnl.gg` สำหรับใช้เชื่อมต่อกับ ChatGPT, Claude หรือ Web Dashboard ได้จากทุกที่โดยไม่ต้องทำ Port Forwarding*

#### Terminal 3: เริ่มต้น LoRaWAN Bridge Service
```bash
cd lora-node
python3 lora_bridge.py
```
*สคริปต์จะเชื่อมต่อกับ ChirpStack KMITL เพื่อบริดจ์ข้อมูล LoRaWAN Uplink เข้าสู่ HiveMQ Broker*

#### Terminal 4: เริ่มต้น Go REST API Backend Server
```bash
cd go-backend
go run ./cmd/server
```
*เซิร์ฟเวอร์ Go จะเริ่มทำงานที่ `http://localhost:8080` เพื่อเชื่อมต่อ MQTT Broker และให้บริการ REST API*

#### Terminal 5: เริ่มต้น Next.js Web Dashboard
```bash
cd web-dashboard
npm install
npm run dev
```
*แดชบอร์ดจะเริ่มทำงานที่ `http://localhost:3000`*

---

### 6.3 การเข้าใช้งานระบบ (Accessing Dashboard)

1. เปิดเว็บเบราว์เซอร์แล้วไปที่:
   ```text
   http://localhost:3000
   ```
2. หน้าจอจะแสดงผล:
   * **Environmental Telemetry:** อุณหภูมิ, ความชื้น, ระยะทางอัลตราโซนิก และข้อมูล LoRa Node
   * **Raspberry Pi LED:** สวิตช์ควบคุมเปิดปิดไฟ LED แบบตอบสนองทันที
   * **Temperature Environmental Trend:** กราฟประวัติอุณหภูมิย้อนหลังแบบ Real-time
   * **Intelligence Conversational Control:** กล่องสนทนา AI สำหรับสั่งงานผ่านเสียงหรือข้อความด้วย MCP Tools
