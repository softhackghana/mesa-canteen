import type { IBiometricAdapter, BiometricResult } from "./types";

/**
 * DigitalPersona adapter — real USB integration through a local WebSocket
 * bridge (PRD risk #7, FR-IM-007). The bridge is a native helper that owns the
 * USB device (vendor SDK is browser-hostile) and speaks the JSON protocol
 * below.
 *
 * Protocol (client → bridge):
 *   { type: "hello" }                       — on connect, bridge replies "ready"
 *   { type: "capture" }                     — single fingerprint capture
 *   { type: "identify", template }          — 1:N match against bridge-side store
 *   { type: "enroll", template, identityId }— upsert template (future enrollment)
 *
 * Bridge → client:
 *   { type: "ready" } | { type: "error", message }
 *   { type: "captured", template }          — binary-safe base64 template
 *   { type: "identified", identityId, score }
 *   { type: "no_match" }
 *
 * Fail-soft: if the bridge is unreachable, initialize() resolves with an error
 * string (never throws) so the caller falls back to the simulator.
 */
export class DigitalPersonaAdapter implements IBiometricAdapter {
  readonly metadata = { vendor: "DigitalPersona", model: "U.are.U 4500", hardware: true };

  private readonly url: string;
  private socket: WebSocket | null = null;
  private ready = false;
  private error: string | null = null;
  private seq = 0;
  private pending = new Map<number, (msg: Record<string, unknown>) => void>();
  private closed = false;

  constructor(url = "ws://127.0.0.1:8765") {
    this.url = url;
  }

  initialize(): Promise<void | string> {
    if (this.ready) return Promise.resolve();
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.error = "DigitalPersona bridge unreachable (ws://127.0.0.1:8765). Falling back to simulator.";
        this.cleanup();
        resolve(this.error);
      }, 1500);

      const onOpen = () => {
        clearTimeout(timeout);
        this.ready = true;
        this.error = null;
        resolve();
      };

      const onMessage = (ev: MessageEvent) => {
        let msg: unknown;
        try {
          msg = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        this.handleMessage(msg as Record<string, unknown>);
      };

      const onError = () => {
        clearTimeout(timeout);
        this.error = "DigitalPersona bridge unreachable (ws://127.0.0.1:8765). Falling back to simulator.";
        this.cleanup();
        resolve(this.error);
      };

      const onClose = () => {
        clearTimeout(timeout);
        if (!this.closed) {
          this.error = "DigitalPersona bridge connection closed.";
        }
        this.cleanup();
        resolve(this.error ?? undefined);
      };

      this.cleanup();
      this.closed = false;
      this.socket = new WebSocket(this.url);
      this.socket.addEventListener("open", onOpen);
      this.socket.addEventListener("message", onMessage);
      this.socket.addEventListener("error", onError);
      this.socket.addEventListener("close", onClose);
    });
  }

  private handleMessage(msg: Record<string, unknown>): void {
    if (typeof msg.id === "number") {
      const waiter = this.pending.get(msg.id);
      if (waiter) {
        this.pending.delete(msg.id);
        waiter(msg);
      }
      return;
    }
    // Unsolicited push (e.g. "ready" or hardware events) — ignored; the POS
    // drives capture explicitly so no UI state is mutated off-band.
  }

  private request(type: string, extra: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        reject(new Error("DigitalPersona bridge not connected."));
        return;
      }
      const id = this.seq++;
      this.pending.set(id, resolve as (msg: Record<string, unknown>) => void);
      const payload = { type, id, ...extra };
      try {
        this.socket.send(JSON.stringify(payload));
      } catch (err) {
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  /**
   * Capture a fingerprint and identify it 1:N against the bridge template
   * store. Returns match / no_match; resolves with an error string instead of
   * throwing on any transport failure.
   */
  async identify(): Promise<BiometricResult> {
    if (!this.ready) {
      const err = await this.initialize();
      if (err) return { match: null, error: err };
    }
    try {
      const cap = await this.request("capture");
      if (cap.type === "error") {
        return { match: null, error: String(cap.message ?? "Capture failed.") };
      }
      const template = cap.template as string;
      const idn = await this.request("identify", { template });
      if (idn.type === "identified") {
        return {
          match: { identityId: String(idn.identityId), score: Number(idn.score ?? 0) },
        };
      }
      return { match: null, noMatch: true };
    } catch (err) {
      return { match: null, error: err instanceof Error ? err.message : "Bridge communication error." };
    }
  }

  /** Alias of identify(): satisfies IBiometricAdapter. */
  async capture(): Promise<BiometricResult> {
    return this.identify();
  }

  async close(): Promise<void> {
    this.closed = true;
    this.cleanup();
  }

  private cleanup(): void {
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // already closed
      }
      this.socket = null;
    }
    this.pending.clear();
    this.ready = false;
  }
}
