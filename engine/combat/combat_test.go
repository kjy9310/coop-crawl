package combat

import (
	"testing"
)

func TestCalculateDamage(t *testing.T) {
	attacker := Entity{
		ID:    "player-1",
		Stats: Stats{Attack: 50, CriticalRate: 0.1, CriticalDamage: 1.5},
	}
	defender := Entity{
		ID:    "monster-1",
		Stats: Stats{Defense: 20, HP: 100},
	}

	// Normal attack test (no critical)
	damage := CalculateDamage(attacker, defender, false)
	
	// Expected damage = Attack - Defense = 50 - 20 = 30
	if damage != 30 {
		t.Errorf("Expected normal damage to be 30, got %f", damage)
	}

	// Critical attack test
	critDamage := CalculateDamage(attacker, defender, true)
	
	// Expected crit damage = (Attack * CriticalDamage) - Defense = (50 * 1.5) - 20 = 75 - 20 = 55
	if critDamage != 55 {
		t.Errorf("Expected critical damage to be 55, got %f", critDamage)
	}
}
