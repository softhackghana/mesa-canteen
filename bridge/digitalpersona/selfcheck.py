#!/usr/bin/env python3
"""Self-check for the bridge protocol layer (no hardware required).

Run from this directory:
    python selfcheck.py

Verifies:
  1. The WebSocket server starts and answers "hello" with "ready" (with an
     echoed request id, the way DigitalPersonaAdapter correlates responses).
  2. Request/response correlation: a "ping" echoed with its own id proves the
     client's pending-promise map resolves against the right message.
  3. The 1:N store: enroll → identify round trip returns "identified" with
     the right identityId + score, and an unknown template returns "no_match".
  4. Fail-soft: "capture" with no SDK/reader returns an error message, never
     a crash — the adapter falls back to the simulator on that string.

Exits 0 when everything passes, 1 otherwise. No third-party test framework.
"""

import asyncio
import base64
import json
import sys

try:
    import websockets
except ImportError:
    print("Missing dependency: run `python -m pip install websockets` first.")
    sys.exit(2)

PORT = 18765  # distinct port so the self-check never collides with a live bridge


def b64_of(seed: bytes) -> str:
    # A realistic HID template blob is a few hundred bytes; pad it out.
    return base64.b64encode(seed * 40).decode("ascii")


async def check() -> None:
    from bridge import Bridge

    bridge = Bridge(simulate=True)

    async def handler(ws):
        await bridge.handle(ws, "/")

    async with websockets.serve(handler, "127.0.0.1", PORT):
        async with websockets.connect(f"ws://127.0.0.1:{PORT}") as ws:
            # 1. hello → ready (first message is the unsolicited ready note).
            ready = json.loads(await ws.recv())
            assert ready.get("type") == "ready", f"expected ready, got {ready}"
            assert ready.get("simulate") is True, "expected simulate flag"

            # 2. Correlation: ping/2 must come back as pong/2.
            await ws.send(json.dumps({"type": "ping", "id": 2}))
            pong = json.loads(await ws.recv())
            assert pong.get("id") == 2 and pong.get("type") == "pong", f"bad echo {pong}"

            # 3. Enroll → identify round trip.
            alice = b64_of(b"alice-fingerprint")
            bob = b64_of(b"bob-fingerprint")
            await ws.send(json.dumps({"type": "enroll", "id": 3, "template": alice, "identityId": "EMP-1001"}))
            enrolled = json.loads(await ws.recv())
            assert enrolled.get("type") == "enrolled" and enrolled.get("id") == 3, f"bad enroll {enrolled}"

            await ws.send(json.dumps({"type": "identify", "id": 4, "template": alice}))
            hit = json.loads(await ws.recv())
            assert hit.get("type") == "identified" and hit.get("identityId") == "EMP-1001", f"bad hit {hit}"
            assert isinstance(hit.get("score"), int), "score must be an int"

            await ws.send(json.dumps({"type": "identify", "id": 5, "template": bob}))
            miss = json.loads(await ws.recv())
            assert miss.get("type") == "no_match" and miss.get("id") == 5, f"bad miss {miss}"

            # Malformed template → explicit error, not a crash.
            await ws.send(json.dumps({"type": "identify", "id": 6, "template": "!!!not-base64!!!"}))
            bad = json.loads(await ws.recv())
            assert bad.get("type") == "error" and bad.get("id") == 6, f"bad error {bad}"

            # 4. Fail-soft capture: no SDK → error message (adapter falls back).
            await ws.send(json.dumps({"type": "capture", "id": 7}))
            cap = json.loads(await ws.recv())
            assert cap.get("type") == "error" and cap.get("message"), f"bad capture {cap}"

    print("selfcheck: OK — hello/ready, correlation, enroll/identify/no_match, fail-soft capture")


def main() -> None:
    try:
        asyncio.run(check())
    except AssertionError as err:
        print(f"selfcheck: FAIL — {err}")
        sys.exit(1)
    except Exception as err:  # transport/parse failures are also a failure
        print(f"selfcheck: FAIL — {err}")
        sys.exit(1)


if __name__ == "__main__":
    main()
