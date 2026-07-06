# Lib

Third-party library wrappers and adapters for **karkun-connect**.

This folder isolates external dependencies behind stable internal interfaces. If a library is swapped or upgraded, changes stay localized here.

Examples:

- Date library adapter (e.g., Day.js wrapper)
- HTTP client instance and interceptors
- Form validation schema helpers
- Logging adapter

**Guidelines:**

- Do not import third-party libraries directly in components when a wrapper exists here
- Keep wrappers thin — pass through only what the app needs
- No business logic; that belongs in `src/modules/` or `src/services/`
