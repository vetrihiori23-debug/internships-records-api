# Internship Records REST API

## Project Overview
A beginner-friendly REST API built using Node.js, Express.js, and SQLite to manage internship records.

## Features
- Create, read, update, and delete internship records (CRUD)
- SQLite database for persistent storage
- Input validation for internship data
- Pagination for listing records
- JSON request and response format

## Technologies Used
- Node.js
- Express.js
- SQLite with better-sqlite3

## Prerequisites
Install Node.js and npm before running this project.

## Installation and Setup
1. Clone or download this repository.
2. Open a terminal in the project folder.
3. Install dependencies:

   `npm install`

4. Start the server:

   `npm start`

5. Open the API in your browser:

   `http://localhost:3000/api/internships`

The server runs locally on port 3000.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/internships` | List internships with pagination |
| GET | `/api/internships/:id` | Get one internship |
| POST | `/api/internships` | Create an internship |
| PUT | `/api/internships/:id` | Update an internship |
| DELETE | `/api/internships/:id` | Delete an internship |

## Pagination Example
`GET /api/internships?page=1&limit=5`

## Sample JSON Request

```json
{
  "title": "Python Developer Intern",
  "company": "Tech Solutions",
  "mode": "remote",
  "status": "applied",
  "stipend": 5000,
  "duration": "2 months",
  "apply_url": "https://example.com/python"
}
```

## Allowed Values
- **mode:** `remote`, `onsite`, `hybrid`
- **status:** `applied`, `in-progress`, `completed`

## Database Files
- `schema.sql` — creates the internships table.
- `seed.sql` — contains sample internship records.
- `internships.db` — SQLite database generated when the server runs.

## Notes
The API is intended for local development and learning. Use valid JSON request bodies when creating or updating records.
