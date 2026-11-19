import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

export interface MapPoint { id: string; lat: number; lng: number; color: string; label: string; onClick?: () => void }
export const MARKER_COLORS = { emergency: '#c8102e', high: '#ea580c', general: '#2563eb', resolved: '#16a34a', pick: '#0f2a44' };

const icon = (color: string) => L.divIcon({
  className: '',
  html: `<svg width="28" height="38" viewBox="0 0 28 38" aria-hidden="true"><path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.3 21.7 0 14 0z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="14" cy="14" r="5" fill="#fff"/></svg>`,
  iconSize: [28, 38], iconAnchor: [14, 38],
});

const NAIROBI: [number, number] = [-1.2864, 36.8172];

/**
 * Leaflet + OpenStreetMap. In "pick" mode the user clicks/taps to choose a location.
 * Keyboard users can choose a location with the search box or "Use my location" instead.
 */
export function MapView({ points = [], picked, onPick, height = 320, center, label = 'Map' }: {
  points?: MapPoint[]; picked?: { lat: number; lng: number } | null; onPick?: (p: { lat: number; lng: number }) => void;
  height?: number; center?: [number, number]; label?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    const m = L.map(el.current!, { zoomControl: true }).setView(center ?? NAIROBI, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors',
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on('click', (e: L.LeafletMouseEvent) => pickRef.current?.({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }));
    map.current = m;
    return () => { m.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const g = layer.current!;
    g.clearLayers();
    const all: L.LatLngExpression[] = [];
    for (const p of points) {
      const mk = L.marker([p.lat, p.lng], { icon: icon(p.color), title: p.label, alt: p.label }).bindTooltip(p.label);
      if (p.onClick) mk.on('click', p.onClick);
      mk.addTo(g); all.push([p.lat, p.lng]);
    }
    if (picked) { L.marker([picked.lat, picked.lng], { icon: icon(MARKER_COLORS.pick), title: 'Selected location' }).addTo(g); all.push([picked.lat, picked.lng]); }
    if (all.length === 1) map.current?.setView(all[0], Math.max(map.current.getZoom(), 15));
    else if (all.length > 1) map.current?.fitBounds(L.latLngBounds(all), { padding: [30, 30], maxZoom: 15 });
  }, [points, picked]);

  return <div ref={el} role="region" aria-label={label} style={{ height }} className="w-full rounded-lg border border-slate-300 overflow-hidden" />;
}

export function MapLegend() {
  const items: [string, string][] = [[MARKER_COLORS.emergency, 'Emergency'], [MARKER_COLORS.high, 'High priority'], [MARKER_COLORS.general, 'General'], [MARKER_COLORS.resolved, 'Resolved']];
  return (
    <ul className="flex flex-wrap gap-3 text-sm text-slate-700" aria-label="Map legend">
      {items.map(([c, l]) => <li key={l} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: c }} aria-hidden="true" />{l}</li>)}
    </ul>
  );
}

export function colorFor(i: { isEmergency: boolean; severity: string; status: string }) {
  if (['resolved', 'closed'].includes(i.status)) return MARKER_COLORS.resolved;
  if (i.isEmergency) return MARKER_COLORS.emergency;
  if (['high', 'critical'].includes(i.severity)) return MARKER_COLORS.high;
  return MARKER_COLORS.general;
}

/** Location search via OpenStreetMap Nominatim (biased to Kenya). */
export function LocationSearch({ onSelect }: { onSelect: (r: { lat: number; lng: number; name: string }) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ lat: string; lon: string; display_name: string }[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'empty'>('idle');
  const search = async () => {
    if (q.trim().length < 3) return;
    setState('loading');
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=ke&q=${encodeURIComponent(q)}`);
      const data = await r.json();
      setResults(data); setState(data.length ? 'idle' : 'empty');
    } catch { setState('error'); }
  };
  return (
    <div className="space-y-2">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); search(); }} role="search">
        <label htmlFor="loc-q" className="sr-only">Search for a place</label>
        <input id="loc-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a place, e.g. Kencom bus stop"
          className="flex-1 rounded-lg border border-slate-400 px-3 min-h-11" />
        <button className="rounded-lg bg-brand-800 text-white px-4 min-h-11 font-semibold">{state === 'loading' ? 'Searching…' : 'Search'}</button>
      </form>
      {state === 'error' && <p className="text-sm text-red-700">Search is unavailable right now. Tap the map or type the location instead.</p>}
      {state === 'empty' && <p className="text-sm text-slate-600">No places found. Try a nearby landmark.</p>}
      {results.length > 0 && (
        <ul className="rounded-lg border border-slate-200 divide-y bg-white">
          {results.map((r) => (
            <li key={r.lat + r.lon}>
              <button type="button" className="w-full text-left px-3 py-2 hover:bg-brand-50 text-sm"
                onClick={() => { onSelect({ lat: +(+r.lat).toFixed(6), lng: +(+r.lon).toFixed(6), name: r.display_name }); setResults([]); }}>
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function getPosition(timeout = 10000): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('This device does not support location.'));
    navigator.geolocation.getCurrentPosition(resolve, (e) => reject(new Error(
      e.code === 1 ? 'Location permission was denied. You can allow it in your browser settings, or choose the place on the map.'
        : e.code === 3 ? 'Getting your location took too long.' : 'Your location is unavailable right now.',
    )), { enableHighAccuracy: true, timeout, maximumAge: 30_000 });
  });
}
