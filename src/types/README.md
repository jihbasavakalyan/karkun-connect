# Types

Shared TypeScript type definitions for **karkun-connect**.

Centralized type definitions ensure consistency across the codebase.

Examples: `User`, `Rukn`, `Notification`, API response shapes, and enum types.

**Guidelines:**

- Group types by domain (e.g., `user.types.ts`, `auth.types.ts`)
- Export all public types through the barrel `index.ts`
- Avoid duplicating types — import from here rather than redefining locally
