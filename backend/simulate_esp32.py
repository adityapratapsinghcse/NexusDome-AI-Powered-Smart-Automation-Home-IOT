"""
Nexus Dome - ESP32 Virtual Simulator
Simulates a live ESP32 board sending real-time telemetry to the local database and dashboard.
Run this in a separate terminal:
    python simulate_esp32.py
"""

import os
import sys
import time
import random
import math
from datetime import timedelta
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartnest.settings')
django.setup()

from django.utils import timezone
from devices.models import Device
from sensors.models import SensorReading
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def run_simulator(interval=4):
    devices = Device.objects.all()
    if not devices.exists():
        print("[!] No devices found in database. Run 'python seed_demo_data.py' first.")
        return

    channel_layer = get_channel_layer()

    print("=========================================================")
    print("  Nexus Dome - ESP32 Virtual Hardware Simulator          ")
    print("  Simulating live sensor telemetry for dashboard demo    ")
    print("  Interval: {} seconds                                    ".format(interval))
    print("  Press Ctrl+C to stop                                   ")
    print("=========================================================")

    step = 0
    while True:
        try:
            now = timezone.now()
            hour = now.hour + now.minute / 60.0

            # Dynamic temperature with small realistic fluctuations
            base_temp = 24.2 + 2.0 * math.sin(math.pi * (hour - 8) / 12)
            temp = round(base_temp + random.uniform(-0.15, 0.15), 1)

            # Humidity
            hum = round(55.0 - 4.0 * math.sin(math.pi * (hour - 8) / 12) + random.uniform(-0.4, 0.4), 1)

            # Gas
            gas = round(12.2 + random.uniform(-0.4, 0.5), 1)

            # Current (Power Draw)
            current = round(1.85 + random.uniform(-0.08, 0.12), 2)

            # Distance
            dist = round(182.0 + random.uniform(-1.5, 1.5), 1)

            # Light
            light = round(75.0 + random.uniform(-2.0, 2.0), 1)

            for d in devices:
                # Keep device online status fresh
                d.is_online = True
                d.last_seen = now
                d.save(update_fields=['is_online', 'last_seen'])

                # Record live sensor telemetry
                SensorReading.objects.create(device=d, sensor_type='temperature', value=temp, unit='C')
                SensorReading.objects.create(device=d, sensor_type='humidity', value=hum, unit='%')
                SensorReading.objects.create(device=d, sensor_type='gas', value=gas, unit='%')
                SensorReading.objects.create(device=d, sensor_type='current', value=current, unit='A')
                SensorReading.objects.create(device=d, sensor_type='distance', value=dist, unit='cm')
                SensorReading.objects.create(device=d, sensor_type='light', value=light, unit='%')

                # Broadcast live updates via Django Channels WebSocket if connected
                if channel_layer:
                    try:
                        async_to_sync(channel_layer.group_send)(
                            f"sensors_{d.household_id}",
                            {
                                "type": "sensor_update",
                                "data": {
                                    "temperature": temp,
                                    "humidity": hum,
                                    "gas_percent": gas,
                                    "current_amps": current,
                                    "distance_cm": dist,
                                    "light_percent": light,
                                    "light_on": True,
                                    "fan_on": True,
                                    "cutoff_on": False,
                                    "motion": False,
                                    "flame_detected": False,
                                    "vibration_detected": False,
                                }
                            }
                        )
                    except Exception:
                        pass

            step += 1
            print(f"[{now.strftime('%H:%M:%S')}] Telemetry #{step} | Temp: {temp}C | Hum: {hum}% | Gas: {gas}ppm | Current: {current}A | Dist: {dist}cm | ONLINE")
            time.sleep(interval)

        except KeyboardInterrupt:
            print("\nSimulator stopped.")
            break
        except Exception as e:
            print(f"[!] Error: {e}")
            time.sleep(interval)

if __name__ == '__main__':
    run_simulator()
