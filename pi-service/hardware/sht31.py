import time
import logging

try:
    from smbus2 import SMBus
    HAS_SMBUS = True
except (ImportError, RuntimeError):
    HAS_SMBUS = False

logger = logging.getLogger(__name__)

class SHT31Sensor:
    def __init__(self, bus_num: int = 1, address: int = 0x44):
        self.bus_num = bus_num
        self.address = address
        self.bus = None

        if HAS_SMBUS:
            try:
                self.bus = SMBus(self.bus_num)
                logger.info(f"SHT31 connected on I2C bus {self.bus_num}, address 0x{self.address:02X}")
            except Exception as e:
                logger.error(f"Failed to open I2C bus {self.bus_num}: {e}")
                self.bus = None
        else:
            logger.error("smbus2 is not installed. Real SHT31 reading unavailable.")

    def read(self) -> tuple[float, float]:
        """Reads real temperature (Celsius) and humidity (%) from SHT31 sensor.
        Raises RuntimeError if real hardware cannot be read.
        """
        if not self.bus:
            raise RuntimeError("SHT31 hardware not connected or I2C bus unavailable.")

        try:
            # 0x2C, 0x06: High repeatability measurement command
            self.bus.write_i2c_block_data(self.address, 0x2C, [0x06])
            time.sleep(0.02)  # Wait 20ms for sensor measurement conversion
            data = self.bus.read_i2c_block_data(self.address, 0x00, 6)

            raw_temp = (data[0] << 8) | data[1]
            temp_c = -45.0 + (175.0 * raw_temp / 65535.0)

            raw_hum = (data[3] << 8) | data[4]
            humidity = 100.0 * (raw_hum / 65535.0)

            return round(temp_c, 2), round(humidity, 2)
        except Exception as e:
            logger.error(f"Failed to read from SHT31: {e}")
            raise RuntimeError(f"SHT31 physical read failure: {e}")
