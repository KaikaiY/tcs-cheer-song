import type { Style } from "./types";

type CallOptions = { style: Style; phase: "interview" | "waiting"; nickname?: string };
type RealtimeCall = {
  connection: RTCPeerConnection;
  channel: RTCDataChannel;
  stream: MediaStream;
  maxSeconds: number;
  close: () => void;
};

export async function connectRealtimeCall(options: CallOptions, signal: AbortSignal): Promise<RealtimeCall> {
  let stream: MediaStream | undefined;
  let connection: RTCPeerConnection | undefined;
  const close = () => {
    connection?.close();
    stream?.getTracks().forEach((track) => track.stop());
  };
  signal.addEventListener("abort", close, { once: true });
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    signal.throwIfAborted();
    const response = await fetch("/api/realtime-session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options), signal,
    });
    if (!response.ok) throw new Error("通話につながりませんでした。");
    const { clientSecret, maxSeconds } = await response.json() as { clientSecret: string; maxSeconds: number };
    signal.throwIfAborted();
    connection = new RTCPeerConnection();
    const channel = connection.createDataChannel("oai-events");
    for (const track of stream.getTracks()) {
      track.enabled = false;
      connection.addTrack(track, stream);
    }
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    const answer = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST", headers: { Authorization: `Bearer ${clientSecret}`, "Content-Type": "application/sdp" },
      body: offer.sdp, signal,
    });
    if (!answer.ok) throw new Error("通話につながりませんでした。");
    await connection.setRemoteDescription({ type: "answer", sdp: await answer.text() });
    signal.throwIfAborted();
    if (channel.readyState !== "open") {
      await new Promise<void>((resolve, reject) => {
        channel.addEventListener("open", () => resolve(), { once: true, signal });
        channel.addEventListener("close", () => reject(new Error("通話が切れました。")), { once: true, signal });
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    }
    signal.throwIfAborted();
    return { connection, channel, stream, maxSeconds, close };
  } catch (error) {
    close();
    throw error;
  } finally {
    signal.removeEventListener("abort", close);
  }
}

let pending: { call: RealtimeCall; timer: number } | undefined;

export function handOffRealtimeCall(call: RealtimeCall) {
  takeRealtimeCall()?.close();
  pending = { call, timer: window.setTimeout(() => takeRealtimeCall()?.close(), 15_000) };
}

export function takeRealtimeCall() {
  if (!pending) return;
  const { call, timer } = pending;
  pending = undefined;
  window.clearTimeout(timer);
  return call;
}
