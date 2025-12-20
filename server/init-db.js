import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'database.db'));

// Создание таблиц
const createTables = () => {
  // Таблица услуг
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      image_url TEXT,
      order_num INTEGER DEFAULT 0,
      visible INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Таблица проектов
  db.exec(`
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
    )
  `);

  // Таблица отзывов
  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL,
      company TEXT,
      text TEXT NOT NULL,
      rating INTEGER DEFAULT 5,
      image_url TEXT,
      visible INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Таблица разделов (для нового функционала)
  db.exec(`
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
    )
  `);

  // Таблица команды
  db.exec(`
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
    )
  `);

  // Таблица FAQ
  db.exec(`
    CREATE TABLE IF NOT EXISTS faq (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT,
      order_num INTEGER DEFAULT 0,
      visible INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Таблица настроек сайта
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      description TEXT
    )
  `);

  // Таблица заявок с формы обратной связи
  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'new'
    )
  `);

  console.log('✅ Все таблицы успешно созданы!');
};

// Заполнение начальными данными
const seedData = () => {
  const insertService = db.prepare(`
    INSERT INTO services (title, description, order_num) 
    VALUES (?, ?, ?)
  `);

  const services = [
    ['Маркетинговые исследования и стратегия', 'Анализ рынка и разработка маркетинговой стратегии для вашего объекта', 1],
    ['Архитектурно-строительное проектирование', 'Полный цикл проектирования от концепции до рабочей документации', 2],
    ['Маркетинг объекта', 'Комплексное продвижение вашего объекта недвижимости', 3],
    ['Брендирование объекта', 'Создание уникального бренда для вашего проекта', 4],
    ['2D/3D планировки', 'Детальная визуализация планировочных решений', 5],
    ['Разработка дизайна интерьера', 'Создание стильных и функциональных интерьеров', 6],
    ['3D туры и панорамы', 'Интерактивные виртуальные туры по объектам', 7],
    ['Digital продвижение', 'Онлайн-маркетинг и продвижение в интернете', 8]
  ];

  try {
    const existingServices = db.prepare('SELECT COUNT(*) as count FROM services').get();
    if (existingServices.count === 0) {
      const insertMany = db.transaction((items) => {
        for (const item of items) insertService.run(...item);
      });
      insertMany(services);
      console.log('✅ Услуги добавлены');
    }
  } catch (err) {
    console.log('ℹ️  Услуги уже существуют');
  }

  // Добавление настроек сайта
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, description) 
    VALUES (?, ?, ?)
  `);

  const settings = [
    ['site_title', 'UK ARCHITECTS', 'Название сайта'],
    ['site_phone', '+7 (800) 505-77-28', 'Контактный телефон'],
    ['site_email', 'hello@arch-marketing.ru', 'Email для связи'],
    ['working_hours', '9:00 - 20:00', 'Режим работы'],
    ['address', 'Москва', 'Адрес офиса'],
    ['privacy_policy', `<h2>1. Общие положения</h2>
<p>Администрация Сайта уважает права пользователей и обязуется защищать их персональную информацию. Используя Сайт, вы соглашаетесь с условиями настоящей Политики конфиденциальности.</p>

<h2>2. Собираемая информация</h2>
<p>При использовании Сайта мы можем собирать следующую информацию:</p>
<ul>
<li><strong>Личная информация:</strong> имя, номер телефона, адрес электронной почты</li>
<li><strong>Техническая информация:</strong> IP-адрес, тип браузера, операционная система</li>
<li><strong>Cookies:</strong> данные о поведении на Сайте для улучшения пользовательского опыта</li>
</ul>

<h2>3. Цели обработки персональных данных</h2>
<p>Мы используем собранную информацию для следующих целей:</p>
<ul>
<li>Обработка заявок и запросов пользователей</li>
<li>Предоставление информации о наших услугах</li>
<li>Улучшение работы Сайта и качества обслуживания</li>
<li>Анализ посещаемости и поведения пользователей</li>
</ul>

<h2>4. Защита персональных данных</h2>
<p>Мы принимаем необходимые меры для защиты персональных данных от несанкционированного доступа.</p>

<h2>5. Ваши права</h2>
<p>Вы имеете право получить информацию о собранных персональных данных, требовать их исправления или удаления.</p>

<h2>6. Контактная информация</h2>
<p>По вопросам обработки персональных данных обращайтесь: <a href="mailto:ukarchitects.kg@gmail.com">ukarchitects.kg@gmail.com</a></p>`, 'Политика конфиденциальности']
  ];

  try {
    const insertManySettings = db.transaction((items) => {
      for (const item of items) insertSetting.run(...item);
    });
    insertManySettings(settings);
    console.log('✅ Настройки сайта добавлены');
  } catch (err) {
    console.log('ℹ️  Настройки уже существуют');
  }

  // Добавление категорий проектов
  const insertProjectCategory = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, description) 
    VALUES (?, ?, ?)
  `);

  const projectCategories = [
    ['project_category_1', 'Жилые здания', 'Категория проектов'],
    ['project_category_2', 'Общественные пространства', 'Категория проектов'],
    ['project_category_3', 'Коммерческие объекты', 'Категория проектов'],
    ['project_category_4', 'Спортивные объекты', 'Категория проектов'],
    ['project_category_5', 'Медицинские объекты', 'Категория проектов'],
    ['project_category_6', 'Образовательные объекты', 'Категория проектов'],
    ['project_category_7', 'Мастер-планы', 'Категория проектов']
  ];

  try {
    const insertManyCategories = db.transaction((items) => {
      for (const item of items) insertProjectCategory.run(...item);
    });
    insertManyCategories(projectCategories);
    console.log('✅ Категории проектов добавлены');
  } catch (err) {
    console.log('ℹ️  Категории проектов уже существуют');
  }

  // Добавление стадий проектов
  const insertProjectStage = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, description) 

  const projectStages = [
    ['project_stage_1', 'Концепция', 'Стадия проекта'],
    ['project_stage_2', 'ПП (Проектная документация)', 'Стадия проекта'],
    ['project_stage_3', 'РП (Рабочий проект)', 'Стадия проекта'],
    ['project_stage_4', 'РД (Рабочая документация)', 'Стадия проекта'],
    ['project_stage_5', 'Строительство', 'Стадия проекта'],
    ['project_stage_6', 'Реализовано', 'Стадия проекта']
  ];

  try {
    const insertManyStages = db.transaction((items) => {
      for (const item of items) insertProjectStage.run(...item);
    });
    insertManyStages(projectStages);
    console.log('✅ Стадии проектов добавлены');
  } catch (err) {
    console.log('ℹ️  Стадии проектов уже существуют');
  }
};

// Запуск инициализации
try {
  createTables();
  seedData();
  console.log('✅ База данных успешно инициализирована!');
  console.log('📍 Расположение: ' + join(__dirname, 'database.db'));
} catch (error) {
  console.error('❌ Ошибка инициализации БД:', error);
} finally {
  db.close();
}
