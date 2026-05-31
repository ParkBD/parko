-- PostGIS geo tables for parking lot boundaries, entrances, and exits

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS parking_lot_geo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL UNIQUE,
  boundary GEOMETRY(Polygon, 4326),
  entrances GEOMETRY(MultiPoint, 4326),
  exits GEOMETRY(MultiPoint, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parking_lot_geo_boundary ON parking_lot_geo USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_parking_lot_geo_lot_id ON parking_lot_geo(lot_id);
