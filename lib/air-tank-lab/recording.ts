export type RecordState = "unsupported" | "idle" | "recording" | "error";

export function createRecorder(canvas: HTMLCanvasElement, onState: (state: RecordState) => void) {
  const mime = typeof MediaRecorder === "undefined" ? undefined : ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find(t => MediaRecorder.isTypeSupported(t));
  let recorder: MediaRecorder | undefined;
  let stream: MediaStream | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let revokeTimer: ReturnType<typeof setTimeout> | undefined;
  let objectUrl: string | undefined;
  let disposed = false;
  const stopTracks = () => { stream?.getTracks().forEach(t => t.stop()); stream = undefined; };
  const supported = Boolean(mime) && typeof canvas.captureStream === "function";
  onState(supported ? "idle" : "unsupported");
  return {
    start() {
      if (!supported || !mime || disposed || recorder?.state === "recording") return;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      clearTimeout(revokeTimer);
      try {
        stream = canvas.captureStream(30);
        recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
        const chunks: BlobPart[] = [];
        recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
        recorder.onerror = () => {
          clearTimeout(timeout);
          if (recorder) { recorder.onstop = null; recorder.ondataavailable = null; if (recorder.state !== "inactive") recorder.stop(); }
          stopTracks(); if (!disposed) onState("error");
        };
        recorder.onstop = () => {
          clearTimeout(timeout); stopTracks();
          if (disposed) return;
          if (!chunks.length) { onState("error"); return; }
          objectUrl = URL.createObjectURL(new Blob(chunks, { type: mime }));
          const anchor = document.createElement("a"); anchor.href = objectUrl; anchor.download = `air-tank-${Date.now()}.webm`; anchor.click();
          revokeTimer = setTimeout(() => { if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = undefined; }, 30_000);
          onState("idle");
        };
        recorder.start(); onState("recording");
        timeout = setTimeout(() => { if (recorder?.state === "recording") recorder.stop(); }, 6000);
      } catch { stopTracks(); onState("error"); }
    },
    cancel() {
      clearTimeout(timeout);
      if (recorder) { recorder.onstop = null; recorder.ondataavailable = null; recorder.onerror = null; if (recorder.state !== "inactive") recorder.stop(); }
      stopTracks(); if (!disposed) onState(supported ? "idle" : "unsupported");
    },
    dispose() { disposed = true; this.cancel(); clearTimeout(revokeTimer); if (objectUrl) URL.revokeObjectURL(objectUrl); },
  };
}
