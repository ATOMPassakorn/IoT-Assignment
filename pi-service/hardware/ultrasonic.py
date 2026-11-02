import time
import logging

logger = logging.getLogger(__name__)

# Check RPi.GPIO
HAS_RPI_GPIO = False
try:
    import RPi.GPIO as GPIO
    HAS_RPI_GPIO = True
except (ImportError, Exception):
    pass

class UltrasonicSensor:
    def __init__(self, trigger_pin: int = 23, echo_pin: int = 24):
        self.trigger = trigger_pin
        self.echo = echo_pin

        if not HAS_RPI_GPIO:
            raise RuntimeError("RPi.GPIO is not available. Real HC-SR04 reading requires physical GPIO.")

        try:
            GPIO.setwarnings(False)
            GPIO.setmode(GPIO.BCM)
            GPIO.setup(self.trigger, GPIO.OUT)
            GPIO.setup(self.echo, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
            GPIO.output(self.trigger, GPIO.LOW)
            time.sleep(0.05)
            logger.info(f"HC-SR04 initialized on real GPIO (Trigger: {self.trigger}, Echo: {self.echo})")
        except Exception as e:
            logger.error(f"Failed to setup HC-SR04 pins: {e}")
            raise

    def read_distance(self) -> float:
        """Measures real distance in centimeters using HC-SR04 ultrasonic sound waves.
        Returns distance in cm (between 2.0 and 400.0 cm).
        Raises TimeoutError if no echo is received within physical range.
        """
        # Settle sensor (recovery period >60ms)
        GPIO.output(self.trigger, GPIO.LOW)
        time.sleep(0.06)

        # Send 10us trigger pulse
        GPIO.output(self.trigger, GPIO.HIGH)
        time.sleep(0.00001)
        GPIO.output(self.trigger, GPIO.LOW)

        start_limit = time.perf_counter() + 0.05

        # Wait for echo to go HIGH
        pulse_start = time.perf_counter()
        while GPIO.input(self.echo) == 0:
            pulse_start = time.perf_counter()
            if pulse_start > start_limit:
                raise TimeoutError("HC-SR04: Echo did not start within 50ms.")

        # Wait for echo to go LOW (max 38ms corresponds to ~400cm / 4m)
        end_limit = pulse_start + 0.038
        pulse_end = pulse_start
        while GPIO.input(self.echo) == 1:
            pulse_end = time.perf_counter()
            if pulse_end > end_limit:
                raise TimeoutError("HC-SR04: Echo pulse exceeded 38ms (Out of range > 400cm).")

        duration = pulse_end - pulse_start
        # Speed of sound is 34300 cm/s
        distance = round(duration * 17150.0, 2)

        if distance < 2.0:
            return 2.0
        if distance > 400.0:
            raise TimeoutError("HC-SR04: Distance out of range (> 400cm).")

        return distance
