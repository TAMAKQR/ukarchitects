import Database from 'better-sqlite3';
const db = new Database('./database.db');

try {
    db.exec("ALTER TABLE slider_items ADD COLUMN media_type TEXT DEFAULT 'image'");
    console.log('✅ Колонка media_type добавлена');
} catch (e) {
    console.log('media_type:', e.message);
}

try {
    db.exec('ALTER TABLE slider_items ADD COLUMN video_url TEXT');
    console.log('✅ Колонка video_url добавлена');
} catch (e) {
    console.log('video_url:', e.message);
}

db.close();
console.log('✅ Миграция завершена');
