const API_URL = '/api';

// Обертка для fetch с автоматической обработкой авторизации
async function authFetch(url, options = {}) {
    const defaultOptions = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    // Если это FormData, удаляем Content-Type (браузер установит сам)
    if (options.body instanceof FormData) {
        delete defaultOptions.headers['Content-Type'];
    }

    const response = await fetch(url, defaultOptions);

    // Если получили 401, перенаправляем на логин
    if (response.status === 401) {
        window.location.href = 'login.html';
        throw new Error('Unauthorized');
    }

    return response;
}

// Проверка авторизации при загрузке страницы
async function checkAuth() {
    try {
        const response = await authFetch(`${API_URL}/auth/check`);
        const data = await response.json();

        if (!data.authenticated) {
            window.location.href = 'login.html';
            return false;
        }

        // Показываем информацию о пользователе
        const userInfo = document.getElementById('user-info');
        if (userInfo && data.user) {
            userInfo.innerHTML = `Пользователь: <strong>${data.user.username}</strong>`;
        }

        return true;
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// Выход
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Вы уверены, что хотите выйти?')) {
                try {
                    await authFetch(`${API_URL}/auth/logout`, {
                        method: 'POST'
                    });
                    window.location.href = 'login.html';
                } catch (error) {
                    console.error('Ошибка выхода:', error);
                    window.location.href = 'login.html';
                }
            }
        });
    }

    // Проверяем авторизацию
    checkAuth();
});

// Переключение разделов
document.querySelectorAll('.sidebar nav a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = link.getAttribute('data-section');

        if (!sectionId) return; // Пропускаем кнопку выхода

        // Обновление активного пункта меню
        document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
        link.classList.add('active');

        // Показ нужной секции
        document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');

        // Загрузка данных для секции
        loadSectionData(sectionId);
    });
});

// Загрузка данных при открытии секции
function loadSectionData(sectionId) {
    switch (sectionId) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'services':
            loadServices();
            break;
        case 'projects':
            loadProjects();
            break;
        case 'categories':
            loadCategories();
            break;
        case 'stages':
            loadStages();
            break;
        case 'reviews':
            loadReviews();
            break;
        case 'sections':
            loadSections();
            break;
        case 'team':
            loadTeam();
            break;
        case 'faq':
            loadFaq();
            break;
        case 'contact-requests':
            loadContactRequests();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Показ уведомлений
function showAlert(message, type = 'success') {
    const alertContainer = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alertContainer.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, 3000);
}

// ========== DASHBOARD ==========
async function loadDashboard() {
    try {
        const [services, projects, reviews, sections] = await Promise.all([
            authFetch(`${API_URL}/services`).then(r => r.json()),
            authFetch(`${API_URL}/projects`).then(r => r.json()),
            authFetch(`${API_URL}/reviews`).then(r => r.json()),
            authFetch(`${API_URL}/sections`).then(r => r.json())
        ]);

        document.getElementById('stat-services').textContent = services.length;
        document.getElementById('stat-projects').textContent = projects.length;
        document.getElementById('stat-reviews').textContent = reviews.length;
        document.getElementById('stat-sections').textContent = sections.length;
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// ========== УСЛУГИ ==========
async function loadServices() {
    try {
        const response = await authFetch(`${API_URL}/services`);
        const services = await response.json();

        const tbody = document.getElementById('services-table');
        tbody.innerHTML = services.map(service => `
            <tr>
                <td>${service.id}</td>
                <td>${service.title}</td>
                <td>${service.order_num}</td>
                <td class="actions">
                    <button class="btn btn-secondary" onclick="editService(${service.id})">Редактировать</button>
                    <button class="btn btn-danger" onclick="deleteService(${service.id})">Удалить</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Ошибка загрузки услуг:', error);
        showAlert('Ошибка загрузки услуг', 'error');
    }
}

function openServiceModal(id = null) {
    const modalHtml = `
        <div class="modal active" id="service-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${id ? 'Редактировать услугу' : 'Добавить услугу'}</h3>
                    <span class="close" onclick="closeModal('service-modal')">&times;</span>
                </div>
                <form onsubmit="saveService(event, ${id})">
                    <div class="form-group">
                        <label>Название *</label>
                        <input type="text" name="title" required id="service-title">
                    </div>
                    <div class="form-group">
                        <label>Описание</label>
                        <div id="service-description-editor" style="height: 300px; background: white;"></div>
                        <input type="hidden" name="description" id="service-description-hidden">
                    </div>
                    <div class="form-group">
                        <label>Иконка (SVG или URL)</label>
                        <input type="text" name="icon" id="service-icon">
                    </div>
                    <div class="form-group">
                        <label>Изображение карточки</label>
                        <input type="file" name="image" id="service-image" accept="image/*">
                        <button type="button" onclick="deleteServiceImage()" style="margin-top: 5px; padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Удалить изображение</button>
                        <small style="color: #666; display: block; margin-top: 5px;">Фоновое изображение для полноширинной карточки услуги</small>
                        <div id="current-image-preview" style="margin-top: 10px;"></div>
                    </div>
                    <div class="form-group">
                        <label>Порядок</label>
                        <input type="number" name="order_num" value="0" id="service-order">
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="visible" checked id="service-visible"> Видимый
                        </label>
                    </div>
                    <button type="submit" class="btn btn-primary">Сохранить</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal('service-modal')">Отмена</button>
                </form>
            </div>
    `;

    document.getElementById('modal-container').innerHTML = modalHtml;

    // Инициализируем Quill редактор
    const serviceEditor = new Quill('#service-description-editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['link', 'image'],
                ['clean']
            ]
        }
    });
    window.serviceEditor = serviceEditor;

    if (id) {
        authFetch(`${API_URL}/services/${id}`)
            .then(r => r.json())
            .then(service => {
                document.getElementById('service-title').value = service.title;
                if (window.serviceEditor) {
                    window.serviceEditor.root.innerHTML = service.description || '';
                }
                document.getElementById('service-icon').value = service.icon || '';
                document.getElementById('service-order').value = service.order_num;
                document.getElementById('service-visible').checked = service.visible === 1;

                // Показываем текущее изображение, если есть
                if (service.image_url) {
                    document.getElementById('current-image-preview').innerHTML = `
                        <img src="${service.image_url}" style="max-width: 200px; max-height: 150px; border-radius: 8px; margin-top: 5px;">
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">Текущее изображение</p>
                    `;
                }
            });
    }
}

async function saveService(event, id) {
    event.preventDefault();

    // Сохраняем содержимое Quill в скрытое поле ПЕРЕД созданием FormData
    if (window.serviceEditor) {
        const hiddenField = document.getElementById('service-description-hidden');
        if (hiddenField) {
            hiddenField.value = window.serviceEditor.root.innerHTML;
        }
    }

    const formData = new FormData(event.target);

    console.log('Отправка данных:', {
        title: formData.get('title'),
        description: formData.get('description'),
        icon: formData.get('icon'),
        order_num: formData.get('order_num'),
        visible: formData.get('visible')
    });

    // Если файл не выбран, удаляем его из FormData
    const imageFile = formData.get('image');
    if (!imageFile || imageFile.size === 0) {
        formData.delete('image');
    }

    try {
        const response = await authFetch(`${API_URL}/services${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            body: formData  // Отправляем FormData напрямую для поддержки файлов
        });

        if (response.ok) {
            showAlert(id ? 'Услуга обновлена' : 'Услуга добавлена');
            closeModal('service-modal');
            loadServices();
        } else {
            const errorText = await response.text();
            console.error('Ошибка сервера:', errorText);
            showAlert('Ошибка сохранения', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showAlert('Ошибка сохранения: ' + error.message, 'error');
    }
}

async function deleteService(id) {
    if (!confirm('Удалить услугу?')) return;

    try {
        await authFetch(`${API_URL}/services/${id}`, { method: 'DELETE' });
        showAlert('Услуга удалена');
        loadServices();
    } catch (error) {
        showAlert('Ошибка удаления', 'error');
    }
}

function deleteServiceImage() {
    document.getElementById('service-image').value = '';
    document.getElementById('current-image-preview').innerHTML = '';
    // Добавляем скрытое поле для отметки удаления
    let deleteFlag = document.getElementById('delete-service-image-flag');
    if (!deleteFlag) {
        deleteFlag = document.createElement('input');
        deleteFlag.type = 'hidden';
        deleteFlag.name = 'delete_image';
        deleteFlag.id = 'delete-service-image-flag';
        deleteFlag.value = '1';
        document.querySelector('#service-modal form').appendChild(deleteFlag);
    }
    showAlert('Изображение будет удалено при сохранении', 'info');
}

function editService(id) {
    openServiceModal(id);
}

// ========== ПРОЕКТЫ ==========
async function loadProjects() {
    try {
        const [projectsResponse, categoriesResponse] = await Promise.all([
            authFetch(`${API_URL}/projects`),
            authFetch(`${API_URL}/project-categories`)
        ]);

        const projects = await projectsResponse.json();
        const categoriesData = await categoriesResponse.json();

        // Проверяем, что категории - это массив
        window.projectCategories = Array.isArray(categoriesData) ? categoriesData : [];

        const tbody = document.getElementById('projects-table');
        tbody.innerHTML = projects.map(project => `
            <tr>
                <td>${project.id}</td>
                <td>${project.title}</td>
                <td>${project.category || '-'}</td>
                <td>${project.year || '-'}</td>
                <td class="actions">
                    <button class="btn btn-secondary" onclick="editProject(${project.id})">Редактировать</button>
                    <button class="btn btn-danger" onclick="deleteProject(${project.id})">Удалить</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Ошибка загрузки проектов:', error);
        window.projectCategories = [];
        showAlert('Ошибка загрузки проектов', 'error');
    }
}

function openProjectModal(id = null) {
    const categories = Array.isArray(window.projectCategories) && window.projectCategories.length > 0
        ? window.projectCategories
        : [
            'Жилые здания',
            'Общественные пространства',
            'Коммерческие объекты',
            'Спортивные объекты',
            'Медицинские объекты',
            'Образовательные объекты',
            'Мастер-планы'
        ];

    const categoryOptions = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');

    const modalHtml = `
        <div class="modal active" id="project-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${id ? 'Редактировать проект' : 'Добавить проект'}</h3>
                    <span class="close" onclick="closeModal('project-modal')">&times;</span>
                </div>
                <form onsubmit="saveProject(event, ${id})">
                    <h4 style="margin: 20px 0 10px 0; color: #042164;">Основная информация</h4>
                    <div class="form-group">
                        <label>Название проекта *</label>
                        <input type="text" name="title" required id="project-title">
                    </div>
                    <div class="form-group">
                        <label>Описание</label>
                        <div id="project-description-editor" style="height: 300px; background: white;"></div>
                        <input type="hidden" name="description" id="project-description-hidden">
                    </div>
                    <div class="form-group">
                        <label>Категория *</label>
                        <select name="category" required id="project-category">
                            <option value="">Выберите категорию</option>
                            ${categoryOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Главное изображение</label>
                        <input type="file" accept="image/*" id="project-image-file" style="margin-bottom: 10px;">
                        <input type="text" name="image_url" id="project-image" placeholder="или введите URL" readonly style="background: #f5f5f5;">
                        <button type="button" onclick="deleteProjectMainImage()" style="margin-top: 5px; padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Удалить изображение</button>
                        <div id="project-image-preview" style="margin-top: 10px;"></div>
                    </div>
                    <div class="form-group">
                        <label>Галерея изображений</label>
                        <input type="file" accept="image/*" multiple id="project-gallery-files" style="margin-bottom: 10px;">
                        <textarea name="gallery_images" id="project-gallery" rows="5" placeholder="Список загруженных изображений" readonly style="background: #f5f5f5;"></textarea>
                        <button type="button" onclick="deleteProjectGallery()" style="margin-top: 5px; padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Очистить галерею</button>
                        <small style="color: #666; display: block; margin-top: 5px;">Выберите несколько изображений для галереи</small>
                        <div id="project-gallery-preview" style="margin-top: 10px; display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px;"></div>
                    </div>
                    
                    <h4 style="margin: 20px 0 10px 0; color: #042164;">Общие данные</h4>
                    <div class="form-group">
                        <label>Адрес</label>
                        <input type="text" name="address" id="project-address" placeholder="г. Москва, ул. ...">
                    </div>
                    <div class="form-group">
                        <label>Год</label>
                        <input type="number" name="year" id="project-year" placeholder="2024">
                    </div>
                    <div class="form-group">
                        <label>Общая площадь</label>
                        <input type="text" name="total_area" id="project-total-area" placeholder="5000 м²">
                    </div>
                    <div class="form-group">
                        <label>Этажность</label>
                        <input type="text" name="floors" id="project-floors" placeholder="5 этажей">
                    </div>
                    <div class="form-group">
                        <label>Заказчик</label>
                        <input type="text" name="client" id="project-client" placeholder="Название компании">
                    </div>
                    <div class="form-group">
                        <label>Стадия (можно выбрать несколько)</label>
                        <div id="stages-checkboxes" style="border: 1px solid #ddd; padding: 10px; border-radius: 4px; max-height: 150px; overflow-y: auto;">
                            <!-- Стадии будут загружены динамически -->
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin-top: 20px;">
                        <label>
                            <input type="checkbox" name="visible" checked id="project-visible"> Показывать на сайте
                        </label>
                    </div>
                    <div style="margin-top: 20px;">
                        <button type="submit" class="btn btn-primary">Сохранить</button>
                        <button type="button" class="btn btn-secondary" onclick="closeModal('project-modal')">Отмена</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modal-container').innerHTML = modalHtml;

    // Загрузка стадий из API
    authFetch(`${API_URL}/stages`)
        .then(r => r.json())
        .then(stages => {
            if (Array.isArray(stages) && stages.length > 0) {
                const stagesHtml = stages.map(stage => `
                    <label style="display: block; margin: 5px 0;">
                        <input type="checkbox" name="stage" value="${stage.name}"> ${stage.name}
                    </label>
                `).join('');

                document.getElementById('stages-checkboxes').innerHTML = stagesHtml;
            } else {
                document.getElementById('stages-checkboxes').innerHTML = '<p style="color: #999;">Стадии не настроены. Добавьте их в разделе "Стадии проектов"</p>';
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки стадий:', error);
            document.getElementById('stages-checkboxes').innerHTML = '<p style="color: #999;">Ошибка загрузки стадий</p>';
        });

    // Инициализируем Quill редактор для проекта
    const projectEditor = new Quill('#project-description-editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['link', 'image'],
                ['clean']
            ]
        }
    });
    window.projectEditor = projectEditor;

    // Обработчик загрузки главного изображения
    document.getElementById('project-image-file').addEventListener('change', async function (e) {
        const file = e.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await authFetch(`${API_URL}/upload-image`, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                document.getElementById('project-image').value = data.url;
                document.getElementById('project-image-preview').innerHTML = `
                    <img src="${data.url}" style="max-width: 200px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                `;
            } catch (error) {
                console.error('Ошибка загрузки изображения:', error);
                alert('Ошибка при загрузке изображения');
            }
        }
    });

    // Обработчик загрузки галереи изображений
    document.getElementById('project-gallery-files').addEventListener('change', async function (e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const uploadedUrls = [];
        const previewContainer = document.getElementById('project-gallery-preview');
        previewContainer.innerHTML = '<p>Загрузка...</p>';

        for (const file of files) {
            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await authFetch(`${API_URL}/upload-image`, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                uploadedUrls.push(data.url);
            } catch (error) {
                console.error('Ошибка загрузки изображения:', error);
            }
        }

        // Обновляем текстовое поле и превью
        const currentGallery = document.getElementById('project-gallery').value;
        const existingUrls = currentGallery ? currentGallery.split('\n').filter(url => url.trim()) : [];
        const allUrls = [...existingUrls, ...uploadedUrls];

        document.getElementById('project-gallery').value = allUrls.join('\n');

        previewContainer.innerHTML = allUrls.map(url => `
            <img src="${url}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        `).join('');
    });

    if (id) {
        authFetch(`${API_URL}/projects/${id}`)
            .then(r => r.json())
            .then(project => {
                document.getElementById('project-title').value = project.title;
                if (window.projectEditor) {
                    window.projectEditor.root.innerHTML = project.description || '';
                }
                document.getElementById('project-category').value = project.category || '';
                document.getElementById('project-image').value = project.image_url || '';

                // Показываем превью главного изображения
                if (project.image_url) {
                    document.getElementById('project-image-preview').innerHTML = `
                        <img src="${project.image_url}" style="max-width: 200px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    `;
                }

                document.getElementById('project-gallery').value = project.gallery_images || '';

                // Показываем превью галереи
                if (project.gallery_images) {
                    const urls = project.gallery_images.split('\n').filter(url => url.trim());
                    document.getElementById('project-gallery-preview').innerHTML = urls.map(url => `
                        <img src="${url}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    `).join('');
                }

                document.getElementById('project-address').value = project.address || '';
                document.getElementById('project-year').value = project.year || '';
                document.getElementById('project-total-area').value = project.total_area || '';
                document.getElementById('project-floors').value = project.floors || '';
                document.getElementById('project-client').value = project.client || '';

                // Установка множественных значений для стадий
                const stages = project.stage ? project.stage.split(',').map(s => s.trim()) : [];
                document.querySelectorAll('input[name="stage"]').forEach(checkbox => {
                    checkbox.checked = stages.includes(checkbox.value);
                });

                document.getElementById('project-visible').checked = project.visible === 1;
            });
    }
}

async function saveProject(event, id) {
    event.preventDefault();

    // Сохраняем содержимое Quill в скрытое поле ПЕРЕД созданием FormData
    if (window.projectEditor) {
        const hiddenField = document.getElementById('project-description-hidden');
        if (hiddenField) {
            hiddenField.value = window.projectEditor.root.innerHTML;
        }
    }

    const formData = new FormData(event.target);

    // Сбор всех выбранных стадий
    const stages = [];
    document.querySelectorAll('input[name="stage"]:checked').forEach(checkbox => {
        stages.push(checkbox.value);
    });

    const data = {
        title: formData.get('title'),
        description: formData.get('description'),
        category: formData.get('category'),
        image_url: formData.get('image_url'),
        gallery_images: formData.get('gallery_images'),
        address: formData.get('address'),
        year: formData.get('year') ? parseInt(formData.get('year')) : null,
        total_area: formData.get('total_area'),
        floors: formData.get('floors'),
        client: formData.get('client'),
        stage: stages.join(', '),
        visible: document.getElementById('project-visible').checked ? 1 : 0
    };

    console.log('Сохранение проекта:', data);

    try {
        const response = await authFetch(`${API_URL}/projects${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showAlert(id ? 'Проект обновлен' : 'Проект добавлен');
            closeModal('project-modal');
            loadProjects();
        }
    } catch (error) {
        showAlert('Ошибка сохранения', 'error');
    }
}

async function deleteProject(id) {
    if (!confirm('Удалить проект?')) return;

    try {
        await authFetch(`${API_URL}/projects/${id}`, { method: 'DELETE' });
        showAlert('Проект удален');
        loadProjects();
    } catch (error) {
        showAlert('Ошибка удаления', 'error');
    }
}

function deleteProjectMainImage() {
    document.getElementById('project-image').value = '';
    document.getElementById('project-image-preview').innerHTML = '';
    document.getElementById('project-image-file').value = '';
    showAlert('Изображение будет удалено при сохранении', 'info');
}

function deleteProjectGallery() {
    document.getElementById('project-gallery').value = '';
    document.getElementById('project-gallery-preview').innerHTML = '';
    document.getElementById('project-gallery-files').value = '';
    showAlert('Галерея будет очищена при сохранении', 'info');
}

function editProject(id) {
    openProjectModal(id);
}

// Остальные функции для reviews, sections, team, faq аналогично...
// Для краткости не буду дублировать весь код

// ========== КАТЕГОРИИ ПРОЕКТОВ ==========
async function loadCategories() {
    try {
        const response = await authFetch(`${API_URL}/settings`);
        const settings = await response.json();

        const categories = Object.entries(settings)
            .filter(([key]) => key.startsWith('project_category_'))
            .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

        const container = document.getElementById('categories-list');
        container.innerHTML = categories.map(([key, value]) => `
            <div style="display: flex; gap: 10px; margin-bottom: 15px; align-items: center; padding: 15px; background: #f8f9fa; border-radius: 5px;">
                <input type="text" value="${value}" id="${key}" 
                    style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px;"
                    onchange="updateCategory('${key}', this.value)">
                <button class="btn btn-danger" onclick="deleteCategory('${key}')">Удалить</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
        showAlert('Ошибка загрузки категорий', 'error');
    }
}

async function updateCategory(key, value) {
    try {
        await authFetch(`${API_URL}/settings/${key}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value })
        });
        showAlert('Категория обновлена');
    } catch (error) {
        showAlert('Ошибка обновления', 'error');
    }
}

async function deleteCategory(key) {
    if (!confirm('Удалить категорию?')) return;

    try {
        // Здесь нужно добавить DELETE endpoint в API
        await authFetch(`${API_URL}/settings/${key}`, { method: 'DELETE' });
        showAlert('Категория удалена');
        loadCategories();
    } catch (error) {
        showAlert('Ошибка удаления', 'error');
    }
}

function addCategory() {
    const categoryName = prompt('Введите название новой категории:');
    if (!categoryName) return;

    // Найти максимальный номер категории
    authFetch(`${API_URL}/settings`)
        .then(r => r.json())
        .then(settings => {
            const categoryKeys = Object.keys(settings).filter(k => k.startsWith('project_category_'));
            const maxNum = categoryKeys.length > 0
                ? Math.max(...categoryKeys.map(k => parseInt(k.replace('project_category_', ''))))
                : 0;
            const newKey = `project_category_${maxNum + 1}`;

            return authFetch(`${API_URL}/settings/${newKey}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: categoryName })
            });
        })
        .then(() => {
            showAlert('Категория добавлена');
            loadCategories();
        })
        .catch(error => {
            showAlert('Ошибка добавления', 'error');
        });
}

// ========== СТАДИИ ПРОЕКТОВ ==========
async function loadStages() {
    try {
        const response = await authFetch(`${API_URL}/stages`);
        const stages = await response.json();

        window.projectStages = stages.map(stage => stage.name);

        const container = document.getElementById('stages-list');
        container.innerHTML = stages.map(stage => `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                <input type="text" value="${stage.name}" 
                       onblur="updateStage(${stage.id}, this.value)" 
                       style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <button class="btn btn-danger" onclick="deleteStage(${stage.id})" style="padding: 8px 15px;">Удалить</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка загрузки стадий:', error);
        showAlert('Ошибка загрузки стадий', 'error');
    }
}

async function updateStage(id, name) {
    try {
        await authFetch(`${API_URL}/stages/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        showAlert('Стадия обновлена');
        loadStages();
    } catch (error) {
        console.error('Ошибка обновления стадии:', error);
        showAlert('Ошибка обновления', 'error');
    }
}

async function deleteStage(id) {
    if (!confirm('Удалить стадию?')) return;

    try {
        await authFetch(`${API_URL}/stages/${id}`, { method: 'DELETE' });
        showAlert('Стадия удалена');
        loadStages();
    } catch (error) {
        console.error('Ошибка удаления стадии:', error);
        showAlert('Ошибка удаления', 'error');
    }
}

async function addStage() {
    const stageName = prompt('Введите название новой стадии:');
    if (!stageName?.trim()) return;

    try {
        await authFetch(`${API_URL}/stages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: stageName.trim() })
        });
        showAlert('Стадия добавлена');
        loadStages();
    } catch (error) {
        console.error('Ошибка добавления стадии:', error);
        showAlert('Ошибка добавления', 'error');
    }
}

// ========== ОТЗЫВЫ ==========
async function loadReviews() {
    try {
        const response = await authFetch(`${API_URL}/reviews`);
        const reviews = await response.json();

        const tbody = document.querySelector('#reviews tbody');
        tbody.innerHTML = reviews.map(review => `
            <tr>
                <td>${review.id}</td>
                <td>${review.client_name}</td>
                <td>${review.company || '-'}</td>
                <td>${review.rating}/5</td>
                <td class="actions">
                    <button class="btn btn-secondary" onclick="editReview(${review.id})">Редактировать</button>
                    <button class="btn btn-danger" onclick="deleteReview(${review.id})">Удалить</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Ошибка загрузки отзывов:', error);
        showAlert('Ошибка загрузки отзывов', 'error');
    }
}

function openReviewModal(id = null) {
    const modalHtml = `
        <div class="modal active" id="review-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${id ? 'Редактировать отзыв' : 'Добавить отзыв'}</h3>
                    <span class="close" onclick="closeModal('review-modal')">&times;</span>
                </div>
                <form onsubmit="saveReview(event, ${id})">
                    <div class="form-group">
                        <label>Имя клиента *</label>
                        <input type="text" name="client_name" required id="review-client-name">
                    </div>
                    <div class="form-group">
                        <label>Компания / Должность</label>
                        <input type="text" name="company" id="review-company" placeholder="Например: Девелопер или ООО 'Компания'">
                    </div>
                    <div class="form-group">
                        <label>Отзыв *</label>
                        <textarea name="text" required id="review-text" rows="5" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Рейтинг *</label>
                        <select name="rating" id="review-rating" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="5">5 звезд</option>
                            <option value="4">4 звезды</option>
                            <option value="3">3 звезды</option>
                            <option value="2">2 звезды</option>
                            <option value="1">1 звезда</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Фото клиента</label>
                        <input type="file" name="image" id="review-image" accept="image/*">
                        <small style="color: #666; display: block; margin-top: 5px;">Круглое фото клиента для отображения в карточке отзыва</small>
                        <div id="current-review-image-preview" style="margin-top: 10px;"></div>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="visible" checked id="review-visible"> Видимый
                        </label>
                    </div>
                    <button type="submit" class="btn btn-primary">Сохранить</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal('review-modal')">Отмена</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modal-container').innerHTML = modalHtml;

    if (id) {
        authFetch(`${API_URL}/reviews/${id}`)
            .then(r => r.json())
            .then(review => {
                document.getElementById('review-client-name').value = review.client_name;
                document.getElementById('review-company').value = review.company || '';
                document.getElementById('review-text').value = review.text;
                document.getElementById('review-rating').value = review.rating;
                document.getElementById('review-visible').checked = review.visible === 1;

                if (review.image_url) {
                    document.getElementById('current-review-image-preview').innerHTML = `
                        <img src="${review.image_url}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; margin-top: 5px;">
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">Текущее фото</p>
                    `;
                }
            });
    }
}

async function saveReview(event, id) {
    event.preventDefault();

    const formData = new FormData(event.target);

    const imageFile = formData.get('image');
    if (!imageFile || imageFile.size === 0) {
        formData.delete('image');
    }

    try {
        const response = await authFetch(`${API_URL}/reviews${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            body: formData
        });

        if (response.ok) {
            showAlert(id ? 'Отзыв обновлен' : 'Отзыв добавлен');
            closeModal('review-modal');
            loadReviews();
        } else {
            const error = await response.json();
            showAlert(error.error || 'Ошибка сохранения', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showAlert('Ошибка сохранения: ' + error.message, 'error');
    }
}

async function deleteReview(id) {
    if (!confirm('Удалить отзыв?')) return;

    try {
        await authFetch(`${API_URL}/reviews/${id}`, { method: 'DELETE' });
        showAlert('Отзыв удален');
        loadReviews();
    } catch (error) {
        showAlert('Ошибка удаления', 'error');
    }
}

function editReview(id) {
    openReviewModal(id);
}

// ========== РАЗДЕЛЫ ==========
async function loadSections() {
    try {
        const response = await authFetch(`${API_URL}/sections`);
        const sections = await response.json();

        const tbody = document.querySelector('#sections tbody');
        tbody.innerHTML = sections.map(section => `
            <tr>
                <td>${section.id}</td>
                <td>${section.title}</td>
                <td>${section.slug}</td>
                <td>${section.order_num}</td>
                <td class="actions">
                    <button class="btn btn-secondary" onclick="editSection(${section.id})">Редактировать</button>
                    <button class="btn btn-danger" onclick="deleteSection(${section.id})">Удалить</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Ошибка загрузки разделов:', error);
        showAlert('Ошибка загрузки разделов', 'error');
    }
}

function openSectionModal(id = null) {
    const modalHtml = `
        <div class="modal active" id="section-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${id ? 'Редактировать раздел' : 'Добавить раздел'}</h3>
                    <span class="close" onclick="closeModal('section-modal')">&times;</span>
                </div>
                <form onsubmit="saveSection(event, ${id})">
                    <div class="form-group">
                        <label>Название *</label>
                        <input type="text" name="title" required id="section-title">
                    </div>
                    <div class="form-group">
                        <label>Slug (URL) *</label>
                        <input type="text" name="slug" required id="section-slug" placeholder="about-us">
                        <small style="color: #666; display: block; margin-top: 5px;">Уникальный идентификатор раздела для URL</small>
                    </div>
                    <div class="form-group">
                        <label>Подзаголовок</label>
                        <input type="text" name="subtitle" id="section-subtitle">
                    </div>
                    <div class="form-group">
                        <label>Содержимое</label>
                        <textarea name="content" id="section-content" rows="8" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Фоновое изображение (URL)</label>
                        <input type="text" name="background_image" id="section-background">
                    </div>
                    <div class="form-group">
                        <label>Порядок</label>
                        <input type="number" name="order_num" value="0" id="section-order">
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="visible" checked id="section-visible"> Видимый
                        </label>
                    </div>
                    <button type="submit" class="btn btn-primary">Сохранить</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal('section-modal')">Отмена</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modal-container').innerHTML = modalHtml;

    if (id) {
        authFetch(`${API_URL}/sections/${id}`)
            .then(r => r.json())
            .then(section => {
                document.getElementById('section-title').value = section.title;
                document.getElementById('section-slug').value = section.slug;
                document.getElementById('section-subtitle').value = section.subtitle || '';
                document.getElementById('section-content').value = section.content || '';
                document.getElementById('section-background').value = section.background_image || '';
                document.getElementById('section-order').value = section.order_num;
                document.getElementById('section-visible').checked = section.visible === 1;
            });
    }
}

async function saveSection(event, id) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = {
        title: formData.get('title'),
        slug: formData.get('slug'),
        subtitle: formData.get('subtitle'),
        content: formData.get('content'),
        background_image: formData.get('background_image'),
        order_num: parseInt(formData.get('order_num')),
        visible: formData.get('visible') ? 1 : 0
    };

    try {
        const response = await authFetch(`${API_URL}/sections${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showAlert(id ? 'Раздел обновлен' : 'Раздел добавлен');
            closeModal('section-modal');
            loadSections();
        }
    } catch (error) {
        showAlert('Ошибка сохранения', 'error');
    }
}

async function deleteSection(id) {
    if (!confirm('Удалить раздел?')) return;
    try {
        await authFetch(`${API_URL}/sections/${id}`, { method: 'DELETE' });
        showAlert('Раздел удален');
        loadSections();
    } catch (error) {
        showAlert('Ошибка удаления', 'error');
    }
}

function editSection(id) {
    openSectionModal(id);
}

// ========== КОМАНДА ==========
async function loadTeam() {
    try {
        const response = await authFetch(`${API_URL}/team`);
        const team = await response.json();

        const tbody = document.querySelector('#team tbody');
        tbody.innerHTML = team.map(member => `
            <tr>
                <td>${member.id}</td>
                <td>${member.name}</td>
                <td>${member.position || '-'}</td>
                <td class="actions">
                    <button class="btn btn-secondary" onclick="editTeamMember(${member.id})">Редактировать</button>
                    <button class="btn btn-danger" onclick="deleteTeamMember(${member.id})">Удалить</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Ошибка загрузки команды:', error);
        showAlert('Ошибка загрузки команды', 'error');
    }
}

function openTeamModal(id = null) {
    const modalHtml = `
        <div class="modal active" id="team-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${id ? 'Редактировать сотрудника' : 'Добавить сотрудника'}</h3>
                    <span class="close" onclick="closeModal('team-modal')">&times;</span>
                </div>
                <form onsubmit="saveTeamMember(event, ${id})">
                    <div class="form-group">
                        <label>Имя *</label>
                        <input type="text" name="name" required id="team-name">
                    </div>
                    <div class="form-group">
                        <label>Должность</label>
                        <input type="text" name="position" id="team-position">
                    </div>
                    <div class="form-group">
                        <label>Биография</label>
                        <textarea name="bio" id="team-bio" rows="5" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Фото</label>
                        <input type="file" name="photo" id="team-photo" accept="image/*">
                        <div id="current-team-photo-preview" style="margin-top: 10px;"></div>
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" id="team-email">
                    </div>
                    <div class="form-group">
                        <label>Телефон</label>
                        <input type="tel" name="phone" id="team-phone">
                    </div>
                    <div class="form-group">
                        <label>Порядок</label>
                        <input type="number" name="order_num" value="0" id="team-order">
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="visible" checked id="team-visible"> Видимый
                        </label>
                    </div>
                    <button type="submit" class="btn btn-primary">Сохранить</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal('team-modal')">Отмена</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modal-container').innerHTML = modalHtml;

    if (id) {
        authFetch(`${API_URL}/team/${id}`)
            .then(r => r.json())
            .then(member => {
                document.getElementById('team-name').value = member.name;
                document.getElementById('team-position').value = member.position || '';
                document.getElementById('team-bio').value = member.bio || '';
                document.getElementById('team-email').value = member.email || '';
                document.getElementById('team-phone').value = member.phone || '';
                document.getElementById('team-order').value = member.order_num;
                document.getElementById('team-visible').checked = member.visible === 1;

                if (member.photo_url) {
                    document.getElementById('current-team-photo-preview').innerHTML = `
                        <img src="${member.photo_url}" style="max-width: 150px; max-height: 150px; border-radius: 8px;">
                        <p style="font-size: 12px; color: #666; margin-top: 5px;">Текущее фото</p>
                    `;
                }
            });
    }
}

async function saveTeamMember(event, id) {
    event.preventDefault();
    const formData = new FormData(event.target);

    const photoFile = formData.get('photo');
    if (!photoFile || photoFile.size === 0) {
        formData.delete('photo');
    }

    try {
        const response = await authFetch(`${API_URL}/team${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            body: formData
        });

        if (response.ok) {
            showAlert(id ? 'Сотрудник обновлен' : 'Сотрудник добавлен');
            closeModal('team-modal');
            loadTeam();
        } else {
            const error = await response.json();
            showAlert(error.error || 'Ошибка сохранения', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showAlert('Ошибка сохранения: ' + error.message, 'error');
    }
}

async function deleteTeamMember(id) {
    if (!confirm('Удалить сотрудника?')) return;
    try {
        await authFetch(`${API_URL}/team/${id}`, { method: 'DELETE' });
        showAlert('Сотрудник удален');
        loadTeam();
    } catch (error) {
        showAlert('Ошибка удаления', 'error');
    }
}

function editTeamMember(id) {
    openTeamModal(id);
}

// ========== FAQ ==========
async function loadFaq() {
    try {
        const response = await authFetch(`${API_URL}/faq`);
        const faq = await response.json();

        const tbody = document.querySelector('#faq tbody');
        tbody.innerHTML = faq.map(item => `
            <tr>
                <td>${item.id}</td>
                <td>${item.question}</td>
                <td>${item.category || '-'}</td>
                <td class="actions">
                    <button class="btn btn-secondary" onclick="editFaq(${item.id})">Редактировать</button>
                    <button class="btn btn-danger" onclick="deleteFaq(${item.id})">Удалить</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Ошибка загрузки FAQ:', error);
        showAlert('Ошибка загрузки FAQ', 'error');
    }
}

function openFaqModal(id = null) {
    const modalHtml = `
        <div class="modal active" id="faq-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${id ? 'Редактировать вопрос' : 'Добавить вопрос'}</h3>
                    <span class="close" onclick="closeModal('faq-modal')">&times;</span>
                </div>
                <form onsubmit="saveFaq(event, ${id})">
                    <div class="form-group">
                        <label>Вопрос *</label>
                        <input type="text" name="question" required id="faq-question">
                    </div>
                    <div class="form-group">
                        <label>Ответ *</label>
                        <textarea name="answer" required id="faq-answer" rows="5" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Категория</label>
                        <input type="text" name="category" id="faq-category" placeholder="Например: Услуги, Цены">
                    </div>
                    <div class="form-group">
                        <label>Порядок</label>
                        <input type="number" name="order_num" value="0" id="faq-order">
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="visible" checked id="faq-visible"> Видимый
                        </label>
                    </div>
                    <button type="submit" class="btn btn-primary">Сохранить</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal('faq-modal')">Отмена</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modal-container').innerHTML = modalHtml;

    if (id) {
        authFetch(`${API_URL}/faq/${id}`)
            .then(r => r.json())
            .then(item => {
                document.getElementById('faq-question').value = item.question;
                document.getElementById('faq-answer').value = item.answer;
                document.getElementById('faq-category').value = item.category || '';
                document.getElementById('faq-order').value = item.order_num;
                document.getElementById('faq-visible').checked = item.visible === 1;
            });
    }
}

async function saveFaq(event, id) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = {
        question: formData.get('question'),
        answer: formData.get('answer'),
        category: formData.get('category'),
        order_num: parseInt(formData.get('order_num')),
        visible: formData.get('visible') ? 1 : 0
    };

    try {
        const response = await authFetch(`${API_URL}/faq${id ? `/${id}` : ''}`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showAlert(id ? 'Вопрос обновлен' : 'Вопрос добавлен');
            closeModal('faq-modal');
            loadFaq();
        }
    } catch (error) {
        showAlert('Ошибка сохранения', 'error');
    }
}

async function deleteFaq(id) {
    if (!confirm('Удалить вопрос?')) return;
    try {
        await authFetch(`${API_URL}/faq/${id}`, { method: 'DELETE' });
        showAlert('Вопрос удален');
        loadFaq();
    } catch (error) {
        showAlert('Ошибка удаления', 'error');
    }
}

function editFaq(id) {
    openFaqModal(id);
}

// ========== ЗАЯВКИ ==========
async function loadContactRequests() {
    try {
        const response = await authFetch(`${API_URL}/contact`);
        const requests = await response.json();

        const tbody = document.getElementById('contact-requests-table');
        tbody.innerHTML = requests.map(request => `
            <tr>
                <td>${request.id}</td>
                <td>${request.name}</td>
                <td>${request.phone}</td>
                <td>${request.email || '-'}</td>
                <td>${new Date(request.created_at).toLocaleString('ru-RU')}</td>
                <td>
                    <span style="padding: 5px 10px; border-radius: 5px; font-size: 12px; background: ${request.status === 'new' ? '#ffeaa7' : '#81ecec'}; color: #2d3436;">
                        ${request.status === 'new' ? 'Новая' : 'Обработана'}
                    </span>
                </td>
                <td class="actions">
                    <button class="btn btn-secondary" onclick="viewContactRequest(${request.id})">Просмотр</button>
                    <button class="btn btn-danger" onclick="deleteContactRequest(${request.id})">Удалить</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
        showAlert('Ошибка загрузки заявок', 'error');
    }
}

function viewContactRequest(id) {
    authFetch(`${API_URL}/contact`)
        .then(r => r.json())
        .then(requests => {
            const request = requests.find(r => r.id === id);
            if (!request) return;

            const modalHtml = `
                <div class="modal active" id="view-request-modal">
                    <div class="modal-content" style="max-width: 600px;">
                        <span class="modal-close" onclick="closeModal('view-request-modal')">&times;</span>
                        <h3>Заявка #${request.id}</h3>
                        <div style="margin-top: 20px;">
                            <p><strong>Имя:</strong> ${request.name}</p>
                            <p><strong>Телефон:</strong> <a href="tel:${request.phone}">${request.phone}</a></p>
                            ${request.email ? `<p><strong>Email:</strong> <a href="mailto:${request.email}">${request.email}</a></p>` : ''}
                            ${request.message ? `<p><strong>Сообщение:</strong><br>${request.message}</p>` : ''}
                            <p><strong>Дата:</strong> ${new Date(request.created_at).toLocaleString('ru-RU')}</p>
                            <p><strong>Статус:</strong> ${request.status === 'new' ? 'Новая' : 'Обработана'}</p>
                        </div>
                        <div style="margin-top: 30px; display: flex; gap: 10px;">
                            <button class="btn btn-secondary" onclick="markAsProcessed(${request.id})">Отметить обработанной</button>
                            <button class="btn btn-danger" onclick="deleteContactRequest(${request.id}); closeModal('view-request-modal')">Удалить</button>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('modal-container').innerHTML = modalHtml;
        });
}

async function markAsProcessed(id) {
    try {
        await authFetch(`${API_URL}/contact/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'processed' })
        });
        showAlert('Заявка обработана');
        closeModal('view-request-modal');
        loadContactRequests();
    } catch (error) {
        showAlert('Ошибка обновления', 'error');
    }
}

async function deleteContactRequest(id) {
    if (!confirm('Удалить заявку?')) return;

    try {
        await authFetch(`${API_URL}/contact/${id}`, { method: 'DELETE' });
        showAlert('Заявка удалена');
        loadContactRequests();
    } catch (error) {
        showAlert('Ошибка удаления', 'error');
    }
}

// ========== НАСТРОЙКИ ==========
async function loadSettings() {
    try {
        const response = await authFetch(`${API_URL}/settings`);
        const settings = await response.json();

        const container = document.querySelector('#settings .card');
        const settingsSections = [
            {
                title: 'Основные настройки',
                fields: [
                    { key: 'site_title', label: 'Название сайта', type: 'text', description: 'Отображается в заголовке и футере' },
                    { key: 'site_description', label: 'Описание сайта', type: 'textarea', description: 'Мета-описание для SEO' },
                    { key: 'site_keywords', label: 'Ключевые слова', type: 'textarea', description: 'SEO ключевые слова через запятую' },
                ]
            },
            {
                title: 'Контактная информация',
                fields: [
                    { key: 'site_email', label: 'Email для связи', type: 'email', description: 'Основной email компании' },
                    { key: 'site_phone', label: 'Телефон', type: 'tel', description: 'Контактный телефон' },
                    { key: 'whatsapp_phone', label: 'WhatsApp', type: 'tel', description: 'Номер WhatsApp (с кодом страны, например: +79001234567)' },
                    { key: 'address', label: 'Адрес', type: 'text', description: 'Физический адрес офиса' },
                    { key: 'working_hours', label: 'Часы работы', type: 'text', description: 'Например: 9:00 - 18:00' },
                ]
            },
            {
                title: 'Социальные сети',
                fields: [
                    { key: 'instagram_url', label: 'Instagram', type: 'url', description: 'Полная ссылка на профиль Instagram' },
                    { key: 'facebook_url', label: 'Facebook', type: 'url', description: 'Полная ссылка на страницу Facebook' },
                    { key: 'linkedin_url', label: 'LinkedIn', type: 'url', description: 'Полная ссылка на профиль LinkedIn' },
                    { key: 'youtube_url', label: 'YouTube', type: 'url', description: 'Полная ссылка на канал YouTube' },
                    { key: 'telegram_url', label: 'Telegram', type: 'url', description: 'Полная ссылка на Telegram' },
                    { key: 'vk_url', label: 'VK', type: 'url', description: 'Полная ссылка на группу VK' },
                ]
            },
            {
                title: 'Пиксели и аналитика',
                fields: [
                    { key: 'google_analytics_id', label: 'Google Analytics ID', type: 'text', description: 'Например: G-XXXXXXXXXX или UA-XXXXXXXXX-X' },
                    { key: 'google_tag_manager_id', label: 'Google Tag Manager ID', type: 'text', description: 'Например: GTM-XXXXXXX' },
                    { key: 'yandex_metrika_id', label: 'Яндекс.Метрика ID', type: 'text', description: 'Номер счетчика Яндекс.Метрики' },
                    { key: 'facebook_pixel_id', label: 'Facebook Pixel ID', type: 'text', description: 'ID пикселя Facebook' },
                    { key: 'vk_pixel_id', label: 'VK Pixel ID', type: 'text', description: 'ID пикселя ВКонтакте' },
                ]
            },
            {
                title: 'Дополнительно',
                fields: [
                    { key: 'custom_head_code', label: 'Код в &lt;head&gt;', type: 'textarea', description: 'Дополнительный код для вставки в <head> (скрипты, стили)' },
                    { key: 'custom_body_code', label: 'Код в &lt;body&gt;', type: 'textarea', description: 'Дополнительный код для вставки перед закрывающим </body>' },
                    { key: 'favicon_url', label: 'Фавикон', type: 'file', description: 'Загрузите favicon.ico или изображение для фавикона' },
                    { key: 'logo_url', label: 'Логотип сайта', type: 'file', description: 'Загрузите логотип сайта' },
                ]
            }
        ];

        container.innerHTML = `
            <h3>Настройки сайта</h3>
            <form id="settings-form">
                ${settingsSections.map(section => `
                    <div style="margin-bottom: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                        <h4 style="color: #042164; margin-bottom: 20px; font-size: 18px;">${section.title}</h4>
                        ${section.fields.map(field => `
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #333;">${field.label}</label>
                                ${field.type === 'textarea'
                ? `<textarea name="${field.key}" rows="4" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit;">${settings[field.key] || ''}</textarea>`
                : field.type === 'file'
                    ? `
                                        ${settings[field.key] ? `<div style="margin-bottom: 10px;">
                                            <img src="${settings[field.key]}" alt="Current ${field.label}" style="max-width: 150px; max-height: 150px; display: block; margin-bottom: 10px; border: 1px solid #ddd; padding: 5px; border-radius: 4px;">
                                            <input type="hidden" name="${field.key}_current" value="${settings[field.key]}">
                                        </div>` : ''}
                                        <input type="file" id="${field.key}_file" accept="image/*" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                                        <input type="hidden" name="${field.key}" value="${settings[field.key] || ''}">
                                      `
                    : `<input type="${field.type}" name="${field.key}" value="${settings[field.key] || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">`
            }
                                ${field.description ? `<small style="color: #666; display: block; margin-top: 5px;">${field.description}</small>` : ''}
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
                <button type="submit" class="btn btn-primary" style="padding: 12px 30px; font-size: 16px;">Сохранить все настройки</button>
            </form>
        `;

        document.getElementById('settings-form').addEventListener('submit', saveSettings);
    } catch (error) {
        console.error('Ошибка загрузки настроек:', error);
        showAlert('Ошибка загрузки настроек', 'error');
    }
}

async function saveSettings(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    try {
        // Сначала загружаем файлы, если есть
        const fileFields = ['favicon_url', 'logo_url'];

        for (const fieldKey of fileFields) {
            const fileInput = document.getElementById(`${fieldKey}_file`);
            if (fileInput && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const uploadFormData = new FormData();
                uploadFormData.append('image', file);

                const uploadResponse = await authFetch(`${API_URL}/upload-image`, {
                    method: 'POST',
                    body: uploadFormData
                });

                const uploadResult = await uploadResponse.json();
                if (uploadResult.url) {
                    // Обновляем значение в formData
                    formData.set(fieldKey, uploadResult.url);
                }
            }
        }

        // Сохраняем все настройки
        const promises = [];
        for (let [key, value] of formData.entries()) {
            if (!key.endsWith('_current') && !key.endsWith('_file')) {
                promises.push(
                    authFetch(`${API_URL}/settings/${key}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ value })
                    })
                );
            }
        }

        await Promise.all(promises);
        showAlert('Настройки сохранены');

        // Перезагружаем настройки для отображения новых изображений
        setTimeout(() => loadSettings(), 1000);
    } catch (error) {
        console.error('Ошибка сохранения настроек:', error);
        showAlert('Ошибка сохранения настроек', 'error');
    }
}

// Обработчик формы смены пароля
document.getElementById('change-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        showAlert('Пароли не совпадают', 'error');
        return;
    }

    try {
        const response = await authFetch(`${API_URL}/auth/change-password`, {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const result = await response.json();

        if (response.ok) {
            showAlert(result.message || 'Пароль успешно изменен', 'success');
            document.getElementById('change-password-form').reset();
        } else {
            showAlert(result.error || 'Ошибка смены пароля', 'error');
        }
    } catch (error) {
        console.error('Ошибка смены пароля:', error);
        showAlert('Ошибка смены пароля', 'error');
    }
});

// Обработчик формы изменения профиля
document.getElementById('change-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('profile-username').value;
    const email = document.getElementById('profile-email').value;

    try {
        const response = await authFetch(`${API_URL}/auth/change-profile`, {
            method: 'POST',
            body: JSON.stringify({ username, email })
        });

        const result = await response.json();

        if (response.ok) {
            showAlert(result.message || 'Профиль успешно обновлен', 'success');
            // Обновляем отображение имени пользователя
            const userInfo = document.getElementById('user-info');
            if (userInfo) {
                userInfo.innerHTML = `Пользователь: <strong>${result.user.username}</strong>`;
            }
        } else {
            showAlert(result.error || 'Ошибка обновления профиля', 'error');
        }
    } catch (error) {
        console.error('Ошибка обновления профиля:', error);
        showAlert('Ошибка обновления профиля', 'error');
    }
});

// Загрузка профиля при открытии раздела "Безопасность"
document.querySelector('[data-section="security"]').addEventListener('click', async () => {
    try {
        const response = await authFetch(`${API_URL}/auth/check`);
        const data = await response.json();

        if (data.authenticated && data.user) {
            document.getElementById('profile-username').value = data.user.username;
            document.getElementById('profile-email').value = data.user.email;
        }
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
    }
});

// Utility function for closing modals
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

