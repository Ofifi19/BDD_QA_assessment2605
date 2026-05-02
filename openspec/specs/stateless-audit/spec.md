# stateless-audit Specification

## Purpose

TBD - created by archiving change 'prepare-for-deployment'. Update Purpose after archive.

## Requirements

### Requirement: Stateless BDD Audit Endpoint
The system SHALL provide a POST endpoint at `/api/audit-stateless` that accepts BDD text directly in the request body and returns a quality audit report.

#### Scenario: Successful audit of provided text
- **WHEN** user sends a POST request with valid Gherkin text to `/api/audit-stateless`
- **THEN** system returns a 200 OK response with the quality audit JSON report

---
### Requirement: Frontend stateless integration
The frontend SHALL be updated to call the `/api/audit-stateless` endpoint when performing an audit on a newly generated BDD specification that hasn't been saved to the database yet.

#### Scenario: Audit new generation
- **WHEN** user generates a new BDD and clicks "Quality Audit"
- **THEN** frontend sends the BDD text to `/api/audit-stateless` and displays the result
