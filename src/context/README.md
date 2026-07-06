# Context

React Context definitions for **karkun-connect**.

This folder holds context objects and their TypeScript types — not providers. Contexts define the shape of shared state; providers (in `src/providers/`) supply the values.

Examples:

- `AuthContext` — current user and auth status
- `ThemeContext` — theme preference
- `PermissionsContext` — resolved role permissions

**Guidelines:**

- One context per file, named `{Domain}Context`
- Export the context object and its value type
- Do not place business logic here — keep contexts as typed state contracts
