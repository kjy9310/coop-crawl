# Co-op Roguelike MVP

실시간 멀티플레이어 협동 로그라이크 게임 (WebAssembly + React + Three.js)

## 🛠️ 기술 스택

| 레이어 | 기술 |
|---|---|
| 게임 엔진 | **Go → TinyGo → WebAssembly** |
| 렌더링 | **React + Three.js (react-three-fiber)** |
| 멀티플레이 네트워크 | **WebRTC P2P (PeerJS)** |
| 상태 관리 | **Zustand** |
| 빌드 인프라 | **Docker / Docker Compose** |

## 📁 프로젝트 구조

```
mkGame2/
├── engine/           # Go 게임 엔진 (WASM으로 빌드)
│   ├── game/         # 시뮬레이터, 물리, 전투, 맵 생성 등
│   ├── combat/       # 전투 로직 패키지
│   ├── main.go       # WASM export 엔트리포인트
│   └── build.sh      # TinyGo 빌드 스크립트
├── client/           # React 프론트엔드
│   ├── src/
│   │   ├── components/   # Player, Enemy, MobileControls 등
│   │   ├── store/        # Zustand 게임 스토어
│   │   ├── network/      # WebRTC PeerManager
│   │   └── App.tsx       # 메인 앱
│   └── public/wasm/  # 빌드된 WASM 파일 (gitignore)
├── server/           # 시그널링 서버 (PeerJS 서버)
├── docs/specs/       # 기능 스펙 문서
└── docker-compose.yml
```

## 🚀 시작하기

### 사전 요구사항

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (엔진 빌드용)
- [Node.js 18+](https://nodejs.org/)

### 1. 의존성 설치

```bash
cd client
npm install
```

### 2. 엔진(WASM) 빌드

```bash
# Docker로 TinyGo 빌드 후 client/public/wasm/ 에 복사
docker compose exec -w /app engine ./build.sh
Copy-Item -Force engine/build/* client/public/wasm/   # Windows PowerShell
# cp engine/build/* client/public/wasm/              # Linux/macOS
```

### 3. 개발 서버 실행

```bash
cd client
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

## 🎮 게임 방법

### PC
| 키 | 동작 |
|---|---|
| `WASD` | 이동 |
| `마우스 이동` | 조준 |
| `마우스 클릭` | 원거리 공격 |
| `E` | 스킬 사용 |
| `G` | 아이템 버리기 |

### 모바일 (세로 모드)
- **왼쪽 조이스틱**: 이동
- **오른쪽 공격존 스와이프**: 스윙 공격
- **오른쪽 공격존 탭**: 현재 방향으로 공격
- **👜 줍기**: 근처 아이템 자동 픽업
- **G 버리기**: 장착 아이템 버리기

## 🏗️ 아키텍처

### 이벤트 기반 동기화

```
[Host]                    [Client]
  │                          │
  ├─ wasmTick() × 30fps      │
  ├─ wasmGetState()          │
  ├─── broadcastState ──────►│
  │                    updateWorldState()
  │
  │◄── sendEvent(move/aim/attack) ──┤
  ├─ wasmApplyEvent()        │
```

- **호스트**: 매 틱 `wasmTick()` → 상태 브로드캐스트
- **클라이언트**: 이벤트만 전송, 호스트로부터 상태 수신
- **결정론적 재현**: 동일 시드 + 이벤트 로그 = 동일 결과

### 엔진 TDD 워크플로우

```
스펙 갱신 → 테스트 작성 → 코드 작성 → 테스트 실행
```

```bash
# Go 단위 테스트 실행
docker compose exec engine go test -v ./game/...
```

## ✨ 주요 기능

- 🗺️ **프로시저럴 맵 생성** (결정론적 시드 기반)
- ⚔️ **근접/원거리/힐 무기** 시스템
- 🧠 **AI 적 스포너** 및 시야(LOS) 시스템
- 🏆 **도착지점 시스템** - 전원 도착 시 완주
- 🎬 **리플레이 저장** - 플레이 기록 JSON 파일 다운로드
- 📱 **모바일 지원** - 세로 모드 가상 조이스틱

## 📋 스펙 문서

- [네트워크 아키텍처](docs/specs/01_network.md)
- [맵 생성](docs/specs/02_map.md)
- [리플레이 시스템](docs/specs/05_replay.md)
