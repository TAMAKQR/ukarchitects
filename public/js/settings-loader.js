// Загрузка и применение настроек сайта
(async function loadSiteSettings() {
    try {
        const getApiBase = () => {
            const host = window.location.hostname;
            if (host === 'localhost' || host === '127.0.0.1') {
                return 'http://localhost:3000/api';
            }
            // Если фронт и API на одном домене (например, когда сайт обслуживается Express на Render)
            if (host.endsWith('onrender.com')) {
                return '/api';
            }
            // Production: статический фронтенд на отдельном домене
            return 'https://uk-architects.onrender.com/api';
        };

        const API_BASE = getApiBase();
        const response = await fetch(`${API_BASE}/settings`);
        const settings = await response.json();

        console.log('Settings loaded:', settings);

        // Обновление мета-тегов
        if (settings.site_title) {
            document.title = settings.site_title;
        }

        if (settings.site_description) {
            updateMetaTag('description', settings.site_description);
        }

        if (settings.site_keywords) {
            updateMetaTag('keywords', settings.site_keywords);
        }

        // Обновление фавикона
        if (settings.favicon_url) {
            updateFavicon(settings.favicon_url);
        }

        // Вставка Google Analytics
        if (settings.google_analytics_id) {
            insertGoogleAnalytics(settings.google_analytics_id);
        }

        // Вставка Google Tag Manager
        if (settings.google_tag_manager_id) {
            insertGoogleTagManager(settings.google_tag_manager_id);
        }

        // Вставка Яндекс.Метрики
        if (settings.yandex_metrika_id) {
            insertYandexMetrika(settings.yandex_metrika_id);
        }

        // Вставка Facebook Pixel
        if (settings.facebook_pixel_id) {
            insertFacebookPixel(settings.facebook_pixel_id);
        }

        // Вставка VK Pixel
        if (settings.vk_pixel_id) {
            insertVKPixel(settings.vk_pixel_id);
        }

        // Вставка пользовательского кода в head
        if (settings.custom_head_code) {
            insertCustomCode(settings.custom_head_code, 'head');
        }

        // Вставка пользовательского кода в body
        if (settings.custom_body_code) {
            insertCustomCode(settings.custom_body_code, 'body');
        }

        // Обновление контактов и социальных сетей на странице
        updateContactsAndSocials(settings);

    } catch (error) {
        console.error('Ошибка загрузки настроек:', error);
    }
})();

// Вспомогательные функции
function updateMetaTag(name, content) {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = name;
        document.head.appendChild(meta);
    }
    meta.content = content;
}

function updateFavicon(url) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.href = url;
}

function insertGoogleAnalytics(trackingId) {
    // Google Analytics 4
    if (trackingId.startsWith('G-')) {
        const script1 = document.createElement('script');
        script1.async = true;
        script1.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
        document.head.appendChild(script1);

        const script2 = document.createElement('script');
        script2.textContent = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${trackingId}');
        `;
        document.head.appendChild(script2);
    }
    // Universal Analytics
    else if (trackingId.startsWith('UA-')) {
        const script = document.createElement('script');
        script.textContent = `
            (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
            (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
            m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
            })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
            ga('create', '${trackingId}', 'auto');
            ga('send', 'pageview');
        `;
        document.head.appendChild(script);
    }
}

function insertGoogleTagManager(gtmId) {
    // GTM Head
    const scriptHead = document.createElement('script');
    scriptHead.textContent = `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${gtmId}');
    `;
    document.head.appendChild(scriptHead);

    // GTM Body
    const noscript = document.createElement('noscript');
    noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
    document.body.insertBefore(noscript, document.body.firstChild);
}

function insertYandexMetrika(counterId) {
    const script = document.createElement('script');
    script.textContent = `
        (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
        (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
        
        ym(${counterId}, "init", {
            clickmap:true,
            trackLinks:true,
            accurateTrackBounce:true,
            webvisor:true
        });
    `;
    document.head.appendChild(script);

    const noscript = document.createElement('noscript');
    noscript.innerHTML = `<div><img src="https://mc.yandex.ru/watch/${counterId}" style="position:absolute; left:-9999px;" alt="" /></div>`;
    document.body.appendChild(noscript);
}

function insertFacebookPixel(pixelId) {
    const script = document.createElement('script');
    script.textContent = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelId}');
        fbq('track', 'PageView');
    `;
    document.head.appendChild(script);

    const noscript = document.createElement('noscript');
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`;
    document.body.appendChild(noscript);
}

function insertVKPixel(pixelId) {
    const script = document.createElement('script');
    script.textContent = `
        !function(){var t=document.createElement("script");t.type="text/javascript",t.async=!0,t.src='https://vk.com/js/api/openapi.js?169',t.onload=function(){VK.Retargeting.Init("${pixelId}"),VK.Retargeting.Hit()},document.head.appendChild(t)}();
    `;
    document.head.appendChild(script);

    const noscript = document.createElement('noscript');
    noscript.innerHTML = `<img src="https://vk.com/rtrg?p=${pixelId}" style="position:fixed; left:-999px;" alt=""/>`;
    document.body.appendChild(noscript);
}

function insertCustomCode(code, location) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = code;

    if (location === 'head') {
        document.head.appendChild(wrapper);
    } else {
        document.body.appendChild(wrapper);
    }
}

function updateContactsAndSocials(settings) {
    // Обновление описания сайта
    if (settings.site_description) {
        document.querySelectorAll('[data-setting="site_description"]').forEach(el => {
            el.textContent = settings.site_description;
        });
    }

    // Обновление телефона
    if (settings.site_phone) {
        document.querySelectorAll('[data-setting="phone"]').forEach(el => {
            el.textContent = settings.site_phone;
            el.href = `tel:${settings.site_phone.replace(/[^+\d]/g, '')}`;
        });
    }

    // Обновление email
    if (settings.site_email) {
        document.querySelectorAll('[data-setting="email"]').forEach(el => {
            el.textContent = settings.site_email;
            el.href = `mailto:${settings.site_email}`;
        });
    }

    // Обновление адреса
    if (settings.address) {
        document.querySelectorAll('[data-setting="address"]').forEach(el => {
            el.textContent = settings.address;
        });
    }

    // Обновление часов работы
    if (settings.working_hours) {
        document.querySelectorAll('[data-setting="working_hours"]').forEach(el => {
            el.textContent = `Время работы: ${settings.working_hours}`;
        });
    }

    // Обновление WhatsApp
    if (settings.whatsapp_phone) {
        document.querySelectorAll('[data-setting="whatsapp"]').forEach(el => {
            const phone = settings.whatsapp_phone.replace(/[^+\d]/g, '');
            el.href = `https://wa.me/${phone}`;
            el.style.display = 'flex';
        });
    }

    // Обновление социальных сетей
    const socials = {
        instagram: settings.instagram_url,
        facebook: settings.facebook_url,
        linkedin: settings.linkedin_url,
        youtube: settings.youtube_url,
        telegram: settings.telegram_url,
        vk: settings.vk_url,
        website: settings.website_url
    };

    Object.entries(socials).forEach(([network, url]) => {
        if (url) {
            document.querySelectorAll(`[data-setting="${network}"]`).forEach(el => {
                el.href = url;
                el.style.display = 'flex';
                el.target = '_blank';
                el.rel = 'noopener noreferrer';
            });
        }
    });
}
