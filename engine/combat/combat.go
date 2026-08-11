package combat

import (
	"math"
)

// Stats represents common attributes for entities in the game
type Stats struct {
	HP             float64 `json:"hp"`
	Attack         float64 `json:"attack"`
	Defense        float64 `json:"defense"`
	CriticalRate   float64 `json:"criticalRate"`
	CriticalDamage float64 `json:"criticalDamage"`
}

// Entity represents any living object in the game (Player, Monster)
type Entity struct {
	ID    string `json:"id"`
	Stats Stats  `json:"stats"`
}

// CalculateDamage computes the damage dealt from an attacker to a defender.
func CalculateDamage(attacker Entity, defender Entity, isCritical bool) float64 {
	baseAttack := attacker.Stats.Attack

	if isCritical {
		baseAttack *= attacker.Stats.CriticalDamage
	}

	damage := baseAttack - defender.Stats.Defense

	// Prevent negative damage
	if damage < 0 {
		damage = 0
	}

	return math.Round(damage*100) / 100 // round to 2 decimal places if needed, but simple test uses integers mainly
}
