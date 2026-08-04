#!/usr/bin/env python3
"""MESA biometrics bridge — Windows helper that owns the USB fingerprint
reader and speaks the JSON protocol the browser expects.

Listens on ws://127.0.0.1:8765 and serves a single DigitalPersona U.are.U
4500 (the "Civil PIV Sensor", USB 05ba:000b). It implements exactly the
protocol in `mesa-admin/lib/biometrics/DigitalPersonaAdapter.ts`:

  client → bridge:
    { "type": "hello" }
    { "type": "capture" }
    { "type": "identify", "template": "<base64>" }
    { "type": "enroll", "template": "<base64>", "identityId": "<id>" }

  bridge → client:
    { "type": "ready" }
    { "type": "error", "message": "..." }
    { "type": "captured", "template": "<base64>" }
    { "type": "identified", "identityId": "<id>", "score": <0..100> }
    { "type": "no_match" }

Every request carries an integer `id`; responses echo it back so the client
can correlate the pending promise (see DigitalPersonaAdapter.request()).

The bridge keeps an in-memory 1:N template store keyed by identityId
(registered via "enroll") and compares captures against it with a simple
byte-equality matcher. This is the Phase 1 store: real minutiae matching
(SourceAFIS) and server-side template persistence land in Phase 2.

Run (Windows):
  python -m pip install websockets
  python bridge.py [--port 8765] [--simulate]

The bridge fails soft when the SDK is missing or the reader is absent:
it still answers "hello" with "ready" and answers "capture" with an error
message, so the browser adapter keeps working end-to-end.

selfcheck.py exercises the protocol layer without hardware.
"""

import argparse
import asyncio
import base64
import json
import sys
from typing import Any, Dict, Optional

try:
    import websockets
except ImportError:
    print("Missing dependency: run `python -m pip install websockets` first.")
    sys.exit(2)

from digitalpersona import (
    DigitalPersonaSDK,
    DPFP_PURPOSE_ENROLL,
    DPFP_STATUS_OK,
    DPFP_STATUS_NOT_FINGER,
    DPFP_STATUS_DEVICE_NOT_CONNECTED,
)

PORT = 8765
SAME_TEMPLATE_SCORE = 100


# --------------------------------------------------------------------------
# Protocol / matching
# --------------------------------------------------------------------------

class TemplateStore:
    """In-memory 1:N template registry (identityId → base64 template).

    ponytail: byte-equality matching is a placeholder. Real fingerprint
    matching (SourceAFIS / DPFPVerify) plus a durable server-side store
    replace this in Phase 2; the protocol surface stays identical.
    """

    def __init__(self) -> None:
        self._templates: Dict[str, str] = {}

    def upsert(self, identity_id: str, template_b64: str) -> None:
        self._templates[identity_id] = template_b64

    def identify(self, template_b64: str) -> Optional[tuple[str, int]]:
        for identity_id, stored in self._templates.items():
            if stored == template_b64:
                return identity_id, SAME_TEMPLATE_SCORE
        return None

    def count(self) -> int:
        return len(self._templates)

    def clear(self) -> None:
        self._templates.clear()


def decode_template(raw: Any) -> Optional[str]:
    """Validate a client-supplied template field; None when malformed."""
    if not isinstance(raw, str):
        return None
    try:
        data = base64.b64decode(raw, validate=True)
    except Exception:
        return None
    if len(data) == 0:
        return None
    # Sanity cap: HID templates are ~200-800 bytes; anything larger is junk.
    return raw if len(data) <= 8192 else None


# --------------------------------------------------------------------------
# Bridge handler
# --------------------------------------------------------------------------

class Bridge:
    def __init__(self, simulate: bool = False) -> None:
        self.simulate = simulate
        self.store = TemplateStore()
        self.sdk: Optional[DigitalPersonaSDK] = None
        self.ready_note = ""
        self._sdk_failed = False

    def _load_sdk(self) -> str:
        """Open the reader; returns a ready-note string. Never raises."""
        if self.simulate:
            return "Simulation mode — no physical reader used."
        if self.sdk is not None:
            return self.ready_note
        try:
            self.sdk = DigitalPersonaSDK()
        except FileNotFoundError as err:
            self._sdk_failed = True
            self.sdk = None
            return str(err)
        except Exception as err:  # ctypes load issues
            self._sdk_failed = True
            self.sdk = None
            return f"SDK load failed: {err}"
        note = self.sdk.open_reader()
        if self.sdk.status != DPFP_STATUS_OK:
            self._sdk_failed = True
            self.sdk = None
            return note
        return note

    def _capture_once(self, purpose: int) -> Optional[str]:
        """Returns a base64 template, or None when no finger was present."""
        assert self.sdk is not None
        try:
            return self.sdk.capture_template(purpose)
        except ValueError as err:
            # NOT_FINGER and friends → "retry" semantics, not an error.
            if self.sdk.status == DPFP_STATUS_NOT_FINGER:
                return None
            raise ValueError(str(err))

    def _do_capture(self, purpose: int) -> tuple[str, Dict[str, Any]]:
        """Blocking capture loop; (status, payload)."""
        note = self._load_sdk()
        if self.sdk is None:
            return "error", {"message": note}
        for _ in range(20):
            try:
                tpl = self._capture_once(purpose)
            except ValueError as err:
                return "error", {"message": str(err)}
            if tpl:
                return "captured", {"template": tpl}
        return "error", {
            "message": "No fingerprint captured in time. Place the finger flat and swipe steadily."
        }

    async def handle(self, ws, path: str) -> None:
        note = self._load_sdk()
        await ws.send(json.dumps({"type": "ready", "note": note, "simulate": self.simulate}))
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send(json.dumps({"type": "error", "message": "Invalid JSON."}))
                continue
            if not isinstance(msg, dict):
                await ws.send(json.dumps({"type": "error", "message": "Expected a JSON object."}))
                continue
            req_id = msg.get("id")
            if not isinstance(req_id, int):
                await ws.send(json.dumps({"type": "error", "message": "Missing integer 'id' field."}))
                continue

            kind = msg.get("type")
            try:
                if kind == "hello":
                    await ws.send(json.dumps({"type": "ready", "id": req_id}))
                elif kind == "capture":
                    status, payload = self._do_capture(DPFP_PURPOSE_ENROLL)
                    payload["id"] = req_id
                    await ws.send(json.dumps({"type": status, **payload}))
                elif kind == "identify":
                    tpl = decode_template(msg.get("template"))
                    if tpl is None:
                        await ws.send(json.dumps({"type": "error", "id": req_id, "message": "Invalid template."}))
                        continue
                    hit = self.store.identify(tpl)
                    if hit:
                        identity_id, score = hit
                        await ws.send(
                            json.dumps({"type": "identified", "id": req_id, "identityId": identity_id, "score": score})
                        )
                    else:
                        await ws.send(json.dumps({"type": "no_match", "id": req_id}))
                elif kind == "enroll":
                    tpl = decode_template(msg.get("template"))
                    identity_id = msg.get("identityId")
                    if tpl is None or not isinstance(identity_id, str) or not identity_id:
                        await ws.send(json.dumps({"type": "error", "id": req_id, "message": "Invalid enroll payload."}))
                        continue
                    self.store.upsert(identity_id, tpl)
                    await ws.send(json.dumps({"type": "enrolled", "id": req_id, "identityId": identity_id}))
                elif kind == "ping":
                    await ws.send(json.dumps({"type": "pong", "id": req_id}))
                elif kind == "clear":
                    self.store.clear()
                    await ws.send(json.dumps({"type": "cleared", "id": req_id}))
                else:
                    await ws.send(
                        json.dumps({"type": "error", "id": req_id, "message": f"Unknown request type '{kind}'."})
                    )
            except Exception as err:  # never kill the connection on a bad request
                await ws.send(
                    json.dumps({"type": "error", "id": req_id, "message": f"Bridge error: {err}"})
                )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=PORT, help=f"Listen port (default {PORT})")
    parser.add_argument("--simulate", action="store_true", help="Serve without a physical reader")
    args = parser.parse_args()

    bridge = Bridge(simulate=args.simulate)
    note = bridge._load_sdk()
    print(f"MESA biometrics bridge listening on ws://127.0.0.1:{args.port}")
    print(f"Reader: {note or 'ready'}")
    print("Press Ctrl+C to stop.")

    async def serve() -> None:
        # websockets >=14 passes a single connection arg; older versions pass
        # (connection, path). The wrapper keeps the registered handler happy
        # on both.
        async with websockets.serve(
            lambda ws, path="/": bridge.handle(ws, path), "127.0.0.1", args.port
        ):
            await asyncio.Future()

    try:
        asyncio.run(serve())
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
