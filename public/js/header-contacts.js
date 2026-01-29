(function () {
    const DEFAULT_FAVICON = '/images/tildafavicon.ico';

    function getApiBase() {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') {
            return 'http://localhost:3000/api';
        }
        if (host.endsWith('onrender.com')) {
            return '/api';
        }
        return 'https://uk-architects.onrender.com/api';
    }

    function ensureFaviconLink() {
        let faviconLink = document.querySelector('link[rel="icon"][data-dynamic-favicon="true"]');
        if (!faviconLink) {
            faviconLink = document.createElement('link');
            faviconLink.rel = 'icon';
            faviconLink.type = 'image/x-icon';
            faviconLink.setAttribute('data-dynamic-favicon', 'true');
            document.head.appendChild(faviconLink);
        }
        return faviconLink;
    }

    function sanitizeUrl(value) {
        if (!value) {
            return '';
        }
        const trimmed = String(value).trim();
        return trimmed && trimmed !== 'null' && trimmed !== 'undefined' ? trimmed : '';
    }

    function normalizeMediaUrl(value) {
        const url = sanitizeUrl(value);
        if (!url) {
            return '';
        }
        if (/^https?:\/\//i.test(url) || url.startsWith('data:')) {
            return url;
        }
        return url.startsWith('/') ? url : '/' + url;
    }

    async function refreshMobileContacts() {
        try {
            const response = await fetch(`${getApiBase()}/settings`);
            if (!response.ok) {
                throw new Error('Failed to load settings');
            }

            const settings = await response.json();

            const phoneEl = document.getElementById('mobile-phone');
            if (phoneEl && settings.site_phone) {
                const sanitizedPhone = settings.site_phone.trim();
                phoneEl.textContent = sanitizedPhone;
                phoneEl.href = 'tel:' + sanitizedPhone.replace(/[^0-9+]/g, '');
            }

            const addressEl = document.getElementById('mobile-address');
            if (addressEl && settings.address) {
                addressEl.textContent = settings.address.trim();
            }

            const logoEl = document.getElementById('site-logo');
            const logoUrl = normalizeMediaUrl(settings.logo_url);
            if (logoEl) {
                if (!logoEl.dataset.defaultLogo) {
                    logoEl.dataset.defaultLogo = logoEl.getAttribute('src') || '';
                }
                if (logoUrl) {
                    logoEl.src = logoUrl;
                } else if (logoEl.dataset.defaultLogo) {
                    logoEl.src = logoEl.dataset.defaultLogo;
                }
            }

            const loaderLogoEl = document.querySelector('#page-loader img');
            if (loaderLogoEl) {
                if (!loaderLogoEl.dataset.defaultLogo) {
                    loaderLogoEl.dataset.defaultLogo = loaderLogoEl.getAttribute('src') || '';
                }
                if (logoUrl) {
                    loaderLogoEl.src = logoUrl;
                } else if (loaderLogoEl.dataset.defaultLogo) {
                    loaderLogoEl.src = loaderLogoEl.dataset.defaultLogo;
                }
            }

            const faviconLink = ensureFaviconLink();
            if (faviconLink) {
                const faviconUrl = normalizeMediaUrl(settings.favicon_url) || DEFAULT_FAVICON;
                faviconLink.href = faviconUrl;
            }
        } catch (error) {
            console.error('Error refreshing mobile contacts:', error);
        }
    }

    window.refreshMobileContacts = refreshMobileContacts;
})();
