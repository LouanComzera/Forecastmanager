const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Error opening database:", err);
    else {
        db.run(`CREATE TABLE IF NOT EXISTS store (
            key TEXT PRIMARY KEY,
            value TEXT
        )`, (err) => {
            if (err) console.error("Error creating table:", err);
        });
    }
});

// API Endpoints
app.get('/api/state', (req, res) => {
    db.all(`SELECT key, value FROM store`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const state = {};
        rows.forEach(row => {
            try {
                state[row.key] = JSON.parse(row.value);
            } catch (e) {
                state[row.key] = row.value;
            }
        });
        res.json(state);
    });
});

app.post('/api/state', (req, res) => {
    const state = req.body;
    if (!state || typeof state !== 'object') return res.status(400).json({ error: 'Invalid state' });

    db.serialize(() => {
        const stmt = db.prepare(`INSERT INTO store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`);
        Object.keys(state).forEach(key => {
            stmt.run(key, JSON.stringify(state[key]));
        });
        stmt.finalize();
        res.json({ success: true });
    });
});

// Protect sensitive directories and serve static files
app.use((req, res, next) => {
    if (req.path.startsWith('/data') || req.path.endsWith('.sqlite')) {
        return res.status(403).send('Forbidden');
    }
    next();
});

app.use(express.static(__dirname));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
