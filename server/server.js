import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import multer from 'multer';
import { existsSync, mkdirSync } from 'fs';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Определяем режим разработки или production
const isDevelopment = process.env.NODE_ENV !== 'production';

// Trust proxy - важно для работы secure cookies на Render
app.set('trust proxy', 1);

// Конфигурация Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Настройка Multer для временного хранения (memory storage для Cloudinary)
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB для видео
    },
    fileFilter: function (req, file, cb) {
        const allowedImageTypes = /jpeg|jpg|png|gif|webp|svg|ico/;
        const allowedVideoTypes = /mp4|mov|avi|webm/;
        const ext = file.originalname.toLowerCase().split('.').pop();

        const isImage = allowedImageTypes.test(ext) || file.mimetype.startsWith('image/');
        const isVideo = allowedVideoTypes.test(ext) || file.mimetype.startsWith('video/');

        if (isImage || isVideo) {
            return cb(null, true);
        } else {
            cb(new Error('Только изображения и видео разрешены!'));
        }
    }
});

const uploadImageBuffer = (buffer, options = {}) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'uk-architects',
                resource_type: 'auto',
                transformation: [
                    { width: 2000, crop: 'limit' },
                    { quality: 'auto:good' }
                ],
                ...options
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );
        uploadStream.end(buffer);
    });
};

// Подключение к БД
// В продакшене используем persistent disk от Render
const dbPath = isDevelopment
    ? join(__dirname, 'database.db')
    : join(__dirname, 'data', 'database.db');

// Создаём директорию data если её нет (для production)
if (!isDevelopment) {
    const dataDir = join(__dirname, 'data');
    if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
    }
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Функция инициализации базы данных
const initializeDatabase = async () => {
    try {
        // Проверяем, существует ли таблица settings с правильной структурой
        const tableInfo = db.prepare("PRAGMA table_info(settings)").all();
        const hasIdColumn = tableInfo.some(column => column.name === 'id');

        if (!hasIdColumn) {
            console.log('⚠️ Пересоздаём таблицу settings с правильной структурой...');

            // Бэкап данных если они есть
            let existingData = null;
            try {
                existingData = db.prepare('SELECT * FROM settings LIMIT 1').get();
            } catch (e) {
                // Таблица может не существовать
            }

            // Удаляем старую таблицу
            db.exec('DROP TABLE IF EXISTS settings');

            // Создаём новую таблицу с правильной структурой
            db.exec(`
                CREATE TABLE settings (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    site_title TEXT DEFAULT 'UK Architects',
                    site_description TEXT,
                    site_keywords TEXT,
                    site_phone TEXT,
                    site_email TEXT,
                    address TEXT,
                    working_hours TEXT,
                    whatsapp_phone TEXT,
                    instagram_url TEXT,
                    facebook_url TEXT,
                    whatsapp_url TEXT,
                    telegram_url TEXT,
                    youtube_url TEXT,
                    vk_url TEXT,
                    linkedin_url TEXT,
                    website_url TEXT,
                    google_analytics_id TEXT,
                    google_tag_manager_id TEXT,
                    yandex_metrika_id TEXT,
                    facebook_pixel_id TEXT,
                    vk_pixel_id TEXT,
                    custom_head_code TEXT,
                    custom_body_code TEXT,
                    favicon_url TEXT,
                    logo_url TEXT,
                    privacy_policy TEXT,
                    terms_of_service TEXT,
                    about_company TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Вставляем начальную строку настроек
            db.prepare(`INSERT INTO settings (id) VALUES (1)`).run();

            console.log('✅ Таблица settings пересоздана с правильной структурой');
        }

        // Создание остальных таблиц если их нет
        db.exec(`
            CREATE TABLE IF NOT EXISTS services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                icon TEXT,
                image_url TEXT,
                slug TEXT,
                order_num INTEGER DEFAULT 0,
                visible INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS projects (
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
            );

            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_name TEXT NOT NULL,
                company TEXT,
                text TEXT NOT NULL,
                rating INTEGER DEFAULT 5,
                image_url TEXT,
                visible INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                subtitle TEXT,
                content TEXT,
                background_image TEXT,
                order_num INTEGER DEFAULT 0,
                visible INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS team (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                position TEXT,
                bio TEXT,
                photo_url TEXT,
                email TEXT,
                phone TEXT,
                order_num INTEGER DEFAULT 0,
                visible INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS faq (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                category TEXT,
                order_num INTEGER DEFAULT 0,
                visible INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                reset_token TEXT,
                reset_token_expires INTEGER,
                last_login DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS slider_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                title TEXT,
                description TEXT,
                category TEXT,
                media_type TEXT DEFAULT 'image',
                image_url TEXT,
                video_url TEXT,
                button_text TEXT DEFAULT 'Подробнее',
                button_link TEXT,
                order_num INTEGER DEFAULT 0,
                visible INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                description TEXT,
                order_num INTEGER DEFAULT 0,
                visible INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS stages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                description TEXT,
                order_num INTEGER DEFAULT 0,
                visible INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS contact_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                message TEXT,
                status TEXT DEFAULT 'new',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Миграция: добавляем отсутствующие столбцы в существующие таблицы
        try {
            // Проверяем и добавляем slug в services если отсутствует
            const servicesColumns = db.prepare("PRAGMA table_info(services)").all();
            const hasSlugInServices = servicesColumns.some(col => col.name === 'slug');
            if (!hasSlugInServices) {
                db.prepare("ALTER TABLE services ADD COLUMN slug TEXT").run();
                console.log('✅ Добавлен столбец slug в таблицу services');
            }

            // Проверяем и добавляем новые поля в settings
            const settingsColumns = db.prepare("PRAGMA table_info(settings)").all();
            const newSettingsFields = [
                'whatsapp_phone',
                'google_tag_manager_id',
                'facebook_pixel_id',
                'vk_pixel_id',
                'custom_head_code',
                'custom_body_code',
                'favicon_url',
                'logo_url',
                'website_url'
            ];

            newSettingsFields.forEach(field => {
                const hasField = settingsColumns.some(col => col.name === field);
                if (!hasField) {
                    db.prepare(`ALTER TABLE settings ADD COLUMN ${field} TEXT`).run();
                    console.log(`✅ Добавлен столбец ${field} в таблицу settings`);
                }
            });
        } catch (error) {
            console.log('ℹ️ Миграция столбцов: пропущено (возможно, уже выполнено)');
        }

        // Проверяем, есть ли настройки, если нет - создаём
        const settingsExist = db.prepare('SELECT COUNT(*) as count FROM settings').get();
        if (settingsExist.count === 0) {
            db.prepare(`
                INSERT INTO settings (
                    id, site_title, site_description, site_phone, site_email, address, working_hours,
                    site_keywords, about_company, privacy_policy, terms_of_service
                )
                VALUES (
                    1, 
                    'UK Architects', 
                    'Архитектурное бюро полного цикла', 
                    '+996 779 777 666', 
                    'info@ukarchitects.com', 
                    'Ch.Aitmatova street 243', 
                    'Пн–Пт: 9:00–19:00',
                    'архитектура, проектирование, дизайн, строительство',
                    'UK Architects — ведущее архитектурное бюро, специализирующееся на создании современных и функциональных пространств.',
                    '<h2>Политика конфиденциальности</h2><p>Мы обязуемся защищать конфиденциальность ваших личных данных.</p>',
                    '<h2>Условия предоставления услуг</h2><p>Настоящие условия регулируют использование наших услуг.</p>'
                )
            `).run();
        }

        // Проверяем, есть ли пользователи, если нет - создаём админа
        const usersExist = db.prepare('SELECT COUNT(*) as count FROM users').get();
        if (usersExist.count === 0) {
            const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
            const passwordHash = await bcrypt.hash(defaultPassword, 10);

            db.prepare(`
                INSERT INTO users (username, email, password_hash, role)
                VALUES (?, ?, ?, ?)
            `).run('admin', 'admin@ukarchitects.com', passwordHash, 'admin');

            console.log('✅ Создан администратор по умолчанию');
            console.log('   Логин: admin');
            console.log('   Пароль:', defaultPassword);
        }

        // Проверяем, есть ли стадии, если нет - создаём базовые
        const stagesExist = db.prepare('SELECT COUNT(*) as count FROM stages').get();
        if (stagesExist.count === 0) {
            const defaultStages = [
                'Эскизный проект',
                'Проектная документация',
                'Рабочий проект',
                'Реализация',
                'Завершен'
            ];

            defaultStages.forEach((stageName, index) => {
                const slug = stageName.toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[а-я]/g, char =>
                        'абвгдеёжзийклмнопрстуфхцчшщъыьэюя'.indexOf(char) !== -1 ?
                            'abvgdeejzijklmnoprstufhccssyeyuya'['абвгдеёжзийклмнопрстуфхцчшщъыьэюя'.indexOf(char)] :
                            char);

                db.prepare(`
                    INSERT INTO stages (name, slug, order_num, visible)
                    VALUES (?, ?, ?, 1)
                `).run(stageName, slug, index);
            });

            console.log('✅ Созданы базовые стадии проектов');
        }

        // Проверяем, есть ли услуги, если нет - создаём базовые
        const servicesExist = db.prepare('SELECT COUNT(*) as count FROM services').get();
        if (servicesExist.count === 0) {
            const defaultServices = [
                {
                    title: 'Архитектурное проектирование',
                    description: '<p>Полный цикл архитектурного проектирования от концепции до рабочих чертежей. Создание функциональных и эстетически привлекательных зданий с учетом всех современных требований.</p><ul><li>Концептуальное проектирование</li><li>Эскизный проект</li><li>Проектная документация</li><li>Рабочая документация</li></ul>',
                    image_url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?ixlib=rb-4.0.3',
                    icon: 'fas fa-drafting-compass'
                },
                {
                    title: 'Дизайн интерьера',
                    description: '<p>Создание уникального и комфортного пространства, отражающего ваш стиль и потребности. Работаем с жилыми и коммерческими объектами.</p><ul><li>Концепция интерьера</li><li>3D визуализация</li><li>Подбор материалов и мебели</li><li>Авторский надзор</li></ul>',
                    image_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3',
                    icon: 'fas fa-paint-brush'
                },
                {
                    title: 'Градостроительное планирование',
                    description: '<p>Комплексное планирование территорий с учетом социальных, экономических и экологических факторов. Создание устойчивой городской среды.</p><ul><li>Генеральные планы</li><li>Проекты планировки</li><li>Мастер-планы</li><li>Концепции развития территорий</li></ul>',
                    image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3',
                    icon: 'fas fa-city'
                }
            ];

            defaultServices.forEach((service, index) => {
                const slug = service.title.toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[а-я]/g, char =>
                        'абвгдеёжзийклмнопрстуфхцчшщъыьэюя'.indexOf(char) !== -1 ?
                            'abvgdeejzijklmnoprstufhccssyeyuya'['абвгдеёжзийклмнопрстуфхцчшщъыьэюя'.indexOf(char)] :
                            char);

                // Проверяем, есть ли столбец slug в таблице
                try {
                    db.prepare(`
                        INSERT INTO services (title, description, image_url, icon, slug, order_num, visible)
                        VALUES (?, ?, ?, ?, ?, ?, 1)
                    `).run(service.title, service.description, service.image_url, service.icon, slug, index);
                } catch (error) {
                    // Если slug столбца нет, вставляем без него
                    db.prepare(`
                        INSERT INTO services (title, description, image_url, icon, order_num, visible)
                        VALUES (?, ?, ?, ?, ?, 1)
                    `).run(service.title, service.description, service.image_url, service.icon, index);
                }
            });

            console.log('✅ Созданы базовые услуги');
        }

        // Проверяем, есть ли категории, если нет - создаём базовые
        const categoriesExist = db.prepare('SELECT COUNT(*) as count FROM categories').get();
        if (categoriesExist.count === 0) {
            const defaultCategories = [
                'Жилые здания',
                'Общественные пространства',
                'Коммерческие объекты',
                'Спортивные объекты',
                'Медицинские объекты',
                'Образовательные объекты',
                'Мастер-планы'
            ];

            defaultCategories.forEach((categoryName, index) => {
                const slug = categoryName.toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[а-я]/g, char =>
                        'абвгдеёжзийклмнопрстуфхцчшщъыьэюя'.indexOf(char) !== -1 ?
                            'abvgdeejzijklmnoprstufhccssyeyuya'['абвгдеёжзийклмнопрстуфхцчшщъыьэюя'.indexOf(char)] :
                            char);

                db.prepare(`
                    INSERT INTO categories (name, slug, order_num, visible)
                    VALUES (?, ?, ?, 1)
                `).run(categoryName, slug, index);
            });

            console.log('✅ Созданы базовые категории проектов');
        }

        // Проверяем, есть ли FAQ, если нет - создаём базовые вопросы
        const faqExist = db.prepare('SELECT COUNT(*) as count FROM faq').get();
        if (faqExist.count === 0) {
            const defaultFAQ = [
                {
                    question: 'Какие услуги предоставляет ваше архитектурное бюро?',
                    answer: 'Мы предоставляем полный спектр архитектурных услуг: проектирование жилых и коммерческих объектов, дизайн интерьера, градостроительное планирование, 3D визуализация и авторский надзор.',
                    category: 'services'
                },
                {
                    question: 'Сколько времени занимает проектирование?',
                    answer: 'Время проектирования зависит от сложности объекта. Эскизный проект занимает 2-4 недели, проектная документация — 1-3 месяца, рабочая документация — 2-6 месяцев.',
                    category: 'timeline'
                },
                {
                    question: 'Предоставляете ли вы 3D визуализацию проекта?',
                    answer: 'Да, 3D визуализация входит в наши услуги. Мы создаем фотореалистичные изображения как экстерьера, так и интерьера проектируемого объекта.',
                    category: 'services'
                },
                {
                    question: 'Как рассчитывается стоимость проектирования?',
                    answer: 'Стоимость зависит от типа объекта, его площади, сложности проекта и объема работ. Мы предоставляем детальную смету после первичного обследования объекта.',
                    category: 'pricing'
                },
                {
                    question: 'Работаете ли вы с индивидуальными заказчиками?',
                    answer: 'Да, мы работаем как с частными лицами, так и с коммерческими организациями. Каждому клиенту мы обеспечиваем индивидуальный подход.',
                    category: 'clients'
                }
            ];

            defaultFAQ.forEach((faq, index) => {
                db.prepare(`
                    INSERT INTO faq (question, answer, category, order_num, visible)
                    VALUES (?, ?, ?, ?, 1)
                `).run(faq.question, faq.answer, faq.category, index);
            });

            console.log('✅ Созданы базовые FAQ');
        }

        // Проверяем, есть ли команда, если нет - создаём базовую информацию о команде
        const teamExist = db.prepare('SELECT COUNT(*) as count FROM team').get();
        if (teamExist.count === 0) {
            const defaultTeam = [
                {
                    name: 'Главный архитектор',
                    position: 'Руководитель проектов',
                    bio: 'Опытный архитектор с более чем 15-летним стажем в области проектирования жилых и коммерческих объектов.',
                    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=300',
                    email: 'architect@ukarchitects.com'
                },
                {
                    name: 'Ведущий дизайнер',
                    position: 'Дизайнер интерьера',
                    bio: 'Специалист по созданию современных и функциональных интерьеров с учетом последних трендов в дизайне.',
                    photo_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b77c?ixlib=rb-4.0.3&w=300',
                    email: 'designer@ukarchitects.com'
                },
                {
                    name: 'Инженер-проектировщик',
                    position: 'Конструктор',
                    bio: 'Ответственный за техническую часть проектов, обеспечивает надежность и безопасность всех конструктивных решений.',
                    photo_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&w=300',
                    email: 'engineer@ukarchitects.com'
                }
            ];

            defaultTeam.forEach((member, index) => {
                db.prepare(`
                    INSERT INTO team (name, position, bio, photo_url, email, order_num, visible)
                    VALUES (?, ?, ?, ?, ?, ?, 1)
                `).run(member.name, member.position, member.bio, member.photo_url, member.email, index);
            });

            console.log('✅ Создана базовая информация о команде');
        }

        // Проверяем, есть ли разделы, если нет - создаём базовые
        const sectionsExist = db.prepare('SELECT COUNT(*) as count FROM sections').get();
        if (sectionsExist.count === 0) {
            const defaultSections = [
                {
                    slug: 'user-agreement',
                    title: 'Пользовательское соглашение',
                    subtitle: 'Условия использования сайта',
                    content: `<h2>1. Общие положения</h2>
<p>Настоящее Пользовательское соглашение определяет условия использования сайта UK Architects и регулирует отношения между администрацией сайта и его пользователями.</p>

<h2>2. Использование материалов сайта</h2>
<p>Все материалы, размещенные на сайте, включая изображения проектов, текстовые описания и дизайнерские решения, являются интеллектуальной собственностью UK Architects.</p>
<ul>
<li>Использование материалов без письменного согласия запрещено</li>
<li>Цитирование возможно с обязательной ссылкой на источник</li>
<li>Коммерческое использование требует отдельного согласования</li>
</ul>

<h2>3. Конфиденциальность</h2>
<p>Мы обязуемся защищать конфиденциальность предоставленной вами информации в соответствии с нашей Политикой конфиденциальности.</p>

<h2>4. Ответственность</h2>
<p>Администрация сайта не несет ответственности за:</p>
<ul>
<li>Технические сбои и перерывы в работе сайта</li>
<li>Действия третьих лиц</li>
<li>Ущерб, причиненный использованием или невозможностью использования сайта</li>
</ul>

<h2>5. Изменения в соглашении</h2>
<p>Администрация оставляет за собой право вносить изменения в настоящее соглашение. Продолжение использования сайта после внесения изменений означает ваше согласие с новыми условиями.</p>

<h2>6. Контакты</h2>
<p>По всем вопросам, связанным с настоящим соглашением, вы можете обращаться по адресу: info@ukarchitects.com</p>`,
                    order_num: 0
                },
                {
                    slug: 'privacy-policy',
                    title: 'Политика конфиденциальности',
                    subtitle: 'Защита ваших данных',
                    content: `<h2>1. Общие положения</h2>
<p>UK Architects уважает вашу конфиденциальность и обязуется защищать ваши персональные данные.</p>

<h2>2. Какие данные мы собираем</h2>
<ul>
<li>Имя и контактная информация (телефон, email)</li>
<li>Информация о проекте при оформлении заявки</li>
<li>Данные о посещении сайта (cookies, IP-адрес)</li>
</ul>

<h2>3. Как мы используем данные</h2>
<p>Ваши данные используются для:</p>
<ul>
<li>Обработки заявок и предоставления услуг</li>
<li>Связи с вами по вопросам проектирования</li>
<li>Улучшения качества обслуживания</li>
<li>Отправки информационных рассылок (с вашего согласия)</li>
</ul>

<h2>4. Защита данных</h2>
<p>Мы применяем современные технологии для защиты ваших данных от несанкционированного доступа, изменения или уничтожения.</p>

<h2>5. Передача данных третьим лицам</h2>
<p>Мы не передаем ваши персональные данные третьим лицам без вашего согласия, за исключением случаев, предусмотренных законодательством.</p>

<h2>6. Ваши права</h2>
<p>Вы имеете право:</p>
<ul>
<li>Запросить доступ к своим данным</li>
<li>Исправить неточные данные</li>
<li>Удалить свои данные</li>
<li>Отозвать согласие на обработку данных</li>
</ul>`,
                    order_num: 1
                },
                {
                    slug: 'about',
                    title: 'О компании',
                    subtitle: 'UK Architects — ваш надежный партнер в архитектуре',
                    content: `<h2>Наша история</h2>
<p>UK Architects — ведущее архитектурное бюро с многолетним опытом в создании современных и функциональных пространств. Мы специализируемся на комплексном подходе к проектированию, охватывающем все этапы от концепции до реализации.</p>

<h2>Наша миссия</h2>
<p>Создавать архитектурные решения, которые улучшают качество жизни людей, гармонично сочетая эстетику, функциональность и устойчивое развитие.</p>

<h2>Наши ценности</h2>
<ul>
<li><strong>Инновации:</strong> Используем передовые технологии и современные подходы</li>
<li><strong>Качество:</strong> Внимание к деталям на каждом этапе проекта</li>
<li><strong>Индивидуальность:</strong> Уникальное решение для каждого клиента</li>
<li><strong>Устойчивость:</strong> Экологичные и энергоэффективные решения</li>
</ul>

<h2>Наши достижения</h2>
<ul>
<li>Более 100 реализованных проектов</li>
<li>Международные архитектурные награды</li>
<li>Команда профессионалов с опытом 15+ лет</li>
<li>Партнерство с ведущими строительными компаниями</li>
</ul>`,
                    order_num: 2
                }
            ];

            defaultSections.forEach(section => {
                db.prepare(`
                    INSERT INTO sections (slug, title, subtitle, content, order_num, visible)
                    VALUES (?, ?, ?, ?, ?, 1)
                `).run(section.slug, section.title, section.subtitle, section.content, section.order_num);
            });

            console.log('✅ Созданы базовые разделы (пользовательское соглашение, политика конфиденциальности, о компании)');
        }

        console.log('✅ База данных инициализирована');
    } catch (error) {
        console.error('❌ Ошибка инициализации базы данных:', error);
    }
};

// Инициализируем базу данных при старте
initializeDatabase();

// Middleware
app.use(cors({
    origin: isDevelopment ? true : process.env.FRONTEND_URL || true,
    credentials: true
}));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'uk-architects-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    proxy: true, // Важно для работы за прокси
    cookie: {
        secure: !isDevelopment, // HTTPS в production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 часа
        sameSite: 'lax', // lax работает для same-site requests
        path: '/' // Убедимся что cookie доступна на всех путях
    }
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(join(__dirname, '..', 'public')));

// Middleware для clean URLs (убирает .html из адресов)
app.use((req, res, next) => {
    if (req.path.endsWith('/')) {
        // Если путь заканчивается на /, ищем index.html
        const indexPath = join(__dirname, '..', 'public', req.path, 'index.html');
        if (existsSync(indexPath)) {
            return res.sendFile(indexPath);
        }
    } else if (!req.path.includes('.')) {
        // Если нет расширения, пробуем добавить .html
        const htmlPath = join(__dirname, '..', 'public', req.path + '.html');
        if (existsSync(htmlPath)) {
            return res.sendFile(htmlPath);
        }
    }
    next();
});

// Middleware для проверки авторизации
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// ============= AUTHENTICATION API =============

// Вход
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username и пароль обязательны' });
        }

        // Ищем пользователя
        const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);

        if (!user) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        // Проверяем пароль
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        // Создаем сессию
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;

        // Обновляем время последнего входа
        db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: error.message });
    }
});

// Выход
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Ошибка выхода' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

// Проверка авторизации
app.get('/api/auth/check', (req, res) => {
    if (req.session && req.session.userId) {
        const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(req.session.userId);
        if (user) {
            return res.json({ authenticated: true, user });
        }
    }
    res.json({ authenticated: false });
});

// Смена пароля
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Все поля обязательны' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Новый пароль должен содержать минимум 6 символов' });
        }

        // Получаем текущего пользователя
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Проверяем текущий пароль
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Неверный текущий пароль' });
        }

        // Хешируем новый пароль
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Обновляем пароль
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, user.id);

        res.json({ success: true, message: 'Пароль успешно изменен' });
    } catch (error) {
        console.error('Ошибка смены пароля:', error);
        res.status(500).json({ error: error.message });
    }
});

// Изменение профиля
app.post('/api/auth/change-profile', requireAuth, async (req, res) => {
    try {
        const { username, email } = req.body;

        if (!username || !email) {
            return res.status(400).json({ error: 'Все поля обязательны' });
        }

        // Проверяем, не занят ли username другим пользователем
        const existingUser = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.session.userId);
        if (existingUser) {
            return res.status(400).json({ error: 'Это имя пользователя уже занято' });
        }

        // Проверяем, не занят ли email другим пользователем
        const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.session.userId);
        if (existingEmail) {
            return res.status(400).json({ error: 'Этот email уже используется' });
        }

        // Обновляем профиль
        db.prepare('UPDATE users SET username = ?, email = ? WHERE id = ?').run(username, email, req.session.userId);

        // Обновляем данные в сессии
        req.session.username = username;

        res.json({ success: true, message: 'Профиль успешно обновлен', user: { username, email } });
    } catch (error) {
        console.error('Ошибка изменения профиля:', error);
        res.status(500).json({ error: error.message });
    }
});

// Запрос на сброс пароля
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

        if (!user) {
            // Не раскрываем, существует ли email
            return res.json({ success: true, message: 'Если email существует, на него отправлена ссылка для сброса пароля' });
        }

        // Генерируем токен
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 3600000); // 1 час

        // Сохраняем токен
        db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?')
            .run(resetToken, resetTokenExpires.toISOString(), user.id);

        // TODO: Отправить email с ссылкой для сброса
        // В реальном приложении здесь нужно отправить email
        console.log(`Reset token для ${email}: ${resetToken}`);
        console.log(`Ссылка для сброса: http://localhost:${PORT}/admin/reset-password.html?token=${resetToken}`);

        res.json({ success: true, message: 'Если email существует, на него отправлена ссылка для сброса пароля' });
    } catch (error) {
        console.error('Ошибка запроса сброса пароля:', error);
        res.status(500).json({ error: error.message });
    }
});

// Сброс пароля
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Токен и новый пароль обязательны' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
        }

        // Ищем пользователя по токену
        const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);

        if (!user) {
            return res.status(400).json({ error: 'Неверный или истекший токен' });
        }

        // Проверяем срок действия токена
        const tokenExpires = new Date(user.reset_token_expires);
        if (tokenExpires < new Date()) {
            return res.status(400).json({ error: 'Токен истек' });
        }

        // Хешируем новый пароль
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        // Обновляем пароль и удаляем токен
        db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?')
            .run(passwordHash, user.id);

        res.json({ success: true, message: 'Пароль успешно изменен' });
    } catch (error) {
        console.error('Ошибка сброса пароля:', error);
        res.status(500).json({ error: error.message });
    }
});

// Смена пароля (для авторизованных пользователей)
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Текущий и новый пароль обязательны' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
        }

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

        // Проверяем текущий пароль
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Неверный текущий пароль' });
        }

        // Хешируем новый пароль
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);

        res.json({ success: true, message: 'Пароль успешно изменен' });
    } catch (error) {
        console.error('Ошибка смены пароля:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============= API ENDPOINTS =============

// Загрузка изображения (требует авторизации)
app.post('/api/upload-image', requireAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }

        const result = await uploadImageBuffer(req.file.buffer);
        res.json({ url: result.secure_url });
    } catch (error) {
        console.error('Ошибка загрузки изображения в Cloudinary:', error);
        res.status(500).json({ error: 'Ошибка загрузки изображения' });
    }
});

// Получить все услуги
app.get('/api/services', (req, res) => {
    try {
        const services = db.prepare('SELECT * FROM services WHERE visible = 1 ORDER BY order_num').all();
        // Очистка undefined/null значений для image_url
        const cleanedServices = services.map(service => ({
            ...service,
            image_url: service.image_url && service.image_url !== 'undefined' && service.image_url !== 'null' ? service.image_url : null
        }));
        res.json(cleanedServices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получить услугу по ID
app.get('/api/services/:id', (req, res) => {
    try {
        const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
        if (service) {
            // Очистка undefined/null значений для image_url
            service.image_url = service.image_url && service.image_url !== 'undefined' && service.image_url !== 'null' ? service.image_url : null;
            res.json(service);
        } else {
            res.status(404).json({ error: 'Услуга не найдена' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Создать услугу
app.post('/api/services', requireAuth, upload.single('image'), async (req, res) => {
    try {
        console.log('POST /api/services - Body:', req.body);
        console.log('POST /api/services - File:', req.file);

        const { title, description, icon, order_num, visible } = req.body;
        let image_url = null;

        if (req.file) {
            const uploadResult = await uploadImageBuffer(req.file.buffer);
            image_url = uploadResult.secure_url;
            console.log('Изображение сохранено в Cloudinary:', image_url);
        }

        const visibleValue = visible === 'on' || visible === '1' || visible === 1 || visible === true ? 1 : 0;

        console.log('Создание услуги:', { title, description: description?.substring(0, 50), icon, image_url, order_num, visibleValue });

        const stmt = db.prepare('INSERT INTO services (title, description, icon, image_url, order_num, visible) VALUES (?, ?, ?, ?, ?, ?)');
        const result = stmt.run(title, description, icon || null, image_url, order_num || 0, visibleValue);

        console.log('Услуга создана с ID:', result.lastInsertRowid);
        res.status(201).json({ id: result.lastInsertRowid, message: 'Услуга создана' });
    } catch (error) {
        console.error('Ошибка создания услуги:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обновить услугу
app.put('/api/services/:id', requireAuth, upload.single('image'), async (req, res) => {
    try {
        console.log('PUT /api/services/:id - Body:', req.body);
        console.log('PUT /api/services/:id - File:', req.file);

        const { title, description, icon, order_num, visible, delete_image } = req.body;
        const visibleValue = visible === 'on' || visible === '1' || visible === 1 || visible === true ? 1 : 0;

        if (req.file) {
            const uploadResult = await uploadImageBuffer(req.file.buffer);
            const image_url = uploadResult.secure_url;
            const stmt = db.prepare('UPDATE services SET title = ?, description = ?, icon = ?, image_url = ?, order_num = ?, visible = ? WHERE id = ?');
            stmt.run(title, description, icon, image_url, order_num || 0, visibleValue, req.params.id);
        } else if (delete_image === '1') {
            const stmt = db.prepare('UPDATE services SET title = ?, description = ?, icon = ?, image_url = NULL, order_num = ?, visible = ? WHERE id = ?');
            stmt.run(title, description, icon, order_num || 0, visibleValue, req.params.id);
        } else {
            const stmt = db.prepare('UPDATE services SET title = ?, description = ?, icon = ?, order_num = ?, visible = ? WHERE id = ?');
            stmt.run(title, description, icon, order_num || 0, visibleValue, req.params.id);
        }

        res.json({ message: 'Услуга обновлена' });
    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({ error: error.message });
    }
});

// Удалить услугу
app.delete('/api/services/:id', requireAuth, (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM services WHERE id = ?');
        stmt.run(req.params.id);
        res.json({ message: 'Услуга удалена' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= ПРОЕКТЫ =============

app.get('/api/projects', (req, res) => {
    try {
        const { category } = req.query;
        let query = 'SELECT * FROM projects WHERE visible = 1';
        let params = [];

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        query += ' ORDER BY created_at DESC';

        const projects = db.prepare(query).all(...params);
        // Очистка undefined/null значений для image_url
        const cleanedProjects = projects.map(project => ({
            ...project,
            image_url: project.image_url && project.image_url !== 'undefined' && project.image_url !== 'null' ? project.image_url : null
        }));
        res.json(cleanedProjects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получить категории проектов
app.get('/api/project-categories', (req, res) => {
    try {
        const categories = db.prepare("SELECT name FROM categories WHERE visible = 1 ORDER BY order_num, name").all();
        res.json(categories.map(c => c.name));
    } catch (error) {
        console.error('Ошибка получения категорий:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/projects/:id', (req, res) => {
    try {
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
        if (project) {
            // Очистка undefined/null значений для image_url
            project.image_url = project.image_url && project.image_url !== 'undefined' && project.image_url !== 'null' ? project.image_url : null;
            res.json(project);
        } else {
            res.status(404).json({ error: 'Проект не найден' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/projects', requireAuth, (req, res) => {
    try {
        const { title, description, category, image_url, gallery_images, address, year, total_area, floors, client, stage } = req.body;
        const stmt = db.prepare('INSERT INTO projects (title, description, category, image_url, gallery_images, address, year, total_area, floors, client, stage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        const result = stmt.run(title, description, category, image_url, gallery_images, address, year, total_area, floors, client, stage);
        res.status(201).json({ id: result.lastInsertRowid, message: 'Проект создан' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/projects/:id', requireAuth, (req, res) => {
    try {
        const { title, description, category, image_url, gallery_images, address, year, total_area, floors, client, stage, visible } = req.body;
        const stmt = db.prepare('UPDATE projects SET title = ?, description = ?, category = ?, image_url = ?, gallery_images = ?, address = ?, year = ?, total_area = ?, floors = ?, client = ?, stage = ?, visible = ? WHERE id = ?');
        stmt.run(title, description, category, image_url, gallery_images, address, year, total_area, floors, client, stage, visible, req.params.id);
        res.json({ message: 'Проект обновлен' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/projects/:id', requireAuth, (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
        stmt.run(req.params.id);
        res.json({ message: 'Проект удален' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= HERO СЛАЙДЫ =============

app.get('/api/hero-slides', (req, res) => {
    try {
        const slides = db.prepare('SELECT * FROM slider_items WHERE visible = 1 ORDER BY order_num ASC').all();
        const cleanedSlides = slides.map(slide => ({
            ...slide,
            image_url: slide.image_url && slide.image_url !== 'undefined' && slide.image_url !== 'null' ? slide.image_url : null
        }));
        res.json(cleanedSlides);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/hero-slides/:id', requireAuth, (req, res) => {
    try {
        const slide = db.prepare('SELECT * FROM slider_items WHERE id = ?').get(req.params.id);
        if (slide) {
            res.json(slide);
        } else {
            res.status(404).json({ error: 'Слайд не найден' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/hero-slides', requireAuth, (req, res) => {
    try {
        console.log('POST /api/hero-slides - Body:', req.body);
        const { title, description, category, media_type, image_url, video_url, button_text, button_link, order_num, project_id } = req.body;
        const stmt = db.prepare('INSERT INTO slider_items (title, description, category, media_type, image_url, video_url, button_text, button_link, order_num, project_id, visible) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)');
        const result = stmt.run(title, description, category, media_type || 'image', image_url, video_url, button_text || 'Подробнее', button_link, order_num || 0, project_id || null);
        res.status(201).json({ id: result.lastInsertRowid, message: 'Слайд создан' });
    } catch (error) {
        console.error('Ошибка создания слайда:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/hero-slides/:id', requireAuth, (req, res) => {
    try {
        const { title, description, category, media_type, image_url, video_url, button_text, button_link, order_num, visible, project_id } = req.body;
        const stmt = db.prepare('UPDATE slider_items SET title = ?, description = ?, category = ?, media_type = ?, image_url = ?, video_url = ?, button_text = ?, button_link = ?, order_num = ?, visible = ?, project_id = ? WHERE id = ?');
        stmt.run(title, description, category, media_type || 'image', image_url, video_url, button_text, button_link, order_num, visible, project_id || null, req.params.id);
        res.json({ message: 'Слайд обновлен' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/hero-slides/:id', requireAuth, (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM slider_items WHERE id = ?');
        stmt.run(req.params.id);
        res.json({ message: 'Слайд удален' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= ОТЗЫВЫ =============

app.get('/api/reviews', (req, res) => {
    try {
        // Проверяем, существует ли таблица
        const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reviews'").get();

        if (!tableExists) {
            console.error('Reviews table does not exist');
            return res.status(500).json({ error: 'Reviews table does not exist' });
        }

        const reviews = db.prepare('SELECT * FROM reviews WHERE visible = 1 ORDER BY created_at DESC').all();
        // Очистка undefined/null значений для image_url
        const cleanedReviews = reviews.map(review => ({
            ...review,
            image_url: review.image_url && review.image_url !== 'undefined' && review.image_url !== 'null' ? review.image_url : null
        }));
        res.json(cleanedReviews);
    } catch (error) {
        console.error('Error in /api/reviews:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reviews/:id', (req, res) => {
    try {
        // Проверяем, существует ли таблица
        const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reviews'").get();

        if (!tableExists) {
            console.error('Reviews table does not exist');
            return res.status(500).json({ error: 'Reviews table does not exist' });
        }

        const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
        if (review) {
            // Очистка undefined/null значений для image_url
            review.image_url = review.image_url && review.image_url !== 'undefined' && review.image_url !== 'null' ? review.image_url : null;
            res.json(review);
        } else {
            res.status(404).json({ error: 'Отзыв не найден' });
        }
    } catch (error) {
        console.error('Error in /api/reviews/:id:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/reviews', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { client_name, company, text, rating, visible } = req.body;
        let image_url = null;

        if (req.file) {
            // Загрузка в Cloudinary
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'uk-architects/reviews',
                        resource_type: 'auto',
                        transformation: [
                            { width: 200, height: 200, crop: 'fill', gravity: 'face' }, // Аватарки 200x200
                            { quality: 'auto:good' }
                        ]
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(req.file.buffer);
            });

            image_url = result.secure_url;
        }

        const visibleValue = visible === 'on' || visible === '1' || visible === 1 || visible === true ? 1 : 0;

        const stmt = db.prepare('INSERT INTO reviews (client_name, company, text, rating, image_url, visible) VALUES (?, ?, ?, ?, ?, ?)');
        const result = stmt.run(client_name, company, text, rating || 5, image_url, visibleValue);
        res.status(201).json({ id: result.lastInsertRowid, message: 'Отзыв создан' });
    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/reviews/:id', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { client_name, company, text, rating, visible } = req.body;
        const visibleValue = visible === 'on' || visible === '1' || visible === 1 || visible === true ? 1 : 0;

        if (req.file) {
            // Загрузка в Cloudinary
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'uk-architects/reviews',
                        resource_type: 'auto',
                        transformation: [
                            { width: 200, height: 200, crop: 'fill', gravity: 'face' }, // Аватарки 200x200
                            { quality: 'auto:good' }
                        ]
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(req.file.buffer);
            });

            const image_url = result.secure_url;
            const stmt = db.prepare('UPDATE reviews SET client_name = ?, company = ?, text = ?, rating = ?, image_url = ?, visible = ? WHERE id = ?');
            stmt.run(client_name, company, text, rating || 5, image_url, visibleValue, req.params.id);
        } else {
            const stmt = db.prepare('UPDATE reviews SET client_name = ?, company = ?, text = ?, rating = ?, visible = ? WHERE id = ?');
            stmt.run(client_name, company, text, rating || 5, visibleValue, req.params.id);
        }

        res.json({ message: 'Отзыв обновлен' });
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/reviews/:id', requireAuth, (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM reviews WHERE id = ?');
        stmt.run(req.params.id);
        res.json({ message: 'Отзыв удален' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= РАЗДЕЛЫ =============

app.get('/api/sections', (req, res) => {
    try {
        // Исключаем служебные страницы из основных разделов сайта
        const sections = db.prepare(`
            SELECT * FROM sections 
            WHERE visible = 1 
            AND slug NOT IN ('user-agreement', 'privacy-policy', 'about') 
            ORDER BY order_num
        `).all();
        res.json(sections);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/sections/:slug', (req, res) => {
    try {
        // Пробуем найти по slug, если нет - по ID
        let section = db.prepare('SELECT * FROM sections WHERE slug = ?').get(req.params.slug);
        if (!section && !isNaN(req.params.slug)) {
            section = db.prepare('SELECT * FROM sections WHERE id = ?').get(req.params.slug);
        }
        if (section) {
            res.json(section);
        } else {
            res.status(404).json({ error: 'Раздел не найден' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/sections', (req, res) => {
    try {
        const { slug, title, subtitle, content, background_image, order_num } = req.body;
        const stmt = db.prepare('INSERT INTO sections (slug, title, subtitle, content, background_image, order_num) VALUES (?, ?, ?, ?, ?, ?)');
        const result = stmt.run(slug, title, subtitle, content, background_image, order_num || 0);
        res.status(201).json({ id: result.lastInsertRowid, message: 'Раздел создан' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/sections/:id', (req, res) => {
    try {
        const { slug, title, subtitle, content, background_image, order_num, visible } = req.body;
        const stmt = db.prepare('UPDATE sections SET slug = ?, title = ?, subtitle = ?, content = ?, background_image = ?, order_num = ?, visible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        stmt.run(slug, title, subtitle, content, background_image, order_num, visible, req.params.id);
        res.json({ message: 'Раздел обновлен' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/sections/:id', (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM sections WHERE id = ?');
        stmt.run(req.params.id);
        res.json({ message: 'Раздел удален' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= КОМАНДА =============

app.get('/api/team', (req, res) => {
    try {
        const team = db.prepare('SELECT * FROM team WHERE visible = 1 ORDER BY order_num').all();
        res.json(team);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/team/:id', (req, res) => {
    try {
        const member = db.prepare('SELECT * FROM team WHERE id = ?').get(req.params.id);
        if (member) {
            res.json(member);
        } else {
            res.status(404).json({ error: 'Сотрудник не найден' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/team', upload.single('photo'), async (req, res) => {
    try {
        const { name, position, bio, email, phone, order_num, visible } = req.body;
        let photo_url = null;

        if (req.file) {
            // Загрузка в Cloudinary
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'uk-architects/team',
                        transformation: [{ width: 500, height: 500, crop: 'fill', quality: 'auto:good' }]
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(req.file.buffer);
            });
            photo_url = result.secure_url;
        }

        const visibleValue = visible === 'on' || visible === '1' || visible === 1 || visible === true ? 1 : 0;

        const stmt = db.prepare('INSERT INTO team (name, position, bio, photo_url, email, phone, order_num, visible) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        const result = stmt.run(name, position, bio, photo_url, email, phone, order_num || 0, visibleValue);
        res.status(201).json({ id: result.lastInsertRowid, message: 'Сотрудник добавлен' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/team/:id', upload.single('photo'), async (req, res) => {
    try {
        const { name, position, bio, email, phone, order_num, visible } = req.body;
        const visibleValue = visible === 'on' || visible === '1' || visible === 1 || visible === true ? 1 : 0;

        if (req.file) {
            // Загрузка в Cloudinary
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'uk-architects/team',
                        transformation: [{ width: 500, height: 500, crop: 'fill', quality: 'auto:good' }]
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(req.file.buffer);
            });
            const photo_url = result.secure_url;
            const stmt = db.prepare('UPDATE team SET name = ?, position = ?, bio = ?, photo_url = ?, email = ?, phone = ?, order_num = ?, visible = ? WHERE id = ?');
            stmt.run(name, position, bio, photo_url, email, phone, order_num || 0, visibleValue, req.params.id);
        } else {
            const stmt = db.prepare('UPDATE team SET name = ?, position = ?, bio = ?, email = ?, phone = ?, order_num = ?, visible = ? WHERE id = ?');
            stmt.run(name, position, bio, email, phone, order_num || 0, visibleValue, req.params.id);
        }

        res.json({ message: 'Информация обновлена' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/team/:id', (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM team WHERE id = ?');
        stmt.run(req.params.id);
        res.json({ message: 'Сотрудник удален' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= STAGES =============

app.get('/api/stages', (req, res) => {
    try {
        // Сначала пытаемся получить стадии из таблицы stages
        const stages = db.prepare('SELECT * FROM stages WHERE visible = 1 ORDER BY order_num').all();

        // Если таблица пуста, возвращаем базовые стадии
        if (stages.length === 0) {
            const defaultStages = [
                { id: 1, name: 'Концепция', slug: 'concept', order_num: 1 },
                { id: 2, name: 'Проект', slug: 'project', order_num: 2 },
                { id: 3, name: 'Рабочая документация', slug: 'working', order_num: 3 },
                { id: 4, name: 'Строительство', slug: 'construction', order_num: 4 },
                { id: 5, name: 'Завершено', slug: 'completed', order_num: 5 }
            ];
            res.json(defaultStages);
        } else {
            res.json(stages);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/stages', requireAuth, (req, res) => {
    try {
        const { name, slug } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Название стадии обязательно' });
        }

        const generatedSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const maxOrder = db.prepare('SELECT MAX(order_num) as max FROM stages').get();
        const orderNum = (maxOrder?.max || 0) + 1;

        const result = db.prepare(`
            INSERT INTO stages (name, slug, order_num, visible)
            VALUES (?, ?, ?, 1)
        `).run(name, generatedSlug, orderNum);

        const newStage = db.prepare('SELECT * FROM stages WHERE id = ?').get(result.lastInsertRowid);
        res.json(newStage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/stages/:id', requireAuth, (req, res) => {
    try {
        const { name, order_num } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Название стадии обязательно' });
        }

        db.prepare('UPDATE stages SET name = ?, order_num = ? WHERE id = ?')
            .run(name, order_num || 0, req.params.id);

        const updatedStage = db.prepare('SELECT * FROM stages WHERE id = ?').get(req.params.id);
        res.json(updatedStage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/stages/:id', requireAuth, (req, res) => {
    try {
        db.prepare('DELETE FROM stages WHERE id = ?').run(req.params.id);
        res.json({ message: 'Стадия удалена' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= CATEGORIES =============

app.get('/api/categories', (req, res) => {
    try {
        const categories = db.prepare('SELECT * FROM categories WHERE visible = 1 ORDER BY order_num, name').all();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/categories', requireAuth, (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Название категории обязательно' });
        }

        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const maxOrder = db.prepare('SELECT MAX(order_num) as max FROM categories').get();
        const orderNum = (maxOrder?.max || 0) + 1;

        const result = db.prepare(`
            INSERT INTO categories (name, slug, order_num, visible)
            VALUES (?, ?, ?, 1)
        `).run(name, slug, orderNum);

        const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
        res.json(newCategory);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/categories/:id', requireAuth, (req, res) => {
    try {
        const { name } = req.body;
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        db.prepare(`
            UPDATE categories 
            SET name = ?, slug = ?
            WHERE id = ?
        `).run(name, slug, req.params.id);

        const updatedCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
        res.json(updatedCategory);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/categories/:id', requireAuth, (req, res) => {
    try {
        db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
        res.json({ message: 'Категория удалена' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= FAQ =============

app.get('/api/faq', (req, res) => {
    try {
        const faq = db.prepare('SELECT * FROM faq WHERE visible = 1 ORDER BY order_num').all();
        res.json(faq);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/faq/:id', (req, res) => {
    try {
        const item = db.prepare('SELECT * FROM faq WHERE id = ?').get(req.params.id);
        if (item) {
            res.json(item);
        } else {
            res.status(404).json({ error: 'Вопрос не найден' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/faq', (req, res) => {
    try {
        const { question, answer, category, order_num } = req.body;
        const stmt = db.prepare('INSERT INTO faq (question, answer, category, order_num) VALUES (?, ?, ?, ?)');
        const result = stmt.run(question, answer, category, order_num || 0);
        res.status(201).json({ id: result.lastInsertRowid, message: 'Вопрос добавлен' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/faq/:id', (req, res) => {
    try {
        const { question, answer, category, order_num, visible } = req.body;
        const stmt = db.prepare('UPDATE faq SET question = ?, answer = ?, category = ?, order_num = ?, visible = ? WHERE id = ?');
        stmt.run(question, answer, category, order_num, visible, req.params.id);
        res.json({ message: 'Вопрос обновлен' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/faq/:id', (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM faq WHERE id = ?');
        stmt.run(req.params.id);
        res.json({ message: 'Вопрос удален' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= НАСТРОЙКИ =============

app.get('/api/settings', (req, res) => {
    try {
        const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
        if (settings) {
            // Удаляем служебные поля
            delete settings.id;
            delete settings.created_at;
            delete settings.updated_at;
            res.json(settings);
        } else {
            res.json({});
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/settings/:key', requireAuth, (req, res) => {
    try {
        const { value } = req.body;
        const key = req.params.key;

        // Список разрешенных полей для обновления
        const allowedFields = [
            'site_title', 'site_description', 'site_keywords', 'site_phone', 'site_email',
            'address', 'working_hours', 'whatsapp_phone', 'instagram_url', 'facebook_url',
            'whatsapp_url', 'telegram_url', 'youtube_url', 'vk_url', 'linkedin_url', 'website_url',
            'google_analytics_id', 'google_tag_manager_id', 'yandex_metrika_id',
            'facebook_pixel_id', 'vk_pixel_id', 'custom_head_code', 'custom_body_code',
            'favicon_url', 'logo_url', 'privacy_policy', 'terms_of_service', 'about_company'
        ];

        if (!allowedFields.includes(key)) {
            return res.status(400).json({ error: 'Недопустимое поле настройки' });
        }

        const stmt = db.prepare(`UPDATE settings SET ${key} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`);
        stmt.run(value);
        res.json({ message: 'Настройка обновлена' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= ФОРМА ОБРАТНОЙ СВЯЗИ =============

app.post('/api/contact', (req, res) => {
    try {
        const { name, phone, email, message } = req.body;
        const stmt = db.prepare('INSERT INTO contact_requests (name, phone, email, message) VALUES (?, ?, ?, ?)');
        const info = stmt.run(name, phone, email || '', message || '');
        res.json({ id: info.lastInsertRowid, message: 'Заявка отправлена' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/contact', (req, res) => {
    try {
        const requests = db.prepare('SELECT * FROM contact_requests ORDER BY created_at DESC').all();
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/contact/:id/status', requireAuth, (req, res) => {
    try {
        const { status } = req.body;
        const stmt = db.prepare('UPDATE contact_requests SET status = ? WHERE id = ?');
        stmt.run(status, req.params.id);
        res.json({ message: 'Статус обновлен' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/contact/:id', (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM contact_requests WHERE id = ?');
        stmt.run(req.params.id);
        res.json({ message: 'Заявка удалена' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Инициализация БД при первом запуске
const initDatabase = async () => {
    try {
        // Проверяем, существует ли таблица users
        const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();

        if (!tableExists) {
            console.log('🔄 Инициализация базы данных...');
            const initDb = await import('./init-db.js');
            console.log('✅ База данных инициализирована');
        }
    } catch (error) {
        console.error('❌ Ошибка инициализации БД:', error);
    }
};

// Запуск сервера
app.listen(PORT, async () => {
    await initDatabase();
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📊 API доступно на http://localhost:${PORT}/api`);
    console.log(`🌐 Фронтенд доступен на http://localhost:${PORT}/index.html`);

    if (!isDevelopment) {
        console.log('🌍 Production mode');
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close();
    process.exit(0);
});
