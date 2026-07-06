# Pages

Route-level page components for **karkun-connect**.

Each page maps to a route and represents a full screen or view. Pages compose components, hooks, and services but should remain thin — delegating logic to lower layers.

## Subfolders

| Folder    | Purpose                                    |
| --------- | ------------------------------------------ |
| `admin/`  | Administrator portal pages                 |
| `rukn/`   | Rukn (member) portal pages                 |
| `auth/`   | Authentication pages (login, register)     |
| `shared/` | Cross-role pages (profile, settings, etc.) |

**Convention:** One page component per file, named with a `Page` suffix (e.g., `DashboardPage.tsx`).
