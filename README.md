<div align="center">

# 🏠 The Nexus Dome
### AI Powered Smart Home Automation Platform

<img src="docs/logo.png" width="180"/>

![Python](https://img.shields.io/badge/Python-3.11-blue)
![Django](https://img.shields.io/badge/Django-5.x-green)
![React](https://img.shields.io/badge/React-19-61DAFB)
![ESP32](https://img.shields.io/badge/ESP32-IoT-red)
![Arduino](https://img.shields.io/badge/Arduino-UNO-00979D)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)
![License](https://img.shields.io/badge/License-MIT-success)

An intelligent **AI-powered Smart Home Automation Platform** that combines IoT devices, cloud computing, real-time communication, and mobile technology into one seamless ecosystem.

**Monitor • Control • Secure • Automate**

</div>

---

# 📖 About

The Nexus Dome is a complete Full Stack IoT Smart Home Automation System designed to provide intelligent monitoring, real-time automation, secure access control, and seamless device management.

The system connects ESP32 and Arduino-based hardware with a Django cloud backend and a React web/mobile dashboard. Sensor data is streamed live to users through WebSockets, while automation commands travel securely from the dashboard back to the hardware.

Unlike traditional automation projects, The Nexus Dome integrates:

- 🏠 Smart Home Automation
- 🌐 IoT Communication
- ☁️ Cloud Computing
- 📱 Mobile Application
- 🔒 Smart Security
- ⚡ Real-Time Updates
- 🤖 Intelligent Automation

---

# ✨ Key Features

## 🌡 Environmental Monitoring

- Temperature Monitoring
- Humidity Monitoring
- Gas Leak Detection
- Flame Detection
- Motion Detection
- Light Intensity Detection
- Distance Measurement
- Vibration Detection

---

## 🏡 Smart Home Control

- Smart Light Control
- Smart Fan Control
- Garage Door Automation
- Relay Based Appliance Control
- Mobile Dashboard
- Remote Device Access

---

## 🔐 Smart Security

- Digital Keypad Lock
- Secure PIN Verification
- Access Logging
- Buzzer Alarm
- Motion Alerts
- Household Authentication

---

## 📊 Live Dashboard

- Real-Time Sensor Data
- WebSocket Updates
- Device Status
- Activity Timeline
- Live Notifications
- User Authentication

---

## ☁️ Cloud Features

- REST APIs
- PostgreSQL Database
- Device Registration
- Household Management
- Access Logs
- Celery Background Tasks

---

# 🏗 System Architecture

```

┌────────────────────────────┐
│ React Web Dashboard │
│ Android App │
└────────────┬───────────────┘
│
REST APIs
│
┌────────────▼───────────────┐
│ Django Backend │
│ Django REST Framework │
│ Channels │
│ Celery │
└────────────┬───────────────┘
│
WebSockets
│
┌────────────▼───────────────┐
│ ESP32 Controller │
└───────┬───────────┬────────┘
│ │
UART HTTP
│ │
Arduino UNO Cloud
│
┌────────────▼───────────────┐
│ Sensors & Actuators │
└────────────────────────────┘

```

---

# ⚙ Technology Stack

## Frontend

- React
- Vite
- Capacitor
- HTML5
- CSS3
- JavaScript

---

## Backend

- Django
- Django REST Framework
- Django Channels
- Celery
- Redis
- PostgreSQL

---

## IoT Hardware

- ESP32
- Arduino UNO
- DHT11
- MQ2 Gas Sensor
- PIR Motion Sensor
- Flame Sensor
- LDR
- HC-SR04 Ultrasonic Sensor
- ADXL345 Accelerometer
- Servo Motor
- Relay Module
- Buzzer
- 4×4 Keypad

---

# 📂 Project Structure

```

The-Nexus-Dome/
│
├── backend/
│ ├── Django
│ ├── REST APIs
│ ├── WebSockets
│ └── Database
│
├── web/
│ ├── React Dashboard
│ ├── Android (Capacitor)
│ └── UI Components
│
├── firmware/
│ ├── esp32/
│ └── uno/
│
├── docs/
│ ├── Images
│ └── README Assets
│
└── README.md

```

---

# 🚀 Installation

## 1️⃣ Clone Repository

```bash
git clone https://github.com/adityapratapsinghcse/The-Nexus-Dome.git
cd The-Nexus-Dome
```

---

## 2️⃣ Backend Setup

```bash
cd backend

python -m venv venv

# Windows

venv\Scripts\activate

# Linux / Mac

source venv/bin/activate

pip install -r requirements.txt
```

Create `.env`

```env
SECRET_KEY=your-secret-key

DEBUG=True

DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/nexus

REDIS_URL=redis://127.0.0.1:6379/0

FIREBASE_CREDENTIALS_JSON={}
```

Run Database Migrations & Seed Demo Data:

```bash
# 1. Apply database tables
python manage.py migrate

# 2. Populate complete realistic demo/test data (Users, Devices, Sensors, Energy, RFID Cards)
python seed_demo_data.py

# 3. Start Django API server
python manage.py runserver
```

*(Optional)* Run Live ESP32 Hardware Telemetry Simulator:
```bash
# In a separate terminal, to stream live telemetry (temperature, current, gas, distance)
python simulate_esp32.py
```

---

## 3️⃣ Frontend Setup

```bash
cd web

npm install

npm run dev
```

Create `web/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_WS_BASE_URL=ws://127.0.0.1:8000
```

### 🔑 Demo Login Credentials
| Username | Password | Role | Permissions |
|---|---|---|---|
| `adi` | `admin123` | Owner | Full access to all devices, relays, RFID cards & settings |
| `priya` | `admin123` | Admin | Management & member access |
| `rohan` | `admin123` | Member | Standard telemetry & climate monitoring |

*Note: You can also click the **"⚡ ONE-CLICK DEMO ACCESS"** button directly on the login page.*


---

## 4️⃣ Android Build

```bash
npm run build

npx cap sync

npx cap open android
```

---

## 5️⃣ Firmware

ESP32

```bash
cp include/secrets.h.example include/secrets.h
```

Configure

- WiFi SSID
- Password
- Backend URL
- Device Key

Upload using PlatformIO.

Upload Arduino UNO firmware separately.

---

# 📡 API Flow

```

Sensors
↓

ESP32
↓

REST API
↓

Django Backend
↓

Database
↓

WebSocket
↓

Dashboard

```

Commands follow the reverse direction.

---

# 🔌 Hardware Connections

| Component | Interface |
|------------|----------|
| DHT11 | GPIO4 |
| MQ2 | GPIO34 |
| PIR | GPIO33 |
| Flame | GPIO35 |
| LDR | GPIO32 |
| Servo | GPIO14 |
| Ultrasonic | GPIO5 / GPIO18 |
| Buzzer | GPIO23 |
| UART | GPIO16 / GPIO17 |

---

# 📸 Screenshots

```
docs/
├── dashboard.png
├── mobile.png
├── hardware.jpg
├── architecture.png
```

*(Add screenshots here for a more attractive repository.)*

---

# 🚀 Future Enhancements

- AI-based anomaly detection
- Voice Assistant Integration
- MQTT Communication
- Energy Consumption Analytics
- Face Recognition Door Lock
- Smart Scheduling
- AI Recommendations
- Smart Power Management

---

# 👨‍💻 Team

| Name | Role |
|------|------|
| **Member 1 Aditya Pratap Singh** | Backend Development, Django, APIs & Database |
| **Member 2 Divynashi Kesharwani** | Frontend Development, React & Mobile Application |
| **Member 3 Jayant Singh** | IoT Development, ESP32, Arduino & Hardware Integration |

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository

2. Create a feature branch

3. Commit your changes

4. Push to your branch

5. Open a Pull Request

---

# 📜 License

This project is licensed under the MIT License.

---

<div align="center">

### ⭐ If you like this project, don't forget to star the repository!

Made with ❤️ by Team Nexus Dome

</div>
