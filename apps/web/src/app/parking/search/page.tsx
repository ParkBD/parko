'use client';

import { useState } from 'react';
import { useRadiusSearch } from '@/hooks/use-parking';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

export default function SearchPage() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(5);
  const [locationError, setLocationError] = useState('');

  const { data: lots, isLoading } = useRadiusSearch(
    coords?.lat ?? 0,
    coords?.lng ?? 0,
    radius,
  );

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationError('Location access denied'),
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4">
        <div className="container mx-auto flex items-center gap-4">
          <Link href="/dashboard" className="text-blue-600 font-bold text-xl">Parko</Link>
          <h1 className="text-lg font-semibold">Find Parking</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Search Radius</label>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="px-3 py-2 border rounded-lg"
              >
                {[1, 2, 5, 10, 20].map((r) => (
                  <option key={r} value={r}>{r} km</option>
                ))}
              </select>
            </div>
            <button
              onClick={detectLocation}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Use My Location
            </button>
          </div>
          {locationError && <p className="text-red-600 text-sm mt-2">{locationError}</p>}
        </div>

        {isLoading && <p className="text-gray-500">Searching nearby lots...</p>}

        <div className="grid gap-4">
          {(lots as any[])?.map((lot: any) => (
            <Link
              key={lot.id}
              href={`/parking/${lot.id}`}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md flex items-start justify-between"
            >
              <div>
                <h3 className="font-semibold text-lg">{lot.name}</h3>
                <p className="text-gray-600 text-sm">{lot.address}</p>
                <p className="text-gray-500 text-sm mt-1">{lot.distance?.toFixed(1)} km away</p>
                <div className="flex gap-2 mt-2">
                  {lot.amenities?.slice(0, 3).map((a: string) => (
                    <span key={a} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{a}</span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(lot.pricePerHour)}
                </p>
                <p className="text-gray-500 text-sm">per hour</p>
              </div>
            </Link>
          ))}
        </div>

        {!isLoading && (!lots || (lots as any[]).length === 0) && coords && (
          <p className="text-gray-500 text-center py-10">No parking lots found nearby.</p>
        )}

        {!coords && (
          <p className="text-gray-500 text-center py-10">
            Click &quot;Use My Location&quot; to find nearby parking.
          </p>
        )}
      </div>
    </div>
  );
}
