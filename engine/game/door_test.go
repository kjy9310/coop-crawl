package game

import (
	"testing"
)

func TestDoor_LockedDoorBlocksMovement(t *testing.T) {
	state := NewWorldState()

	// Add Locked Door at (5, 0, 5) with width 3, depth 0.6
	state.Doors["goal_door"] = Door{
		ID:       "goal_door",
		IsLocked: true,
		Position: Vector3{X: 5, Y: 1.0, Z: 5},
		Size:     Vector3{X: 3.0, Y: 2.5, Z: 0.6},
	}

	pos := Vector3{X: 5, Y: 0, Z: 4.8} // Collision test point near door
	if !checkDoorCollision(pos, 0.4, state.Doors) {
		t.Fatalf("Expected checkDoorCollision to return true for locked door")
	}

	// Unlock door and verify collision clears
	door := state.Doors["goal_door"]
	door.IsLocked = false
	state.Doors["goal_door"] = door

	if checkDoorCollision(pos, 0.4, state.Doors) {
		t.Fatalf("Expected checkDoorCollision to return false for unlocked door")
	}
}

func TestDoor_KeyConsumerOpensDoor(t *testing.T) {
	state := NewWorldState()
	state.IsGoalLocked = true

	state.Doors["goal_door"] = Door{
		ID:       "goal_door",
		IsLocked: true,
		Position: Vector3{X: 5, Y: 1.0, Z: 5},
		Size:     Vector3{X: 3.0, Y: 2.5, Z: 0.6},
	}

	// Give Player a Key in EquippedRightHand
	keyItem := Item{
		ID:       "my_key",
		Name:     "Dungeon Key",
		Type:     "key",
		HandType: HandAny,
	}

	state.Players["p1"] = PlayerState{
		ID:                "p1",
		Position:          Vector3{X: 5, Y: 0, Z: 4.2}, // Near door (distance ~ 0.8m)
		HP:                100,
		EquippedRightHand: &keyItem,
		EquippedWeapon:    &keyItem,
	}

	// Try interacting with door / pickup near door
	ApplyEvent(state, InputEvent{
		Type:     EventPickup,
		PlayerID: "p1",
	})

	p1 := state.Players["p1"]

	// 1. Key should be consumed (removed from hand/inventory)
	if p1.EquippedRightHand != nil && p1.EquippedRightHand.Type == "key" {
		t.Fatalf("Expected Key to be consumed after unlocking door")
	}

	// 2. Door should be unlocked
	if state.Doors["goal_door"].IsLocked {
		t.Fatalf("Expected goal_door.IsLocked to be false after key consumption")
	}

	// 3. IsGoalLocked should be false
	if state.IsGoalLocked {
		t.Fatalf("Expected state.IsGoalLocked to be false after door unlock")
	}
}

func TestDoor_GoalRoomSingleEntrance(t *testing.T) {
	config := GenerateMap(12345, 100, 100, 10)
	state := NewWorldState()
	LoadMapConfig(state, config)

	if len(state.Doors) == 0 {
		t.Fatalf("Expected map generator to spawn at least 1 Door for Goal Room entrance")
	}

	goalDoor, exists := state.Doors["goal_door"]
	if !exists {
		t.Fatalf("Expected state.Doors to contain 'goal_door'")
	}
	if !goalDoor.IsLocked {
		t.Fatalf("Expected goal_door.IsLocked to default to true")
	}
}
