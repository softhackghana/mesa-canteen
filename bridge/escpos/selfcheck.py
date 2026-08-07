#!/usr/bin/env python3
"""Self-check for the ESC/POS bridge protocol layer (no hardware required).

Run from this directory:
    python selfcheck.py

Verifies:
  1. The WebSocket server starts and answers an unsolicited "status" with the
     backend name (the way PrinterClient probes status on connect).
  2. Request/response correlation: a "ping" echoed with its own id proves the
     client's pending-promise map resolves against the right message.
  3. The status round-trip: "status" with an id comes back with the same id
     and a valid status string.
  4. A "print" with a well-formed base64 receiptTemplate reaches the backend
     and resolves "printed" with the echoed id — on the stdout backend so no
     hardware is required.
  5. Fail-soft: a "print" with a malformed receiptTemplate returns an error
     with the echoed id, never a crash.

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

PORT = 18766  # distinct port so the self-check never collides with a live bridge


def escpos_coupon() -> str:
    """A realistic ESC/POS coupon: ESC a1 center+bold header, ESC a0 body,
    ESC i cut — matches renderCoupon's byte template."""
    esc = "\x1b"
    text = (
        f"{esc}a1{esc}E1MESA MEAL COUPON\n"
        f"{esc}a0{esc}E0EMP-1234 LUNCH GHS 12.00\n"
        f"{esc}i"
    )
    return base64.b64encode(text.encode("utf-8")).decode("ascii")


async def check() -> None:
    from bridge import Bridge

    # stdout backend: no printer needed, exercises the full transport path.
    bridge = Bridge(simulate=True, backend_name="stdout")

    async def handler(ws):
        await bridge.handle(ws, "/")

    async with websockets.serve(handler, "127.0.0.1", PORT):
        async with websockets.connect(f"ws://127.0.0.1:{PORT}") as ws:
            # 1. Unsolicited status on connect (backend + simulate flag).
            ready = json.loads(await ws.recv())
            assert ready.get("type") == "status", f"expected status, got {ready}"
            assert ready.get("backend") == "stdout", f"expected stdout backend, got {ready}"
            assert ready.get("simulate") is True, "expected simulate flag"

            # 2. Correlation: ping/2 must come back as pong/2.
            await ws.send(json.dumps({"type": "ping", "id": 2}))
            pong = json.loads(await ws.recv())
            assert pong.get("id") == 2 and pong.get("type") == "pong", f"bad echo {pong}"

            # 3. Status round-trip echoes the id and a valid status string.
            await ws.send(json.dumps({"type": "status", "id": 3}))
            status = json.loads(await ws.recv())
            assert status.get("id") == 3, f"bad status id {status}"
            assert status.get("status") in ("online", "paper_out", "cover_open", "error", "offline"), (
                f"bad status value {status}"
            )

            # 4. Print round-trip → printed with echoed id.
            await ws.send(
                json.dumps(
                    {
                        "type": "print",
                        "id": 4,
                        "receiptTemplate": escpos_coupon(),
                        "transactionId": "TXN-20260806-1",
                        "reprint": False,
                    }
                )
            )
            printed = json.loads(await ws.recv())
            assert printed.get("type") == "printed" and printed.get("id") == 4, f"bad printed {printed}"

            # 5. Malformed receiptTemplate → explicit error, not a crash.
            await ws.send(json.dumps({"type": "print", "id": 5, "receiptTemplate": "!!!not-base64!!!"}))
            bad = json.loads(await ws.recv())
            assert bad.get("type") == "error" and bad.get("id") == 5, f"bad error {bad}"

    print("selfcheck: OK — status round-trip, id correlation, print, malformed-template error")


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
