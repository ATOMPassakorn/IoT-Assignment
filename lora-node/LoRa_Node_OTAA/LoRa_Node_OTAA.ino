/*******************************************************************************
 * LoRaWAN Node OTAA Telemetry Transmitter
 * Hardware: Arduino Uno + Dragino LoRa Shield (RFM95 / SX1276)
 * Protocol: LoRaWAN 1.0.3 OTAA (AS923 / 923.2 MHz)
 * Integration: Uplink forwarded to ChirpStack -> MQTT Broker (iot/67070134/lora)
 *******************************************************************************/

#include <lmic.h>
#include <hal/hal.h>
#include <SPI.h>

// -----------------------------------------------------------------------------
// OTAA Keys (Configure to match ChirpStack Device EUI & Application Key)
// Note: APPEUI and DEVEUI must be Little-Endian (LSB first).
// APPKEY must be Big-Endian (MSB first).
// -----------------------------------------------------------------------------
static const u1_t PROGMEM APPEUI[8] = { 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 };
void os_getArtEui (u1_t* buf) { memcpy_P(buf, APPEUI, 8); }

static const u1_t PROGMEM DEVEUI[8] = { 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08 };
void os_getDevEui (u1_t* buf) { memcpy_P(buf, DEVEUI, 8); }

static const u1_t PROGMEM APPKEY[16] = { 0x2B, 0x7E, 0x15, 0x16, 0x28, 0xAE, 0xD2, 0xA6, 0xAB, 0xF7, 0x15, 0x88, 0x09, 0xCF, 0x4F, 0x3C };
void os_getDevKey (u1_t* buf) { memcpy_P(buf, APPKEY, 16); }

// Schedule TX every this many seconds (respect duty cycle)
const unsigned TX_INTERVAL = 30;

// Pin mapping for Dragino LoRa Shield on Arduino Uno
const lmic_pinmap lmic_pins = {
    .nss = 10,
    .rxtx = LMIC_UNUSED_PIN,
    .rst = 9,
    .dio = {2, 6, 7},
};

static osjob_t sendjob;

void do_send(osjob_t* j) {
    // Check if there is not a current TX/RX job running
    if (LMIC.opmode & OP_TXRXPEND) {
        Serial.println(F("OP_TXRXPEND, not sending"));
    } else {
        // Read sample sensor value (e.g. Analog Pin A0 for soil/light or simulated humidity)
        int sensorRaw = analogRead(A0);
        uint16_t humidityScaled = map(sensorRaw, 0, 1023, 300, 900); // 30.0% to 90.0%
        uint16_t batteryScaled = 370; // 3.70 V

        // Prepare 4-byte payload: [Hum_H, Hum_L, Bat_H, Bat_L]
        uint8_t payload[4];
        payload[0] = highByte(humidityScaled);
        payload[1] = lowByte(humidityScaled);
        payload[2] = highByte(batteryScaled);
        payload[3] = lowByte(batteryScaled);

        // Prepare transmission at port 1
        LMIC_setTxData2(1, payload, sizeof(payload), 0);
        Serial.print(F("Packet queued: Humidity="));
        Serial.print(humidityScaled / 10.0);
        Serial.println(F("%"));
    }
}

void onEvent (ev_t ev) {
    Serial.print(os_getTime());
    Serial.print(": ");
    switch(ev) {
        case EV_JOINING:
            Serial.println(F("EV_JOINING: Requesting OTAA Join..."));
            break;
        case EV_JOINED:
            Serial.println(F("EV_JOINED: Successfully joined LoRaWAN network!"));
            // Disable link check validation
            LMIC_setLinkCheckMode(0);
            break;
        case EV_TXCOMPLETE:
            Serial.println(F("EV_TXCOMPLETE (includes waiting for RX windows)"));
            if (LMIC.txrxFlags & TXRX_ACK)
              Serial.println(F("Received ack"));
            if (LMIC.dataLen) {
              Serial.print(F("Received "));
              Serial.print(LMIC.dataLen);
              Serial.println(F(" bytes of downlink payload"));
            }
            // Schedule next transmission
            os_setTimedCallback(&sendjob, os_getTime()+sec2osticks(TX_INTERVAL), do_send);
            break;
        default:
            Serial.print(F("Event: "));
            Serial.println((unsigned) ev);
            break;
    }
}

void setup() {
    Serial.begin(9600);
    Serial.println(F("Starting LoRaWAN Telemetry Node..."));

    // LMIC init
    os_init();
    // Reset the MAC state. Session and pending transfers will be discarded.
    LMIC_reset();

    // Start joining OTAA
    LMIC_startJoining();

    // Initial send job
    do_send(&sendjob);
}

void loop() {
    os_runloop_once();
}
