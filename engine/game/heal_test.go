package game

import (
	"testing"
)

func TestCombat_HealStaffTeammate(t *testing.T) {
	state := NewWorldState()

	// Player 1 (Healer) and Player 2 (Teammate with 50 HP)
	state.Players["p1"] = PlayerState{
		ID:       "p1",
		Position: Vector3{X: 0, Y: 0, Z: 0},
		HP:       100,
		MaxHP:    100,
	}
	state.Players["p2"] = PlayerState{
		ID:       "p2",
		Position: Vector3{X: 3, Y: 0, Z: 0},
		HP:       50,
		MaxHP:    100,
	}

	// Create a Heal Staff projectile moving from p1 toward p2
	projID := "proj_heal_1"
	state.Projectiles[projID] = Projectile{
		ID:       projID,
		OwnerID:  "p1",
		Position: Vector3{X: 2.5, Y: 0, Z: 0},
		Velocity: Vector3{X: 10, Y: 0, Z: 0},
		Damage:   5,
		MaxRange: 10,
	}

	// Advance 1 tick
	Tick(state)

	p2 := state.Players["p2"]
	if p2.HP != 55 {
		t.Errorf("Expected Teammate p2 HP to be healed to 55 (+5 HP equal to Damage), got %f", p2.HP)
	}

	if _, exists := state.Projectiles[projID]; exists {
		t.Errorf("Expected heal projectile to be consumed on hit, but still exists")
	}
}

func TestCombat_AOEHealingSkillAndMP(t *testing.T) {
	state := NewWorldState()

	isSelfCast := true
	staff := Item{
		ID:              "starter_staff",
		Type:            "ranged",
		Name:            "Heal Staff",
		Damage:          5,
		Heal:            5,
		Range:           7.0,
		ProjectileSpeed: 6.0,
		SkillName:       "Sanctuary",
		SkillType:       "aoe_heal",
		SkillMPCost:     30.0,
		SkillCooldown:   150,
	}

	// Player 1 (Caster at 0,0,0) - HP 40, MP 100
	state.Players["p1"] = PlayerState{
		ID:             "p1",
		Position:       Vector3{X: 0, Y: 0, Z: 0},
		HP:             40,
		MaxHP:          100,
		MP:             100,
		MaxMP:          100,
		EquippedWeapon: &staff,
	}

	// Player 2 (Nearby Teammate at 2.0, 0, 0) - HP 50
	state.Players["p2"] = PlayerState{
		ID:       "p2",
		Position: Vector3{X: 2.0, Y: 0, Z: 0},
		HP:       50,
		MaxHP:    100,
	}

	// Player 3 (Distant Teammate at 6.0, 0, 0) - HP 50
	state.Players["p3"] = PlayerState{
		ID:       "p3",
		Position: Vector3{X: 6.0, Y: 0, Z: 0},
		HP:       50,
		MaxHP:    100,
	}

	state.Tick = 1
	heading := 0.0
	ApplyEvent(state, InputEvent{
		Type:       EventAttack,
		PlayerID:   "p1",
		Tick:       1,
		Heading:    &heading,
		IsSelfCast: &isSelfCast,
	})

	p1 := state.Players["p1"]
	p2 := state.Players["p2"]
	p3 := state.Players["p3"]

	// Assert MP deduction (-30 MP)
	if p1.MP != 70 {
		t.Errorf("Expected Player p1 MP to be deducted to 70 (-30 MP), got %f", p1.MP)
	}

	// Assert Caster LastSkillCastTick and LastHealTick
	if p1.LastSkillCastTick != 1 {
		t.Errorf("Expected Caster p1 LastSkillCastTick to be 1, got %d", p1.LastSkillCastTick)
	}
	if p1.LastHealTick != 1 {
		t.Errorf("Expected Caster p1 LastHealTick to be 1, got %d", p1.LastHealTick)
	}

	// Assert Nearby Teammate LastHealTick (Receiver only, LastSkillCastTick stays 0)
	if p2.LastSkillCastTick != 0 {
		t.Errorf("Expected Receiver p2 LastSkillCastTick to remain 0, got %d", p2.LastSkillCastTick)
	}
	if p2.LastHealTick != 1 {
		t.Errorf("Expected Receiver p2 LastHealTick to be 1, got %d", p2.LastHealTick)
	}

	// Assert Distant Teammate NOT healed (stays 50 HP)
	if p3.HP != 50 {
		t.Errorf("Expected Distant Teammate p3 HP to remain 50 (out of 3.5m radius), got %f", p3.HP)
	}
}
