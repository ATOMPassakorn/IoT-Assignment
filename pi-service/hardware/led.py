import os
import shutil
import logging
import subprocess

logger = logging.getLogger(__name__)

# Check pinctrl CLI (Raspberry Pi native tool)
HAS_PINCTRL = shutil.which("pinctrl") is not None

# Check gpiozero
HAS_GPIOZERO = False
try:
    from gpiozero import LED as GpiozeroLED
    HAS_GPIOZERO = True
except (ImportError, Exception):
    pass

# Check RPi.GPIO
HAS_RPI_GPIO = False
if not HAS_GPIOZERO:
    try:
        import RPi.GPIO as GPIO
        HAS_RPI_GPIO = True
    except (ImportError, Exception):
        pass

class LEDController:
    def __init__(self, pin: int = 18):
        self.pin = pin
        self._state = False
        self._device = None
        self._backend = None

        if HAS_GPIOZERO:
            try:
                self._device = GpiozeroLED(self.pin)
                self._backend = "gpiozero"
                logger.info(f"Connected to physical LED on pin {self.pin} via gpiozero")
            except Exception as e:
                logger.warning(f"gpiozero init failed: {e}")

        if not self._backend and HAS_RPI_GPIO:
            try:
                GPIO.setwarnings(False)
                GPIO.setmode(GPIO.BCM)
                GPIO.setup(self.pin, GPIO.OUT)
                GPIO.output(self.pin, GPIO.LOW)
                self._backend = "rpigpio"
                logger.info(f"Connected to physical LED on pin {self.pin} via RPi.GPIO")
            except Exception as e:
                logger.warning(f"RPi.GPIO init failed: {e}")

        if not self._backend and HAS_PINCTRL:
            try:
                subprocess.run(["pinctrl", "set", str(self.pin), "op", "dl"], check=True)
                self._backend = "pinctrl"
                logger.info(f"Connected to physical LED on pin {self.pin} via native pinctrl")
            except Exception as e:
                logger.warning(f"pinctrl init failed: {e}")

        if not self._backend:
            raise RuntimeError(f"Cannot control physical LED: No GPIO driver available for pin {self.pin}")

    def set_state(self, action: str) -> str:
        clean = action.strip().upper()
        if clean not in ("ON", "OFF"):
            raise ValueError(f"Invalid LED action '{action}'. Must be ON or OFF.")

        self._state = (clean == "ON")

        if self._backend == "gpiozero" and self._device is not None:
            if self._state:
                self._device.on()
            else:
                self._device.off()
        elif self._backend == "rpigpio":
            GPIO.output(self.pin, GPIO.HIGH if self._state else GPIO.LOW)
        elif self._backend == "pinctrl":
            level = "dh" if self._state else "dl"
            subprocess.run(["pinctrl", "set", str(self.pin), "op", level], check=True)

        logger.info(f"Physical LED pin {self.pin} switched to {clean}")
        return clean

    def is_on(self) -> bool:
        return self._state

    def cleanup(self):
        if self._backend == "gpiozero" and self._device is not None:
            self._device.close()
        elif self._backend == "rpigpio":
            GPIO.cleanup(self.pin)
        elif self._backend == "pinctrl":
            subprocess.run(["pinctrl", "set", str(self.pin), "op", "dl"], check=False)
