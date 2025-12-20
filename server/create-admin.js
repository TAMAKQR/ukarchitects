import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'database.db'));

// Создание таблицы пользователей
const createUsersTable = () => {
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
    console.log('✅ Таблица пользователей создана');
};

// Создание админа
const createAdmin = async (username, email, password) => {
    try {
        // Проверяем, существует ли уже админ
        const existingUser = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, email);

        if (existingUser) {
            console.log('⚠️  Пользователь с таким username или email уже существует');
            return false;
        }

        // Хешируем пароль
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Создаем пользователя
        const stmt = db.prepare(`
            INSERT INTO users (username, email, password_hash, role) 
            VALUES (?, ?, ?, 'admin')
        `);

        const result = stmt.run(username, email, passwordHash);

        console.log('✅ Администратор успешно создан!');
        console.log(`   Username: ${username}`);
        console.log(`   Email: ${email}`);
        console.log(`   ID: ${result.lastInsertRowid}`);
        return true;
    } catch (error) {
        console.error('❌ Ошибка создания администратора:', error);
        return false;
    }
};

// Интерактивное создание админа
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
    try {
        console.log('='.repeat(50));
        console.log('  СОЗДАНИЕ АДМИНИСТРАТОРА');
        console.log('='.repeat(50));
        console.log('');

        // Создаем таблицу
        createUsersTable();
        console.log('');

        // Проверяем, есть ли уже админы
        const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin');

        if (adminCount.count > 0) {
            console.log(`ℹ️  В базе уже есть ${adminCount.count} администратор(ов)`);
            const continueCreate = await question('Создать нового? (y/n): ');
            if (continueCreate.toLowerCase() !== 'y') {
                console.log('Отменено');
                rl.close();
                db.close();
                return;
            }
        }

        console.log('');
        const username = await question('Введите username: ');
        const email = await question('Введите email: ');
        const password = await question('Введите пароль: ');
        const confirmPassword = await question('Подтвердите пароль: ');

        console.log('');

        if (!username || !email || !password) {
            console.log('❌ Все поля обязательны для заполнения');
            rl.close();
            db.close();
            return;
        }

        if (password !== confirmPassword) {
            console.log('❌ Пароли не совпадают');
            rl.close();
            db.close();
            return;
        }

        if (password.length < 6) {
            console.log('❌ Пароль должен содержать минимум 6 символов');
            rl.close();
            db.close();
            return;
        }

        await createAdmin(username, email, password);

    } catch (error) {
        console.error('❌ Ошибка:', error);
    } finally {
        rl.close();
        db.close();
    }
}

main();
