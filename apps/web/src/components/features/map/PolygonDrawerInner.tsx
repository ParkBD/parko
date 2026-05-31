'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { PolygonDrawerProps } from './PolygonDrawer';

export function PolygonDrawerInner({ onPolygonComplete, isActive }: PolygonDrawerProps) {
  const map = useMap();
  const drawControlRef = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);

  useEffect(() => {
    let L: any;
    let mounted = true;

    async function init() {
      L = (await import('leaflet')).default;
      await import('leaflet-draw');

      if (!mounted) return;

      // Inject leaflet-draw CSS via link tag
      if (!document.getElementById('leaflet-draw-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-draw-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css';
        document.head.appendChild(link);
      }

      drawnItemsRef.current = new L.FeatureGroup();
      map.addLayer(drawnItemsRef.current);
    }

    init();

    return () => {
      mounted = false;
      if (drawnItemsRef.current) {
        map.removeLayer(drawnItemsRef.current);
      }
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
        drawControlRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    let L: any;
    let mounted = true;

    async function toggleDraw() {
      L = (await import('leaflet')).default;
      await import('leaflet-draw');

      if (!mounted || !drawnItemsRef.current) return;

      if (isActive) {
        if (!drawControlRef.current) {
          drawControlRef.current = new (L as any).Control.Draw({
            draw: {
              polygon: {
                allowIntersection: false,
                showArea: true,
                shapeOptions: { color: '#6366f1', fillOpacity: 0.2 },
              },
              polyline: false,
              rectangle: false,
              circle: false,
              marker: false,
              circlemarker: false,
            },
            edit: {
              featureGroup: drawnItemsRef.current,
            },
          });
          map.addControl(drawControlRef.current);
        }

        const onDrawCreated = (e: any) => {
          const { layer } = e;
          const latLngs: any[] = layer.getLatLngs()[0];

          if (latLngs.length < 3) {
            alert('Polygon requires at least 3 points');
            return;
          }

          drawnItemsRef.current.clearLayers();
          drawnItemsRef.current.addLayer(layer);

          // GeoJSON uses [lng, lat], Leaflet uses [lat, lng]
          const coords = latLngs.map((ll: any) => [ll.lng, ll.lat]);
          // Close the ring
          coords.push(coords[0]);

          const geojson = { type: 'Polygon', coordinates: [coords] };
          onPolygonComplete(geojson);
        };

        map.on((L as any).Draw.Event.CREATED, onDrawCreated);

        return () => {
          map.off((L as any).Draw.Event.CREATED, onDrawCreated);
        };
      } else {
        if (drawControlRef.current) {
          map.removeControl(drawControlRef.current);
          drawControlRef.current = null;
        }
      }
    }

    toggleDraw();

    return () => {
      mounted = false;
    };
  }, [isActive, map, onPolygonComplete]);

  return null;
}
