package game

import (
	"fmt"
	"math/rand"
	
	"github.com/mkgame2/engine/combat"
)

type Room struct {
	X, Z, W, D int
}

func (r Room) Center() (int, int) {
	return r.X + r.W/2, r.Z + r.D/2
}

func (r Room) Intersects(other Room) bool {
	return r.X <= other.X+other.W && r.X+r.W >= other.X &&
		r.Z <= other.Z+other.D && r.Z+r.D >= other.Z
}

func GenerateMap(seed int64, width, depth, numEnemies int) MapConfig {
	r := rand.New(rand.NewSource(seed))
	
	// Create grid: false = Wall, true = Floor
	grid := make([][]bool, width)
	for x := 0; x < width; x++ {
		grid[x] = make([]bool, depth)
	}
	
	// Generate Rooms
	var rooms []Room
	maxRooms := 30
	minRoomSize := 8
	maxRoomSize := 16
	
	for i := 0; i < maxRooms; i++ {
		w := r.Intn(maxRoomSize-minRoomSize+1) + minRoomSize
		d := r.Intn(maxRoomSize-minRoomSize+1) + minRoomSize
		
		// Ensure room fits within bounds (with 1 padding)
		x := r.Intn(width - w - 2) + 1
		z := r.Intn(depth - d - 2) + 1
		
		newRoom := Room{X: x, Z: z, W: w, D: d}
		
		failed := false
		for _, otherRoom := range rooms {
			if newRoom.Intersects(otherRoom) {
				failed = true
				break
			}
		}
		
		if !failed {
			// Carve room
			for cx := newRoom.X; cx < newRoom.X+newRoom.W; cx++ {
				for cz := newRoom.Z; cz < newRoom.Z+newRoom.D; cz++ {
					grid[cx][cz] = true
				}
			}
			rooms = append(rooms, newRoom)
		}
	}
	
	// Connect rooms with corridors
	for i := 1; i < len(rooms); i++ {
		prevX, prevZ := rooms[i-1].Center()
		currX, currZ := rooms[i].Center()
		
		// Horizontal corridor
		minX, maxX := prevX, currX
		if currX < prevX {
			minX, maxX = currX, prevX
		}
		for x := minX; x <= maxX; x++ {
			grid[x][prevZ] = true
			grid[x][prevZ+1] = true // 2-wide
		}
		
		// Vertical corridor
		minZ, maxZ := prevZ, currZ
		if currZ < prevZ {
			minZ, maxZ = currZ, prevZ
		}
		for z := minZ; z <= maxZ; z++ {
			grid[currX][z] = true
			grid[currX+1][z] = true // 2-wide
		}
	}
	
	// Extract Walls (Simple Horizontal Meshing)
	var walls []Wall
	wallId := 0
	
	for z := 0; z < depth; z++ {
		startX := -1
		for x := 0; x < width; x++ {
			if !grid[x][z] { // Wall
				if startX == -1 {
					startX = x
				}
			} else { // Floor
				if startX != -1 {
					// End of a wall segment
					wLen := float64(x - startX)
					wCenter := float64(startX) + wLen/2.0
					walls = append(walls, Wall{
						ID:       fmt.Sprintf("wall_%d", wallId),
						Position: Vector3{X: wCenter, Y: 1.0, Z: float64(z) + 0.5}, // Center Z is z + 0.5
						Size:     Vector3{X: wLen, Y: 2.0, Z: 1.0},
					})
					wallId++
					startX = -1
				}
			}
		}
		if startX != -1 {
			wLen := float64(width - startX)
			wCenter := float64(startX) + wLen/2.0
			walls = append(walls, Wall{
				ID:       fmt.Sprintf("wall_%d", wallId),
				Position: Vector3{X: wCenter, Y: 1.0, Z: float64(z) + 0.5},
				Size:     Vector3{X: wLen, Y: 2.0, Z: 1.0},
			})
			wallId++
		}
	}
	
	var spawnPoint Vector3
	var exitPoint Vector3
	var items []Item

	if len(rooms) > 0 {
		startRoom := rooms[0]
		sx, sz := startRoom.Center()
		spawnPoint = Vector3{X: float64(sx) + 0.5, Y: 0.0, Z: float64(sz) + 0.5}
		
		endRoom := rooms[len(rooms)-1]
		ex, ez := endRoom.Center()
		exitPoint = Vector3{X: float64(ex) + 0.5, Y: 0.0, Z: float64(ez) + 0.5}
		
		// Spawn Starter Heal Staff 3 units in front of player
		items = append(items, Item{
			ID:              "starter_staff",
			Type:            "ranged",
			Name:            "Heal Staff",
			Position:        Vector3{X: spawnPoint.X - 1.5, Y: 0.5, Z: spawnPoint.Z + 3.0},
			Damage:          5,
			Heal:            5,
			Range:           7.0, // Range 7
			ProjectileSpeed: 6.0, // Slow magic bolt speed
			SkillName:       "Sanctuary",
			SkillType:       "aoe_heal",
			SkillMPCost:     30.0,
			SkillCooldown:   150, // 5 seconds (150 ticks)
		})
		
		// Spawn Starter Greatsword (Long Melee)
		items = append(items, Item{
			ID:            "starter_sword",
			Type:          "melee",
			Name:          "Greatsword (Long)",
			Position:      Vector3{X: spawnPoint.X + 1.5, Y: 0.5, Z: spawnPoint.Z + 3.0},
			Damage:        40,
			Length:        3.5,
			MinSwingSpeed: 7.5,
		})

		// Spawn Starter Dagger (Short Melee)
		items = append(items, Item{
			ID:            "starter_dagger",
			Type:          "melee",
			Name:          "Dagger (Short)",
			Position:      Vector3{X: spawnPoint.X, Y: 0.5, Z: spawnPoint.Z + 3.0},
			Damage:        20,
			Length:        1.2,
			MinSwingSpeed: 5.0,
		})
	}

	// Spawn Enemies
	var enemies []EnemyState
	if len(rooms) > 1 { // Only spawn if there is more than just the start room
		for i := 0; i < numEnemies; i++ {
			// Pick a random room, but NOT the start room (index 0)
			roomIdx := r.Intn(len(rooms)-1) + 1
			room := rooms[roomIdx]
			
			ex := room.X + r.Intn(room.W)
			ez := room.Z + r.Intn(room.D)
			
			enemies = append(enemies, EnemyState{
				ID:       fmt.Sprintf("goblin_%d", i),
				Position: Vector3{X: float64(ex) + 0.5, Y: 0.0, Z: float64(ez) + 0.5},
				Velocity: Vector3{0, 0, 0},
				Heading:  r.Float64() * 6.28, // Random 0 to 2PI
				HP:       100,
				MaxHP:    100,
				Stats:    combat.Stats{Attack: 10, Defense: 5},
			})
		}
	}
	
	return MapConfig{
		ID:         fmt.Sprintf("random_dungeon_%d", seed),
		Name:       "Procedural Dungeon",
		SpawnPoint: spawnPoint,
		ExitPoint:  exitPoint,
		Spawners:   []Spawner{},
		Walls:      walls,
		Enemies:    enemies,
		Items:      items,
	}
}
