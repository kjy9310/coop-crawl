package game

import "github.com/mkgame2/engine/combat"

// Vector3 represents a position or direction in 3D space
type Vector3 struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	Z float64 `json:"z"`
}

// Item represents an equippable weapon or consumable
type Item struct {
	ID              string  `json:"id"`
	Type            string  `json:"type"` // "melee", "ranged", "consumable"
	Name            string  `json:"name"`
	Position        Vector3 `json:"position"`
	Damage          float64 `json:"damage"`
	Heal            float64 `json:"heal"`
	Range           float64 `json:"range"`
	ProjectileSpeed float64 `json:"projectileSpeed"`
	Length          float64 `json:"length"`
	MinSwingSpeed   float64 `json:"minSwingSpeed"`

	// Weapon-Bound Skill Architecture
	SkillName     string  `json:"skillName,omitempty"`
	SkillType     string  `json:"skillType,omitempty"`
	SkillMPCost   float64 `json:"skillMPCost,omitempty"`
	SkillCooldown uint64  `json:"skillCooldown,omitempty"`
}

// Projectile represents a flying entity (arrow, magic missile)
type Projectile struct {
	ID        string  `json:"id"`
	OwnerID   string  `json:"ownerId"`
	Position  Vector3 `json:"position"`
	Velocity  Vector3 `json:"velocity"`
	Damage    float64 `json:"damage"`
	Distance  float64 `json:"distance"` // Distance traveled so far
	MaxRange  float64 `json:"maxRange"`
}

// PlayerState represents a single player in the game
type PlayerState struct {
	ID             string       `json:"id"`
	Name           string       `json:"name"`
	Position       Vector3      `json:"position"`
	Velocity       Vector3      `json:"velocity"`
	Heading        float64      `json:"heading"` // Radians
	Stats          combat.Stats `json:"stats"`
	HP             float64      `json:"hp"`
	MaxHP          float64      `json:"maxHp"`
	MP             float64      `json:"mp"`
	MaxMP          float64      `json:"maxMp"`
	LastAtkTick    uint64       `json:"lastAtkTick"`
	LastSwingTick  uint64       `json:"lastSwingTick"`
	LastHealTick      uint64       `json:"lastHealTick"`
	LastSkillTick     uint64       `json:"lastSkillTick"`
	LastSkillCastTick uint64       `json:"lastSkillCastTick"`
	TargetPos      *Vector3     `json:"targetPos,omitempty"`
	Inventory      []Item       `json:"inventory"`
	EquippedWeapon *Item        `json:"equippedWeapon"`
	ReachedGoal    bool         `json:"reachedGoal"`
}

type EnemyState struct {
	ID             string       `json:"id"`
	Position       Vector3      `json:"position"`
	Velocity       Vector3      `json:"velocity"`
	Heading        float64      `json:"heading"` // Radians
	Stats          combat.Stats `json:"stats"`
	HP             float64      `json:"hp"`
	MaxHP          float64      `json:"maxHp"`
	LastAtkTick    uint64       `json:"lastAtkTick"`
	TargetID       string       `json:"targetId"`
	EquippedWeapon *Item        `json:"equippedWeapon"`
}

type Spawner struct {
	ID          string  `json:"id"`
	Position    Vector3 `json:"position"`
	Interval    uint64  `json:"interval"` // ticks between spawns
	LastSpawn   uint64  `json:"lastSpawn"`
}

type Wall struct {
	ID       string  `json:"id"`
	Position Vector3 `json:"position"`
	Size     Vector3 `json:"size"` // Width (X), Height (Y), Depth (Z)
}

// MapConfig represents the structural data of a map loaded via JSON
type MapConfig struct {
	ID         string       `json:"id"`
	Name       string       `json:"name"`
	SpawnPoint Vector3      `json:"spawnPoint"`
	ExitPoint  Vector3      `json:"exitPoint"`
	Spawners   []Spawner    `json:"spawners"`
	Walls      []Wall       `json:"walls"`
	Enemies    []EnemyState `json:"enemies"`
	Items      []Item       `json:"items"`
}

// WorldState represents the entire game state at a given tick
type WorldState struct {
	Tick        uint64                 `json:"tick"`
	SpawnPoint  Vector3                `json:"spawnPoint"`
	ExitPoint   Vector3                `json:"exitPoint"`
	GoalPoint   Vector3                `json:"goalPoint"`
	Players     map[string]PlayerState `json:"players"`
	Enemies     map[string]EnemyState  `json:"enemies"`
	Items       map[string]Item        `json:"items"` // Ground items
	Projectiles map[string]Projectile  `json:"projectiles"`
	Spawners    map[string]Spawner     `json:"-"`
	Walls       map[string]Wall        `json:"-"`
}

// NewWorldState initializes a new empty world state
func NewWorldState() *WorldState {
	return &WorldState{
		Tick:        0,
		Players:     make(map[string]PlayerState),
		Enemies:     make(map[string]EnemyState),
		Items:       make(map[string]Item),
		Projectiles: make(map[string]Projectile),
		Spawners:    make(map[string]Spawner),
		Walls:       make(map[string]Wall),
	}
}

// LoadMapConfig applies a parsed MapConfig to the WorldState
func LoadMapConfig(state *WorldState, config MapConfig) {
	state.SpawnPoint = config.SpawnPoint
	state.ExitPoint = config.ExitPoint
	state.GoalPoint = config.ExitPoint
	
	// Clear existing data
	state.Spawners = make(map[string]Spawner)
	state.Walls = make(map[string]Wall)
	state.Enemies = make(map[string]EnemyState)
	state.Items = make(map[string]Item)
	
	for _, s := range config.Spawners {
		state.Spawners[s.ID] = s
	}
	for _, w := range config.Walls {
		state.Walls[w.ID] = w
	}
	for _, e := range config.Enemies {
		state.Enemies[e.ID] = e
	}
	for _, i := range config.Items {
		state.Items[i.ID] = i
	}
}
