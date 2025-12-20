Write-Host "🚀 Проверка деплоя на Render..." -ForegroundColor Green
Write-Host ""

# Проверяем последние коммиты
Write-Host "📝 Последние коммиты:" -ForegroundColor Yellow
git log --oneline -5

Write-Host ""
Write-Host "🔗 Ссылки для проверки:" -ForegroundColor Cyan
Write-Host "   GitHub репозиторий: https://github.com/TAMAKQR/ukarchitects"
Write-Host "   Render дашборд: https://dashboard.render.com"
Write-Host ""

Write-Host "✅ Деплой завершен!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Что проверить после деплоя:" -ForegroundColor Yellow
Write-Host "   1. Проект доступен на вашем Render URL"
Write-Host "   2. Админ-панель работает (/admin)"
Write-Host "   3. Логин: admin, Пароль: admin123"
Write-Host "   4. Стадии проектов отображаются"
Write-Host "   5. Можно создавать и редактировать проекты"
Write-Host ""
Write-Host "🔧 Если нужна помощь с настройкой Render:" -ForegroundColor Magenta
Write-Host "   1. Создайте новый Web Service на render.com"
Write-Host "   2. Подключите GitHub репозиторий"
Write-Host "   3. Используйте render.yaml конфигурацию"
Write-Host "   4. Добавьте переменные окружения для Cloudinary"