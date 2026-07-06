# Services

Business logic and external API integration for **karkun-connect**.

Services encapsulate data fetching, mutations, and domain logic. They act as the bridge between UI layers and backend/Firebase.

Examples: `userService`, `notificationService`, `reportService`.

**Guidelines:**

- Services should be framework-agnostic (no React imports)
- Return typed data using definitions from `src/types/`
- Handle errors consistently and propagate meaningful messages to callers
