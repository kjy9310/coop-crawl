package game

import (
	"testing"
)

func TestReplay_GoalDetection(t *testing.T) {
	state := NewWorldState()
	state.GoalPoint = Vector3{X: 18, Y: 0, Z: 18}

	// Player at 22, 0, 22 (distance = 5.65 > 2.5, not at goal yet)
	state.Players["p1"] = PlayerState{
		ID:       "p1",
		Position: Vector3{X: 22, Y: 0, Z: 22},
		HP:       100,
	}

	Tick(state)
	if state.Players["p1"].ReachedGoal {
		t.Errorf("Expected Player p1 ReachedGoal to be false at dist 5.65, got true")
	}

	// Player moves to 19.5, 0, 19.5 (distance = 2.12 <= 2.5, Goal Reached!)
	p1 := state.Players["p1"]
	p1.Position = Vector3{X: 19.5, Y: 0, Z: 19.5}
	state.Players["p1"] = p1

	Tick(state)
	if !state.Players["p1"].ReachedGoal {
		t.Errorf("Expected Player p1 ReachedGoal to be true at dist 2.12 (within 2.5m), got false")
	}
}

func TestReplay_AllPlayersGoalRequirement(t *testing.T) {
	state := NewWorldState()
	state.GoalPoint = Vector3{X: 18, Y: 0, Z: 18}

	state.Players["p1"] = PlayerState{ID: "p1", Name: "Hero", Position: Vector3{X: 18, Y: 0, Z: 18}, HP: 100}
	state.Players["p2"] = PlayerState{ID: "p2", Name: "Healer", Position: Vector3{X: 0, Y: 0, Z: 0}, HP: 100}

	Tick(state)

	p1 := state.Players["p1"]
	p2 := state.Players["p2"]

	if !p1.ReachedGoal {
		t.Errorf("Expected p1 to have ReachedGoal = true")
	}
	if p2.ReachedGoal {
		t.Errorf("Expected p2 to have ReachedGoal = false")
	}

	if AllPlayersReachedGoal(state) {
		t.Errorf("Expected AllPlayersReachedGoal to be false when p2 is not at goal")
	}

	// Move p2 to goal
	p2.Position = Vector3{X: 18, Y: 0, Z: 18}
	state.Players["p2"] = p2
	Tick(state)

	if !AllPlayersReachedGoal(state) {
		t.Errorf("Expected AllPlayersReachedGoal to be true when both p1 and p2 reach goal")
	}
}

func TestReplay_EventDeterministicPlayback(t *testing.T) {
	seed := int64(12345)

	// Simulation 1: Real-time Play
	s1 := NewWorldState()
	config1 := GenerateMap(seed, 100, 100, 5)
	LoadMapConfig(s1, config1)

	// Record events
	eventLog := []InputEvent{
		{Type: EventJoin, PlayerID: "p1", Tick: 0},
		{Type: EventMove, PlayerID: "p1", Tick: 1, Dir: &Vector3{X: 1, Y: 0, Z: 0}},
		{Type: EventMove, PlayerID: "p1", Tick: 10, Dir: &Vector3{X: 0, Y: 0, Z: 1}},
	}

	for tick := uint64(0); tick <= 50; tick++ {
		for _, ev := range eventLog {
			if ev.Tick == tick {
				ApplyEvent(s1, ev)
			}
		}
		Tick(s1)
	}

	// Simulation 2: Replay Playback with same seed and event log
	s2 := NewWorldState()
	config2 := GenerateMap(seed, 100, 100, 5)
	LoadMapConfig(s2, config2)

	for tick := uint64(0); tick <= 50; tick++ {
		for _, ev := range eventLog {
			if ev.Tick == tick {
				ApplyEvent(s2, ev)
			}
		}
		Tick(s2)
	}

	// Assert 100% Deterministic Equality at Tick 50
	p1_s1 := s1.Players["p1"]
	p1_s2 := s2.Players["p1"]

	if p1_s1.Position.X != p1_s2.Position.X || p1_s1.Position.Z != p1_s2.Position.Z {
		t.Errorf("Determinism failure: S1 Pos (%f,%f) != S2 Pos (%f,%f)",
			p1_s1.Position.X, p1_s1.Position.Z, p1_s2.Position.X, p1_s2.Position.Z)
	}
	if p1_s1.HP != p1_s2.HP || p1_s1.MP != p1_s2.MP {
		t.Errorf("Determinism failure: S1 HP/MP (%f,%f) != S2 HP/MP (%f,%f)",
			p1_s1.HP, p1_s1.MP, p1_s2.HP, p1_s2.MP)
	}
}
