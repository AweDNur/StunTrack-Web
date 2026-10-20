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
app.post('/api/user/babies', verifyToken, checkRole(['user']), async (req, res) => {
    const { name, gender, birth_date } = req.body;
    try {
        await db.query(
            'INSERT INTO babies (user_id, name, gender, birth_date) VALUES (?, ?, ?, ?)',
            [req.user.id, name, gender, birth_date]
        );
        res.status(201).json({ message: 'Profil bayi berhasil dibuat' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/user/scans', verifyToken, checkRole(['user']), upload.single('photo'), async (req, res) => {
    const { baby_id, age_months, weight_kg, head_circ_cm, arm_circ_cm } = req.body;
    const photo_url = req.file ? `/uploads/${req.file.filename}` : null;
    
    // MOCKUP AI: Nanti ini dihubungkan dengan API AI Python Anda
    let ai_result = 'Normal'; 
    if (weight_kg < 5.0 && age_months > 6) ai_result = 'Kurang Nutrisi';
    if (arm_circ_cm < 11.5) ai_result = 'Stunting';

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
            'SELECT age_months, weight_kg, head_circ_cm, arm_circ_cm, ai_result, created_at FROM scans WHERE baby_id = ? ORDER BY age_months ASC',
            [req.params.baby_id]
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
    const { manual_label, notes } = req.body;
    const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

    if (!photo_url) return res.status(400).json({ message: 'Foto wajib diunggah untuk keperluan training' });

    try {
        await db.query(
            'INSERT INTO training_data (volunteer_id, photo_url, manual_label, notes) VALUES (?, ?, ?, ?)',
            [req.user.id, photo_url, manual_label, notes]
        );
        res.status(201).json({ message: 'Data training berhasil disubmit' });
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
        const [data] = await db.query('SELECT * FROM training_data ORDER BY created_at DESC');
        res.json(data);
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