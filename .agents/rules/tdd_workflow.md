# Spec-Driven TDD Workflow Rule

Whenever adding or modifying features in this codebase, ALWAYS adhere strictly to the following 4-step sequence:

1. **Update Specifications (`docs/specs/`)**:
   - First update or create the relevant specification file (e.g. `01_network.md`, `02_physics.md`, `03_combat.md`, `04_ai.md`).
   - Define clear BDD scenarios and mechanics.

2. **Write Spec-based Unit Tests**:
   - Write or update unit tests in `engine/game/` (e.g. `item_test.go`, `heal_test.go`, `physics_test.go`) derived directly from the BDD scenarios.

3. **Implement Feature Code**:
   - Implement the feature in Go engine (`engine/game/`) and React client (`client/src/`).

4. **Run Tests & Verify**:
   - Run Go unit tests in Docker:
     ```sh
     docker compose exec engine go test -v ./game/...
     ```
   - Verify all tests pass (100% PASS) before declaring completion.
