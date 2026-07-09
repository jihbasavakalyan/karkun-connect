# Validation Rules — Production Data Import

Rules enforced by the Data Migration wizard (`src/lib/migration/migrationValidationEngine.ts`).

## Blocking errors (import cannot proceed)

| Rule | Code | Description |
|------|------|-------------|
| Missing header row | `missing_required` | File must include a header row |
| Missing `Name` column | `missing_required` | Required for all imports |
| Missing `Gender` column | `missing_required` | Required for all imports |
| Missing `Mobile` column | `missing_required` | Required for Karkun imports |
| Empty name | `missing_name` | Each data row must have a name |
| Invalid gender | `invalid_gender` | Must be Male/Female (M/F accepted) |
| Missing mobile | `missing_mobile` | Karkun rows require mobile |
| Invalid mobile format | `invalid_mobile` | Must be valid 10-digit Indian mobile when provided |
| Duplicate mobile in file | `duplicate_mobile_in_file` | Same mobile twice in one file |
| Duplicate ID in file | `duplicate_id_in_file` | Same ID twice in one file |

## Warnings (import can proceed)

| Rule | Code | Description |
|------|------|-------------|
| Unexpected columns | `unexpected_column` | Columns not in the field mapping |
| Blank row | `blank_row` | Empty row ignored |
| Empty Rukn mobile | `missing_mobile` | Allowed for Rukn — warning only |
| Unknown status | `unknown_value` | Status not active/inactive |
| Existing record match | `existing_record` | Mobile or ID matches existing data |
| Similar name | `unknown_value` | Name fuzzy-matches existing person |

## Conflict resolution

When a row matches an existing record of the same type:

| Policy | Behavior |
|--------|----------|
| **Skip** | Keep existing record; skip import row |
| **Replace** | Overwrite contact fields from import row |
| **Merge** | Fill only empty fields on existing record |

## Transaction safety

1. Automatic JSON backup before import
2. Snapshot of people + connections state
3. Rollback if import produces zero successful inserts/updates
4. Validation errors block import entirely — no partial writes from invalid files

## QA scenarios

| Scenario | Expected result |
|----------|-----------------|
| Empty file | Error: no rows |
| Large file | Preview first rows; full validation |
| Duplicate file | `duplicate_mobile_in_file` errors |
| Wrong headers | `missing_required` errors |
| Wrong encoding | UTF-8 BOM stripped; garbled text if not UTF-8 |
| Missing values | Row-level errors per rule |
| Unexpected columns | Warning; import continues if required columns present |
| Rollback | Failed all-row import restores prior snapshot |
