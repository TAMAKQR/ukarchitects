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
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp|svg|ico/;
        const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
        const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'image/x-icon' || file.mimetype === 'image/vnd.microsoft.icon';

        if (mimetype || extname) {
            return cb(null, true);
        } else {
            cb(new Error('Только изображения разрешены!'));
        }
    }
});

// Подключение к БД
const db = new Database(join(__dirname, 'database.db'));
db.pragma('journal_mode = WAL');

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
    cookie: {
        secure: !isDevelopment, // HTTPS в production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 часа
        sameSite: 'lax' // lax работает для same-site requests
    }
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(join(__dirname, '..')));

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

        // Загрузка в Cloudinary
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'uk-architects',
                    resource_type: 'auto',
                    transformation: [
                        { width: 2000, crop: 'limit' }, // Максимальная ширина
                        { quality: 'auto:good' } // Автоматическое сжатие
                    ]
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

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
        res.json(services);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получить услугу по ID
app.get('/api/services/:id', (req, res) => {
    try {
        const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
        if (service) {
            res.json(service);
        } else {
            res.status(404).json({ error: 'Услуга не найдена' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Создать услугу
app.post('/api/services', requireAuth, upload.single('image'), (req, res) => {
    try {
        console.log('POST /api/services - Body:', req.body);
        console.log('POST /api/services - File:', req.file);

        const { title, description, icon, order_num, visible } = req.body;
        let image_url = null;

        if (req.file) {
            image_url = `/uploads/${req.file.filename}`;
            console.log('Изображение сохранено:', image_url);
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
app.put('/api/services/:id', requireAuth, upload.single('image'), (req, res) => {
    try {
        console.log('PUT /api/services/:id - Body:', req.body);
        console.log('PUT /api/services/:id - File:', req.file);

        const { title, description, icon, order_num, visible, delete_image } = req.body;
        const visibleValue = visible === 'on' || visible === '1' || visible === 1 || visible === true ? 1 : 0;

        if (req.file) {
            // Если загружено новое изображение
            const image_url = `/uploads/${req.file.filename}`;
            const stmt = db.prepare('UPDATE services SET title = ?, description = ?, icon = ?, image_url = ?, order_num = ?, visible = ? WHERE id = ?');
            stmt.run(title, description, icon, image_url, order_num || 0, visibleValue, req.params.id);
        } else if (delete_image === '1') {
            // Если нужно удалить изображение
            const stmt = db.prepare('UPDATE services SET title = ?, description = ?, icon = ?, image_url = NULL, order_num = ?, visible = ? WHERE id = ?');
            stmt.run(title, description, icon, order_num || 0, visibleValue, req.params.id);
        } else {
            // Изображение не изменяется
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
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получить категории проектов
app.get('/api/project-categories', (req, res) => {
    try {
        const categories = db.prepare("SELECT value FROM settings WHERE key LIKE 'project_category_%' ORDER BY key").all();
        res.json(categories.map(c => c.value));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/projects/:id', (req, res) => {
    try {
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
        if (project) {
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

// ============= ОТЗЫВЫ =============

app.get('/api/reviews', (req, res) => {
    try {
        const reviews = db.prepare('SELECT * FROM reviews WHERE visible = 1 ORDER BY created_at DESC').all();
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reviews/:id', (req, res) => {
    try {
        const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
        if (review) {
            res.json(review);
        } else {
            res.status(404).json({ error: 'Отзыв не найден' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/reviews', requireAuth, upload.single('image'), (req, res) => {
    try {
        const { client_name, company, text, rating, visible } = req.body;
        let image_url = null;

        if (req.file) {
            image_url = `/uploads/${req.file.filename}`;
        }

        const visibleValue = visible === 'on' || visible === '1' || visible === 1 || visible === true ? 1 : 0;

        const stmt = db.prepare('INSERT INTO reviews (client_name, company, text, rating, image_url, visible) VALUES (?, ?, ?, ?, ?, ?)');
        const result = stmt.run(client_name, company, text, rating || 5, image_url, visibleValue);
        res.status(201).json({ id: result.lastInsertRowid, message: 'Отзыв создан' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/reviews/:id', requireAuth, upload.single('image'), (req, res) => {
    try {
        const { client_name, company, text, rating, visible } = req.body;
        const visibleValue = visible === 'on' || visible === '1' || visible === 1 || visible === true ? 1 : 0;

        if (req.file) {
            const image_url = `/uploads/${req.file.filename}`;
            const stmt = db.prepare('UPDATE reviews SET client_name = ?, company = ?, text = ?, rating = ?, image_url = ?, visible = ? WHERE id = ?');
            stmt.run(client_name, company, text, rating || 5, image_url, visibleValue, req.params.id);
        } else {
            const stmt = db.prepare('UPDATE reviews SET client_name = ?, company = ?, text = ?, rating = ?, visible = ? WHERE id = ?');
            stmt.run(client_name, company, text, rating || 5, visibleValue, req.params.id);
        }

        res.json({ message: 'Отзыв обновлен' });
    } catch (error) {
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
        const sections = db.prepare('SELECT * FROM sections WHERE visible = 1 ORDER BY order_num').all();
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

app.post('/api/team', upload.single('photo'), (req, res) => {
    try {
        const { name, position, bio, email, phone, order_num, visible } = req.body;
        let photo_url = null;

        if (req.file) {
            photo_url = `/uploads/${req.file.filename}`;
        }

        const visibleValue = visible === 'on' || visible === '1' || visible === 1 || visible === true ? 1 : 0;

        const stmt = db.prepare('INSERT INTO team (name, position, bio, photo_url, email, phone, order_num, visible) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        const result = stmt.run(name, position, bio, photo_url, email, phone, order_num || 0, visibleValue);
        res.status(201).json({ id: result.lastInsertRowid, message: 'Сотрудник добавлен' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/team/:id', upload.single('photo'), (req, res) => {
    try {
        const { name, position, bio, email, phone, order_num, visible } = req.body;
        const visibleValue = visible === 'on' || visible === '1' || visible === 1 || visible === true ? 1 : 0;

        if (req.file) {
            const photo_url = `/uploads/${req.file.filename}`;
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
        const settings = db.prepare('SELECT * FROM settings').all();
        const settingsObj = {};
        settings.forEach(s => {
            settingsObj[s.key] = s.value;
        });
        res.json(settingsObj);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/settings/:key', requireAuth, (req, res) => {
    try {
        const { value } = req.body;
        // Проверяем существует ли ключ
        const existing = db.prepare('SELECT * FROM settings WHERE key = ?').get(req.params.key);

        if (existing) {
            const stmt = db.prepare('UPDATE settings SET value = ? WHERE key = ?');
            stmt.run(value, req.params.key);
        } else {
            const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
            stmt.run(req.params.key, value);
        }
        res.json({ message: 'Настройка обновлена' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/settings/:key', (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM settings WHERE key = ?');
        stmt.run(req.params.key);
        res.json({ message: 'Настройка удалена' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= ФОРМА ОБРАТНОЙ СВЯЗИ =============

app.post('/api/contact', (req, res) => {
    try {
        const { name, phone, email, message } = req.body;
        const stmt = db.prepare('INSERT INTO contact_requests (name, phone, email, message, created_at) VALUES (?, ?, ?, ?, ?)');
        const info = stmt.run(name, phone, email || '', message || '', new Date().toISOString());
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
