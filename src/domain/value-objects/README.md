# Value Objects

Immutable domain value objects for **karkun-connect**.

A **value object** is defined entirely by its attributes — it has no identity. Two value objects are equal if all their attributes are equal. Value objects are immutable; any change produces a new instance.

## Examples (future)

| Value Object   | Attributes                    | Description                        |
| -------------- | ----------------------------- | ---------------------------------- |
| `Email`        | `address`                     | Validated email address            |
| `PhoneNumber`  | `countryCode`, `number`       | Formatted phone number             |
| `DateRange`    | `start`, `end`                | Inclusive date interval            |
| `Address`      | `street`, `city`, `postalCode`| Physical location                  |
| `Role`         | `name`, `permissions`         | User role with permission set      |
| `VisitStatus`  | `value`                       | Enum-like visit state              |

## Guidelines

- Immutable — never mutate; create a new instance on change.
- Self-validating — construction enforces invariants (e.g., valid email format).
- Comparable by value — equality is attribute-based, not reference-based.
- Composable — entities aggregate value objects as properties.

## What does NOT belong here

- Primitive wrappers with no domain meaning (use `utils/` instead)
- UI formatting helpers (use `utils/` or `lib/`)
- Configuration constants (use `constants/` or `config/`)
