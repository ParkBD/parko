'use client';

import { useState, useEffect } from 'react';
import { MapPin, Navigation, Loader2, Clock, Car } from 'lucide-react';
import { ParkingMap } from '@/components/features/map/ParkingMap';
import { RadiusSearch } from '@/components/features/map/RadiusSearch';
import { ParkingLotOverlay, LotOverlayItem } from '@/components/features/map/ParkingLotOverlay';
import { useRadiusSearch } from '@/lib/hooks/useGeo';
import Link from 'next/link';

interface MapCenter {
  lat: number;
  lng: number;
}

const DEFAULT_CENTER: MapCenter = { lat: 23.8103, lng: 90.4125 };

export default function DriverMapPage() {
  const [center, setCenter] = useState<MapCenter>(DEFAULT_CENTER);
  const [radius, setRadius] = useState(3000);
  const [selectedLot, setSelectedLot] = useState<LotOverlayItem | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Attempt to get user's geolocation
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
      },
      () => setLocationLoading(false),
      { timeout: 5000 },
    );
  }, []);

  // Radius search with 30 s live refresh (handled in useRadiusSearch)
  const { data: lots = [], isLoading, dataUpdatedAt } = useRadiusSearch({
    lat: center.lat,
    lng: center.lng,
    radiusMeters: radius,
  });

  const overlayLots: LotOverlayItem[] = lots.map((l: any) => ({
    id: l.id,
    name: l.name,
    boundary: l.boundary,
    availableSlots: l.availableSlots ?? 0,
    totalSlots: l.totalSlots ?? 1,
    pricePerHour: l.pricePerHour,
    isOpen: l.status === 'ACTIVE',
  }));

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="flex-none px-6 py-4 bg-white border-b shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Find Parking</h1>
          <p className="text-sm text-gray-500">Drag the pin or search to explore nearby parking</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {lastUpdated && !isLoading && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Updated {lastUpdated}
            </span>
          )}
          {locationLoading && (
            <span className="flex items-center gap-1 text-indigo-500">
              <Navigation className="h-3.5 w-3.5 animate-pulse" />
              Getting location…
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map area */}
        <div className="flex-1 relative">
          <ParkingMap center={center} zoom={14} height="100%">
            <RadiusSearch
              center={center}
              radiusMeters={radius}
              onCenterChange={setCenter}
              onRadiusChange={setRadius}
            />
            <ParkingLotOverlay
              lots={overlayLots}
              onLotClick={(lot) => setSelectedLot(lot)}
            />
          </ParkingMap>
        </div>

        {/* Results panel */}
        <div className="w-80 flex-none bg-white border-l flex flex-col overflow-hidden">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 text-sm">
                {isLoading ? 'Searching…' : `${lots.length} lots found`}
              </h2>
              <span className="text-xs text-gray-400">
                {radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${radius} m`} radius
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {lots.map((lot: any) => {
              const availRatio = lot.totalSlots > 0 ? lot.availableSlots / lot.totalSlots : 0;
              const statusColor =
                lot.availableSlots === 0 ? 'text-red-600 bg-red-50' :
                availRatio < 0.2 ? 'text-amber-600 bg-amber-50' :
                'text-green-600 bg-green-50';

              return (
                <div
                  key={lot.id}
                  onClick={() =>
                    setSelectedLot({
                      id: lot.id,
                      name: lot.name,
                      boundary: lot.boundary,
                      availableSlots: lot.availableSlots ?? 0,
                      totalSlots: lot.totalSlots ?? 1,
                      pricePerHour: lot.pricePerHour,
                      isOpen: lot.status === 'ACTIVE',
                    })
                  }
                  className={`cursor-pointer rounded-xl border p-3 transition-all hover:shadow-md ${
                    selectedLot?.id === lot.id
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-gray-100 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{lot.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{lot.addressLine1 ?? lot.city}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor}`}>
                      {lot.availableSlots === 0
                        ? 'Full'
                        : lot.availableSlots === 1
                        ? '1 slot'
                        : `${lot.availableSlots} slots`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-indigo-700">৳{lot.pricePerHour}/hr</span>
                    {lot.distanceMeters != null && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <MapPin className="h-3 w-3" />
                        {lot.distanceMeters >= 1000
                          ? `${(lot.distanceMeters / 1000).toFixed(1)} km`
                          : `${Math.round(lot.distanceMeters)} m`}
                      </span>
                    )}
                  </div>

                  {selectedLot?.id === lot.id && (
                    <Link
                      href={`/parking/${lot.id}`}
                      className="mt-2 flex items-center justify-center gap-2 w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                    >
                      <Car className="h-3.5 w-3.5" />
                      Book Now
                    </Link>
                  )}
                </div>
              );
            })}

            {!isLoading && lots.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No parking lots found nearby.</p>
                <p className="text-xs mt-1">Try increasing the search radius.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
