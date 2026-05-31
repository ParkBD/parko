'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { RadiusSearchProps } from './RadiusSearch';

export function RadiusSearchInner({ center, radiusMeters, onCenterChange }: RadiusSearchProps) {
  const map = useMap();
  const circleRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const L = (await import('leaflet')).default;
      if (!mounted) return;

      // Remove previous layers
      if (circleRef.current) map.removeLayer(circleRef.current);
      if (markerRef.current) map.removeLayer(markerRef.current);

      // Draw the radius circle
      circleRef.current = L.circle([center.lat, center.lng], {
        radius: radiusMeters,
        color: '#6366f1',
        fillColor: '#6366f1',
        fillOpacity: 0.1,
        weight: 2,
        dashArray: '6 4',
      });
      map.addLayer(circleRef.current);

      // Center marker (draggable)
      const markerIcon = L.divIcon({
        html: `<div style="
          width:20px;height:20px;border-radius:50%;
          background:#6366f1;border:3px solid white;
          box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:move;
        "></div>`,
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      markerRef.current = L.marker([center.lat, center.lng], {
        icon: markerIcon,
        draggable: true,
      });
      markerRef.current.on('dragend', (e: any) => {
        const ll = e.target.getLatLng();
        onCenterChange({ lat: ll.lat, lng: ll.lng });
      });
      map.addLayer(markerRef.current);

      // Pan map to center
      map.panTo([center.lat, center.lng]);
    }

    init();

    return () => {
      mounted = false;
      if (circleRef.current) { map.removeLayer(circleRef.current); circleRef.current = null; }
      if (markerRef.current) { map.removeLayer(markerRef.current); markerRef.current = null; }
    };
  }, [center.lat, center.lng, radiusMeters, map, onCenterChange]);

  return null;
}
