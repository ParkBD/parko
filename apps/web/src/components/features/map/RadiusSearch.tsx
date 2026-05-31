'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';

export interface MapCenter {
  lat: number;
  lng: number;
}

export interface RadiusSearchProps {
  center: MapCenter;
  radiusMeters: number;
  onCenterChange: (center: MapCenter) => void;
  onRadiusChange: (radius: number) => void;
}

const RadiusSearchInner = dynamic(
  () => import('./RadiusSearchInner').then((m) => m.RadiusSearchInner),
  { ssr: false },
);

export function RadiusSearch(props: RadiusSearchProps) {
  return (
    <div>
      <RadiusSearchInner {...props} />
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-xl shadow-lg px-4 py-3 w-72">
        <label className="text-xs font-semibold text-gray-600 mb-1 block">
          Search radius: {props.radiusMeters >= 1000
            ? `${(props.radiusMeters / 1000).toFixed(1)} km`
            : `${props.radiusMeters} m`}
        </label>
        <input
          type="range"
          min={100}
          max={10000}
          step={100}
          value={props.radiusMeters}
          onChange={(e) => props.onRadiusChange(parseInt(e.target.value, 10))}
          className="w-full accent-indigo-600"
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>100 m</span>
          <span>10 km</span>
        </div>
      </div>
    </div>
  );
}
