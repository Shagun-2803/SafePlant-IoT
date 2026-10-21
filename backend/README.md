# SafePlant AIoT — FastAPI Backend Server

Authoritative backend service for the SafePlant AIoT industrial safety monitoring system. Handles real ESP32 telemetry ingestion, on-device CameraX person intrusion tracking, safety threshold evaluations, persistent SQLite logging, and live WebSocket streaming.

---

## 1. Quick Start Guide (Windows PowerShell / CMD)

### Step 1: Open Terminal in the `backend/` directory
```powershell
cd backend
```

### Step 2: Create and Activate Virtual Environment
**PowerShell:**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```
*(If PowerShell blocks script execution, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process`)*

**Command Prompt (cmd.exe):**
```cmd
python -m venv venv
venv\Scripts\activate.bat
```

**Linux / macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Required Dependencies
```powershell
pip install -r requirements.txt
```

### Step 4: Run the FastAPI Server on `0.0.0.0:8000`
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The server will start listening on all network interfaces (`0.0.0.0:8000`).

---

## 2. LAN IP Configuration for Real Hardware (ESP32 & Phone)

When testing with a physical ESP32 or Android phone, **never use `localhost` or `127.0.0.1`**, because those point to the device itself.

### Finding your Laptop's LAN IP:
1. Open PowerShell or Command Prompt.
2. Run:
   ```cmd
   ipconfig
   ```
3. Locate your active Wi-Fi or Ethernet adapter's **IPv4 Address** (e.g., `192.168.1.105`).
4. Ensure your laptop, Android phone, and ESP32 are all connected to the **same Wi-Fi network**.
5. If Windows Defender Firewall blocks incoming connections, run:
   ```powershell
   New-NetFirewallRule -DisplayName "SafePlant FastAPI (Port 8000)" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
   ```

### Configuring the ESP32:
In `firmware/esp32_safeplant_firmware.ino`:
```cpp
const char* serverUrl = "http://192.168.1.105:8000/api/telemetry";
```

### Configuring the Android App:
- In the SafePlant Android app, tap **Settings**.
- Update the **Backend Base URL** to `http://192.168.1.105:8000`.
- Tap **Test Connection** to verify immediate connectivity.
*(Note: If using the Android Studio Emulator, use `http://10.0.2.2:8000` to reach your host machine).*

---

## 3. API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check and uptime status |
| `GET` | `/api/status` | ESP32 gateway hardware connection state & RSSI |
| `POST` | `/api/telemetry` | Ingests real ESP32 sensor telemetry packet |
| `GET` | `/api/telemetry/latest` | Returns latest verified hardware telemetry |
| `GET` | `/api/telemetry` | Alias for latest telemetry reading |
| `GET` | `/api/telemetry/history` | Historical telemetry records (range: 1h, 6h, 24h, 7d) |
| `GET` | `/api/incidents` | List recorded safety incidents |
| `POST` | `/api/incidents/{id}/acknowledge` | Acknowledge active incident |
| `POST` | `/api/incidents/{id}/resolve` | Resolve incident with audit notes |
| `GET` | `/api/settings` | Retrieve active safety thresholds |
| `PUT` | `/api/settings` | Update safety thresholds with validation |
| `GET` | `/api/ai/status` | CameraX edge AI monitoring status |
| `POST` | `/api/ai/events` | Ingest CameraX restricted area intrusion event |
| `WS` | `/ws` | Live streaming WebSocket for telemetry & incidents |

---

## 4. Running Automated Tests

Run the test suite using `pytest`:
```powershell
pytest tests/test_api.py -v
```
All endpoints, threshold evaluations, and edge cases are validated automatically.
