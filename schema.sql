CREATE TABLE IF NOT EXISTS internships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('remote', 'onsite', 'hybrid')),
    status TEXT NOT NULL CHECK (status IN ('applied', 'in-progress', 'completed')),
    stipend REAL DEFAULT 0,
    duration TEXT NOT NULL,
    apply_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);