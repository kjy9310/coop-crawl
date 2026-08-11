package game

import (
	"testing"
)

func TestItem_PickupAndDrop(t *testing.T) {
	state := NewWorldState()
	
	// Join player
	joinEv := InputEvent{Type: EventJoin, PlayerID: "player-1", Tick: 0}
	ApplyEvent(state, joinEv)
	
	// Spawn an item at player's position
	state.Items["bow_1"] = Item{
		ID:              "bow_1",
		Type:            "ranged",
		Name:            "Test Bow",
		Position:        Vector3{X: 0, Y: 0, Z: 0},
		Damage:          15,
		Range:           10,
		ProjectileSpeed: 12,
	}

	// Player picks up item
	itemID := "bow_1"
	pickupEv := InputEvent{Type: EventPickup, PlayerID: "player-1", ItemID: &itemID, Tick: 1}
	ApplyEvent(state, pickupEv)

	player := state.Players["player-1"]
	if player.EquippedWeapon == nil {
		t.Fatalf("Expected equipped weapon after pickup, got nil")
	}
	if player.EquippedWeapon.Name != "Test Bow" {
		t.Errorf("Expected weapon 'Test Bow', got '%s'", player.EquippedWeapon.Name)
	}
	if len(state.Items) != 0 {
		t.Errorf("Expected 0 ground items after pickup, got %d", len(state.Items))
	}

	// Player drops item
	dropEv := InputEvent{Type: EventDrop, PlayerID: "player-1", Tick: 2}
	ApplyEvent(state, dropEv)

	playerAfterDrop := state.Players["player-1"]
	if playerAfterDrop.EquippedWeapon != nil {
		t.Fatalf("Expected equipped weapon to be nil after drop, got %v", playerAfterDrop.EquippedWeapon)
	}
	if len(state.Items) != 1 {
		t.Errorf("Expected 1 ground item after drop, got %d", len(state.Items))
	}
}
