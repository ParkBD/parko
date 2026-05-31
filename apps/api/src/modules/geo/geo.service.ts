import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { SavePolygonDto } from './dto/save-polygon.dto';
import { RadiusSearchDto } from './dto/radius-search.dto';

@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Extract GeoJSON Polygon coordinates from a FeatureCollection or Polygon input.
   */
  private extractPolygonCoords(geojson: Record<string, any>): number[][][] {
    if (geojson.type === 'FeatureCollection') {
      const feature = geojson.features?.[0];
      if (!feature) throw new BadRequestException('FeatureCollection has no features');
      return this.extractPolygonCoords(feature.geometry ?? feature);
    }
    if (geojson.type === 'Feature') {
      return this.extractPolygonCoords(geojson.geometry);
    }
    if (geojson.type === 'Polygon') {
      return geojson.coordinates as number[][][];
    }
    throw new BadRequestException(`Unsupported GeoJSON type: ${geojson.type}`);
  }

  /**
   * Build a WKT string for a Polygon from coordinates array.
   */
  private coordsToWkt(coords: number[][][]): string {
    const ring = coords[0].map((p) => `${p[0]} ${p[1]}`).join(', ');
    return `POLYGON((${ring}))`;
  }

  /**
   * Build a WKT MultiPoint from array of {lat, lng}.
   */
  private pointsToMultiPointWkt(points: { lat: number; lng: number }[]): string {
    if (!points.length) return 'MULTIPOINT EMPTY';
    const pts = points.map((p) => `(${p.lng} ${p.lat})`).join(', ');
    return `MULTIPOINT(${pts})`;
  }

  /**
   * 1. Store polygon + entrance/exit points for a lot.
   *    Owner must own the parking space referenced by lotId.
   */
  async saveLotPolygon(ownerId: string, dto: SavePolygonDto) {
    // Validate ownership
    const space = await this.prisma.parkingSpace.findUnique({
      where: { id: dto.lotId },
      select: { ownerId: true },
    });
    if (!space) throw new NotFoundException('Parking space not found');
    if (space.ownerId !== ownerId) throw new ForbiddenException('Not your parking space');

    const coords = this.extractPolygonCoords(dto.polygon);
    const boundaryWkt = this.coordsToWkt(coords);
    const entrancesWkt = this.pointsToMultiPointWkt(dto.entrances);
    const exitsWkt = this.pointsToMultiPointWkt(dto.exits);

    // Upsert using raw SQL (PostGIS geometry types)
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO parking_lot_geo (lot_id, boundary, entrances, exits, updated_at)
      VALUES (
        ${dto.lotId}::uuid,
        ST_GeomFromText(${boundaryWkt}, 4326),
        ST_GeomFromText(${entrancesWkt}, 4326),
        ST_GeomFromText(${exitsWkt}, 4326),
        NOW()
      )
      ON CONFLICT (lot_id) DO UPDATE SET
        boundary   = EXCLUDED.boundary,
        entrances  = EXCLUDED.entrances,
        exits      = EXCLUDED.exits,
        updated_at = NOW()
    `);

    return this.getLotGeo(dto.lotId);
  }

  /**
   * 2. Return GeoJSON polygon + entrance/exit points for a lot.
   */
  async getLotGeo(lotId: string) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        lot_id                                   AS "lotId",
        CAST(ST_AsGeoJSON(boundary)  AS text)    AS boundary,
        CAST(ST_AsGeoJSON(entrances) AS text)    AS entrances,
        CAST(ST_AsGeoJSON(exits)     AS text)    AS exits,
        created_at                               AS "createdAt",
        updated_at                               AS "updatedAt"
      FROM parking_lot_geo
      WHERE lot_id = ${lotId}::uuid
    `);

    if (!rows.length) throw new NotFoundException('Geo data not found for this lot');

    const row = rows[0];
    return {
      lotId: row.lotId,
      boundary: row.boundary ? JSON.parse(row.boundary) : null,
      entrances: row.entrances ? JSON.parse(row.entrances) : null,
      exits: row.exits ? JSON.parse(row.exits) : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * 3. Radius search using ST_DWithin — joins with parking_spaces for availability/pricing.
   */
  async searchWithinRadius(dto: RadiusSearchDto) {
    const { lat, lng, radiusMeters, limit } = dto;

    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        ps.id                                                           AS "id",
        ps.name                                                         AS "name",
        ps.address_line1                                                AS "addressLine1",
        ps.city                                                         AS "city",
        ps.available_slots                                              AS "availableSlots",
        ps.total_slots                                                  AS "totalSlots",
        ps.price_per_hour                                               AS "pricePerHour",
        ps.price_per_day                                                AS "pricePerDay",
        ps.currency                                                     AS "currency",
        ps.latitude                                                     AS "latitude",
        ps.longitude                                                    AS "longitude",
        ps.status                                                       AS "status",
        ps.space_type                                                   AS "spaceType",
        CAST(ST_AsGeoJSON(g.boundary) AS text)                          AS "boundary",
        CAST(ST_AsGeoJSON(g.entrances) AS text)                         AS "entrances",
        CAST(ST_AsGeoJSON(g.exits) AS text)                             AS "exits",
        ROUND(
          CAST(ST_Distance(
            g.boundary::geography,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
          ) AS numeric), 2
        )                                                               AS "distanceMeters"
      FROM parking_lot_geo g
      JOIN parking_spaces ps ON ps.id = g.lot_id
      WHERE
        ST_DWithin(
          g.boundary::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radiusMeters}
        )
        AND ps.status = 'ACTIVE'
      ORDER BY "distanceMeters" ASC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      ...r,
      boundary: r.boundary ? JSON.parse(r.boundary) : null,
      entrances: r.entrances ? JSON.parse(r.entrances) : null,
      exits: r.exits ? JSON.parse(r.exits) : null,
    }));
  }

  /**
   * 4. Get nearby lots sorted by distance (no availability filter).
   */
  async getNearbyLots(lat: number, lng: number, radiusMeters: number = 5000) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        ps.id                                                           AS "id",
        ps.name                                                         AS "name",
        ps.city                                                         AS "city",
        ps.available_slots                                              AS "availableSlots",
        ps.total_slots                                                  AS "totalSlots",
        ps.price_per_hour                                               AS "pricePerHour",
        ps.currency                                                     AS "currency",
        ps.latitude                                                     AS "latitude",
        ps.longitude                                                    AS "longitude",
        ps.status                                                       AS "status",
        CAST(ST_AsGeoJSON(g.boundary) AS text)                          AS "boundary",
        ROUND(
          CAST(ST_Distance(
            g.boundary::geography,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
          ) AS numeric), 2
        )                                                               AS "distanceMeters"
      FROM parking_lot_geo g
      JOIN parking_spaces ps ON ps.id = g.lot_id
      WHERE
        ST_DWithin(
          g.boundary::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radiusMeters}
        )
      ORDER BY "distanceMeters" ASC
      LIMIT 50
    `);

    return rows.map((r) => ({
      ...r,
      boundary: r.boundary ? JSON.parse(r.boundary) : null,
    }));
  }

  /**
   * 5. Validate polygon GeoJSON using ST_IsValid.
   */
  async validatePolygon(geojson: Record<string, any>) {
    let coords: number[][][];
    try {
      coords = this.extractPolygonCoords(geojson);
    } catch {
      return { valid: false, reason: 'Invalid GeoJSON structure' };
    }

    if (coords[0].length < 4) {
      return { valid: false, reason: 'Polygon requires at least 3 distinct points (4 with closing point)' };
    }

    const wkt = this.coordsToWkt(coords);

    const rows = await this.prisma.$queryRaw<{ valid: boolean; reason: string | null }[]>(
      Prisma.sql`
        SELECT
          ST_IsValid(ST_GeomFromText(${wkt}, 4326)) AS valid,
          ST_IsValidReason(ST_GeomFromText(${wkt}, 4326)) AS reason
      `,
    );

    return {
      valid: rows[0].valid,
      reason: rows[0].reason ?? null,
    };
  }
}
