# 06. Build & WebAssembly Specification

## Overview
The core game engine is written in Go and compiled to WebAssembly (Wasm). It runs client-side inside the browser to provide deterministic 30 TPS simulation for both Host and Client peers.

## Compiler Requirements
- **Compiler**: TinyGo v0.31.2+ (`tinygo build -target wasm`)
- **Reason**: Standard Go (`go build`) generates large Wasm binaries (>2MB) and uses standard Go runtime bindings (`runtime.scheduleTimeoutEvent`). TinyGo produces compact binaries (<500KB) and matches the `wasm_exec.js` provided in `client/public/wasm/`.

## Build Environment & Commands
The build environment is isolated inside Docker (`engine` container).

### Build Script (`engine/build.sh`)
```sh
#!/bin/sh
mkdir -p build
cp $(tinygo env TINYGOROOT)/targets/wasm_exec.js build/
tinygo build -o build/engine.wasm -target wasm ./main.go
```

### Execution Procedure
1. Build Wasm & copy JS bindings inside Docker:
   ```bash
   docker compose exec -w /app engine ./build.sh
   ```
2. Deploy artifacts to Client public assets:
   ```bash
   # Windows PowerShell
   Copy-Item -Force engine/build/* client/public/wasm/

   # Linux / macOS
   cp -f engine/build/* client/public/wasm/
   ```

## Common Pitfalls
- **`LinkError: Import #0 "gojs" "runtime.scheduleTimeoutEvent"`**: Occurs when `engine.wasm` is built using standard Go instead of TinyGo while the client uses TinyGo's `wasm_exec.js`.
- **Solution**: Rebuild using `./build.sh` with TinyGo and re-sync both `engine.wasm` and `wasm_exec.js`.
