#!/bin/sh

# Create build directory if it doesn't exist
mkdir -p build

# Copy the wasm_exec.js required by TinyGo
cp $(tinygo env TINYGOROOT)/targets/wasm_exec.js build/

# Build the WebAssembly module
tinygo build -o build/engine.wasm -target wasm ./main.go

echo "Wasm build complete."
