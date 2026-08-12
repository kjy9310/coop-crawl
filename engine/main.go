package main

import (
	"encoding/json"
	"fmt"
	"syscall/js"
	
	"github.com/mkgame2/engine/game"
)

var currentState *game.WorldState

func main() {
	fmt.Println("Engine Wasm Initialized")
	currentState = game.NewWorldState()

	// Register functions to JS global scope
	js.Global().Set("wasmInitState", js.FuncOf(wasmInitState))
	js.Global().Set("wasmLoadMap", js.FuncOf(wasmLoadMap))
	js.Global().Set("wasmGenerateMap", js.FuncOf(wasmGenerateMap))
	js.Global().Set("wasmApplyEvent", js.FuncOf(wasmApplyEvent))
	js.Global().Set("wasmTick", js.FuncOf(wasmTick))
	js.Global().Set("wasmGetState", js.FuncOf(wasmGetState))
	
	// Keep the WebAssembly module running
	select {}
}

func wasmGenerateMap(this js.Value, args []js.Value) any {
	if len(args) < 1 {
		return "error: expected seed"
	}
	var seed int64
	if args[0].Type() == js.TypeNumber {
		seed = int64(args[0].Float())
	}
	
	// Default random map size 100x100, 20 enemies
	config := game.GenerateMap(seed, 100, 100, 20)
	game.LoadMapConfig(currentState, config)
	
	bytes, err := json.Marshal(config)
	if err != nil {
		return "{}"
	}
	return string(bytes)
}

func wasmLoadMap(this js.Value, args []js.Value) any {
	if len(args) < 1 {
		return "error: expected JSON string map config"
	}
	jsonStr := args[0].String()
	var config game.MapConfig
	if err := json.Unmarshal([]byte(jsonStr), &config); err != nil {
		return "error: " + err.Error()
	}
	game.LoadMapConfig(currentState, config)
	return nil
}

func wasmInitState(this js.Value, args []js.Value) any {
	currentState = game.NewWorldState()
	return nil
}

func wasmApplyEvent(this js.Value, args []js.Value) any {
	if len(args) < 1 {
		return "error: expected JSON string event"
	}
	jsonStr := args[0].String()
	var event game.InputEvent
	if err := json.Unmarshal([]byte(jsonStr), &event); err != nil {
		return "error: " + err.Error()
	}
	game.ApplyEvent(currentState, event)
	return nil
}

func wasmTick(this js.Value, args []js.Value) any {
	game.Tick(currentState)
	return nil
}

func wasmGetState(this js.Value, args []js.Value) any {
	b, err := json.Marshal(currentState)
	if err != nil {
		return "{}"
	}
	return string(b)
}
