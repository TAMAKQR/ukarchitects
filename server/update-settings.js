import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'database.db'));

// Добавление новых настроек
const updateSettings = () => {
    const insertSetting = db.prepare(`
        INSERT OR IGNORE INTO settings (key, value, description) 
        VALUES (?, ?, ?)
    `);

    const newSettings = [
        // Основные настройки
        ['site_title', 'UK ARCHITECTS', 'Название сайта'],
        ['site_description', 'UK Architects - профессиональное архитектурное бюро с полным циклом услуг от концепции до реализации проекта', 'Описание сайта для SEO'],
        ['site_keywords', 'архитектура, дизайн, проектирование, интерьер, строительство', 'Ключевые слова для SEO'],

        // Контакты
        ['site_email', 'hello@arch-marketing.ru', 'Email для связи'],
        ['site_phone', '+7 (800) 505-77-28', 'Контактный телефон'],
        ['whatsapp_phone', '+79001234567', 'Номер WhatsApp'],
        ['address', 'Москва', 'Адрес офиса'],
        ['working_hours', '9:00 - 20:00', 'Режим работы'],

        // Социальные сети
        ['instagram_url', '', 'Ссылка на Instagram'],
        ['facebook_url', '', 'Ссылка на Facebook'],
        ['linkedin_url', '', 'Ссылка на LinkedIn'],
        ['youtube_url', '', 'Ссылка на YouTube'],
        ['telegram_url', '', 'Ссылка на Telegram'],
        ['vk_url', '', 'Ссылка на VK'],

        // Аналитика
        ['google_analytics_id', '', 'Google Analytics ID'],
        ['google_tag_manager_id', '', 'Google Tag Manager ID'],
        ['yandex_metrika_id', '', 'Яндекс.Метрика ID'],
        ['facebook_pixel_id', '', 'Facebook Pixel ID'],
        ['vk_pixel_id', '', 'VK Pixel ID'],

        // Дополнительно
        ['custom_head_code', '', 'Пользовательский код в head'],
        ['custom_body_code', '', 'Пользовательский код в body'],
        ['favicon_url', '/images/tildafavicon.ico', 'URL фавикона'],
        ['logo_url', '', 'URL логотипа'],
    ];

    try {
        const insertMany = db.transaction((items) => {
            for (const item of items) {
                insertSetting.run(...item);
            }
        });
        insertMany(newSettings);
        console.log('✅ Настройки успешно обновлены!');
        console.log(`📝 Добавлено/обновлено настроек: ${newSettings.length}`);
    } catch (err) {
        console.error('❌ Ошибка обновления настроек:', err);
    }
};

// Запуск обновления
try {
    updateSettings();
    console.log('✅ База данных успешно обновлена!');
} catch (error) {
    console.error('❌ Ошибка обновления БД:', error);
} finally {
    db.close();
}
