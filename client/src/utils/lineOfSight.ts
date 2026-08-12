export interface Point {
  x: number;
  z: number;
}

export interface WallData {
  position: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
}

function ccw(a: Point, b: Point, c: Point): number {
  return (c.z - a.z) * (b.x - a.x) - (b.z - a.z) * (c.x - a.x);
}

function lineIntersectSegment(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  return ccw(p1, p3, p4) * ccw(p2, p3, p4) < 0 && ccw(p1, p2, p3) * ccw(p1, p2, p4) < 0;
}

export function hasLineOfSight(posA: Point, posB: Point, walls?: WallData[]): boolean {
  if (!walls || walls.length === 0) return true;

  // Fast distance check - close proximity (<= 1.8m) bypasses LOS
  const dx = posA.x - posB.x;
  const dz = posA.z - posB.z;
  if (dx * dx + dz * dz <= 3.24) return true;

  const minX = Math.min(posA.x, posB.x);
  const maxX = Math.max(posA.x, posB.x);
  const minZ = Math.min(posA.z, posB.z);
  const maxZ = Math.max(posA.z, posB.z);

  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    const halfW = w.size.x / 2.0;
    const halfD = w.size.z / 2.0;

    if (
      w.position.x + halfW < minX ||
      w.position.x - halfW > maxX ||
      w.position.z + halfD < minZ ||
      w.position.z - halfD > maxZ
    ) {
      continue;
    }

    const c1 = { x: w.position.x - halfW, z: w.position.z - halfD };
    const c2 = { x: w.position.x + halfW, z: w.position.z - halfD };
    const c3 = { x: w.position.x + halfW, z: w.position.z + halfD };
    const c4 = { x: w.position.x - halfW, z: w.position.z + halfD };

    if (
      lineIntersectSegment(posA, posB, c1, c2) ||
      lineIntersectSegment(posA, posB, c2, c3) ||
      lineIntersectSegment(posA, posB, c3, c4) ||
      lineIntersectSegment(posA, posB, c4, c1)
    ) {
      return false;
    }
  }

  return true;
}
