'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { ParkingMapProps } from './ParkingMap';

// Fix Leaflet default icon broken by webpack
function useFixLeafletIcons() {
  useEffect(() => {
    // Dynamically import to avoid SSR issues
    import('leaflet').then((L) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      delete L.default.Icon.Default.prototype._getIconUrl;
      L.default.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    });
  }, []);
}

function MapReadyHandler({ onMapReady }: { onMapReady?: (map: any) => void }) {
  const map = useMap();
  useEffect(() => {
    if (onMapReady) onMapReady(map);
  }, [map, onMapReady]);
  return null;
}

export function ParkingMapInner({
  center,
  zoom = 14,
  children,
  height = '500px',
  onMapReady,
  className = '',
}: ParkingMapProps) {
  useFixLeafletIcons();

  return (
    <div style={{ height }} className={`w-full rounded-lg overflow-hidden ${className}`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onMapReady && <MapReadyHandler onMapReady={onMapReady} />}
        {children}
      </MapContainer>
    </div>
  );
}
