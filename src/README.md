# Source (`src`)

Application source code for **karkun-connect**.

This directory follows a feature-oriented, layered architecture designed for scalability and team collaboration. Each subfolder has a single responsibility and a dedicated README describing its purpose.

## Structure Overview

| Folder        | Responsibility                              |
| ------------- | ------------------------------------------- |
| `assets/`     | Static media (images, icons, fonts)         |
| `components/` | Reusable UI building blocks                 |
| `pages/`      | Route-level page components                 |
| `layouts/`    | Page shell and wrapper layouts              |
| `routes/`     | Route definitions and navigation config     |
| `modules/`    | Feature-domain logic (auth, visits, etc.)   |
| `services/`   | Cross-cutting and external API integration  |
| `firebase/`   | Firebase SDK setup and configuration        |
| `context/`    | React Context type definitions              |
| `providers/`  | React Context provider components           |
| `hooks/`      | Custom React hooks                          |
| `config/`     | Environment and app configuration           |
| `lib/`        | Third-party library wrappers and adapters   |
| `types/`      | Shared TypeScript type definitions          |
| `utils/`      | Pure helper and utility functions           |
| `constants/`  | Application-wide constant values            |
| `styles/`     | Global styles, themes, and design tokens    |

Entry points (`main.tsx`, `App.tsx`) remain at this level until routing is implemented.
