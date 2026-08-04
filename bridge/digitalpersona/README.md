# MESA DigitalPersona Bridge (Windows)

Native helper that owns the USB fingerprint reader and exposes it to the MESA
web app over a local WebSocket. The browser cannot open a USB vendor device
directly, so this bridge is the hardware layer: it talks to the
**HID DigitalPersona SDK** (`DigitalPersona.dll`) and speaks the JSON protocol
implemented client-side in
`mesa-admin/lib/biometrics/DigitalPersonaAdapter.ts`.

| | |
|---|---|
| Target reader | DigitalPersona U.are.U 4500 **UID edition** — USB ID `05ba:000b` ("Civil PIV Sensor") |
| Host OS | **Windows** (the 4500 UID has no Linux driver; see notes below) |
| Protocol | WebSocket JSON, `ws://127.0.0.1:8765` |
| Language | Python 3.9+ (stdlib + `websockets`) |
| Access | The Windows machine runs this bridge and the browser opens the MESA app over Tailscale from that same machine |

> **Important:** the 4500 **UID edition** (`05ba:000b`) is *not* supported on
> Linux — there is no `libfprint` entry and no UVC video stream (the "camera"
> shows blank filler). It works with the HID DigitalPersona SDK on Windows
> only. Do not try to run the reader on the Linux box; run the bridge on the
> Windows machine that has the reader plugged in.

---

## 1. What the bridge implements

Protocol (client → bridge):

```json
{ "type": "hello" }
{ "type": "capture" }
{ "type": "identify", "template": "<base64 template>" }
{ "type": "enroll", "template": "<base64 template>", "identityId": "<id>" }
```

Bridge → client:

```json
{ "type": "ready" }
{ "type": "error", "message": "..." }
{ "type": "captured", "template": "<base64 template>" }
{ "type": "identified", "identityId": "<id>", "score": 100 }
{ "type": "no_match" }
```

Every request carries an integer `id`; every response echoes it back so the
browser adapter can correlate the pending promise (see
`DigitalPersonaAdapter.request()` in `mesa-admin/lib/`).

The bridge keeps an **in-memory 1:N template store** keyed by `identityId`.
Templates are registered with `enroll` and compared byte-for-byte on
`identify` (`score` = 100 on an exact match). This is the Phase 1 store:
real minutiae matching (SourceAFIS) and server-side persistence replace it in
Phase 2 without changing the protocol.

The bridge **fails soft**: if the SDK or reader is missing it still answers
`hello` with `ready`, and `capture` with an `error` message — the MESA app
falls back to the simulated adapter (`SimulatedBiometricAdapter`) and keeps
working end-to-end.

## 2. Windows setup (one-time)

1. **Install the HID DigitalPersona SDK**
   - Download "HID DigitalPersona SDK" (version 3.x, e.g. 3.4.x) from
     HID Global / your DigitalPersona partner portal.
   - Run the installer. It installs `DigitalPersona.dll` into
     `C:\Program Files\DigitalPersona\` (or your chosen SDK dir).
   - If the DLL is somewhere else, set the environment variable
     `DPFP_SDK_DIR` to that folder before running the bridge.

2. **Install the U.are.U 4500 driver**
   - Plug in the reader. Windows shows it as **"Civil PIV Sensor"**
     (USB ID `05ba:000b`).
   - Install the driver bundled with the SDK (or Windows Update), then
     verify in Device Manager → Biometric devices (or Universal Serial Bus
     devices) that it is present and healthy.
   - The reader is a **swipe** sensor: fingers are swiped across the narrow
     slot, not pressed on a pad.

3. **Install Python + the websockets library**
   ```bat
   python --version            rem  need 3.9+
   python -m pip install websockets
   ```

4. **Run the bridge**
   ```bat
   cd bridge\digitalpersona
   python bridge.py
   ```
   Expected output:
   ```
   MESA biometrics bridge listening on ws://127.0.0.1:8765
   Reader: Ready
   ```

5. **Verify the browser can reach it**
   Open the MESA app on that Windows machine and go to the enrollment page —
   the adapter note should read `DigitalPersona (U.are.U 4500) — hardware
   bridge connected.` instead of the fallback note. (POS kiosk shows the same
   note in its offline/setup banner.)

### Troubleshooting

| Symptom | Fix |
|---|---|
| `No DigitalPersona reader found` | Cable/USB port; driver installed? `Device Manager` shows `Civil PIV Sensor`? |
| `Failed to open the reader (is it claimed by another app?)` | Close DigitalPersona's own tools (e.g. the SDK sample apps) that hold the device. |
| `DigitalPersona.dll not found` | SDK not installed, or set `DPFP_SDK_DIR` to the folder containing the DLL. |
| `no finger on sensor` on swipe | Swipe faster/flatter; the 4500 needs a full-length, steady swipe. |
| App shows fallback note anyway | Bridge not running, or `ws://127.0.0.1:8765` blocked. Run `python selfcheck.py` first. |

## 3. Self-check (no hardware needed)

From this folder:

```bat
python selfcheck.py
```

Starts the protocol server in simulation mode and verifies: `hello` → `ready`,
request-id echo correlation, `enroll` → `identify` → `identified` /
`no_match` round trips, malformed-template handling, and fail-soft `capture`
without a reader. Exits 0 when all checks pass.

## 4. Files

| File | Purpose |
|---|---|
| `bridge.py` | WebSocket server + protocol handler + in-memory template store |
| `digitalpersona.py` | ctypes wrapper around `DigitalPersona.dll` (SDK calls only) |
| `selfcheck.py` | Protocol self-check, runnable on any OS without a reader |

## 5. Ports

The biometrics bridge owns **`ws://127.0.0.1:8765`**. The ESC/POS printer
bridge is a separate program on **`ws://127.0.0.1:8766`** (see
`mesa-admin/lib/printer.ts`). Keep the two ports distinct.
