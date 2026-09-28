# ShiftPlanner - Employee Shift Roster and Swap Requests

Spring Boot 3.3 REST API (Java 21, MySQL, Spring Data JPA, Springdoc Swagger) for small retail and
manufacturing teams. Managers build weekly rosters; employees request shift swaps that need colleague
acceptance and manager approval before the roster changes.

## Requirements

- JDK 21
- Maven 3.9+
- MySQL 8 running on localhost:3306

## MySQL configuration

The database `shiftplanner` is created automatically (`createDatabaseIfNotExist=true`) and tables are created
by Hibernate (`ddl-auto=update`). Credentials come from environment variables:

- `DB_USERNAME` (default `root`)
- `DB_PASSWORD` (default empty, so you must set it if root has a password)

PowerShell:

    $env:DB_PASSWORD = 'your-mysql-password'

Use single quotes so characters like `$` are kept as typed. Never commit passwords.

## Run

    mvn spring-boot:run

- API: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui.html
- OpenAPI JSON: http://localhost:8080/v3/api-docs

Sample data (6 employees, 3 shifts, 8 roster entries for next Monday to Wednesday) is loaded on startup
only when the employees table is empty.

## Data model

- `employees` 1 --- N `rosters`: each roster row assigns one employee to one shift on one date.
- `shifts` 1 --- N `rosters`.
- `swap_requests` N --- 1 `rosters`, and two links to `employees` (requester and colleague).

## Endpoints

Employees: `POST /api/employees`, `GET /api/employees`, `GET /api/employees/{id}`,
`PUT /api/employees/{id}`, `DELETE /api/employees/{id}` (deactivates, keeps history).

Shifts: `POST /api/shifts`, `GET /api/shifts`, `GET /api/shifts/{id}`, `PUT /api/shifts/{id}`,
`DELETE /api/shifts/{id}` (blocked if used in a roster).

Rosters: `POST /api/rosters`, `GET /api/rosters/{id}`, `GET /api/rosters/date/{yyyy-MM-dd}`,
`GET /api/rosters/week?startDate=yyyy-MM-dd`, `DELETE /api/rosters/{id}`.

Swaps: `POST /api/swaps`, `GET /api/swaps`, `GET /api/swaps/{id}`, `PUT /api/swaps/{id}/accept`,
`PUT /api/swaps/{id}/decline`, `PUT /api/swaps/{id}/manager/approve`, `PUT /api/swaps/{id}/manager/reject`.

## Swap workflow

    PENDING_COLLEAGUE --accept--> COLLEAGUE_ACCEPTED --manager approve--> COMPLETED (roster updated)
    PENDING_COLLEAGUE --decline--> COLLEAGUE_DECLINED
    COLLEAGUE_ACCEPTED --manager reject--> MANAGER_REJECTED

The roster changes only when the colleague has accepted AND the manager approves, inside one transaction.
`MANAGER_APPROVED` is a transient step inside that transaction; the saved status is `COMPLETED`.

## Business rules

- An employee cannot have overlapping shifts on the same date (night shifts that end after midnight are handled).
- Inactive employees cannot be rostered or take part in swaps.
- Employee code and email are unique.
- A shift's start and end time cannot be equal.
- A shift used in a roster cannot be deleted; a roster with an active swap cannot be deleted.
- Swap requester must own the roster entry; self-swaps are rejected; one active swap per roster entry.
- Manager approval before colleague acceptance is rejected.
- Final validation at approval: the roster still belongs to the requester, the colleague is still active and
  has no overlapping shift. On failure nothing is changed.

## Error format

    { "timestamp": "...", "status": 409, "error": "Business Rule Violation", "message": "...", "path": "..." }

Status codes: 400 validation or bad input, 404 not found, 409 business rule or duplicate, 500 unexpected.

## Testing the workflow

With the app running, in a second terminal:

    powershell -ExecutionPolicy Bypass -File scripts\workflow-test.ps1

Manual flow in Swagger: create two employees and a shift, create a roster for employee A, create a swap
(A to B), accept it, then approve it, then GET the roster and check it belongs to B with status SWAPPED.

## Future enhancements

No authentication yet: manager endpoints are open by design for now. Planned: login and roles, notifications,
automated tests, and overlap checks across midnight between consecutive dates.