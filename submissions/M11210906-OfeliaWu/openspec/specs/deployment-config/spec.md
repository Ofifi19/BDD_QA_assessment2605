# deployment-config Specification

## Purpose

TBD - created by archiving change 'prepare-for-deployment'. Update Purpose after archive.

## Requirements

### Requirement: Secure credential management
The system SHALL NOT commit the `.env` file or any hardcoded API keys to the Git repository.

#### Scenario: Environment variable usage
- **WHEN** system starts in a production environment (e.g., Render)
- **THEN** system SHALL read `GEMINI_API_KEY` from the environment variables

---
### Requirement: Database and asset exclusion
The system SHALL exclude the SQLite database file and uploaded asset files from the Git repository via `.gitignore`.

#### Scenario: File exclusion
- **WHEN** user runs `git status` after local usage
- **THEN** `bdd_generator.db` and files in the `uploads/` directory SHALL NOT appear as tracked or untracked files
