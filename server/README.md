# UK Architects - Backend

Бэкенд для сайта UK Architects с базой данных и REST API.

## Установка

1. Перейдите в папку server:
```bash
cd server
```

2. Установите зависимости:
```bash
npm install
```

3. Инициализируйте базу данных:
```bash
npm run init-db
```

4. Запустите сервер:
```bash
npm start
```

Сервер будет доступен по адресу: http://localhost:3000

## API Endpoints

### Услуги
- `GET /api/services` - Получить все услуги
- `GET /api/services/:id` - Получить услугу по ID
- `POST /api/services` - Создать услугу
- `PUT /api/services/:id` - Обновить услугу
- `DELETE /api/services/:id` - Удалить услугу

### Проекты
- `GET /api/projects` - Получить все проекты
- `GET /api/projects/:id` - Получить проект по ID
- `POST /api/projects` - Создать проект
- `PUT /api/projects/:id` - Обновить проект
- `DELETE /api/projects/:id` - Удалить проект

### Отзывы
- `GET /api/reviews` - Получить все отзывы
- `POST /api/reviews` - Создать отзыв
- `PUT /api/reviews/:id` - Обновить отзыв
- `DELETE /api/reviews/:id` - Удалить отзыв

### Разделы
- `GET /api/sections` - Получить все разделы
- `GET /api/sections/:slug` - Получить раздел по slug
- `POST /api/sections` - Создать раздел
- `PUT /api/sections/:id` - Обновить раздел
- `DELETE /api/sections/:id` - Удалить раздел

### Команда
- `GET /api/team` - Получить всю команду
- `POST /api/team` - Добавить сотрудника
- `PUT /api/team/:id` - Обновить информацию
- `DELETE /api/team/:id` - Удалить сотрудника

### FAQ
- `GET /api/faq` - Получить все вопросы
- `POST /api/faq` - Добавить вопрос
- `PUT /api/faq/:id` - Обновить вопрос
- `DELETE /api/faq/:id` - Удалить вопрос

### Настройки
- `GET /api/settings` - Получить все настройки
- `PUT /api/settings/:key` - Обновить настройку

## Админ-панель

Доступна по адресу: http://localhost:3000/admin/index.html

## База данных

Используется SQLite. Файл БД: `server/database.db`

### Структура таблиц:
- services - Услуги
- projects - Проекты
- reviews - Отзывы
- sections - Разделы сайта
- team - Команда
- faq - Часто задаваемые вопросы
- settings - Настройки сайта
