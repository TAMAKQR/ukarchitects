import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'database.db'));

// Конфигурация
const DOMAIN = 'https://yourdomain.com'; // Замените на ваш домен
const OUTPUT_FILE = join(__dirname, '..', 'sitemap.xml');

function generateSitemap() {
    try {
        // Получаем все видимые проекты и услуги
        const projects = db.prepare('SELECT id, created_at FROM projects WHERE visible = 1').all();
        const services = db.prepare('SELECT id, created_at FROM services WHERE visible = 1').all();

        const currentDate = new Date().toISOString();

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
    
    <!-- Главная страница -->
    <url>
        <loc>${DOMAIN}/</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    
    <!-- Страница услуг -->
    <url>
        <loc>${DOMAIN}/service.html</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.9</priority>
    </url>
    
    <!-- Страница проектов -->
    <url>
        <loc>${DOMAIN}/projects.html</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
    </url>
`;

        // Добавляем отдельные проекты (если есть страницы для каждого проекта)
        projects.forEach(project => {
            const lastmod = project.created_at || currentDate;
            xml += `    
    <url>
        <loc>${DOMAIN}/project.html?id=${project.id}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
`;
        });

        // Добавляем отдельные услуги (если есть страницы для каждой услуги)
        services.forEach(service => {
            const lastmod = service.created_at || currentDate;
            xml += `    
    <url>
        <loc>${DOMAIN}/service.html?id=${service.id}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>
`;
        });

        xml += `    
</urlset>`;

        // Сохраняем файл
        writeFileSync(OUTPUT_FILE, xml, 'utf8');

        console.log('✅ Sitemap успешно сгенерирован!');
        console.log(`📍 Файл: ${OUTPUT_FILE}`);
        console.log(`📊 Статистика:`);
        console.log(`   - Главная и основные страницы: 3`);
        console.log(`   - Проекты: ${projects.length}`);
        console.log(`   - Услуги: ${services.length}`);
        console.log(`   - Всего URL: ${3 + projects.length + services.length}`);
        console.log('');
        console.log('⚠️  Не забудьте заменить "yourdomain.com" на ваш реальный домен!');

    } catch (error) {
        console.error('❌ Ошибка генерации sitemap:', error);
    }
}

// Запуск генерации
try {
    generateSitemap();
} catch (error) {
    console.error('❌ Ошибка:', error);
} finally {
    db.close();
}
