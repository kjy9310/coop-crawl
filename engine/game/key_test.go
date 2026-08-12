package game

import (
	"testing"
)

func TestKey_LockedGatePreventsWin(t *testing.T) {
	state := NewWorldState()
	state.IsGoalLocked = true
	state.GoalPoint = Vector3{X: 10, Y: 0, Z: 10}

	state.Players["p1"] = PlayerState{
		ID:          "p1",
		Position:    Vector3{X: 10, Y: 0, Z: 10}, // Standing in Goal Zone
		HP:          100,
		ReachedGoal: false,
	}

	Tick(state)

	p1 := state.Players["p1"]
	if p1.ReachedGoal {
		t.Fatalf("Player should NOT reach goal when IsGoalLocked is true")
	}
	if AllPlayersReachedGoal(state) {
		t.Fatalf("AllPlayersReachedGoal should return false when gate is locked")
	}
}

func TestKey_PickupUnlocksGate(t *testing.T) {
	state := NewWorldState()
	state.IsGoalLocked = true

	state.Players["p1"] = PlayerState{
		ID:       "p1",
		Position: Vector3{X: 0, Y: 0, Z: 0},
		HP:       100,
	}

	keyID := "dungeon_key"
	state.Items[keyID] = Item{
		ID:       keyID,
		Name:     "Dungeon Key",
		Type:     "key",
		HandType: HandAny,
		Position: Vector3{X: 0.5, Y: 0, Z: 0},
	}

	ApplyEvent(state, InputEvent{
		Type:     EventPickup,
		PlayerID: "p1",
		ItemID:   &keyID,
	})

	if state.IsGoalLocked {
		t.Fatalf("Expected IsGoalLocked to be false after picking up Dungeon Key")
	}
}

func TestKey_WinConditionAfterUnlock(t *testing.T) {
	state := NewWorldState()
	state.IsGoalLocked = true
	state.GoalPoint = Vector3{X: 10, Y: 0, Z: 10}

	state.Players["p1"] = PlayerState{
		ID:          "p1",
		Position:    Vector3{X: 10, Y: 0, Z: 10},
		HP:          100,
		ReachedGoal: false,
	}

	// Pickup Key to unlock gate
	keyID := "dungeon_key"
	state.Items[keyID] = Item{
		ID:       keyID,
		Name:     "Dungeon Key",
		Type:     "key",
		HandType: HandAny,
		Position: Vector3{X: 10, Y: 0, Z: 10},
	}
	ApplyEvent(state, InputEvent{
		Type:     EventPickup,
		PlayerID: "p1",
		ItemID:   &keyID,
	})

	Tick(state)

	p1 := state.Players["p1"]
	if !p1.ReachedGoal {
		t.Fatalf("Expected Player ReachedGoal to be true after unlocking gate and standing in goal zone")
	}
	if !AllPlayersReachedGoal(state) {
		t.Fatalf("Expected AllPlayersReachedGoal to be true after gate unlock")
	}
}
