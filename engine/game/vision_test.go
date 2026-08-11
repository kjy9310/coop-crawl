package game

import (
	"testing"
)

func TestVision_LineOfSight(t *testing.T) {
	walls := make(map[string]Wall)
	walls["w1"] = Wall{
		Position: Vector3{0, 0, 0},
		Size:     Vector3{2, 2, 2},
	}

	// Unblocked
	posA := Vector3{-2, 0, 2}
	posB := Vector3{2, 0, 2}
	if !hasLineOfSight(posA, posB, walls) {
		t.Errorf("Expected hasLineOfSight to be true, got false")
	}

	// Blocked
	posC := Vector3{-2, 0, 0}
	posD := Vector3{2, 0, 0}
	if hasLineOfSight(posC, posD, walls) {
		t.Errorf("Expected hasLineOfSight to be false, got true")
	}
}
