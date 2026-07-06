# Hooks

Custom React hooks for **karkun-connect**.

Hooks encapsulate reusable stateful logic that can be shared across components and pages.

Examples: `useAuth`, `useFirestore`, `useDebounce`, `useLocalStorage`, `usePermissions`.

**Guidelines:**

- Prefix all hooks with `use`
- Keep hooks focused on a single concern
- Compose lower-level hooks into higher-level ones when needed
