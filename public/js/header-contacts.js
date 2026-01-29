(function () {
    const DEFAULT_FAVICON = '/images/tildafavicon.ico';
    const STORAGE_LOGO_KEY = 'uk_architects_logo_url';
    const STORAGE_FAVICON_KEY = 'uk_architects_favicon_url';

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

    function getCachedValue(key) {
        try {
            return sanitizeUrl(window.localStorage.getItem(key));
        } catch (error) {
            return '';
        }
    }

    function setCachedValue(key, value) {
        try {
            const normalized = sanitizeUrl(value);
            if (!normalized) {
                window.localStorage.removeItem(key);
            } else {
                window.localStorage.setItem(key, normalized);
            }
        } catch (error) {
            // ignore
        }
    }

    function applyBrandingToDom(logoUrl, faviconUrl) {
        const normalizedLogoUrl = normalizeMediaUrl(logoUrl);

        const logoEl = document.getElementById('site-logo');
        if (logoEl) {
            if (!logoEl.dataset.defaultLogo) {
                logoEl.dataset.defaultLogo = logoEl.getAttribute('src') || '';
            }
            if (normalizedLogoUrl) {
                logoEl.src = normalizedLogoUrl;
            } else if (logoEl.dataset.defaultLogo) {
                logoEl.src = logoEl.dataset.defaultLogo;
            }
        }

        const loaderLogoEl = document.querySelector('#page-loader img');
        if (loaderLogoEl) {
            if (!loaderLogoEl.dataset.defaultLogo) {
                loaderLogoEl.dataset.defaultLogo = loaderLogoEl.getAttribute('src') || '';
            }
            if (normalizedLogoUrl) {
                loaderLogoEl.src = normalizedLogoUrl;
            } else if (loaderLogoEl.dataset.defaultLogo) {
                loaderLogoEl.src = loaderLogoEl.dataset.defaultLogo;
            }
        }

        const faviconLink = ensureFaviconLink();
        if (faviconLink) {
            const normalizedFaviconUrl = normalizeMediaUrl(faviconUrl) || DEFAULT_FAVICON;
            faviconLink.href = normalizedFaviconUrl;
        }
    }

    function applyCachedBranding() {
        const cachedLogoUrl = getCachedValue(STORAGE_LOGO_KEY);
        const cachedFaviconUrl = getCachedValue(STORAGE_FAVICON_KEY);
        if (!cachedLogoUrl && !cachedFaviconUrl) {
            return;
        }

        const tryApply = () => applyBrandingToDom(cachedLogoUrl, cachedFaviconUrl);
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', tryApply, { once: true });
        } else {
            tryApply();
        }
    }

    async function refreshMobileContacts() {
        try {
            // Apply cached branding ASAP to avoid visible "old logo" flash in the preloader.
            applyCachedBranding();

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

            const rawLogoUrl = sanitizeUrl(settings.logo_url);
            const rawFaviconUrl = sanitizeUrl(settings.favicon_url);

            applyBrandingToDom(rawLogoUrl, rawFaviconUrl);
            setCachedValue(STORAGE_LOGO_KEY, rawLogoUrl);
            setCachedValue(STORAGE_FAVICON_KEY, rawFaviconUrl);
        } catch (error) {
            console.error('Error refreshing mobile contacts:', error);
        }
    }

    window.refreshMobileContacts = refreshMobileContacts;

    // Best-effort: apply cached branding even before refreshMobileContacts() is called.
    applyCachedBranding();
})();
