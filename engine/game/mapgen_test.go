package game

import (
	"testing"
)

func TestMapGen_Deterministic(t *testing.T) {
	// Generate map with seed 12345
	config1 := GenerateMap(12345, 50, 50, 5)
	
	// Generate map with same seed
	config2 := GenerateMap(12345, 50, 50, 5)
	
	if len(config1.Walls) != len(config2.Walls) {
		t.Errorf("Expected identical wall counts for same seed, got %d and %d", len(config1.Walls), len(config2.Walls))
	}
	if len(config1.Enemies) != len(config2.Enemies) {
		t.Errorf("Expected identical enemy counts for same seed, got %d and %d", len(config1.Enemies), len(config2.Enemies))
	}
	
	// Check if the first enemy is exactly at the same position
	if len(config1.Enemies) > 0 {
		e1 := config1.Enemies[0]
		e2 := config2.Enemies[0]
		if e1.Position.X != e2.Position.X || e1.Position.Z != e2.Position.Z {
			t.Errorf("Expected enemies to be at identical positions, got %v and %v", e1.Position, e2.Position)
		}
	}
}

func TestMapGen_Bounds(t *testing.T) {
	width := 50.0
	depth := 50.0
	config := GenerateMap(9999, int(width), int(depth), 5)
	
	// All walls must fall within [0, 50] for X and Z
	for _, w := range config.Walls {
		// Wall position is the center. So min bound is Position - Size/2, max is Position + Size/2
		minX := w.Position.X - (w.Size.X / 2.0)
		maxX := w.Position.X + (w.Size.X / 2.0)
		minZ := w.Position.Z - (w.Size.Z / 2.0)
		maxZ := w.Position.Z + (w.Size.Z / 2.0)
		
		if minX < 0 || maxX > width {
			t.Errorf("Wall %s out of X bounds [0, %f]: MinX=%f, MaxX=%f", w.ID, width, minX, maxX)
		}
		if minZ < 0 || maxZ > depth {
			t.Errorf("Wall %s out of Z bounds [0, %f]: MinZ=%f, MaxZ=%f", w.ID, depth, minZ, maxZ)
		}
	}
}
