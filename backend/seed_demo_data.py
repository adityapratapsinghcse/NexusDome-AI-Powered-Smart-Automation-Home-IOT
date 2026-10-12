import os
import sys
import random
import math
from datetime import timedelta
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartnest.settings')
django.setup()

from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from accounts.models import Household, Membership
from devices.models import Device, RFIDCard, EnergyLog
from sensors.models import SensorReading
from alerts.models import Alert, AccessLog

def seed():
    print("[*] Seeding realistic false/demo data for The Nexus Dome...")

    # Override auto_now_add to allow setting past historical timestamps
    for model in [SensorReading, Alert, AccessLog]:
        ts_field = model._meta.get_field('timestamp')
        ts_field.auto_now_add = False

    # 1. Households
    h1, _ = Household.objects.get_or_create(name='The Nexus Dome')
    h2, _ = Household.objects.get_or_create(name='Nexus Dome')

    # 2. Users & Memberships
    # Main demo users
    user_configs = [
        ('adi', 'adi@nexusdome.local', 'admin123', 'owner', True, False),
        ('Adi', 'adi2@nexusdome.local', 'admin123', 'owner', True, False),
        ('admin', 'admin@nexusdome.local', 'admin123', 'owner', True, True),
        ('priya', 'priya@nexusdome.local', 'admin123', 'admin', True, False),
        ('rohan', 'rohan@nexusdome.local', 'admin123', 'member', True, False),
        ('kavita', 'kavita@nexusdome.local', 'admin123', 'member', False, False),  # Pending join request
    ]

    for uname, email, pwd, role, is_active, is_super in user_configs:
        u, _ = User.objects.get_or_create(
            username=uname,
            defaults={'email': email}
        )
        u.set_password(pwd)
        if is_super:
            u.is_staff = True
            u.is_superuser = True
        u.save()
        Token.objects.get_or_create(user=u)

        # Household 1 membership
        mem1, _ = Membership.objects.get_or_create(
            user=u, household=h1,
            defaults={'role': role, 'is_active': is_active}
        )
        mem1.role = role
        mem1.is_active = is_active
        mem1.save()

        # Household 2 membership for adi and admin
        if uname in ['adi', 'Adi', 'admin']:
            mem2, _ = Membership.objects.get_or_create(
                user=u, household=h2,
                defaults={'role': 'owner', 'is_active': True}
            )
            mem2.role = 'owner'
            mem2.is_active = True
            mem2.save()

    now = timezone.now()

    # 3. Devices
    devices = []
    d1, _ = Device.objects.get_or_create(
        household=h1,
        name='ESP32 Smart Hub',
        defaults={'type': 'esp32', 'location': 'Living Room'}
    )
    devices.append(d1)

    d2, _ = Device.objects.get_or_create(
        household=h1,
        name='ESP32 Security Node',
        defaults={'type': 'esp32', 'location': 'Front Gate & Garage'}
    )
    devices.append(d2)

    d3, _ = Device.objects.get_or_create(
        household=h2,
        name='ESP32 Backup Board',
        defaults={'type': 'esp32', 'location': 'Main Hub'}
    )
    devices.append(d3)

    for device in devices:
        device.is_online = True
        device.last_seen = now
        device.door_status = 'locked'
        device.garage_status = 'vacant'
        device.gate_status = 'closed'
        device.automation_enabled = True
        device.save()

        # Clear existing entries for idempotent seeding
        SensorReading.objects.filter(device=device).delete()
        AccessLog.objects.filter(device=device).delete()
        Alert.objects.filter(device=device).delete()
        EnergyLog.objects.filter(device=device).delete()

    # RFID cards for Household 1
    RFIDCard.objects.filter(household=h1).delete()
    RFIDCard.objects.create(
        household=h1,
        uid='E280689A',
        label='Aditya - Master Keycard',
        is_active=True
    )
    RFIDCard.objects.create(
        household=h1,
        uid='B472C190',
        label='Priya - Keycard',
        is_active=True
    )
    RFIDCard.objects.create(
        household=h1,
        uid='99AA33FF',
        label='Guest Backup Pass',
        is_active=False
    )

    # Populate telemetry, logs, and energy for primary devices
    for device in [d1, d2]:
        readings = []

        # Current (Amps) readings every 30 minutes for 7 days (336 intervals)
        for step in range(7 * 48, -1, -1):
            ts = now - timedelta(minutes=step * 30)
            hour = ts.hour + ts.minute / 60.0
            if 7 <= hour <= 23:
                base_current = 1.6 + 0.6 * math.sin(math.pi * (hour - 7) / 16)
            else:
                base_current = 0.85
            current_val = round(max(0.65, base_current + random.uniform(-0.1, 0.1)), 2)
            readings.append(SensorReading(
                device=device,
                sensor_type='current',
                value=current_val,
                unit='A',
                timestamp=ts
            ))

        # Temperature, Humidity, Gas, Light readings every 30 mins for 24h
        for step in range(48, -1, -1):
            ts = now - timedelta(minutes=step * 30)
            hour = ts.hour + ts.minute / 60.0

            # Realistic temperature curve
            temp_val = round(23.6 + 2.5 * math.sin(math.pi * (hour - 8) / 12) + random.uniform(-0.2, 0.2), 1)
            # Humidity
            hum_val = round(55.0 - 5.5 * math.sin(math.pi * (hour - 8) / 12) + random.uniform(-0.6, 0.6), 1)
            # Safe indoor gas level: 10 - 14 ppm
            gas_val = round(12.0 + random.uniform(-1.0, 1.2), 1)
            # Light level
            if 6.5 <= hour <= 18.5:
                light_val = round(85.0 * math.sin(math.pi * (hour - 6.5) / 12) + random.uniform(-1.5, 1.5), 1)
            else:
                light_val = round(random.uniform(0, 3.5), 1)

            readings.append(SensorReading(device=device, sensor_type='temperature', value=temp_val, unit='C', timestamp=ts))
            readings.append(SensorReading(device=device, sensor_type='humidity', value=hum_val, unit='%', timestamp=ts))
            readings.append(SensorReading(device=device, sensor_type='gas', value=gas_val, unit='%', timestamp=ts))
            readings.append(SensorReading(device=device, sensor_type='light', value=max(0, light_val), unit='%', timestamp=ts))

        # Nominal active states for relays and security
        readings.append(SensorReading(device=device, sensor_type='light_relay', value=1.0, unit='', timestamp=now))
        readings.append(SensorReading(device=device, sensor_type='fan_relay', value=1.0, unit='', timestamp=now))
        readings.append(SensorReading(device=device, sensor_type='cutoff_relay', value=0.0, unit='', timestamp=now))
        readings.append(SensorReading(device=device, sensor_type='motion', value=0.0, unit='', timestamp=now))
        readings.append(SensorReading(device=device, sensor_type='flame', value=0.0, unit='', timestamp=now))
        readings.append(SensorReading(device=device, sensor_type='vibration', value=0.0, unit='', timestamp=now))
        readings.append(SensorReading(device=device, sensor_type='distance', value=182.0, unit='cm', timestamp=now))

        SensorReading.objects.bulk_create(readings)

        # 7 Days Daily Energy Logs
        for day_offset in range(7):
            d_date = (now - timedelta(days=day_offset)).date()
            EnergyLog.objects.create(
                device=device,
                date=d_date,
                on_duration_mins=480.0 + random.uniform(-30, 45),
                estimated_kwh=round(4.15 + random.uniform(-0.35, 0.45), 3)
            )

        # Access Logs
        access_logs = [
            AccessLog(device=device, rfid_uid='E280689A', method='rfid', granted=True, timestamp=now - timedelta(minutes=14)),
            AccessLog(device=device, rfid_uid='', method='keypad', granted=True, timestamp=now - timedelta(hours=1, minutes=35)),
            AccessLog(device=device, rfid_uid='B472C190', method='rfid', granted=True, timestamp=now - timedelta(hours=3, minutes=10)),
            AccessLog(device=device, rfid_uid='99AA33FF', method='rfid', granted=False, timestamp=now - timedelta(hours=8, minutes=45)),
            AccessLog(device=device, rfid_uid='', method='keypad', granted=True, timestamp=now - timedelta(days=1, hours=2)),
            AccessLog(device=device, rfid_uid='E280689A', method='rfid', granted=True, timestamp=now - timedelta(days=2, hours=4)),
        ]
        AccessLog.objects.bulk_create(access_logs)

        # Alerts (both unread active and historical read)
        alerts = [
            Alert(device=device, type='gas_leak', severity='critical', message='Kitchen Gas Sensor: Minor VOC elevation detected (32 ppm)', is_read=False, timestamp=now - timedelta(minutes=8)),
            Alert(device=device, type='intrusion', severity='warning', message='PIR Sensor: Perimeter motion detected near front walkway', is_read=False, timestamp=now - timedelta(minutes=24)),
            Alert(device=device, type='car_detected', severity='info', message='Garage Ultrasonic Sensor: Vehicle detected at parking bay', is_read=False, timestamp=now - timedelta(minutes=45)),
            Alert(device=device, type='system', severity='info', message='Nexus Core Online: All telemetry sensors nominal and synchronized', is_read=True, timestamp=now - timedelta(hours=2, minutes=15)),
            Alert(device=device, type='system', severity='info', message='SmartNest Energy AI: Efficiency rating 96% optimal', is_read=True, timestamp=now - timedelta(hours=5, minutes=10)),
            Alert(device=device, type='rfid_denied', severity='warning', message='Access Gate: Revoked keycard scan rejected (UID: 99AA33FF)', is_read=True, timestamp=now - timedelta(days=1, hours=3)),
        ]
        Alert.objects.bulk_create(alerts)

    # Restore auto_now_add
    for model in [SensorReading, Alert, AccessLog]:
        ts_field = model._meta.get_field('timestamp')
        ts_field.auto_now_add = True

    print("[+] Demo data seeded successfully!")
    print("------------------------------------------------------------------")
    print("User Credentials:    adi / admin123 (Owner)")
    print("                     priya / admin123 (Admin)")
    print("                     rohan / admin123 (Member)")
    print("Pending Join Req:    kavita (Ready to approve/reject in Household)")
    print("Households:          The Nexus Dome, Nexus Dome")
    print("Devices:             ESP32 Smart Hub, ESP32 Security Node (Online)")
    print("RFID Keycards:       3 cards (2 Active, 1 Revoked)")
    print("Telemetry History:   24h Temperature, Humidity, Gas, Light, Relays")
    print("Energy Analytics:    7 Days Daily Breakdown & Real-Time Amps")
    print("Access Logs:         6 entries (RFID & Keypad, Granted & Denied)")
    print("Alerts:              6 entries (3 Unread Active, 3 Read History)")
    print("------------------------------------------------------------------")

if __name__ == '__main__':
    seed()
