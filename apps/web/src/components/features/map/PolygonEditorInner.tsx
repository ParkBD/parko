'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { PolygonEditorProps } from './PolygonEditor';

export function PolygonEditorInner({ polygon, onChange, readonly = false }: PolygonEditorProps) {
  const map = useMap();
  const layerRef = useRef<any>(null);
  const editControlRef = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);

  useEffect(() => {
    if (!polygon) return;

    let mounted = true;

    async function init() {
      const L = (await import('leaflet')).default;
      await import('leaflet-draw');
      await import('leaflet-draw/dist/leaflet.draw.css');

      if (!mounted) return;

      // Clean up previous layers
      if (drawnItemsRef.current) {
        map.removeLayer(drawnItemsRef.current);
      }
      if (editControlRef.current) {
        map.removeControl(editControlRef.current);
        editControlRef.current = null;
      }

      drawnItemsRef.current = new L.FeatureGroup();
      map.addLayer(drawnItemsRef.current);

      // Convert GeoJSON coords ([lng, lat]) to Leaflet LatLngs ([lat, lng])
      const rawCoords: number[][] = polygon.coordinates?.[0] ?? [];
      const latLngs = rawCoords.map((c: number[]) => L.latLng(c[1], c[0]));

      layerRef.current = L.polygon(latLngs, {
        color: '#6366f1',
        fillOpacity: 0.2,
      });
      drawnItemsRef.current.addLayer(layerRef.current);

      // Fit map to polygon bounds
      const bounds = layerRef.current.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });

      if (!readonly) {
        editControlRef.current = new (L as any).Control.Draw({
          draw: false,
          edit: {
            featureGroup: drawnItemsRef.current,
          },
        });
        map.addControl(editControlRef.current);

        map.on((L as any).Draw.Event.EDITED, (e: any) => {
          const layers = e.layers;
          layers.eachLayer((layer: any) => {
            const latlngs: any[] = layer.getLatLngs()[0];
            const coords = latlngs.map((ll: any) => [ll.lng, ll.lat]);
            coords.push(coords[0]);
            onChange({ type: 'Polygon', coordinates: [coords] });
          });
        });
      }
    }

    init();

    return () => {
      mounted = false;
      if (drawnItemsRef.current) {
        map.removeLayer(drawnItemsRef.current);
        drawnItemsRef.current = null;
      }
      if (editControlRef.current) {
        map.removeControl(editControlRef.current);
        editControlRef.current = null;
      }
    };
  }, [polygon, map, readonly, onChange]);

  return null;
}
