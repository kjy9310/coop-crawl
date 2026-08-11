# Project Context — coop-crawl

## 프로젝트 개요
실시간 멀티플레이어 협동 로그라이크 게임
- GitHub: https://github.com/kjy9310/coop-crawl
- 기술: Go(TinyGo→Wasm) + React + Three.js + WebRTC P2P

## 모노레포 구조
```
mkGame2/
├── engine/        # Go 게임 엔진 → TinyGo → engine.wasm
│   ├── game/      # simulator.go, state.go, event.go, mapgen.go ...
│   └── combat/    # 전투 로직 패키지
├── client/        # Vite + React + react-three-fiber
│   ├── src/
│   │   ├── App.tsx              # 메인: 게임 루프, 입력, 네트워크
│   │   ├── components/
│   │   │   ├── Player.tsx       # 3D 플레이어 + 네임태그 + HP바
│   │   │   ├── Enemy.tsx
│   │   │   ├── MobileControls.tsx  # 모바일 가상 조이스틱 + 공격존
│   │   │   └── ...
│   │   ├── store/gameStore.ts   # Zustand 상태
│   │   └── network/PeerManager.ts  # WebRTC P2P
│   └── public/wasm/             # 빌드 산출물 (gitignore)
├── docs/specs/                  # 기능 스펙 문서
└── docker-compose.yml
```

## 핵심 아키텍처
- **Host/Client 구조**: Host가 wasmTick() 30fps 루프 실행 후 상태 브로드캐스트
- **이벤트 방식**: Client는 move/aim/attack/pickup/drop 이벤트만 Host에 전송
- **결정론적**: 동일 seed + event log → 동일 게임 결과 (리플레이 가능)

## 주요 게임 이벤트 타입
| 이벤트 | 필드 |
|--------|------|
| join | playerId, name, tick |
| move | playerId, tick, dir{x,y,z} |
| aim | playerId, tick, heading, angularSpeed, swingArc |
| attack | playerId, tick, heading |
| pickup | playerId, tick, itemId |
| drop | playerId, tick |
| map | seed |

## 현재 구현된 기능
- 프로시저럴 맵 생성 (결정론적 시드)
- 근접/원거리/힐 무기 + 장착 시스템
- 스킬 시스템 (무기별 종속 스킬, MP 소모, 쿨다운)
- AI 적 스포너 + 시야(LOS) 시스템
- 도착지점(GOAL): 전원 도착 시 완주
- 리플레이: 완주 후 JSON 파일 다운로드
- 모바일 세로 모드: 가상 조이스틱 + 공격존 + 줍기/버리기
- 캐릭터 이름: 로비 입력 → 3D 네임태그 표시
- 도착 알림: 한 명이라도 도착하면 우측 슬라이드 알림

## Go 엔진 주요 파일
- `engine/game/simulator.go` — Tick(), ApplyEvent(), AllPlayersReachedGoal()
- `engine/game/state.go` — WorldState, PlayerState(Name 포함), EnemyState
- `engine/game/event.go` — InputEvent (Name *string 포함)
- `engine/game/mapgen.go` — GenerateMap()
- `engine/game/replay_test.go` — 14개 단위 테스트

## TDD 규칙 (항상 준수)
1. 스펙 문서 갱신 (docs/specs/)
2. 테스트 작성
3. 코드 구현
4. 테스트 실행: `docker compose exec engine go test -v ./game/...`

## Wasm 빌드 명령 (Windows PowerShell)
```powershell
docker compose exec -w /app engine ./build.sh
Copy-Item -Force engine/build/* client/public/wasm/
```
