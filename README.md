# UK Global Architects

Сайт архитектурного бюро с админ-панелью

## Деплой на Render

### 1. Подготовка проекта

```bash
# Инициализируйте git репозиторий
git init
git add .
git commit -m "Initial commit"

# Создайте репозиторий на GitHub и загрузите код
git remote add origin https://github.com/your-username/uk-architects.git
git push -u origin main
```

### 2. Создание Web Service на Render

1. Зайдите на [Render.com](https://render.com) и создайте аккаунт
2. Нажмите "New +" → "Web Service"
3. Подключите ваш GitHub репозиторий
4. Настройте сервис:
   - **Name:** uk-architects
   - **Root Directory:** `server`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free (или платный для production)

### 3. Environment Variables

Добавьте переменные окружения в Render Dashboard:

```
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-very-secret-key-here-change-this
```

### 4. Persistent Disk (для сохранения БД и загрузок)

1. В настройках сервиса перейдите в раздел "Disks"
2. Добавьте диск:
   - **Name:** data
   - **Mount Path:** `/opt/render/project/src/server/data`
   - **Size:** 1GB (минимум для Free tier)

### 5. После деплоя

После успешного деплоя:

1. Откройте URL вашего сервиса (например: `https://uk-architects.onrender.com`)
2. Перейдите в админку: `https://uk-architects.onrender.com/admin/login.html`
3. Создайте администратора через SSH или используйте предварительно созданного

### Локальная разработка

```bash
cd server
npm install
npm run dev
```

Сайт будет доступен на http://localhost:3000

## Структура проекта

```
UK Global/
├── server/           # Backend
│   ├── server.js     # Express сервер
│   ├── init-db.js    # Инициализация БД
│   └── package.json
├── admin/            # Админ-панель
├── css/              # Стили
├── js/               # Скрипты
├── images/           # Изображения
├── index.html        # Главная страница
├── projects.html     # Страница проектов
└── privacy.html      # Политика конфиденциальности
```

## Технологии

- **Backend:** Node.js, Express, SQLite
- **Frontend:** Vanilla JS, HTML5, CSS3
- **Auth:** express-session, bcryptjs
- **Editor:** Quill.js

## Админ-панель

По умолчанию:
- Username: `ukarchitects`
- Email: `ukarchitects.kg@gmail.com`
- Password: `ukarchitects`

⚠️ **Важно:** Смените пароль после первого входа!
