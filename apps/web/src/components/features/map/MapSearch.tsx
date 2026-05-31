'use client';

import { useState, useCallback, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { ParkingMap } from './ParkingMap';
import { RadiusSearch } from './RadiusSearch';
import { ParkingLotOverlay, LotOverlayItem } from './ParkingLotOverlay';
import { useRadiusSearch } from '@/lib/hooks/useGeo';

interface MapCenter {
  lat: number;
  lng: number;
}

interface MapSearchProps {
  initialCenter?: MapCenter;
  onLotSelect?: (lot: LotOverlayItem) => void;
  height?: string;
}

async function geocode(query: string): Promise<MapCenter | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { 'Accept-Language': 'en' } },
    );
    const data = await res.json();
    if (data[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // ignore
  }
  return null;
}

export function MapSearch({
  initialCenter = { lat: 23.8103, lng: 90.4125 },
  onLotSelect,
  height = '600px',
}: MapSearchProps) {
  const [center, setCenter] = useState<MapCenter>(initialCenter);
  const [radius, setRadius] = useState(3000);
  const [searchQuery, setSearchQuery] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [selectedLot, setSelectedLot] = useState<LotOverlayItem | null>(null);

  const { data: lots = [], isLoading } = useRadiusSearch({
    lat: center.lat,
    lng: center.lng,
    radiusMeters: radius,
  });

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setGeocoding(true);
    const result = await geocode(searchQuery);
    setGeocoding(false);
    if (result) setCenter(result);
  }, [searchQuery]);

  const overlayLots: LotOverlayItem[] = lots.map((l: any) => ({
    id: l.id,
    name: l.name,
    boundary: l.boundary,
    availableSlots: l.availableSlots ?? 0,
    totalSlots: l.totalSlots ?? 1,
    pricePerHour: l.pricePerHour,
    isOpen: l.status === 'ACTIVE',
  }));

  const handleLotClick = useCallback(
    (lot: LotOverlayItem) => {
      setSelectedLot(lot);
      if (onLotSelect) onLotSelect(lot);
    },
    [onLotSelect],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search location (e.g. Dhaka, Bangladesh)…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={geocoding}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
        >
          {geocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>
      </div>

      <div className="flex gap-4">
        {/* Map */}
        <div className="relative flex-1">
          <ParkingMap center={center} zoom={14} height={height}>
            <RadiusSearch
              center={center}
              radiusMeters={radius}
              onCenterChange={setCenter}
              onRadiusChange={setRadius}
            />
            <ParkingLotOverlay lots={overlayLots} onLotClick={handleLotClick} />
          </ParkingMap>
        </div>

        {/* Results Panel */}
        <div className="w-80 flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: height }}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm">
              {isLoading ? 'Searching…' : `${lots.length} lots found`}
            </h3>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />}
          </div>

          {lots.map((lot: any) => (
            <div
              key={lot.id}
              onClick={() => handleLotClick({
                id: lot.id,
                name: lot.name,
                boundary: lot.boundary,
                availableSlots: lot.availableSlots ?? 0,
                totalSlots: lot.totalSlots ?? 1,
                pricePerHour: lot.pricePerHour,
                isOpen: lot.status === 'ACTIVE',
              })}
              className={`cursor-pointer rounded-lg border p-3 transition-all hover:border-indigo-400 ${
                selectedLot?.id === lot.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'
              }`}
            >
              <p className="font-semibold text-sm text-gray-900 truncate">{lot.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{lot.city}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs font-medium text-indigo-700">
                  ৳{lot.pricePerHour}/hr
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    lot.availableSlots > 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {lot.availableSlots > 0 ? `${lot.availableSlots} slots` : 'Full'}
                </span>
              </div>
              {lot.distanceMeters != null && (
                <p className="text-[11px] text-gray-400 mt-1">
                  {lot.distanceMeters >= 1000
                    ? `${(lot.distanceMeters / 1000).toFixed(1)} km away`
                    : `${Math.round(lot.distanceMeters)} m away`}
                </p>
              )}
            </div>
          ))}

          {!isLoading && lots.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">
              No parking lots found within this radius.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
