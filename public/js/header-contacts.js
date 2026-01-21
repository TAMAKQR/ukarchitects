(function () {
    const DEFAULT_FAVICON = '/images/tildafavicon.ico';

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

    async function refreshMobileContacts() {
        try {
            const response = await fetch('/api/settings');
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
            const logoUrl = sanitizeUrl(settings.logo_url);
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

            const faviconLink = ensureFaviconLink();
            if (faviconLink) {
                const faviconUrl = sanitizeUrl(settings.favicon_url) || DEFAULT_FAVICON;
                faviconLink.href = faviconUrl;
            }
        } catch (error) {
            console.error('Error refreshing mobile contacts:', error);
        }
    }

    window.refreshMobileContacts = refreshMobileContacts;
})();
