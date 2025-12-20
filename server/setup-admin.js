import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'database.db'));

// Создание таблицы users если не существует
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        reset_token TEXT,
        reset_token_expires INTEGER,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
    )
`);

// Проверяем, есть ли уже админы
const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin');

if (adminCount.count === 0) {
    console.log('📝 Создание администратора по умолчанию...');

    const defaultAdmin = {
        username: 'ukarchitects',
        email: 'ukarchitects.kg@gmail.com',
        password: 'ukarchitects'
    };

    const hashedPassword = bcrypt.hashSync(defaultAdmin.password, 10);

    const stmt = db.prepare(`
        INSERT INTO users (username, email, password_hash, role, created_at)
        VALUES (?, ?, ?, 'admin', datetime('now'))
    `);

    stmt.run(defaultAdmin.username, defaultAdmin.email, hashedPassword);

    console.log('✅ Администратор создан:');
    console.log(`   Username: ${defaultAdmin.username}`);
    console.log(`   Email: ${defaultAdmin.email}`);
    console.log(`   Password: ${defaultAdmin.password}`);
    console.log('');
    console.log('⚠️  ВАЖНО: Смените пароль после первого входа!');
} else {
    console.log(`ℹ️  Администраторов в системе: ${adminCount.count}`);
}

db.close();
