package game

import (
	"testing"
)

func TestPhysics_WASDMovement(t *testing.T) {
	state := NewWorldState()
	state.Spawners = make(map[string]Spawner)

	events := []InputEvent{
		{Type: EventJoin, PlayerID: "p1", Tick: 0},
		{Type: EventMove, PlayerID: "p1", Tick: 1, Dir: &Vector3{X: 1, Y: 0, Z: 0}},
	}

	for i := 0; i < 30; i++ {
		for _, e := range events {
			if e.Tick == state.Tick {
				ApplyEvent(state, e)
			}
		}
		Tick(state)
	}

	p1 := state.Players["p1"]
	
	if p1.Position.X <= 0 {
		t.Errorf("Expected X to increase with WASD movement, got %f", p1.Position.X)
	}
}

func TestPhysics_WallCollision(t *testing.T) {
	state := NewWorldState()
	
	state.Walls["test_wall"] = Wall{
		ID:       "test_wall",
		Position: Vector3{X: 5, Y: 1, Z: 0},
		Size:     Vector3{X: 2, Y: 2, Z: 10},
	}
	
	state.Players["p1"] = PlayerState{
		ID:       "p1",
		Position: Vector3{X: 3.0, Y: 0, Z: 0},
		HP:       100,
	}
	
	ApplyEvent(state, InputEvent{
		Type:     EventMove,
		PlayerID: "p1",
		Dir:      &Vector3{X: 1, Y: 0, Z: 1},
	})

	for i := 0; i < 30; i++ {
		Tick(state)
	}

	player := state.Players["p1"]
	
	if player.Position.X > 3.6 {
		t.Errorf("Expected X to be blocked at ~3.5, got %f", player.Position.X)
	}
	
	if player.Position.Z <= 0.1 {
		t.Errorf("Expected Z to increase (sliding), got %f", player.Position.Z)
	}
}
