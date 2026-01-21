import Database from 'better-sqlite3';
const db = new Database('./database.db');

const slides = db.prepare("SELECT id, title, media_type, video_url FROM slider_items WHERE media_type = 'video'").all();
console.log('Видео-слайды в базе:');
console.log(JSON.stringify(slides, null, 2));

db.close();
