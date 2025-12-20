# 🚀 Быстрый деплой на Render

## 0️⃣ Cloudinary Setup (3 минуты)

1. Зарегистрируйтесь на https://cloudinary.com (бесплатно)
2. В Dashboard скопируйте:
   - Cloud Name
   - API Key  
   - API Secret

📖 Подробно: [CLOUDINARY.md](CLOUDINARY.md)

## 1️⃣ Git Setup (5 минут)

```bash
cd "d:\UK Global"
git init
git add .
git commit -m "Initial commit"
```

Создайте репозиторий на GitHub и:

```bash
git remote add origin https://github.com/YOUR-USERNAME/uk-architects.git
git push -u origin main
```

## 2️⃣ Render Setup (10 минут)

1. Зайдите на https://render.com и создайте аккаунт
2. New + → Web Service
3. Подключите GitHub репозиторий
4. Настройте:

```
Name: uk-architects
Root Directory: server
Build Command: npm install && npm run setup
Start Command: npm start
Instance Type: Free
```

5. Environment Variables:

```
NODE_ENV=production
SESSION_SECRET=сгенерируйте-случайную-строку
PORT=3000
```

6. ⚠️ **ОБЯЗАТЕЛЬНО!** Добавьте Disk:

```
Name: data
Mount Path: /opt/render/project/src/server
Size: 1 GB
```

7. Create Web Service

## 3️⃣ Готово! (3-5 минут деплоя)

Ваш сайт: `https://uk-architects-xyz.onrender.com`

Админка:
- URL: `https://your-url.onrender.com/admin/login.html`
- Username: `ukarchitects`
- Password: `ukarchitects`

⚠️ **Сразу смените пароль после первого входа!**

---

**Всё! Ваш сайт онлайн! 🎉**

Подробная инструкция: [DEPLOY.md](DEPLOY.md)
