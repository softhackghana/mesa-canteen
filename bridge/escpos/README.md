# MESA ESC/POS printer bridge

Local helper that owns the thermal receipt printer and speaks the JSON
protocol the POS browser expects. Complements `mesa-admin/lib/printer.ts`
(FR-RCP-001/002/005/006).

## Protocol

Listens on `ws://127.0.0.1:8766` (distinct from the biometrics bridge on
8765). Every request carries an integer `id`; responses echo it.

```
client → bridge:
  { "type": "status" }
  { "type": "print", "id": <int>, "receiptTemplate": "<base64 esc/pos>",
    "transactionId": "<id>", "reprint": <bool> }

bridge → client:
  { "type": "status", "status": "online|paper_out|cover_open|error|offline" }
  { "type": "printed", "id": <int> }
  { "type": "error", "id": <int>, "error": "<string>" }
```

`receiptTemplate` is the base64 ESC/POS byte stream the POS already rendered
(see `renderCoupon` in `mesa-admin/app/pos/_store.ts`: `ESC a` align, `ESC E`
bold, `ESC i` cut). The bridge decodes and writes it raw to the printer.

## Run

```bash
# Any OS (self-check / stdout backend):
python -m pip install websockets
python selfcheck.py

# Real printing — Windows with a USB thermal printer:
python -m pip install websockets python-escpos
python bridge.py --backend usb --vendor 0x28e4 --product 0x0001

# Windows without python-escpos (raw spooler via pywin32):
python -m pip install websockets pywin32
python bridge.py --backend spooler

# No printer (logs base64 to stdout — good for verifying the POS→bridge path):
python bridge.py --backend stdout
```

Default backend: USB via python-escpos; falls back to the Windows raw spooler
on Windows, else stdout. `--simulate` forces the stdout backend.

## Backends

| Backend | Where | Requires | Notes |
|---------|-------|----------|-------|
| `usb` | any | `python-escpos` | Direct USB write. `--vendor/--product` override the defaults (STAR 0x28e4:0x0001). |
| `spooler` | Windows | `pywin32` | Raw bytes → default Windows printer. |
| `stdout` | any | — | Base64 to stdout, no hardware. Default fallback. |

## Hardware

Targets an 80mm thermal ESC/POS printer. `python-escpos` owns the USB stack;
if the printer is absent the bridge fails soft (answers `status` with the
last known state, answers `print` with an error) so the POS degrades to its
Printer Error view instead of hanging.
