'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// We re-export as dynamic from this file so consumers don't need to think about it.
// Internal implementation lives in ParkingMapInner.

export interface MapCenter {
  lat: number;
  lng: number;
}

export interface ParkingMapProps {
  center: MapCenter;
  zoom?: number;
  children?: React.ReactNode;
  height?: string;
  onMapReady?: (map: any) => void;
  className?: string;
}

// Dynamic import of the actual Leaflet-dependent component (ssr: false)
const ParkingMapInner = dynamic(
  () => import('./ParkingMapInner').then((m) => m.ParkingMapInner),
  { ssr: false, loading: () => <div style={{ height: '100%' }} className="bg-gray-100 animate-pulse rounded-lg" /> },
);

export function ParkingMap(props: ParkingMapProps) {
  return <ParkingMapInner {...props} />;
}
