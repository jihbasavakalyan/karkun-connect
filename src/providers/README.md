# Providers

React Context providers for **karkun-connect**.

Providers wrap the application (or route subtrees) and supply context values defined in `src/context/`. They compose hooks, services, and module logic into consumable state for components.

Examples:

- `AuthProvider` — wraps `AuthContext`, manages session state
- `ThemeProvider` — applies theme and persists preference
- `AppProviders` — root composition of all global providers

**Guidelines:**

- Providers belong here; context definitions belong in `src/context/`
- Use a single `AppProviders` at the root to compose global providers
- Keep providers focused — delegate logic to hooks and modules
