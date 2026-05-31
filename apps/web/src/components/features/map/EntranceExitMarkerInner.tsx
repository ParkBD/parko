'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { EntranceExitMarkerProps, LatLng } from './EntranceExitMarker';

const ENTRANCE_COLOR = '#22c55e'; // green-500
const EXIT_COLOR = '#ef4444';     // red-500

function makeIcon(L: any, type: 'entrance' | 'exit') {
  const color = type === 'entrance' ? ENTRANCE_COLOR : EXIT_COLOR;
  const label = type === 'entrance' ? 'E' : 'X';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.625 14 22 14 22S28 23.625 28 14C28 6.27 21.73 0 14 0z" fill="${color}"/>
      <text x="14" y="18" text-anchor="middle" fill="white" font-size="12" font-weight="bold" font-family="sans-serif">${label}</text>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

export function EntranceExitMarkerInner({ type, points, onAdd, onRemove }: EntranceExitMarkerProps) {
  const map = useMap();
  const markersRef = useRef<any[]>([]);
  const clickHandlerRef = useRef<((e: any) => void) | null>(null);

  // Render markers whenever points change
  useEffect(() => {
    let mounted = true;

    async function render() {
      const L = (await import('leaflet')).default;
      if (!mounted) return;

      // Remove old markers
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];

      const icon = makeIcon(L, type);

      points.forEach((pt, idx) => {
        const marker = L.marker([pt.lat, pt.lng], { icon, draggable: false });
        marker.bindPopup(
          `<div class="text-sm font-medium">${type === 'entrance' ? 'Entrance' : 'Exit'} #${idx + 1}<br/>
           <button id="rm-${type}-${idx}" style="color:red;cursor:pointer;margin-top:4px;">Remove</button></div>`,
        );
        marker.on('popupopen', () => {
          const btn = document.getElementById(`rm-${type}-${idx}`);
          if (btn) btn.onclick = () => { map.closePopup(); onRemove(idx); };
        });
        map.addLayer(marker);
        markersRef.current.push(marker);
      });
    }

    render();

    return () => {
      mounted = false;
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];
    };
  }, [points, type, map, onRemove]);

  // Click-to-place new marker
  useEffect(() => {
    if (clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current);
    }

    const handler = (e: any) => {
      onAdd({ lat: e.latlng.lat, lng: e.latlng.lng });
    };

    clickHandlerRef.current = handler;
    map.on('click', handler);

    return () => {
      map.off('click', handler);
    };
  }, [map, onAdd]);

  return null;
}
