# Data Migration (M6.8)

Karkun Connect includes a browser-based production data migration framework.

## Import wizard

**Admin → Settings → Data Migration**

Six-step guided flow:

1. Select file (Rukn or Karkun master)
2. Preview rows and columns
3. Validation (errors block import)
4. Conflict detection (skip / replace / merge)
5. Import (automatic backup, transactional rollback)
6. Summary report

## Code locations

| Module | Path |
|--------|------|
| File parser | `src/lib/migration/migrationFileParser.ts` |
| Validation engine | `src/lib/migration/migrationValidationEngine.ts` |
| Import executor | `src/lib/migration/migrationImportExecutor.ts` |
| Backup / restore | `src/lib/migration/migrationBackupService.ts` |
| Export | `src/lib/migration/migrationExportService.ts` |
| Wizard UI | `src/components/migration/DataMigrationWizard.tsx` |
| Templates | `production-data/` |

## Verification

```bash
npm run verify:migration
npm run verify:rc1
```

## Templates

Generate Excel templates:

```bash
npm run migrate:templates
```

See `production-data/field-mapping.md` and `production-data/validation-rules.md`.
