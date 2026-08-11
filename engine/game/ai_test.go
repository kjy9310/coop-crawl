package game

import (
	"testing"
)

func TestAI_SpawnerLogic(t *testing.T) {
	state := NewWorldState()
	
	state.Spawners["s1"] = Spawner{
		ID:       "s1",
		Position: Vector3{0, 0, 0},
		Interval: 90,
	}
	
	if len(state.Enemies) != 0 {
		t.Errorf("Expected 0 enemies initially")
	}

	for i := 0; i < 90; i++ {
		Tick(state)
	}
	if len(state.Enemies) != 1 {
		t.Errorf("Expected 1 enemy at tick 90, got %d", len(state.Enemies))
	}

	for i := 0; i < 90; i++ {
		Tick(state)
	}
	if len(state.Enemies) != 2 {
		t.Errorf("Expected 2 enemies at tick 180, got %d", len(state.Enemies))
	}
}

func TestAI_IdleRotation(t *testing.T) {
	state := NewWorldState()
	
	// Create an enemy with no targets around
	state.Enemies["e1"] = EnemyState{
		ID:       "e1",
		Position: Vector3{X: 0, Y: 0, Z: 0},
		Heading:  0, // Initial heading
		HP:       50,
	}

	for i := 0; i < 30; i++ { // 1 second
		Tick(state)
	}

	enemy := state.Enemies["e1"]
	
	if enemy.Heading == 0 {
		t.Errorf("Expected enemy heading to change during Idle state, but it remained 0")
	}
	
	if enemy.Velocity.X != 0 || enemy.Velocity.Z != 0 {
		t.Errorf("Expected enemy to not move during Idle state, got %v", enemy.Velocity)
	}
}
