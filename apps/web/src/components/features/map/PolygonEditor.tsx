'use client';

import dynamic from 'next/dynamic';

export interface PolygonEditorProps {
  polygon: Record<string, any> | null;
  onChange: (geojson: Record<string, any>) => void;
  readonly?: boolean;
}

const PolygonEditorInner = dynamic(
  () => import('./PolygonEditorInner').then((m) => m.PolygonEditorInner),
  { ssr: false },
);

export function PolygonEditor(props: PolygonEditorProps) {
  return <PolygonEditorInner {...props} />;
}
