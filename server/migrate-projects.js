import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'database.db'));

try {
    console.log('🔄 Начинаем миграцию базы данных...');

    // Проверяем существующие столбцы
    const tableInfo = db.prepare("PRAGMA table_info(projects)").all();
    const columns = tableInfo.map(col => col.name);

    console.log('Текущие столбцы:', columns);

    // Создаем временную таблицу с новой структурой
    db.exec(`
        CREATE TABLE projects_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            category TEXT,
            image_url TEXT,
            gallery_images TEXT,
            address TEXT,
            year INTEGER,
            total_area TEXT,
            floors TEXT,
            client TEXT,
            stage TEXT,
            visible INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Копируем данные из старой таблицы
    db.exec(`
        INSERT INTO projects_new (id, title, description, category, image_url, gallery_images, year, client, visible, created_at)
        SELECT id, title, description, category, image_url, gallery_images, year, client, visible, created_at
        FROM projects
    `);

    // Удаляем старую таблицу
    db.exec(`DROP TABLE projects`);

    // Переименовываем новую таблицу
    db.exec(`ALTER TABLE projects_new RENAME TO projects`);

    console.log('✅ Миграция успешно завершена!');
    console.log('✅ Добавлены поля: address, total_area, floors, stage');

} catch (error) {
    console.error('❌ Ошибка миграции:', error.message);
} finally {
    db.close();
}
