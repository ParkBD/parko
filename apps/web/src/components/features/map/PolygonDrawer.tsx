'use client';

import dynamic from 'next/dynamic';

export interface PolygonDrawerProps {
  onPolygonComplete: (geojson: Record<string, any>) => void;
  isActive: boolean;
}

const PolygonDrawerInner = dynamic(
  () => import('./PolygonDrawerInner').then((m) => m.PolygonDrawerInner),
  { ssr: false },
);

export function PolygonDrawer(props: PolygonDrawerProps) {
  return <PolygonDrawerInner {...props} />;
}
