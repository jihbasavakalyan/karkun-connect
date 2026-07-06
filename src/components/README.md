# Components

Reusable UI building blocks for **karkun-connect**.

Components are organized by domain and responsibility. Each subfolder contains related components with a barrel `index.ts` for clean imports.

## Subfolders

| Folder       | Purpose                                           |
| ------------ | ------------------------------------------------- |
| `common/`    | Shared components used across multiple features   |
| `layout/`    | Structural components (headers, sidebars, footers)|
| `forms/`     | Form controls, inputs, and validation wrappers    |
| `dashboard/` | Dashboard-specific widgets and data displays      |
| `ui/`        | Primitive, design-system-level UI elements        |

**Import convention:** `import { Button } from '@/components/ui'`
