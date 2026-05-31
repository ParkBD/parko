'use client';

import dynamic from 'next/dynamic';

export interface LotOverlayItem {
  id: string;
  name: string;
  boundary: Record<string, any> | null;
  availableSlots: number;
  totalSlots: number;
  pricePerHour: string | number;
  isOpen?: boolean;
}

export interface ParkingLotOverlayProps {
  lots: LotOverlayItem[];
  onLotClick?: (lot: LotOverlayItem) => void;
}

const ParkingLotOverlayInner = dynamic(
  () => import('./ParkingLotOverlayInner').then((m) => m.ParkingLotOverlayInner),
  { ssr: false },
);

export function ParkingLotOverlay(props: ParkingLotOverlayProps) {
  return <ParkingLotOverlayInner {...props} />;
}
