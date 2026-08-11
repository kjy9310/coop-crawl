package game

import (
	"testing"
)

func TestSimulator_MultipleClientsJoin(t *testing.T) {
	state := NewWorldState()
	state.Spawners = make(map[string]Spawner)

	events := []InputEvent{
		{Type: EventJoin, PlayerID: "host", Tick: 0},
		{Type: EventJoin, PlayerID: "client-1", Tick: 10},
		{Type: EventJoin, PlayerID: "client-2", Tick: 20},
	}

	for i := 0; i < 30; i++ {
		for _, e := range events {
			if e.Tick == state.Tick {
				ApplyEvent(state, e)
			}
		}
		Tick(state)
	}

	if len(state.Players) != 3 {
		t.Errorf("Expected 3 players, got %d", len(state.Players))
	}
	if _, ok := state.Players["host"]; !ok {
		t.Errorf("Host missing")
	}
	if _, ok := state.Players["client-1"]; !ok {
		t.Errorf("Client-1 missing")
	}
}
