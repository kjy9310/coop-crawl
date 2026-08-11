package game

type EventType string

const (
	EventJoin   EventType = "join"
	EventMove   EventType = "move"
	EventAim    EventType = "aim"
	EventPickup EventType = "pickup"
	EventDrop   EventType = "drop"
	EventAttack EventType = "attack"
)

// InputEvent represents an action taken by a player
type InputEvent struct {
	Type     EventType `json:"type"`
	PlayerID string    `json:"playerId"`
	Tick     uint64    `json:"tick"`
	
	// Payload for Join event
	Name *string `json:"name,omitempty"`
	
	// Payload for Move event
	TargetPos *Vector3 `json:"targetPos,omitempty"`
	Dir       *Vector3 `json:"dir,omitempty"` // For WASD continuous movement
	
	// Payload for Aim / Attack events
	Heading      *float64 `json:"heading,omitempty"`
	AngularSpeed *float64 `json:"angularSpeed,omitempty"`
	SwingArc     *float64 `json:"swingArc,omitempty"`
	IsSelfCast   *bool    `json:"isSelfCast,omitempty"`
	
	// Payload for Pickup event
	ItemID    *string  `json:"itemId,omitempty"`
}
