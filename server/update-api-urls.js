import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RENDER_URL = process.env.RENDER_URL || 'https://your-app.onrender.com';
const API_URL = `${RENDER_URL}/api`;

console.log(`🔄 Обновление API_URL на: ${API_URL}`);

const files = [
    '../index.html',
    '../projects.html',
    '../project.html',
    '../service.html',
    '../privacy.html',
    '../admin/login.html',
    '../admin/forgot-password.html',
    '../admin/reset-password.html',
    '../js/settings-loader.js'
];

files.forEach(file => {
    try {
        const filePath = join(__dirname, file);
        let content = readFileSync(filePath, 'utf8');

        // Заменяем localhost URL на production URL
        content = content.replace(
            /const API_URL = ['"]http:\/\/localhost:3000\/api['"];?/g,
            `const API_URL = '${API_URL}';`
        );

        content = content.replace(
            /const API_URL = ['"]\/api['"];?/g,
            `const API_URL = '${API_URL}';`
        );

        writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Обновлен: ${file}`);
    } catch (error) {
        console.log(`⚠️  Пропущен: ${file} (${error.message})`);
    }
});

console.log('✅ API URLs обновлены!');
