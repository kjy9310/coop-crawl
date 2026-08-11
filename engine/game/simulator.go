package game

import (
	"fmt"
	"math"
	"github.com/mkgame2/engine/combat"
)

const (
	MoveSpeed     = 5.0  // Units per second
	EnemySpeed    = 3.0  // Units per second
	TickRate      = 30.0 // Ticks per second
	DeltaTime     = 1.0 / TickRate
	AttackRange   = 1.5
	AttackCooldown = 30 // Ticks (1 second)
)

func distance(a, b Vector3) float64 {
	dx := a.X - b.X
	dy := a.Y - b.Y
	dz := a.Z - b.Z
	return math.Sqrt(dx*dx + dy*dy + dz*dz)
}

func checkCollision(pos Vector3, radius float64, walls map[string]Wall) bool {
	for _, wall := range walls {
		halfW := wall.Size.X / 2.0
		halfD := wall.Size.Z / 2.0

		// Fast AABB culling
		if wall.Position.X+halfW+radius < pos.X || wall.Position.X-halfW-radius > pos.X ||
			wall.Position.Z+halfD+radius < pos.Z || wall.Position.Z-halfD-radius > pos.Z {
			continue
		}

		closestX := math.Max(wall.Position.X-halfW, math.Min(pos.X, wall.Position.X+halfW))
		closestZ := math.Max(wall.Position.Z-halfD, math.Min(pos.Z, wall.Position.Z+halfD))

		dx := pos.X - closestX
		dz := pos.Z - closestZ

		if (dx*dx + dz*dz) < (radius*radius) {
			return true
		}
	}
	return false
}

func lineIntersectSegment(p1, p2, p3, p4 Vector3) bool {
	ccw := func(a, b, c Vector3) float64 {
		return (c.Z-a.Z)*(b.X-a.X) - (b.Z-a.Z)*(c.X-a.X)
	}
	return (ccw(p1, p3, p4)*ccw(p2, p3, p4) < 0) && (ccw(p1, p2, p3)*ccw(p1, p2, p4) < 0)
}

// lineCircleIntersect checks if line segment AB intersects circle at C with radius R
func lineCircleIntersect(a, b, c Vector3, r float64) bool {
	abX := b.X - a.X
	abZ := b.Z - a.Z
	acX := c.X - a.X
	acZ := c.Z - a.Z
	
	abLenSq := abX*abX + abZ*abZ
	if abLenSq == 0 {
		return (acX*acX + acZ*acZ) <= r*r
	}
	
	t := (acX*abX + acZ*abZ) / abLenSq
	t = math.Max(0.0, math.Min(1.0, t))
	
	closestX := a.X + t*abX
	closestZ := a.Z + t*abZ
	
	dx := c.X - closestX
	dz := c.Z - closestZ
	return (dx*dx + dz*dz) <= r*r
}

func checkWeaponWallCollision(playerPos Vector3, heading float64, length float64, walls map[string]Wall) bool {
	step := 0.3
	for dist := 0.4; dist <= length; dist += step {
		samplePoint := Vector3{
			X: playerPos.X + math.Sin(heading)*dist,
			Y: playerPos.Y,
			Z: playerPos.Z + math.Cos(heading)*dist,
		}
		if checkCollision(samplePoint, 0.25, walls) {
			return true
		}
	}
	return false
}

func hasLineOfSight(posA, posB Vector3, walls map[string]Wall) bool {
	minX := math.Min(posA.X, posB.X)
	maxX := math.Max(posA.X, posB.X)
	minZ := math.Min(posA.Z, posB.Z)
	maxZ := math.Max(posA.Z, posB.Z)

	for _, wall := range walls {
		halfW := wall.Size.X / 2.0
		halfD := wall.Size.Z / 2.0

		// Fast AABB culling against the line's bounding box
		if wall.Position.X+halfW < minX || wall.Position.X-halfW > maxX ||
			wall.Position.Z+halfD < minZ || wall.Position.Z-halfD > maxZ {
			continue
		}

		c1 := Vector3{X: wall.Position.X - halfW, Z: wall.Position.Z - halfD}
		c2 := Vector3{X: wall.Position.X + halfW, Z: wall.Position.Z - halfD}
		c3 := Vector3{X: wall.Position.X + halfW, Z: wall.Position.Z + halfD}
		c4 := Vector3{X: wall.Position.X - halfW, Z: wall.Position.Z + halfD}

		if lineIntersectSegment(posA, posB, c1, c2) ||
			lineIntersectSegment(posA, posB, c2, c3) ||
			lineIntersectSegment(posA, posB, c3, c4) ||
			lineIntersectSegment(posA, posB, c4, c1) {
			return false
		}
	}
	return true
}

// AllPlayersReachedGoal returns true if all non-dead players have reached the Goal Zone
func AllPlayersReachedGoal(state *WorldState) bool {
	if len(state.Players) == 0 {
		return false
	}
	for _, player := range state.Players {
		if player.HP > 0 && !player.ReachedGoal {
			return false
		}
	}
	return true
}

// ApplyEvent mutates the WorldState based on the given InputEvent
func ApplyEvent(state *WorldState, event InputEvent) {
	switch event.Type {
	case EventJoin:
		if _, exists := state.Players[event.PlayerID]; !exists {
			name := "Player"
			if event.Name != nil && *event.Name != "" {
				name = *event.Name
			}
			state.Players[event.PlayerID] = PlayerState{
				ID:       event.PlayerID,
				Name:     name,
				Position: state.SpawnPoint,
				Velocity: Vector3{0, 0, 0},
				HP:       100,
				MaxHP:    100,
				MP:       100,
				MaxMP:    100,
				Stats:    combat.Stats{Attack: 20, Defense: 5, CriticalRate: 0.1, CriticalDamage: 1.5},
			}
		}
	case EventAim:
		if player, exists := state.Players[event.PlayerID]; exists && player.HP > 0 {
			if event.Heading != nil {
				targetHeading := *event.Heading

				// Continuous Sweep Rotation Collision Check for Melee Weapon
				if player.EquippedWeapon != nil && player.EquippedWeapon.Type == "melee" {
					weaponLen := player.EquippedWeapon.Length
					if weaponLen <= 0 {
						weaponLen = 2.0
					}

					angleDiff := targetHeading - player.Heading
					for angleDiff < -math.Pi {
						angleDiff += 2 * math.Pi
					}
					for angleDiff > math.Pi {
						angleDiff -= 2 * math.Pi
					}

					stepAngle := 0.08 // ~4.5 degrees per step
					steps := int(math.Ceil(math.Abs(angleDiff) / stepAngle))
					if steps < 1 {
						steps = 1
					}

					validHeading := player.Heading
					stepDir := 1.0
					if angleDiff < 0 {
						stepDir = -1.0
					}

					for i := 1; i <= steps; i++ {
						testAngle := player.Heading + stepDir*float64(i)*(math.Abs(angleDiff)/float64(steps))
						if checkWeaponWallCollision(player.Position, testAngle, weaponLen, state.Walls) {
							// Hit wall along sweep path! Stop rotation at last valid heading!
							break
						}
						validHeading = testAngle
					}

					player.Heading = validHeading
				} else {
					player.Heading = targetHeading
				}
				
				// Dynamic Melee Swing Physics Attack
				if player.EquippedWeapon != nil && player.EquippedWeapon.Type == "melee" && event.AngularSpeed != nil {
					minSpeed := player.EquippedWeapon.MinSwingSpeed
					if minSpeed <= 0 {
						minSpeed = 7.0 // Default min angular speed rad/s
					}
					
					minArc := math.Pi / 3.0 // Minimum 60 degrees continuous swing arc requirement
					hasEnoughArc := event.SwingArc == nil || *event.SwingArc >= minArc
					
					if math.Abs(*event.AngularSpeed) >= minSpeed && hasEnoughArc && state.Tick >= player.LastAtkTick+8 {
						player.LastSwingTick = state.Tick
						weaponLen := player.EquippedWeapon.Length
						if weaponLen <= 0 {
							weaponLen = 2.0 // Default length
						}
						
						// Calculate weapon tip position
						tip := Vector3{
							X: player.Position.X + math.Sin(player.Heading)*weaponLen,
							Y: player.Position.Y,
							Z: player.Position.Z + math.Cos(player.Heading)*weaponLen,
						}
						
						// Check Wall Deflection: Only hit enemies if weapon is NOT hitting a wall!
						if !checkWeaponWallCollision(player.Position, player.Heading, weaponLen, state.Walls) {
							// Check hits on enemies
							hitAny := false
							for eId, enemy := range state.Enemies {
								if lineCircleIntersect(player.Position, tip, enemy.Position, 0.8) {
									dmg := combat.CalculateDamage(
										combat.Entity{Stats: player.Stats},
										combat.Entity{Stats: enemy.Stats},
										false,
									)
									if player.EquippedWeapon.Damage > 0 {
										dmg += player.EquippedWeapon.Damage
									}
									enemy.HP -= dmg
									hitAny = true
									
									if enemy.HP <= 0 {
										delete(state.Enemies, eId)
									} else {
										state.Enemies[eId] = enemy
									}
								}
							}
							
							if hitAny {
								player.LastAtkTick = state.Tick
							}
						}
					}
				}
				
				state.Players[event.PlayerID] = player
			}
		}
	case EventMove:
		if player, exists := state.Players[event.PlayerID]; exists && player.HP > 0 {
			if event.Dir != nil {
				// WASD directional movement
				player.TargetPos = nil
				player.Velocity = Vector3{
					X: event.Dir.X * MoveSpeed,
					Y: 0,
					Z: event.Dir.Z * MoveSpeed,
				}
			} else if event.TargetPos != nil {
				// Point and click movement
				player.TargetPos = event.TargetPos
			}
			state.Players[event.PlayerID] = player
		}
	case EventPickup:
		if player, exists := state.Players[event.PlayerID]; exists && player.HP > 0 {
			if event.ItemID != nil {
				if item, itemExists := state.Items[*event.ItemID]; itemExists {
					// Check distance
					if distance(player.Position, item.Position) < 2.0 {
						player.Inventory = append(player.Inventory, item)
						// Auto-equip if no weapon equipped
						if player.EquippedWeapon == nil {
							player.EquippedWeapon = &item
						}
						state.Players[event.PlayerID] = player
						delete(state.Items, *event.ItemID)
					}
				}
			}
		}
	case EventDrop:
		if player, exists := state.Players[event.PlayerID]; exists && player.HP > 0 {
			if player.EquippedWeapon != nil {
				droppedItem := *player.EquippedWeapon
				droppedItem.ID = fmt.Sprintf("item_drop_%d_%s", state.Tick, player.ID)
				// Drop 1 unit in front of player
				droppedItem.Position = Vector3{
					X: player.Position.X + math.Sin(player.Heading)*1.0,
					Y: 0.5,
					Z: player.Position.Z + math.Cos(player.Heading)*1.0,
				}
				state.Items[droppedItem.ID] = droppedItem
				player.EquippedWeapon = nil
				state.Players[event.PlayerID] = player
			}
		}
	case EventAttack:
		if player, exists := state.Players[event.PlayerID]; exists && player.HP > 0 {
			if player.EquippedWeapon != nil && player.EquippedWeapon.Type == "ranged" {
				if player.LastAtkTick == 0 || state.Tick >= player.LastAtkTick+35 { // Cooldown (35 ticks ~ 1.17s)
					player.LastAtkTick = state.Tick

					// Check Weapon-Bound Skill Execution (IsSelfCast == true via E key)
					if event.IsSelfCast != nil && *event.IsSelfCast {
						if player.EquippedWeapon == nil || player.EquippedWeapon.SkillType == "" {
							// Weapon has no bound skill!
							return
						}

						mpCost := player.EquippedWeapon.SkillMPCost
						if mpCost <= 0 {
							mpCost = 30.0
						}
						cdTicks := player.EquippedWeapon.SkillCooldown
						if cdTicks <= 0 {
							cdTicks = 150
						}

						if player.MP < mpCost {
							// Not enough MP!
							return
						}
						if player.LastSkillTick > 0 && state.Tick < player.LastSkillTick+cdTicks {
							// Skill on cooldown!
							return
						}

						player.MP -= mpCost
						player.LastSkillTick = state.Tick
						player.LastHealTick = state.Tick
						player.LastSkillCastTick = state.Tick
						player.LastAtkTick = state.Tick

						switch player.EquippedWeapon.SkillType {
						case "aoe_heal":
							healRadius := 3.5
							healAmount := player.EquippedWeapon.Damage * 2.0
							if healAmount <= 0 {
								healAmount = 10.0
							}
							for pId, pTarget := range state.Players {
								if pTarget.HP > 0 && distance(player.Position, pTarget.Position) <= healRadius {
									pTarget.HP += healAmount
									if pTarget.HP > pTarget.MaxHP {
										pTarget.HP = pTarget.MaxHP
									}
									pTarget.LastHealTick = state.Tick
									state.Players[pId] = pTarget
									if pId == event.PlayerID {
										player.HP = pTarget.HP
									}
								}
							}
						}

						state.Players[event.PlayerID] = player
						return
					}

					// Standard Ranged Projectile
					if event.Heading != nil {
						player.Heading = *event.Heading
						state.Players[event.PlayerID] = player

						projID := fmt.Sprintf("proj_%d_%s", state.Tick, player.ID)
						speed := player.EquippedWeapon.ProjectileSpeed
						if speed <= 0 {
							speed = 10
						}

						maxRange := player.EquippedWeapon.Range
						if maxRange <= 0 {
							maxRange = 15
						}

						state.Projectiles[projID] = Projectile{
							ID:       projID,
							OwnerID:  player.ID,
							Position: player.Position,
							Velocity: Vector3{
								X: math.Sin(player.Heading) * speed,
								Y: 0,
								Z: math.Cos(player.Heading) * speed,
							},
							Damage:   player.EquippedWeapon.Damage,
							MaxRange: maxRange,
						}
					}
				}
			}
		}
	}
}

// Tick advances the world state by one frame
func Tick(state *WorldState) {
	state.Tick++

	// 1. Spawner Logic
	for id, spawner := range state.Spawners {
		if len(state.Enemies) < 10 && state.Tick >= spawner.LastSpawn+spawner.Interval {
			enemyId := fmt.Sprintf("enemy_%d_%s", state.Tick, spawner.ID)
			
			// Randomly give some enemies a bow
			var weapon *Item = nil
			if (state.Tick % 2) == 0 {
				weapon = &Item{
					ID:              "bow_" + enemyId,
					Type:            "ranged",
					Name:            "Goblin Bow",
					Damage:          5,
					Range:           15,
					ProjectileSpeed: 10,
				}
			}

			state.Enemies[enemyId] = EnemyState{
				ID:             enemyId,
				Position:       spawner.Position,
				HP:             50,
				MaxHP:          50,
				Stats:          combat.Stats{Attack: 10, Defense: 2},
				EquippedWeapon: weapon,
			}
			spawner.LastSpawn = state.Tick
			state.Spawners[id] = spawner
		}
	}

	// 2. Player Logic (Movement & Auto Attack)
	for id, player := range state.Players {
		if player.HP <= 0 {
			player.Velocity = Vector3{0, 0, 0}
			player.TargetPos = nil
			state.Players[id] = player
			continue
		}

		// MP Regeneration (+2 MP/sec => +0.067 per 30Hz tick)
		if player.MP < player.MaxMP {
			player.MP = math.Min(player.MaxMP, player.MP+0.067)
		}

		// Check Goal Zone Reach
		if !player.ReachedGoal && (state.GoalPoint.X != 0 || state.GoalPoint.Z != 0) {
			if distance(player.Position, state.GoalPoint) <= 2.5 {
				player.ReachedGoal = true
			}
		}

		// Move based on TargetPos if exists (without dangerous teleport snapping)
		if player.TargetPos != nil {
			dx := player.TargetPos.X - player.Position.X
			dz := player.TargetPos.Z - player.Position.Z
			dist := math.Sqrt(dx*dx + dz*dz)
			
			if dist < 0.2 {
				player.Velocity = Vector3{0, 0, 0}
				player.TargetPos = nil // Reached target
			} else {
				player.Velocity = Vector3{
					X: (dx / dist) * MoveSpeed,
					Y: 0,
					Z: (dz / dist) * MoveSpeed,
				}
			}
		}

		// Apply velocity with robust sliding collision detection & physical weapon wall blocking
		radius := 0.4
		nextX := player.Position.X + player.Velocity.X*DeltaTime
		nextZ := player.Position.Z + player.Velocity.Z*DeltaTime
		
		isWeaponBlocked := func(p Vector3) bool {
			if player.EquippedWeapon != nil && player.EquippedWeapon.Type == "melee" {
				return checkWeaponWallCollision(p, player.Heading, player.EquippedWeapon.Length, state.Walls)
			}
			return false
		}

		fullPos := Vector3{X: nextX, Y: player.Position.Y, Z: nextZ}
		xPos := Vector3{X: nextX, Y: player.Position.Y, Z: player.Position.Z}
		zPos := Vector3{X: player.Position.X, Y: player.Position.Y, Z: nextZ}

		// 1. Try full movement
		if !checkCollision(fullPos, radius, state.Walls) && !isWeaponBlocked(fullPos) {
			player.Position.X = nextX
			player.Position.Z = nextZ
		} else {
			// 2. Corner/Wall hit: Try X-only slide
			xAllowed := !checkCollision(xPos, radius, state.Walls) && !isWeaponBlocked(xPos)
			// 3. Corner/Wall hit: Try Z-only slide
			zAllowed := !checkCollision(zPos, radius, state.Walls) && !isWeaponBlocked(zPos)

			if xAllowed {
				player.Position.X = nextX
			} else {
				player.Velocity.X = 0
			}

			if zAllowed {
				player.Position.Z = nextZ
			} else {
				player.Velocity.Z = 0
			}

			// If both blocked (corner collision), stop TargetPos
			if !xAllowed && !zAllowed {
				player.TargetPos = nil
			}
		}
		
		// Find nearest enemy to attack
		var nearestEnemy *EnemyState
		minDist := math.MaxFloat64
		
		for eId, enemy := range state.Enemies {
			dist := distance(player.Position, enemy.Position)
			if dist < minDist {
				minDist = dist
				// copy to mutate safely
				e := state.Enemies[eId]
				nearestEnemy = &e
			}
		}

		// Player attacks Enemy if alive (Melee auto-attack fallback)
		if player.HP > 0 && nearestEnemy != nil && minDist <= AttackRange && state.Tick >= player.LastAtkTick+AttackCooldown {
			// Only auto-attack if NO ranged weapon equipped
			if player.EquippedWeapon == nil || player.EquippedWeapon.Type != "ranged" {
				dmg := combat.CalculateDamage(
					combat.Entity{Stats: player.Stats},
					combat.Entity{Stats: nearestEnemy.Stats},
					false,
				)
				nearestEnemy.HP -= dmg
				player.LastAtkTick = state.Tick
				
				if nearestEnemy.HP <= 0 {
					delete(state.Enemies, nearestEnemy.ID)
				} else {
					state.Enemies[nearestEnemy.ID] = *nearestEnemy
				}
			}
		}
		
		// Check Arrival at ExitPoint
		if state.ExitPoint.X != 0 || state.ExitPoint.Z != 0 {
			dx := player.Position.X - state.ExitPoint.X
			dz := player.Position.Z - state.ExitPoint.Z
			if (dx*dx + dz*dz) < 4.0 {
				fmt.Println("Player", id, "reached the ExitPoint!")
				// Later we can trigger next floor here
			}
		}

		state.Players[id] = player
	}

	// 3. Enemy Logic (AI Movement & Auto Attack)
	for eId, enemy := range state.Enemies {
		var nearestPlayer *PlayerState
		var minDist float64 = math.MaxFloat64
		AggroRange := 8.0

		for _, p := range state.Players {
			if p.HP <= 0 {
				continue
			}
			
			d := distance(enemy.Position, p.Position)
			if d > AggroRange {
				continue // Too far
			}

			// Angle to player
			dx := p.Position.X - enemy.Position.X
			dz := p.Position.Z - enemy.Position.Z
			angleToPlayer := math.Atan2(dx, dz)
			
			// Difference in angles
			angleDiff := math.Abs(angleToPlayer - enemy.Heading)
			for angleDiff > math.Pi {
				angleDiff = math.Abs(angleDiff - 2*math.Pi)
			}
			
			if angleDiff > math.Pi/3 { 
				continue // Outside of 120 degree FOV cone
			}

			// Line of sight check
			if !hasLineOfSight(enemy.Position, p.Position, state.Walls) {
				continue // Blocked by wall
			}

			if d < minDist {
				minDist = d
				temp := p
				nearestPlayer = &temp
			}
		}

		if nearestPlayer != nil {
			enemy.TargetID = nearestPlayer.ID
		} else {
			enemy.TargetID = ""
		}
			
		// Enemy AI: Move towards Target and Attack
		if enemy.TargetID != "" {
			if target, exists := state.Players[enemy.TargetID]; exists && target.HP > 0 {
				dist := distance(enemy.Position, target.Position)
				
				// Ranged Weapon AI
				if enemy.EquippedWeapon != nil && enemy.EquippedWeapon.Type == "ranged" {
					if dist < enemy.EquippedWeapon.Range {
						enemy.Velocity = Vector3{0, 0, 0}
						
						// Attack
						if state.Tick >= enemy.LastAtkTick+60 { // Enemy fire rate
							dx := target.Position.X - enemy.Position.X
							dz := target.Position.Z - enemy.Position.Z
							heading := math.Atan2(dx, dz)
							enemy.Heading = heading
							enemy.LastAtkTick = state.Tick
							
							projID := fmt.Sprintf("proj_%d_%s", state.Tick, enemy.ID)
							state.Projectiles[projID] = Projectile{
								ID:       projID,
								OwnerID:  enemy.ID,
								Position: enemy.Position,
								Velocity: Vector3{
									X: math.Sin(heading) * enemy.EquippedWeapon.ProjectileSpeed,
									Y: 0,
									Z: math.Cos(heading) * enemy.EquippedWeapon.ProjectileSpeed,
								},
								Damage:   enemy.EquippedWeapon.Damage + enemy.Stats.Attack,
								Distance: 0,
								MaxRange: enemy.EquippedWeapon.Range,
							}
						}
					} else {
						// Move closer
						dx := target.Position.X - enemy.Position.X
						dz := target.Position.Z - enemy.Position.Z
						enemy.Heading = math.Atan2(dx, dz)
						enemy.Velocity = Vector3{
							X: (dx / dist) * EnemySpeed,
							Y: 0,
							Z: (dz / dist) * EnemySpeed,
						}
					}
				} else {
					// Melee AI
					if dist < AttackRange {
						enemy.Velocity = Vector3{0, 0, 0}
						if state.Tick >= enemy.LastAtkTick+AttackCooldown {
							dmg := combat.CalculateDamage(
								combat.Entity{Stats: enemy.Stats},
								combat.Entity{Stats: target.Stats},
								false,
							)
							target.HP -= dmg
							enemy.LastAtkTick = state.Tick
							state.Players[target.ID] = target
						}
					} else {
						dx := target.Position.X - enemy.Position.X
						dz := target.Position.Z - enemy.Position.Z
						enemy.Heading = math.Atan2(dx, dz)
						enemy.Velocity = Vector3{
							X: (dx / dist) * EnemySpeed,
							Y: 0,
							Z: (dz / dist) * EnemySpeed,
						}
					}
				}
			} else {
				enemy.TargetID = ""
				enemy.Velocity = Vector3{0, 0, 0}
			}
		} else {
			// No target, stop moving and look around (Idle)
			enemy.Velocity = Vector3{0, 0, 0}
			enemy.TargetID = ""
			
			// Rotate 90 degrees per second (math.Pi / 2.0 radians per 30 ticks)
			enemy.Heading += (math.Pi / 2.0) / 30.0
			
			// Normalize heading to [-Pi, Pi]
			for enemy.Heading > math.Pi {
				enemy.Heading -= 2 * math.Pi
			}
		}
		
		// Apply Velocity for Enemy (Corner & Diagonal safe)
		if enemy.Velocity.X != 0 || enemy.Velocity.Z != 0 {
			radius := 0.4
			nextX := enemy.Position.X + enemy.Velocity.X*DeltaTime
			nextZ := enemy.Position.Z + enemy.Velocity.Z*DeltaTime
			
			if !checkCollision(Vector3{X: nextX, Y: enemy.Position.Y, Z: nextZ}, radius, state.Walls) {
				enemy.Position.X = nextX
				enemy.Position.Z = nextZ
			} else {
				if !checkCollision(Vector3{X: nextX, Y: enemy.Position.Y, Z: enemy.Position.Z}, radius, state.Walls) {
					enemy.Position.X = nextX
				}
				if !checkCollision(Vector3{X: enemy.Position.X, Y: enemy.Position.Y, Z: nextZ}, radius, state.Walls) {
					enemy.Position.Z = nextZ
				}
			}
		}
		
		state.Enemies[eId] = enemy
	}

	// 4. Projectiles Logic
	for pId, proj := range state.Projectiles {
		// Move
		dx := proj.Velocity.X * DeltaTime
		dz := proj.Velocity.Z * DeltaTime
		
		distMoved := math.Sqrt(dx*dx + dz*dz)
		proj.Distance += distMoved
		proj.Position.X += dx
		proj.Position.Z += dz

		if proj.Distance > proj.MaxRange {
			delete(state.Projectiles, pId)
			continue
		}

		// Check Wall Collision
		if checkCollision(proj.Position, 0.1, state.Walls) {
			delete(state.Projectiles, pId)
			continue
		}

		// Check Entity Collision
		hit := false
		
		// If Player fired it, check Enemies AND Teammate Players (for Healing)
		if _, isPlayer := state.Players[proj.OwnerID]; isPlayer {
			// 1. Check Enemies
			for eId, enemy := range state.Enemies {
				if distance(proj.Position, enemy.Position) < 0.8 {
					enemy.HP -= proj.Damage
					if enemy.HP <= 0 {
						delete(state.Enemies, eId)
					} else {
						state.Enemies[eId] = enemy
					}
					hit = true
					break
				}
			}

			// 2. Check Teammates (Co-op Healing)
			if !hit {
				for pId, player := range state.Players {
					if pId != proj.OwnerID && player.HP > 0 && distance(proj.Position, player.Position) < 0.8 {
						healAmount := proj.Damage
						if healAmount <= 0 {
							healAmount = 5.0
						}
						player.HP += healAmount
						if player.HP > player.MaxHP {
							player.HP = player.MaxHP
						}
						player.LastHealTick = state.Tick
						state.Players[pId] = player
						hit = true
						break
					}
				}
			}
		} else {
			// If Enemy fired it, check Players
			for pIdx, player := range state.Players {
				if player.HP > 0 && distance(proj.Position, player.Position) < 0.8 {
					player.HP -= proj.Damage
					state.Players[pIdx] = player
					hit = true
					break
				}
			}
		}

		if hit {
			delete(state.Projectiles, pId)
		} else {
			state.Projectiles[pId] = proj
		}
	}
}
