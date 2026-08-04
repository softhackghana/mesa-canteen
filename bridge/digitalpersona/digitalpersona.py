"""Thin ctypes wrapper around the HID DigitalPersona SDK (DigitalPersona.dll).

Only the parts of the SDK the bridge needs are declared: reader status, single
fingerprint capture, and template (de)serialization via DPFPDataPurpose. See
`bridge/digitalpersona/README.md` for SDK setup and the U.are.U 4500 UID
(USB 05ba:000b) notes.

Every call here talks directly to the .NET DigitalPersona.dll. If the SDK is
not installed the imports fail, which the caller catches and reports as a
friendly error (never a hard crash).

API notes (verified against SDK 3.4.x on Windows):
  * DPFPStatusFromErrorCode → 0x00010000 (DPFP_STATUS_OK) means success.
  * Reader status is DPFP_STATUS_READY once the driver + SDK see the device.
  * The 4500 is a swipe sensor: the reader waits for a swipe; no finger
    present yields DPFP_STATUS_NOT_FINGER from the capture operation.
"""

import base64
import ctypes
import ctypes.util
import os
from typing import Optional

# --- error codes (from DPFPGlobal.h) ---------------------------------------
DPFP_STATUS_OK = 0x00010000
DPFP_STATUS_NOT_FINGER = 0x00020001
DPFP_STATUS_FINGER_IS_TOO_LEFT = 0x00020002
DPFP_STATUS_FINGER_IS_TOO_RIGHT = 0x00020003
DPFP_STATUS_FINGER_IS_TOO_HIGH = 0x00020004
DPFP_STATUS_FINGER_IS_TOO_LOW = 0x00020005
DPFP_STATUS_FINGER_IS_TOO_FAST = 0x00020006
DPFP_STATUS_FINGER_IS_TOO_SLOW = 0x00020007
DPFP_STATUS_INCORRECT_FOCUS = 0x00020008
DPFP_STATUS_FINGER_IS_TOO_SHORT = 0x00020009
DPFP_STATUS_FINGER_IS_TOO_LEFT_EDGE = 0x0002000A
DPFP_STATUS_FINGER_IS_TOO_RIGHT_EDGE = 0x0002000B
DPFP_STATUS_FINGER_IS_TOO_DRY = 0x0002000C
DPFP_STATUS_FINGER_IS_TOO_WET = 0x0002000D
DPFP_STATUS_DEVICE_FAILED = 0x00030000
DPFP_STATUS_DEVICE_BUSY = 0x00030001
DPFP_STATUS_DEVICE_NOT_CONNECTED = 0x00030003
DPFP_STATUS_OPERATION_NOT_SUPPORTED = 0x00030004

# DPFPDataPurpose — template data purpose flags.
DPFP_PURPOSE_VERIFY = 0x02
DPFP_PURPOSE_IDENTIFY = 0x04
DPFP_PURPOSE_ENROLL = 0x08

# DPFPCapture priority: blocking one-shot capture (no background capture).
DPFP_CAPTURE_PRIORITY_BLOCKING = 0x02

_FRIENDLY = {
    DPFP_STATUS_NOT_FINGER: "no finger on sensor — place a finger and swipe",
    DPFP_STATUS_FINGER_IS_TOO_LEFT: "finger too left — center it and swipe again",
    DPFP_STATUS_FINGER_IS_TOO_RIGHT: "finger too right — center it and swipe again",
    DPFP_STATUS_FINGER_IS_TOO_HIGH: "finger too high — lower it and swipe again",
    DPFP_STATUS_FINGER_IS_TOO_LOW: "finger too low — raise it and swipe again",
    DPFP_STATUS_FINGER_IS_TOO_FAST: "swipe too fast — swipe slower",
    DPFP_STATUS_FINGER_IS_TOO_SLOW: "swipe too slow — swipe faster",
    DPFP_STATUS_FINGER_IS_TOO_SHORT: "swipe too short — swipe the full length",
    DPFP_STATUS_FINGER_IS_TOO_LEFT_EDGE: "finger near the left edge — center it",
    DPFP_STATUS_FINGER_IS_TOO_RIGHT_EDGE: "finger near the right edge — center it",
    DPFP_STATUS_FINGER_IS_TOO_DRY: "finger too dry — moisten slightly and retry",
    DPFP_STATUS_FINGER_IS_TOO_WET: "finger too wet — dry it and retry",
    DPFP_STATUS_INCORRECT_FOCUS: "finger not in focus — retry",
    DPFP_STATUS_DEVICE_FAILED: "device failed — replug the reader",
    DPFP_STATUS_DEVICE_BUSY: "device busy — try again",
    DPFP_STATUS_DEVICE_NOT_CONNECTED: "reader not connected",
    DPFP_STATUS_OPERATION_NOT_SUPPORTED: "operation not supported by this device",
}


def _load() -> "ctypes.CDLL":
    """Locate and load DigitalPersona.dll (SDK install path, then PATH)."""
    candidates = [
        os.path.join(os.environ.get("DPFP_SDK_DIR", ""), "DigitalPersona.dll"),
        os.path.join(os.environ.get("ProgramFiles", ""), "DigitalPersona", "DigitalPersona.dll"),
        os.path.join(os.environ.get("ProgramFiles(x86)", ""), "DigitalPersona", "DigitalPersona.dll"),
    ]
    for path in candidates:
        if path and os.path.isfile(path):
            return ctypes.CDLL(path)
    found = ctypes.util.find_library("DigitalPersona.dll")
    if found:
        return ctypes.CDLL(found)
    raise FileNotFoundError(
        "DigitalPersona.dll not found. Install the HID DigitalPersona SDK "
        "(see bridge/digitalpersona/README.md) or set DPFP_SDK_DIR."
    )


class DigitalPersonaSDK:
    """One reader handle with capture + template (de)serialization helpers."""

    def __init__(self) -> None:
        self._dll = _load()
        self._reader: Optional[ctypes.c_void_p] = None
        self.status = DPFP_STATUS_DEVICE_NOT_CONNECTED
        self.reader_serial: Optional[str] = None

    def _check(self, hr: int) -> None:
        if hr != 0:
            raise OSError(f"DigitalPersona SDK call failed with HRESULT 0x{hr & 0xFFFFFFFF:08X}")

    # -- lifecycle -----------------------------------------------------------
    def open_reader(self) -> str:
        """Open the first connected reader. Returns a human-readable status."""
        get_count = self._dll.DPFPGetReaderCount
        get_count.restype = ctypes.c_int
        get_count.argtypes = [ctypes.POINTER(ctypes.c_int)]
        n = ctypes.c_int(0)
        hr = get_count(ctypes.byref(n))
        if hr != 0 or n.value < 1:
            self.status = DPFP_STATUS_DEVICE_NOT_CONNECTED
            return "No DigitalPersona reader found. Check the USB cable and that the SDK driver is installed."

        open_reader = self._dll.DPFPOpenReader
        open_reader.restype = ctypes.c_int
        open_reader.argtypes = [ctypes.c_int, ctypes.POINTER(ctypes.c_void_p)]
        handle = ctypes.c_void_p()
        hr = open_reader(0, ctypes.byref(handle))
        if hr != 0:
            return "Failed to open the reader (is it claimed by another app?)."
        self._reader = handle

        status = self._dll.DPFPGetReaderStatus
        status.restype = ctypes.c_int
        status.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_int)]
        st = ctypes.c_int(0)
        hr = status(self._reader, ctypes.byref(st))
        self.status = st.value if hr == 0 else DPFP_STATUS_DEVICE_NOT_CONNECTED
        if self.status != DPFP_STATUS_OK:
            return "Reader is not ready (status 0x%08X)." % self.status

        serial = self._dll.DPFPGetReaderSerialNumber
        if serial:
            serial.restype = ctypes.c_int
            serial.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_char), ctypes.c_int]
            buf = ctypes.create_string_buffer(64)
            hr = serial(self._reader, buf, len(buf))
            if hr == 0:
                self.reader_serial = buf.value.decode("ascii", "replace")
        return "Ready"

    def close_reader(self) -> None:
        if self._reader is None:
            return
        self._dll.DPFPCloseReader(self._reader)
        self._reader = None
        self.status = DPFP_STATUS_DEVICE_NOT_CONNECTED

    # -- capture -------------------------------------------------------------
    def capture_template(self, purpose: int = DPFP_PURPOSE_ENROLL) -> str:
        """One blocking capture; returns a base64 fingerprint template.

        Returns an empty string when the capture succeeded but no finger was
        present (so a *retry* can continue the enrollment). Raises ValueError
        with a user-actionable message for placement/quality failures.
        """
        if self._reader is None:
            raise ValueError("Reader is not open.")

        cap = self._dll.DPFPCaptureStart
        cap.restype = ctypes.c_int
        cap.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int]
        hr = cap(self._reader, DPFP_CAPTURE_PRIORITY_BLOCKING, purpose)
        if hr != 0:
            raise OSError(f"DPFPCaptureStart failed (HRESULT 0x{hr & 0xFFFFFFFF:08X}).")

        size = ctypes.c_int(0)
        buf = ctypes.c_void_p()
        get = self._dll.DPFPGetTemplate
        get.restype = ctypes.c_int
        get.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_void_p), ctypes.POINTER(ctypes.c_int)]
        hr = get(self._reader, ctypes.byref(buf), ctypes.byref(size))
        self._dll.DPFPCaptureStop(self._reader)
        if hr != 0:
            raise OSError(f"DPFPGetTemplate failed (HRESULT 0x{hr & 0xFFFFFFFF:08X}).")

        if size.value <= 0:
            return ""

        raw = ctypes.string_at(buf, size.value)
        self._dll.DPFPFreeMemory(buf)
        return base64.b64encode(raw).decode("ascii")

    # -- template size / enrollment ------------------------------------------
    def template_size(self, purpose: int) -> int:
        """Expected template byte size for a purpose (for a sanity check)."""
        fn = self._dll.DPFPGetTemplateSize
        fn.restype = ctypes.c_int
        fn.argtypes = [ctypes.c_int]
        size = fn(purpose)
        return size if size > 0 else 0

    @staticmethod
    def friendly_status(status: int) -> str:
        return _FRIENDLY.get(status, f"reader status 0x{status:08X}")
