import { useEffect, useRef, useState } from 'react';
import { Button, Input } from './ui';
import { fmtBytes } from '../lib/labels';

export interface EvidenceItem {
  key: string; blob: Blob; name: string; kind: 'photo' | 'video' | 'audio' | 'file';
  captureMethod: 'camera' | 'upload' | 'microphone'; capturedAt?: string; description: string; url: string;
}
const MAX = 100 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,video/webm,audio/*,application/pdf';

function kindOf(type: string): EvidenceItem['kind'] {
  if (type.startsWith('image/')) return 'photo';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  return 'file';
}
function pickRecorderType(kind: 'video' | 'audio') {
  const opts = kind === 'video' ? ['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'] : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  return opts.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ?? '';
}

/**
 * Capture photos, video and audio inside the app, or attach existing files.
 * The camera/microphone are only ever active while this panel shows a live preview or a
 * visible "Recording" indicator, and only after the user taps a button.
 */
export function EvidenceCapture({ items, onChange }: { items: EvidenceItem[]; onChange: (i: EvidenceItem[]) => void }) {
  const [mode, setMode] = useState<null | 'photo' | 'video' | 'audio'>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const add = (blob: Blob, name: string, captureMethod: EvidenceItem['captureMethod'], capturedAt?: string) => {
    if (blob.size > MAX) return setError(`${name} is larger than 100 MB. Trim the video or send a shorter clip.`);
    setError('');
    onChange([...items, { key: crypto.randomUUID(), blob, name, kind: kindOf(blob.type), captureMethod, capturedAt, description: '', url: URL.createObjectURL(blob) }]);
  };
  const remove = (key: string) => {
    const it = items.find((i) => i.key === key);
    if (it) URL.revokeObjectURL(it.url);
    onChange(items.filter((i) => i.key !== key));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button type="button" variant="secondary" onClick={() => setMode('photo')}>📷 Take photo</Button>
        <Button type="button" variant="secondary" onClick={() => setMode('video')}>🎥 Record video</Button>
        <Button type="button" variant="secondary" onClick={() => setMode('audio')}>🎙️ Record audio</Button>
        <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>📎 Upload file</Button>
        <input ref={fileRef} type="file" accept={ACCEPT} multiple className="sr-only" tabIndex={-1} aria-hidden="true"
          onChange={(e) => { for (const f of Array.from(e.target.files ?? [])) add(f, f.name, 'upload'); e.target.value = ''; }} />
      </div>
      {error && <p role="alert" className="text-sm font-medium text-red-700">⚠ {error}</p>}
      {mode && <Recorder mode={mode} onClose={() => setMode(null)} onCapture={(b, n, m) => { add(b, n, m, new Date().toISOString()); setMode(null); }} onError={setError} />}

      {items.length > 0 && (
        <ul className="space-y-3" aria-label="Evidence to submit">
          {items.map((it) => (
            <li key={it.key} className="flex gap-3 rounded-lg border border-slate-200 p-3 bg-slate-50">
              <div className="w-24 shrink-0">
                {it.kind === 'photo' && <img src={it.url} alt={`Preview of ${it.name}`} className="w-24 h-24 object-cover rounded" />}
                {it.kind === 'video' && <video src={it.url} controls className="w-24 h-24 object-cover rounded bg-black" aria-label={`Preview of ${it.name}`} />}
                {it.kind === 'audio' && <span className="flex w-24 h-24 items-center justify-center rounded bg-white text-3xl" aria-hidden="true">🎙️</span>}
                {it.kind === 'file' && <span className="flex w-24 h-24 items-center justify-center rounded bg-white text-3xl" aria-hidden="true">📄</span>}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-sm font-medium truncate">{it.name} <span className="text-slate-500 font-normal">· {fmtBytes(it.blob.size)}</span></p>
                {it.kind === 'audio' && <audio src={it.url} controls className="w-full" />}
                <label className="sr-only" htmlFor={`d-${it.key}`}>Description for {it.name}</label>
                <Input id={`d-${it.key}`} placeholder="What does this show? (optional)" value={it.description} maxLength={1000}
                  onChange={(e) => onChange(items.map((x) => (x.key === it.key ? { ...x, description: e.target.value } : x)))} />
                <button type="button" onClick={() => remove(it.key)} className="text-sm font-semibold text-red-700 underline">Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-slate-600">Your files are uploaded exactly as captured. A fingerprint (SHA-256 hash) is recorded so any later change can be detected.</p>
    </div>
  );
}

function Recorder({ mode, onClose, onCapture, onError }: {
  mode: 'photo' | 'video' | 'audio'; onClose: () => void;
  onCapture: (b: Blob, name: string, method: EvidenceItem['captureMethod']) => void; onError: (m: string) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia(mode === 'audio' ? { audio: true } :
          { video: { facingMode: facing, width: { ideal: 1920 } }, audio: mode === 'video' });
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}); }
        setReady(true);
      } catch (e) {
        onError((e as Error).name === 'NotAllowedError'
          ? `Permission to use the ${mode === 'audio' ? 'microphone' : 'camera'} was denied. Allow it in your browser settings, or upload a file instead.`
          : `Could not start the ${mode === 'audio' ? 'microphone' : 'camera'} on this device. You can upload a file instead.`);
        onClose();
      }
    })();
    return () => { cancelled = true; stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, facing]);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
  const snap = () => {
    const v = video.current!;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    c.toBlob((b) => b && onCapture(b, `photo-${stamp()}.jpg`, 'camera'), 'image/jpeg', 0.95);
  };
  const start = () => {
    const type = pickRecorderType(mode as 'video' | 'audio');
    const r = new MediaRecorder(stream.current!, type ? { mimeType: type } : undefined);
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = () => {
      const blob = new Blob(chunks, { type: r.mimeType });
      const ext = r.mimeType.includes('mp4') ? (mode === 'audio' ? 'm4a' : 'mp4') : r.mimeType.includes('ogg') ? 'ogg' : 'webm';
      onCapture(blob, `${mode}-${stamp()}.${ext}`, mode === 'audio' ? 'microphone' : 'camera');
    };
    r.start(1000); rec.current = r; setSeconds(0); setRecording(true);
  };
  const stop = () => { rec.current?.stop(); setRecording(false); };

  return (
    <div className="rounded-xl border-2 border-brand-800 bg-slate-900 p-3 space-y-3 text-white" role="dialog" aria-label={`${mode} capture`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />
          {mode === 'audio' ? 'Microphone on' : 'Camera on'}{recording && ` · Recording ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`}
        </span>
        {mode !== 'audio' && !recording && (
          <button type="button" className="underline" onClick={() => { setReady(false); setFacing((f) => (f === 'user' ? 'environment' : 'user')); }}>Switch camera</button>
        )}
      </div>
      {mode !== 'audio'
        ? <video ref={video} playsInline muted className="w-full max-h-[60vh] rounded bg-black" aria-label="Camera preview" />
        : <p className="py-8 text-center text-lg">{recording ? 'Recording audio…' : 'Ready to record audio'}</p>}
      <div className="flex flex-wrap gap-2">
        {mode === 'photo' && <Button type="button" onClick={snap} disabled={!ready}>Capture photo</Button>}
        {mode !== 'photo' && !recording && <Button type="button" variant="danger" onClick={start} disabled={!ready}>● Start recording</Button>}
        {mode !== 'photo' && recording && <Button type="button" onClick={stop}>■ Stop & keep</Button>}
        <Button type="button" variant="secondary" onClick={() => { if (recording) { rec.current!.onstop = null; rec.current!.stop(); } onClose(); }}>Cancel</Button>
      </div>
    </div>
  );
}
