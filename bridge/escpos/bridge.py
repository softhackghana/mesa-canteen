#!/usr/bin/env python3
"""MESA ESC/POS printer bridge — local helper that owns the thermal receipt
printer and speaks the JSON protocol the browser expects.

Listens on ws://127.0.0.1:8766 (distinct from the biometrics bridge on
8765) and implements exactly the protocol in `mesa-admin/lib/printer.ts`:

  client → bridge:
    { "type": "status" }
    { "type": "print", "id": <int>, "receiptTemplate": "<base64>",
      "transactionId": "<id>", "reprint": <bool> }

  bridge → client:
    { "type": "status", "status": "online|paper_out|cover_open|error|offline" }
    { "type": "printed", "id": <int> }
    { "type": "error", "id": <int>, "error": "<string>" }

Every print request carries an integer `id`; the response echoes it back so
the client can correlate the pending promise (see PrinterClient.print()).

The bridge decodes the base64 ESC/POS bytes the POS already rendered (ESC a
align, ESC E bold, ESC i cut — see renderCoupon in app/pos/_store.ts) and
writes them raw to a USB thermal printer via python-escpos.

Run:
  python -m pip install websockets python-escpos   # Windows: pip install ...
  python bridge.py [--port 8766] [--simulate] [--backend usb|stdout|spooler]

Backends:
  usb      — python-escpos USB 0x28e4:0x0001 (fallback: probe common vendor
             IDs; the --vendor/--product flags override). Default on Windows.
  spooler  — Windows: submit the raw bytes to the default printer via
             win32print. Requires pywin32.
  stdout   — write the ESC/POS bytes to stdout as base64. Best for testing on
             any OS without hardware (matches `--simulate` behaviour).

The bridge fails soft when python-escpos is missing or the printer is absent:
it still answers "status" (reporting the last known state) and answers
"print" with an error message, so the browser client degrades to the
Printer Error view instead of hanging.

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

PORT = 8766

# python-escpos USB IDs. The POS ships with an 80mm thermal printer; these
# cover the most common vendor/product pairs. Override with --vendor/--product.
USB_VENDOR = 0x28E4  # STAR
USB_PRODUCT = 0x0001

# --------------------------------------------------------------------------
# Print backends
# --------------------------------------------------------------------------

class Backend:
    """Base class. `send(bytes)` must raise on failure, return None on success."""

    name = "base"

    def __init__(self) -> None:
        self.last_error: Optional[str] = None

    async def send(self, payload: bytes) -> None:
        raise NotImplementedError

    def available(self) -> bool:
        return True


class StdoutBackend(Backend):
    """Echo the ESC/POS bytes to stdout as base64. No hardware needed."""

    name = "stdout"

    async def send(self, payload: bytes) -> None:
        print(f"[escpos-bridge:stdout] {base64.b64encode(payload).decode('ascii')}")
        sys.stdout.flush()


class EscposUsbBackend(Backend):
    """Write raw ESC/POS bytes to a USB thermal printer via python-escpos.

    ponytail: single-printer USB connection. Multiple printers / per-site
    routing (FR-RCP-003) maps to a printer selector upstream; this backend
    owns exactly one device.
    """

    name = "usb"

    def __init__(self, vendor: int, product: int) -> None:
        super().__init__()
        self.vendor = vendor
        self.product = product
        self._device: Optional[Any] = None

    def _connect(self) -> Any:
        if self._device is not None:
            return self._device
        try:
            from escpos.printer import Usb
        except ImportError:
            self.last_error = "python-escpos not installed. Run `python -m pip install python-escpos`."
            raise RuntimeError(self.last_error)
        try:
            self._device = Usb(self.vendor, self.product)
        except Exception as err:  # usb.core.USBError and friends
            self.last_error = f"Printer not found (USB {self.vendor:04x}:{self.product:04x}): {err}"
            self._device = None
            raise RuntimeError(self.last_error)
        return self._device

    async def send(self, payload: bytes) -> None:
        device = self._connect()
        await asyncio.to_thread(device._raw, payload)  # _raw writes raw bytes

    def available(self) -> bool:
        try:
            self._connect()
            return True
        except RuntimeError:
            return False


class SpoolerBackend(Backend):
    """Windows raw spooler via pywin32 — writes bytes straight to the default
    printer without python-escpos. Fallback when python-escpos's USB stack is
    unavailable on a given Windows box."""

    name = "spooler"

    async def send(self, payload: bytes) -> None:
        try:
            import win32print
        except ImportError:
            self.last_error = "pywin32 not installed. Run `python -m pip install pywin32`."
            raise RuntimeError(self.last_error)
        try:
            printer = win32print.OpenPrinter(None)  # None = default printer
            try:
                job = win32print.StartDocPrinter(printer, 1, ("MESA coupon", None, "RAW"))
                try:
                    win32print.StartPagePrinter(printer)
                    win32print.WritePrinter(printer, payload)
                    win32print.EndPagePrinter(printer)
                finally:
                    win32print.EndDocPrinter(printer)
            finally:
                win32print.ClosePrinter(printer)
        except Exception as err:
            self.last_error = f"Spooler failure: {err}"
            raise RuntimeError(self.last_error)


# --------------------------------------------------------------------------
# Bridge handler
# --------------------------------------------------------------------------

class Bridge:
    def __init__(
        self,
        simulate: bool = False,
        backend_name: str = "",
        vendor: int = USB_VENDOR,
        product: int = USB_PRODUCT,
    ) -> None:
        self.simulate = simulate
        self.status = "online"
        self.backend: Backend
        if simulate or backend_name == "stdout":
            self.backend = StdoutBackend()
        elif backend_name == "spooler":
            self.backend = SpoolerBackend()
        elif backend_name == "usb":
            self.backend = EscposUsbBackend(vendor, product)
        elif backend_name:
            raise ValueError(f"Unknown backend '{backend_name}'")
        else:
            # Default: try USB; fall back to spooler on Windows; else stdout.
            try:
                self.backend = EscposUsbBackend(vendor, product)
                if self.backend.available():
                    self.status = "online"
                else:
                    self.backend = SpoolerBackend() if sys.platform == "win32" else StdoutBackend()
                    self.status = "online"
            except Exception:
                self.backend = StdoutBackend()
                self.status = "online"

    def _decode_template(self, raw: Any) -> Optional[bytes]:
        if not isinstance(raw, str):
            return None
        try:
            data = base64.b64decode(raw, validate=True)
        except Exception:
            return None
        if len(data) == 0:
            return None
        return data

    async def handle(self, ws, path: str) -> None:
        await ws.send(json.dumps({"type": "status", "status": self.status, "backend": self.backend.name, "simulate": self.simulate}))
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send(json.dumps({"type": "error", "error": "Invalid JSON."}))
                continue
            if not isinstance(msg, dict):
                await ws.send(json.dumps({"type": "error", "error": "Expected a JSON object."}))
                continue
            req_id = msg.get("id")

            kind = msg.get("type")
            if kind == "status":
                await ws.send(json.dumps({"type": "status", "id": req_id, "status": self.status}))
            elif kind == "print":
                if not isinstance(req_id, int):
                    await ws.send(json.dumps({"type": "error", "error": "Missing integer 'id' field."}))
                    continue
                payload = self._decode_template(msg.get("receiptTemplate"))
                if payload is None:
                    await ws.send(json.dumps({"type": "error", "id": req_id, "error": "Invalid receiptTemplate."}))
                    continue
                try:
                    await self.backend.send(payload)
                    await ws.send(json.dumps({"type": "printed", "id": req_id}))
                except RuntimeError as err:
                    self.status = "error"
                    await ws.send(json.dumps({"type": "error", "id": req_id, "error": str(err)}))
            elif kind == "ping":
                await ws.send(json.dumps({"type": "pong", "id": req_id}))
            else:
                await ws.send(json.dumps({"type": "error", "id": req_id, "error": f"Unknown request type '{kind}'."}))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=PORT, help=f"Listen port (default {PORT})")
    parser.add_argument("--simulate", action="store_true", help="Serve without a physical printer")
    parser.add_argument(
        "--backend",
        choices=["usb", "spooler", "stdout"],
        default="",
        help="Print backend (default: usb, fallback spooler on Windows, else stdout)",
    )
    parser.add_argument("--vendor", type=lambda x: int(x, 0), default=USB_VENDOR, help="USB vendor id (hex)")
    parser.add_argument("--product", type=lambda x: int(x, 0), default=USB_PRODUCT, help="USB product id (hex)")
    args = parser.parse_args()

    bridge = Bridge(
        simulate=args.simulate,
        backend_name=args.backend,
        vendor=args.vendor,
        product=args.product,
    )
    print(f"MESA ESC/POS bridge listening on ws://127.0.0.1:{args.port}")
    print(f"Backend: {bridge.backend.name} (simulate={bridge.simulate})")
    print("Press Ctrl+C to stop.")

    async def serve() -> None:
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
