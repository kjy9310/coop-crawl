package game

import (
	"math"
)

func distance(a, b Vector3) float64 {
	dx := a.X - b.X
	dy := a.Y - b.Y
	dz := a.Z - b.Z
	return math.Sqrt(dx*dx + dy*dy + dz*dz)
}

func checkCollision(pos Vector3, radius float64, walls map[string]Wall) bool {
	for _, wall := range walls {
		halfW := wall.Size.X / 2.0
		halfD := wall.Size.Z / 2.0

		// Fast AABB culling
		if wall.Position.X+halfW+radius < pos.X || wall.Position.X-halfW-radius > pos.X ||
			wall.Position.Z+halfD+radius < pos.Z || wall.Position.Z-halfD-radius > pos.Z {
			continue
		}

		closestX := math.Max(wall.Position.X-halfW, math.Min(pos.X, wall.Position.X+halfW))
		closestZ := math.Max(wall.Position.Z-halfD, math.Min(pos.Z, wall.Position.Z+halfD))

		dx := pos.X - closestX
		dz := pos.Z - closestZ

		if (dx*dx + dz*dz) < (radius*radius) {
			return true
		}
	}
	return false
}

func checkDoorCollision(pos Vector3, radius float64, doors map[string]Door) bool {
	for _, door := range doors {
		if !door.IsLocked {
			continue
		}
		halfW := door.Size.X / 2.0
		halfD := door.Size.Z / 2.0

		if door.Position.X+halfW+radius < pos.X || door.Position.X-halfW-radius > pos.X ||
			door.Position.Z+halfD+radius < pos.Z || door.Position.Z-halfD-radius > pos.Z {
			continue
		}

		closestX := math.Max(door.Position.X-halfW, math.Min(pos.X, door.Position.X+halfW))
		closestZ := math.Max(door.Position.Z-halfD, math.Min(pos.Z, door.Position.Z+halfD))

		dx := pos.X - closestX
		dz := pos.Z - closestZ

		if (dx*dx + dz*dz) < (radius*radius) {
			return true
		}
	}
	return false
}

func lineIntersectSegment(p1, p2, p3, p4 Vector3) bool {
	ccw := func(a, b, c Vector3) float64 {
		return (c.Z-a.Z)*(b.X-a.X) - (b.Z-a.Z)*(c.X-a.X)
	}
	return (ccw(p1, p3, p4)*ccw(p2, p3, p4) < 0) && (ccw(p1, p2, p3)*ccw(p1, p2, p4) < 0)
}

// lineCircleIntersect checks if line segment AB intersects circle at C with radius R
func lineCircleIntersect(a, b, c Vector3, r float64) bool {
	abX := b.X - a.X
	abZ := b.Z - a.Z
	acX := c.X - a.X
	acZ := c.Z - a.Z

	abLenSq := abX*abX + abZ*abZ
	if abLenSq == 0 {
		return (acX*acX + acZ*acZ) <= r*r
	}

	t := (acX*abX + acZ*abZ) / abLenSq
	t = math.Max(0.0, math.Min(1.0, t))

	closestX := a.X + t*abX
	closestZ := a.Z + t*abZ

	dx := c.X - closestX
	dz := c.Z - closestZ
	return (dx*dx + dz*dz) <= r*r
}

func checkWeaponWallCollision(playerPos Vector3, heading float64, length float64, walls map[string]Wall) bool {
	step := 0.3
	for dist := 0.4; dist <= length; dist += step {
		samplePoint := Vector3{
			X: playerPos.X + math.Sin(heading)*dist,
			Y: playerPos.Y,
			Z: playerPos.Z + math.Cos(heading)*dist,
		}
		if checkCollision(samplePoint, 0.25, walls) {
			return true
		}
	}
	return false
}

func hasLineOfSight(posA, posB Vector3, walls map[string]Wall) bool {
	minX := math.Min(posA.X, posB.X)
	maxX := math.Max(posA.X, posB.X)
	minZ := math.Min(posA.Z, posB.Z)
	maxZ := math.Max(posA.Z, posB.Z)

	for _, wall := range walls {
		halfW := wall.Size.X / 2.0
		halfD := wall.Size.Z / 2.0

		// Fast AABB culling against the line's bounding box
		if wall.Position.X+halfW < minX || wall.Position.X-halfW > maxX ||
			wall.Position.Z+halfD < minZ || wall.Position.Z-halfD > maxZ {
			continue
		}

		c1 := Vector3{X: wall.Position.X - halfW, Z: wall.Position.Z - halfD}
		c2 := Vector3{X: wall.Position.X + halfW, Z: wall.Position.Z - halfD}
		c3 := Vector3{X: wall.Position.X + halfW, Z: wall.Position.Z + halfD}
		c4 := Vector3{X: wall.Position.X - halfW, Z: wall.Position.Z + halfD}

		if lineIntersectSegment(posA, posB, c1, c2) ||
			lineIntersectSegment(posA, posB, c2, c3) ||
			lineIntersectSegment(posA, posB, c3, c4) ||
			lineIntersectSegment(posA, posB, c4, c1) {
			return false
		}
	}
	return true
}
