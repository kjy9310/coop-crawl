import { create } from 'zustand';

// Assuming Vector3 is defined exactly as in Go
export interface Vector3 { x: number; y: number; z: number; }
export interface Item { id: string; type: string; handType?: 'right' | 'left' | 'twoHanded' | 'any'; name: string; position: Vector3; damage?: number; heal?: number; range?: number; projectileSpeed?: number; length?: number; minSwingSpeed?: number; lightRadius?: number; lightColor?: string; lightIntensity?: number; skillName?: string; skillType?: string; skillMPCost?: number; skillCooldown?: number; }
export interface Projectile { id: string; ownerId: string; type?: string; position: Vector3; velocity: Vector3; }
export interface PlayerState { id: string; name?: string; position: Vector3; velocity: Vector3; heading: number; hp: number; maxHp: number; mp?: number; maxMp?: number; lastSwingTick?: number; lastHealTick?: number; lastSkillCastTick?: number; reachedGoal?: boolean; inventory: Item[]; equippedRightHand?: Item; equippedLeftHand?: Item; equippedWeapon?: Item; }
export interface EnemyState { id: string; position: Vector3; velocity: Vector3; heading: number; hp: number; maxHp: number; equippedWeapon?: Item; }
export interface Spawner { id: string; position: Vector3; interval: number; lastSpawn: number; }
export interface Wall {
  id: string;
  position: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
}

export interface Door {
  id: string;
  isLocked: boolean;
  position: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
}

export interface WorldState { 
  tick: number; 
  goalPoint?: Vector3;
  exitPoint?: Vector3;
  isGoalLocked?: boolean;
  players: Record<string, PlayerState>; 
  enemies: Record<string, EnemyState>;
  items: Record<string, Item>;
  projectiles: Record<string, Projectile>;
  spawners: Record<string, Spawner>;
  walls: Record<string, Wall>;
  doors?: Record<string, Door>;
}

interface GameStore {
  isWasmLoaded: boolean;
  setWasmLoaded: (loaded: boolean) => void;
  worldState: WorldState | null;
  updateWorldState: (state: WorldState) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  isWasmLoaded: false,
  setWasmLoaded: (loaded) => set({ isWasmLoaded: loaded }),
  worldState: null,
  updateWorldState: (state) => set({ worldState: state }),
}));
