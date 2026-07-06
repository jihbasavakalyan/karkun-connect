# Config

Application configuration for **karkun-connect**.

Centralized, environment-aware configuration values that are not runtime constants.

Examples:

- Environment variable mappings (`VITE_*` keys)
- Feature flags
- API base URLs and timeout settings
- Firebase project config references

**Guidelines:**

- Read env vars once here; import config elsewhere — never read `import.meta.env` scattered across the codebase
- Separate dev/staging/production overrides clearly
- Do not store secrets in source; use environment variables only
