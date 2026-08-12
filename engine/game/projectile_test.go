package game

import (
	"testing"
)

func TestProjectile_CoreMovementAndCollision(t *testing.T) {
	state := NewWorldState()

	// Add player
	state.Players["p1"] = PlayerState{
		ID:       "p1",
		Position: Vector3{X: 0, Y: 0, Z: 0},
		HP:       100,
	}

	// Add projectile travelling +X at 10 units/sec
	state.Projectiles["proj1"] = Projectile{
		ID:       "proj1",
		OwnerID:  "p1",
		Type:     "magic",
		Position: Vector3{X: 0, Y: 0, Z: 0},
		Velocity: Vector3{X: 10, Y: 0, Z: 0},
		Damage:   20,
		MaxRange: 15,
	}

	// Tick simulation (DeltaTime = 1/30s => 0.333 units moved)
	Tick(state)

	proj, exists := state.Projectiles["proj1"]
	if !exists {
		t.Fatalf("Expected projectile proj1 to exist after 1 tick")
	}

	if proj.Position.X <= 0 {
		t.Errorf("Expected projectile X position to increase, got %f", proj.Position.X)
	}

	if proj.Type != "magic" {
		t.Errorf("Expected projectile Type to be 'magic', got %s", proj.Type)
	}
}

func TestProjectile_CoreWallCollision(t *testing.T) {
	state := NewWorldState()

	// Wall at X=2
	state.Walls["w1"] = Wall{
		ID:       "w1",
		Position: Vector3{X: 2, Y: 0, Z: 0},
		Size:     Vector3{X: 1, Y: 1, Z: 5},
	}

	// Projectile heading towards wall
	state.Projectiles["proj2"] = Projectile{
		ID:       "proj2",
		OwnerID:  "p1",
		Type:     "arrow",
		Position: Vector3{X: 1.8, Y: 0, Z: 0},
		Velocity: Vector3{X: 10, Y: 0, Z: 0},
		MaxRange: 20,
	}

	Tick(state)

	if _, exists := state.Projectiles["proj2"]; exists {
		t.Errorf("Expected projectile proj2 to be destroyed upon hitting wall")
	}
}
