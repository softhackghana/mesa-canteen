/**
 * POS receipt/coupon printer client (FR-RCP-001/005/006).
 *
 * Talks to a local ESC/POS printing bridge over WebSocket (same host model as
 * the biometric bridge) so the browser never needs vendor drivers. The bridge
 * reports status: online | paper_out | cover_open | error.
 *
 * ponytail: the full ESC/POS layout engine lives in the receipt-template worker
 * (lib/receipts). Here we only need the transport + status surface.
 */

export type PrinterStatus = "online" | "paper_out" | "cover_open" | "error" | "offline";

export interface PrintJob {
  type: "coupon";
  receiptTemplate: string; // rendered ESC/POS bytes as base64
  transactionId: string;
  reprint?: boolean;
}

export type PrinterStatusListener = (status: PrinterStatus) => void;

const BRIDGE_URL = "ws://127.0.0.1:8766";

export class PrinterClient {
  private socket: WebSocket | null = null;
  private status: PrinterStatus = "offline";
  private listeners = new Set<PrinterStatusListener>();

  initialize(): void {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) return;
    try {
      const ws = new WebSocket(BRIDGE_URL);
      this.socket = ws;
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "status" }));
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data));
          if (msg.type === "status" && typeof msg.status === "string") {
            this.setStatus(normalizeStatus(msg.status));
          } else if (msg.type === "error") {
            this.setStatus("error");
          }
        } catch {
          // ignore malformed frames; keep last known status
        }
      };
      ws.onerror = () => this.setStatus("offline");
      ws.onclose = () => this.setStatus("offline");
      // Probe once after connect; if the bridge is absent we stay "offline".
      setTimeout(() => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: "status" }));
        }
      }, 250);
    } catch {
      this.setStatus("offline");
    }
  }

  private setStatus(next: PrinterStatus): void {
    if (this.status === next) return;
    this.status = next;
    this.listeners.forEach((fn) => fn(next));
  }

  onStatus(fn: PrinterStatusListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  get statusValue(): PrinterStatus {
    return this.status;
  }

  /** Fire-and-forget print. Resolves { ok } or { ok: false, reason }. */
  async print(job: PrintJob): Promise<{ ok: boolean; reason?: string }> {
    const ws = this.socket;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return { ok: false, reason: "Printer bridge unreachable." };
    }
    return new Promise((resolve) => {
      const id = Math.floor(Math.random() * 1e9);
      const onMsg = (ev: MessageEvent) => {
        let msg: { id?: number; type?: string; error?: string };
        try {
          msg = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        if (msg.id !== id) return;
        ws.removeEventListener("message", onMsg);
        if (msg.type === "printed") {
          resolve({ ok: true });
        } else {
          resolve({ ok: false, reason: msg.error ?? "Print failed." });
        }
      };
      ws.addEventListener("message", onMsg);
      ws.send(JSON.stringify({ type: "print", id, receiptTemplate: job.receiptTemplate, transactionId: job.transactionId, reprint: job.reprint ?? false }));
    });
  }
}

function normalizeStatus(s: string): PrinterStatus {
  if (s === "online" || s === "paper_out" || s === "cover_open" || s === "error") return s;
  return "offline";
}

/** Singleton shared by the POS store. */
export const printerClient = new PrinterClient();
