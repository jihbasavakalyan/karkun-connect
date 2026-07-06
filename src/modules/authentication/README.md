# Authentication Module

User identity, sessions, and access control for **karkun-connect**.

This module owns:

- Sign-in, sign-out, and session lifecycle
- Token and credential management
- Role and permission resolution
- Auth-related service calls and state helpers

Pages in `src/pages/auth/` consume this module; Firebase configuration lives in `src/firebase/`.
