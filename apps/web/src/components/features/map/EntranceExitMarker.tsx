'use client';

import dynamic from 'next/dynamic';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface EntranceExitMarkerProps {
  type: 'entrance' | 'exit';
  points: LatLng[];
  onAdd: (point: LatLng) => void;
  onRemove: (index: number) => void;
}

const EntranceExitMarkerInner = dynamic(
  () => import('./EntranceExitMarkerInner').then((m) => m.EntranceExitMarkerInner),
  { ssr: false },
);

export function EntranceExitMarker(props: EntranceExitMarkerProps) {
  return <EntranceExitMarkerInner {...props} />;
}
