import Database from 'better-sqlite3';
const db = new Database('./database.db');

const slides = db.prepare("SELECT * FROM slider_items").all();
console.log('Все слайды в базе:');
console.log(JSON.stringify(slides, null, 2));

db.close();
