# Wasm Build & Compiler Guidelines

## Critical Rules for Wasm Engine Build

1. **Compiler Standard: TinyGo Only**
   - The Go engine MUST be compiled using **TinyGo** (`tinygo build -o ... -target wasm`), NOT standard `go build`.
   - Standard `go build` produces incompatible JS runtime bindings for `wasm_exec.js`, leading to runtime errors like `LinkError: Import #0 "gojs" "runtime.scheduleTimeoutEvent"`.

2. **Docker Execution Environment**
   - Wasm compilation must be executed inside the `engine` Docker container (or via Docker image `golang:1.22-alpine` with TinyGo installed).
   - Command to build Wasm and sync bindings:
     ```sh
     # 1. Execute build inside engine container
     docker compose exec -w /app engine ./build.sh

     # 2. Sync build output (engine.wasm and matching wasm_exec.js) to client
     # PowerShell:
     Copy-Item -Force engine/build/* client/public/wasm/
     # Bash:
     cp -f engine/build/* client/public/wasm/
     ```

3. **Runtime Synchronization**
   - Always ensure both `engine.wasm` AND `wasm_exec.js` are updated together in `client/public/wasm/`.
   - Never replace `engine.wasm` without updating `wasm_exec.js` from the exact same TinyGo version.
