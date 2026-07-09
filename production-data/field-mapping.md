# Field Mapping — Production Data Import

This document defines the canonical columns for Karkun Connect production imports.

## Rukn Master

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `Name` | Yes | Full name | Amir Khan |
| `Gender` | Yes | `Male` or `Female` (M/F accepted) | Male |
| `Mobile` | No | 10-digit Indian mobile | 9876543210 |
| `WhatsApp` | No | WhatsApp number if different | |
| `Place` | No | Location (defaults to Basavakalyan) | Basavakalyan |
| `Status` | No | `active` or `inactive` | active |
| `Notes` | No | Free text | |
| `ID` | No | Existing Rukn ID for updates (e.g. R001) | R001 |

## Karkun Master

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `Name` | Yes | Full name | Faruq Ali |
| `Gender` | Yes | `Male` or `Female` | Male |
| `Mobile` | Yes | 10-digit Indian mobile | 8861182842 |
| `WhatsApp` | No | WhatsApp number | |
| `Place` | No | Defaults to Basavakalyan | Basavakalyan |
| `Status` | No | `active` or `inactive` | active |
| `Notes` | No | Free text | |
| `Area` | No | Area within Basavakalyan | Ward 3 |
| `Address` | No | Street address | |
| `ID` | No | Existing Karkun ID for updates (e.g. kr-001) | kr-042 |

## Header aliases

The import parser normalizes headers (case-insensitive, collapsed spaces):

- `Phone` → `Mobile`
- `Full Name` → `Name`

## File formats

| Format | Extension | Notes |
|--------|-----------|-------|
| CSV | `.csv` | UTF-8 with or without BOM |
| Excel | `.xlsx`, `.xls` | First worksheet is used |

## Multilingual text

Kannada, Urdu, and English names and places are supported. Save files as UTF-8 CSV or standard Excel Unicode workbooks.

## Conflict matching

Records are matched by:

1. `ID` column (if provided), then
2. `Mobile` number (normalized)

Use the Settings → Data Migration wizard to choose skip, replace, or merge policies.
