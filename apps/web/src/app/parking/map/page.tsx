import type { Metadata } from 'next';
import { PublicMapClient } from './PublicMapClient';

export const metadata: Metadata = {
  title: 'Find Parking Near You | Parko',
  description:
    'Explore parking lots on an interactive map. Search by location, filter by availability and price.',
};

export default function ParkingMapPage() {
  return <PublicMapClient />;
}
