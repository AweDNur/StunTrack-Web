const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./config/db');
const { verifyToken, checkRole } = require('./middlewares/auth');
const upload = require('./middlewares/upload');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); 

// ==========================================
// 1. AUTHENTICATION (Semua Role)
// ==========================================
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role]
        );
        res.status(201).json({ message: 'User berhasil didaftarkan' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: 'User tidak ditemukan' });

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Password salah' });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, role: user.role, name: user.name, id: user.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 2. GUEST & ADMIN: Konten Edukasi
// ==========================================
// Guest (Public) - Melihat konten 
app.get('/api/contents', async (req, res) => {
    try {
        const [contents] = await db.query('SELECT * FROM contents ORDER BY created_at DESC');
        res.json(contents);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Guest - Melihat kategori dan contoh dataset label AI
app.get('/api/labels', async (req, res) => {
    try {
        const gender = typeof req.query.gender === 'string' ? req.query.gender : '';
        const label = typeof req.query.label === 'string' ? req.query.label : '';
        const requestedLimit = Number.parseInt(String(req.query.limit || '5'), 10);
        const requestedOffset = Number.parseInt(String(req.query.offset || '0'), 10);
        const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 5;
        const offset = Number.isFinite(requestedOffset) ? Math.max(requestedOffset, 0) : 0;
        const conditions = [];
        const values = [];

        if (gender) {
            conditions.push('td.gender = ?');
            values.push(gender);
        }
        if (label) {
            conditions.push('td.manual_label = ?');
            values.push(label);
        }

        const whereClause = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
        const [data] = await db.query(
            `SELECT td.*, u.name AS volunteer_name FROM training_data td LEFT JOIN users u ON u.id = td.volunteer_id${whereClause} ORDER BY td.created_at ASC, td.id ASC LIMIT ? OFFSET ?`,
            [...values, limit, offset]
        );
        const [[countRow]] = await db.query(`SELECT COUNT(*) AS total FROM training_data td${whereClause}`, values);
        const [categoryRows] = await db.query(
            'SELECT gender, manual_label AS label, COUNT(*) AS count FROM training_data GROUP BY gender, manual_label'
        );
        const total = Number(countRow.total || 0);

        res.json({
            data,
            total,
            hasMore: offset + data.length < total,
            categories: Array.isArray(categoryRows) ? categoryRows : [],
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin - Menambah konten edukasi (CMS)
app.post('/api/admin/contents', verifyToken, checkRole(['admin']), upload.single('image'), async (req, res) => {
    const { title, body_text } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    try {
        await db.query(
            'INSERT INTO contents (admin_id, title, body_text, image_url) VALUES (?, ?, ?, ?)',
            [req.user.id, title, body_text, image_url]
        );
        res.status(201).json({ message: 'Konten berhasil ditambahkan' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 3. USER: Profil Bayi & Scan AI (Graph Tracking)
// ==========================================
app.get('/api/user/babies', verifyToken, checkRole(['user']), async (req, res) => {
    try {
        const [babies] = await db.query(
            'SELECT id, name, gender, birth_date FROM babies WHERE user_id = ? ORDER BY name ASC',
            [req.user.id]
        );
        res.json(babies);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/user/babies', verifyToken, checkRole(['user']), async (req, res) => {
    const { name, gender, birth_date } = req.body;
    try {
        const [existingBabies] = await db.query(
            'SELECT id FROM babies WHERE user_id = ? AND name = ? AND birth_date = ? LIMIT 1',
            [req.user.id, name, birth_date]
        );

        if (existingBabies.length > 0) {
            return res.status(200).json({
                message: 'Profil bayi sudah tersedia',
                baby_id: existingBabies[0].id,
            });
        }

        const [result] = await db.query(
            'INSERT INTO babies (user_id, name, gender, birth_date) VALUES (?, ?, ?, ?)',
            [req.user.id, name, gender, birth_date]
        );
        res.status(201).json({ message: 'Profil bayi berhasil dibuat', baby_id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/user/scans', verifyToken, checkRole(['user']), upload.single('photo'), async (req, res) => {
    const { baby_id, age_months, weight_kg, head_circ_cm, arm_circ_cm } = req.body;
    const photo_url = req.file ? `/uploads/${req.file.filename}` : null;
    
    // Hasil AI dikirim oleh frontend setelah inference berhasil.
    // Fallback ini menjaga kompatibilitas dengan request lama.
    let ai_result = req.body.ai_result || 'Normal';
    if (!req.body.ai_result) {
        if (weight_kg < 5.0 && age_months > 6) ai_result = 'Kurang Nutrisi';
        if (arm_circ_cm < 11.5) ai_result = 'Stunting';
    }

    try {
        await db.query(
            'INSERT INTO scans (baby_id, age_months, weight_kg, head_circ_cm, arm_circ_cm, photo_url, ai_result) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [baby_id, age_months, weight_kg, head_circ_cm, arm_circ_cm, photo_url, ai_result]
        );
        res.status(201).json({ message: 'Scan berhasil disave', ai_result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/user/babies/:baby_id/scans', verifyToken, checkRole(['user']), async (req, res) => {
    try {
        const [scans] = await db.query(
            `SELECT s.age_months, s.weight_kg, s.head_circ_cm, s.arm_circ_cm,
                    s.ai_result, s.created_at
             FROM scans s
             INNER JOIN babies b ON b.id = s.baby_id
             WHERE s.baby_id = ? AND b.user_id = ?
             ORDER BY s.age_months ASC, s.created_at ASC`,
            [req.params.baby_id, req.user.id]
        );
        res.json(scans); 
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 4. VOLUNTEER & ADMIN: Training Data AI
// ==========================================
app.post('/api/volunteer/training', verifyToken, checkRole(['volunteer']), upload.single('photo'), async (req, res) => {
    // Tambahkan gender di req.body
    const { gender, height_cm, weight_kg, head_circ_cm, arm_circ_cm, manual_label, notes } = req.body;
    const measurements = [height_cm, weight_kg, head_circ_cm, arm_circ_cm].map((value) => { if (value === undefined || value === null || String(value).trim() === '') return null; const number = Number(value); return Number.isFinite(number) && number >= 0 ? number : null; });
    const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

    if (!photo_url) return res.status(400).json({ message: 'Foto wajib diunggah untuk keperluan training' });

    try {
        await db.query(
            // Tambahkan gender ke query INSERT
            'INSERT INTO training_data (volunteer_id, gender, height_cm, weight_kg, head_circ_cm, arm_circ_cm, photo_url, manual_label, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, gender, ...measurements, photo_url, manual_label, notes]
        );
        res.status(201).json({ message: 'Data training berhasil disubmit' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 5. ABOUT WEB (CMS)
// ==========================================

// Guest / Public - Melihat isi halaman About
app.get('/api/about', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT content, updated_at FROM about_web WHERE id = 1');
        if (rows.length === 0) {
            return res.json({ content: 'Belum ada informasi about.' });
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin - Memperbarui konten halaman About
app.put('/api/admin/about', verifyToken, checkRole(['admin']), async (req, res) => {
    const { content } = req.body;
    
    if (!content) return res.status(400).json({ message: 'Konten tidak boleh kosong' });

    try {
        // Menggunakan teknik "INSERT ON DUPLICATE KEY UPDATE"
        // Artinya: Jika id=1 belum ada, buat baru. Jika sudah ada, cukup update kontennya.
        await db.query(
            'INSERT INTO about_web (id, content) VALUES (1, ?) ON DUPLICATE KEY UPDATE content = ?',
            [content, content]
        );
        res.json({ message: 'Konten About Web berhasil diperbarui!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Volunteer - Melihat history data training yang dia upload sendiri
app.get('/api/volunteer/training/history', verifyToken, checkRole(['volunteer']), async (req, res) => {
    try {
        // req.user.id didapat otomatis dari token jwt saat volunteer login
        const [data] = await db.query(
            'SELECT * FROM training_data WHERE volunteer_id = ? ORDER BY created_at DESC',
            [req.user.id] 
        );
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/training', verifyToken, checkRole(['admin']), async (req, res) => {
    try {
        const gender = typeof req.query.gender === 'string' ? req.query.gender : '';
        const label = typeof req.query.label === 'string' ? req.query.label : '';
        const requestedLimit = Number.parseInt(String(req.query.limit || '5'), 10);
        const requestedOffset = Number.parseInt(String(req.query.offset || '0'), 10);
        const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 5;
        const offset = Number.isFinite(requestedOffset) ? Math.max(requestedOffset, 0) : 0;
        const conditions = [];
        const values = [];

        if (gender) {
            conditions.push('td.gender = ?');
            values.push(gender);
        }
        if (label) {
            conditions.push('td.manual_label = ?');
            values.push(label);
        }

        const whereClause = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
        const [data] = await db.query(
            `SELECT td.*, u.name AS volunteer_name FROM training_data td LEFT JOIN users u ON u.id = td.volunteer_id${whereClause} ORDER BY td.created_at ASC, td.id ASC LIMIT ? OFFSET ?`,
            [...values, limit, offset]
        );
        const [[countRow]] = await db.query(`SELECT COUNT(*) AS total FROM training_data td${whereClause}`, values);
        const [categoryRows] = await db.query(
            'SELECT gender, manual_label AS label, COUNT(*) AS count FROM training_data GROUP BY gender, manual_label'
        );
        const total = Number(countRow.total || 0);
        const categories = Array.isArray(categoryRows) ? categoryRows : [];

        res.json({ data, total, hasMore: offset + data.length < total, categories });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server StunTrack berjalan di http://localhost:${PORT}`);
});
