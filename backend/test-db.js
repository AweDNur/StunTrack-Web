const db = require('./config/db');
require('dotenv').config();

async function testConnection() {
    try {
        console.log(`Mencoba menghubungkan ke database: ${process.env.DB_NAME} di host ${process.env.DB_HOST}...`);
        
        // Melakukan query sederhana untuk tes koneksi
        const [rows] = await db.query('SELECT 1 + 1 AS result');
        
        console.log('✅ KESUKSESAN: Database dan file .env berhasil terhubung!');
        console.log('Hasil tes query MySQL:', rows[0].result); // Harusnya mencetak angka 2
        
        process.exit(0);
    } catch (err) {
        console.error('❌ KONEKSI GAGAL!');
        console.error('Pesan Error:', err.message);
        process.exit(1);
    }
}

testConnection();