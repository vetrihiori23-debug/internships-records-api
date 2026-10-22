const express = require("express");
const Database = require("better-sqlite3");

const app = express();
const db = new Database("internships.db");
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Create database table
db.exec(`
  CREATE TABLE IF NOT EXISTS internships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'remote'
      CHECK (mode IN ('remote', 'onsite', 'hybrid')),
    status TEXT NOT NULL DEFAULT 'applied'
      CHECK (status IN ('applied', 'in-progress', 'completed')),
    stipend REAL NOT NULL DEFAULT 0 CHECK (stipend >= 0),
    duration TEXT NOT NULL DEFAULT 'Not specified',
    apply_url TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// Add sample data when database is empty
const count = db.prepare(
  "SELECT COUNT(*) AS total FROM internships"
).get().total;

if (count === 0) {
  const insert = db.prepare(`
    INSERT INTO internships
    (title, company, mode, status, stipend, duration, apply_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    "Full Stack Developer Intern", "Demo Tech",
    "remote", "applied", 0, "4 weeks",
    "https://example.com"
  );

  insert.run(
    "Web Development Intern", "Sample Solutions",
    "hybrid", "in-progress", 5000, "8 weeks",
    "https://example.org"
  );
}

const allowedModes = ["remote", "onsite", "hybrid"];
const allowedStatuses = ["applied", "in-progress", "completed"];

function validate(body, partial = false) {
  const errors = [];
  const fields = [
    "title", "company", "mode", "status",
    "stipend", "duration", "apply_url"
  ];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return ["Body must be a JSON object."];
  }

  const unknown = Object.keys(body).filter(
    key => !fields.includes(key)
  );

  if (unknown.length) {
    errors.push("Unknown fields: " + unknown.join(", "));
  }

  for (const field of ["title", "company"]) {
    if (!partial || body[field] !== undefined) {
      if (typeof body[field] !== "string" || !body[field].trim()) {
        errors.push(field + " must be a non-empty string.");
      } else if (body[field].trim().length > 150) {
        errors.push(field + " cannot exceed 150 characters.");
      }
    }
  }

  if (body.mode !== undefined &&
      !allowedModes.includes(body.mode)) {
    errors.push("mode must be remote, onsite, or hybrid.");
  }

  if (body.status !== undefined &&
      !allowedStatuses.includes(body.status)) {
    errors.push("Invalid status.");
  }

  if (body.stipend !== undefined &&
      (typeof body.stipend !== "number" ||
       !Number.isFinite(body.stipend) || body.stipend < 0)) {
    errors.push("stipend must be a non-negative number.");
  }

  if (body.duration !== undefined &&
      (typeof body.duration !== "string" ||
       !body.duration.trim() || body.duration.length > 100)) {
    errors.push("duration must be a non-empty string (max 100 characters).");
  }

  if (body.apply_url !== undefined) {
    if (typeof body.apply_url !== "string") {
      errors.push("apply_url must be a string.");
    } else if (body.apply_url !== "") {
      try {
        const url = new URL(body.apply_url);
        if (!["http:", "https:"].includes(url.protocol)) {
          errors.push("apply_url must use HTTP or HTTPS.");
        }
      } catch {
        errors.push("apply_url must be a valid URL.");
      }
    }
  }

  return errors;
}

function sendError(res, status, message, details) {
  const error = { message };
  if (details) error.details = details;
  return res.status(status).json({ success: false, error });
}

// GET: List internships with pagination
app.get("/api/internships", (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  if (!Number.isInteger(page) || page < 1 ||
      !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return sendError(res, 400, "Invalid pagination parameters.", [
      "page must be at least 1; limit must be between 1 and 100."
    ]);
  }

  const total = db.prepare(
    "SELECT COUNT(*) AS total FROM internships"
  ).get().total;

  const data = db.prepare(`
    SELECT * FROM internships
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(limit, (page - 1) * limit);

  res.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

// GET: Get one internship
app.get("/api/internships/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return sendError(res, 400, "Invalid internship ID.");
  }

  const record = db.prepare(
    "SELECT * FROM internships WHERE id = ?"
  ).get(id);

  if (!record) {
    return sendError(res, 404, "Internship not found.");
  }

  res.json({ success: true, data: record });
});

// POST: Create internship
app.post("/api/internships", (req, res) => {
  const errors = validate(req.body);

  if (errors.length) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  const b = req.body;

  const result = db.prepare(`
    INSERT INTO internships
    (title, company, mode, status, stipend, duration, apply_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    b.title.trim(),
    b.company.trim(),
    b.mode ?? "remote",
    b.status ?? "applied",
    b.stipend ?? 0,
    b.duration?.trim() || "Not specified",
    b.apply_url ?? ""
  );

  const record = db.prepare(
    "SELECT * FROM internships WHERE id = ?"
  ).get(result.lastInsertRowid);

  res.status(201).json({ success: true, data: record });
});

// PUT: Update internship fields
app.put("/api/internships/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return sendError(res, 400, "Invalid internship ID.");
  }

  const existing = db.prepare(
    "SELECT * FROM internships WHERE id = ?"
  ).get(id);

  if (!existing) {
    return sendError(res, 404, "Internship not found.");
  }

  const errors = validate(req.body, true);

  if (errors.length) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  if (Object.keys(req.body).length === 0) {
    return sendError(res, 400, "Provide at least one field to update.");
  }

  const b = { ...existing, ...req.body };

  const updated = {
    title: b.title.trim(),
    company: b.company.trim(),
    mode: b.mode,
    status: b.status,
    stipend: b.stipend,
    duration: b.duration.trim(),
    apply_url: b.apply_url
  };

  db.prepare(`
    UPDATE internships SET
      title = ?, company = ?, mode = ?, status = ?,
      stipend = ?, duration = ?, apply_url = ?
    WHERE id = ?
  `).run(
    updated.title, updated.company, updated.mode,
    updated.status, updated.stipend, updated.duration,
    updated.apply_url, id
  );

  const record = db.prepare(
    "SELECT * FROM internships WHERE id = ?"
  ).get(id);

  res.json({ success: true, data: record });
});

// DELETE: Remove internship
app.delete("/api/internships/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return sendError(res, 400, "Invalid internship ID.");
  }

  const result = db.prepare(
    "DELETE FROM internships WHERE id = ?"
  ).run(id);

  if (result.changes === 0) {
    return sendError(res, 404, "Internship not found.");
  }

  res.json({
    success: true,
    message: "Internship deleted successfully."
  });
});

// Handle invalid JSON and unexpected errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return sendError(res, 400, "Invalid JSON body.");
  }

  console.error(err);
  return sendError(res, 500, "Internal server error.");
});

app.listen(PORT, () => {
  console.log(`Internship API running at http://localhost:${PORT}`);
});