import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'database.db'));

async function resetAdmin() {
    try {
        // Создаем таблицу если её нет
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                reset_token TEXT,
                reset_token_expires DATETIME,
                role TEXT DEFAULT 'admin',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME
            )
        `);

        // Удаляем всех старых админов
        db.prepare('DELETE FROM users').run();

        // Данные нового админа
        const username = 'admin';
        const email = 'ukarchitects.kg@gmail.com';
        const password = 'admin123';

        // Хешируем пароль
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Создаем админа
        db.prepare(`
            INSERT INTO users (username, email, password_hash, role) 
            VALUES (?, ?, ?, 'admin')
        `).run(username, email, passwordHash);

        console.log('\n✅ Администратор успешно создан!');
        console.log('==================================================');
        console.log('📧 Email:    ', email);
        console.log('🔑 Пароль:   ', password);
        console.log('👤 Username: ', username);
        console.log('==================================================');
        console.log('🔗 Админка:   http://localhost:3000/admin/login.html');
        console.log('==================================================\n');

    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    } finally {
        db.close();
    }
}

resetAdmin();
