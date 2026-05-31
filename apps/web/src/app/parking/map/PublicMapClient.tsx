'use client';

import { MapSearch } from '@/components/features/map/MapSearch';
import { LotOverlayItem } from '@/components/features/map/ParkingLotOverlay';
import { useRouter } from 'next/navigation';

export function PublicMapClient() {
  const router = useRouter();

  const handleLotSelect = (lot: LotOverlayItem) => {
    // Clicking a lot navigates to the lot detail page;
    // booking requires authentication (middleware handles redirect).
    router.push(`/parking/${lot.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero strip */}
      <div className="bg-white border-b px-6 py-5 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Find Parking</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Search for parking lots near any location. Sign in to book instantly.
        </p>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 py-6">
        <MapSearch
          initialCenter={{ lat: 23.8103, lng: 90.4125 }}
          onLotSelect={handleLotSelect}
          height="calc(100vh - 180px)"
        />
      </div>
    </div>
  );
}
