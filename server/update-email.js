import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'database.db'));

// Обновляем email админа
const newEmail = 'ukarchitects.kg@gmail.com';

const result = db.prepare(`
    UPDATE users 
    SET email = ?
`).run(newEmail);

if (result.changes > 0) {
    console.log(`✅ Email обновлен на: ${newEmail}`);

    // Показываем всех админов
    const admins = db.prepare('SELECT username, email FROM users').all();
    console.log('\nВсе пользователи:');
    admins.forEach(admin => {
        console.log(`  - ${admin.username} (${admin.email})`);
    });
} else {
    console.log('❌ Пользователи не найдены');
}

db.close();
