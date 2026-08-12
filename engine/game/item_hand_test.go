package game

import (
	"testing"
)

func TestItem_HandEquipAndDrop(t *testing.T) {
	state := NewWorldState()

	state.Players["p1"] = PlayerState{
		ID:       "p1",
		Position: Vector3{X: 0, Y: 0, Z: 0},
		HP:       100,
	}

	// 1. Add and Pickup Dagger (Right Hand)
	state.Items["dagger1"] = Item{
		ID:       "dagger1",
		Name:     "Short Dagger",
		Type:     "melee",
		HandType: HandRight,
		Position: Vector3{X: 0.5, Y: 0, Z: 0},
		Damage:   15,
	}

	daggerID := "dagger1"
	ApplyEvent(state, InputEvent{
		Type:     EventPickup,
		PlayerID: "p1",
		ItemID:   &daggerID,
	})

	p1 := state.Players["p1"]
	if p1.EquippedRightHand == nil || p1.EquippedRightHand.ID != "dagger1" {
		t.Fatalf("Expected dagger1 in EquippedRightHand")
	}

	// 2. Add and Pickup Torch (Left Hand)
	state.Items["torch1"] = Item{
		ID:          "torch1",
		Name:        "Wooden Torch",
		Type:        "torch",
		HandType:    HandLeft,
		Position:    Vector3{X: 0.5, Y: 0, Z: 0},
		LightRadius: 6.0,
	}

	torchID := "torch1"
	ApplyEvent(state, InputEvent{
		Type:     EventPickup,
		PlayerID: "p1",
		ItemID:   &torchID,
	})

	p1 = state.Players["p1"]
	if p1.EquippedLeftHand == nil || p1.EquippedLeftHand.ID != "torch1" {
		t.Fatalf("Expected torch1 in EquippedLeftHand")
	}
	if p1.EquippedRightHand == nil || p1.EquippedRightHand.ID != "dagger1" {
		t.Fatalf("Expected dagger1 to remain in EquippedRightHand while holding torch in Left Hand")
	}

	// 3. Add and Pickup Greatsword (Two-Handed) -> should unequip Left Hand Torch
	state.Items["sword1"] = Item{
		ID:       "sword1",
		Name:     "Greatsword",
		Type:     "melee",
		HandType: HandTwoHanded,
		Position: Vector3{X: 0.5, Y: 0, Z: 0},
		Damage:   40,
	}

	swordID := "sword1"
	ApplyEvent(state, InputEvent{
		Type:     EventPickup,
		PlayerID: "p1",
		ItemID:   &swordID,
	})

	p1 = state.Players["p1"]
	if p1.EquippedRightHand == nil || p1.EquippedRightHand.ID != "sword1" {
		t.Fatalf("Expected sword1 in EquippedRightHand")
	}
	if p1.EquippedLeftHand != nil {
		t.Fatalf("Expected EquippedLeftHand to be nil when equipping two-handed weapon")
	}
}
