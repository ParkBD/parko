'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { ParkingLotOverlayProps, LotOverlayItem } from './ParkingLotOverlay';

function getColor(lot: LotOverlayItem) {
  if (!lot.isOpen) return '#6b7280'; // gray — closed
  const ratio = lot.totalSlots > 0 ? lot.availableSlots / lot.totalSlots : 0;
  if (ratio > 0.5) return '#22c55e'; // green — available
  if (ratio > 0.1) return '#f59e0b'; // yellow — limited
  return '#ef4444';                  // red — full
}

export function ParkingLotOverlayInner({ lots, onLotClick }: ParkingLotOverlayProps) {
  const map = useMap();
  const layersRef = useRef<any[]>([]);

  useEffect(() => {
    let mounted = true;

    async function render() {
      const L = (await import('leaflet')).default;
      if (!mounted) return;

      // Remove old layers
      layersRef.current.forEach((l) => map.removeLayer(l));
      layersRef.current = [];

      lots.forEach((lot) => {
        if (!lot.boundary?.coordinates) return;

        const color = getColor(lot);
        // GeoJSON coords are [lng,lat], Leaflet needs [lat,lng]
        const rawRing: number[][] = lot.boundary.coordinates[0];
        const latLngs = rawRing.map((c: number[]) => L.latLng(c[1], c[0]));

        const polygon = L.polygon(latLngs, {
          color,
          fillColor: color,
          fillOpacity: 0.25,
          weight: 2,
        });

        const statusLabel =
          !lot.isOpen
            ? 'Closed'
            : lot.availableSlots === 0
            ? 'Full'
            : lot.availableSlots / lot.totalSlots <= 0.1
            ? 'Limited'
            : 'Available';

        polygon.bindPopup(`
          <div style="min-width:180px">
            <p style="font-weight:700;font-size:14px;margin:0 0 4px">${lot.name}</p>
            <p style="margin:2px 0;font-size:12px">
              <span style="color:${color};font-weight:600">${statusLabel}</span>
              &nbsp;·&nbsp;${lot.availableSlots}/${lot.totalSlots} slots
            </p>
            <p style="margin:2px 0;font-size:12px">৳${lot.pricePerHour}/hr</p>
            <a href="/parking/${lot.id}" style="display:inline-block;margin-top:6px;padding:4px 12px;background:#6366f1;color:white;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;">Book Now</a>
          </div>
        `);

        polygon.on('click', () => {
          if (onLotClick) onLotClick(lot);
        });

        map.addLayer(polygon);
        layersRef.current.push(polygon);
      });
    }

    render();

    return () => {
      mounted = false;
      layersRef.current.forEach((l) => map.removeLayer(l));
      layersRef.current = [];
    };
  }, [lots, map, onLotClick]);

  return null;
}
