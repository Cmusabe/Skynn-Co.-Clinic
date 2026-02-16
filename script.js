// ===== SKYNN & CO. CLINIC - JAVASCRIPT =====
const ADMIN_BOOKING_CONFIG_KEY = 'skynn_admin_booking_v2';
const ADMIN_SESSION_KEY = 'skynn_admin_session_v1';
const ADMIN_PIN_KEY = 'skynn_admin_pin_v1';
const LEGACY_ADMIN_BOOKING_CONFIG_KEY = 'mizense_admin_booking_v1';
const LEGACY_ADMIN_SESSION_KEY = 'mizense_admin_session_v1';
const LEGACY_ADMIN_PIN_KEY = 'mizense_admin_pin_v1';
const SUPABASE_CONFIG_ROW_KEY = 'booking_config';
const SUPABASE_CONFIG_TABLE = 'site_config';
const USE_EXTERNAL_BOOKING = true;
const ONLINE_BOOKING_URL = '/boek/';
const CATEGORY_PAGE_ROUTE_MAP = {
    'skin-treatments': '/huidverbetering/'
};
const TAB_ROUTE_REDIRECT_MAP = {
    'tab-skin-treatments': '/huidverbetering/',
    'tab-huid': '/huidverbetering/'
};
const NAV_CATEGORY_LABEL_MAP = {
    popular: 'Populaire diensten',
    'laser-hair-removal': 'Laserontharing',
    'skin-treatments': 'Huidbehandelingen',
    'fat-freeze': 'Fat freeze',
    'hair-loss-treatment': 'Haaruitval behandeling',
    'teeth-whitening': 'Tanden bleken',
    consultation: 'Gratis consult',
    'limited-time-offer-50-off-your-first-laser-hair-removal-session': 'Actie 50% eerste lasersessie'
};
const NAV_CATEGORY_PRIORITY = [
    'popular',
    'laser-hair-removal',
    'skin-treatments',
    'fat-freeze',
    'hair-loss-treatment',
    'teeth-whitening',
    'consultation',
    'limited-time-offer-50-off-your-first-laser-hair-removal-session'
];
let supabaseClient = null;

function cloneDeep(value) {
    return JSON.parse(JSON.stringify(value));
}

function slugify(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
}

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/&/g, ' en ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function tokenize(value) {
    const stopwords = new Set(['de', 'het', 'een', 'en', 'van', 'voor', 'met', 'op', 'in', 'of', 'te', 'bij', 'na']);
    return normalizeText(value)
        .split(' ')
        .filter(token => token && !stopwords.has(token));
}

function normalizePath(pathname) {
    const cleaned = String(pathname || '').split('?')[0].split('#')[0] || '/';
    const normalized = cleaned.replace(/\/+$/, '') || '/';
    return normalized;
}

function getCategoryPageRoute(categoryId) {
    const id = slugify(categoryId);
    return CATEGORY_PAGE_ROUTE_MAP[id] || null;
}

function getCategoryTabId(categoryId) {
    return `tab-${slugify(categoryId)}`;
}

function getCategoryHref(categoryId) {
    const route = getCategoryPageRoute(categoryId);
    if (route) return route;
    return `/tarieven#${getCategoryTabId(categoryId)}`;
}

function getNavCategoryLabel(category) {
    const id = slugify(category?.id);
    const label = String(category?.label || '').trim();
    return NAV_CATEGORY_LABEL_MAP[id] || label || id;
}

function isPmuCategory(category) {
    const content = normalizeText(`${category?.id || ''} ${category?.label || ''}`);
    const pmuKeywords = ['pmu', 'permanente', 'microblading', 'infralash', 'powder', 'brow', 'wenkbrauw'];
    return pmuKeywords.some(keyword => content.includes(keyword));
}

function sortCategoriesForNav(categories) {
    const orderMap = new Map(NAV_CATEGORY_PRIORITY.map((id, index) => [id, index]));
    return [...categories].sort((a, b) => {
        const aOrder = orderMap.has(a.id) ? orderMap.get(a.id) : Number.MAX_SAFE_INTEGER;
        const bOrder = orderMap.has(b.id) ? orderMap.get(b.id) : Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return getNavCategoryLabel(a).localeCompare(getNavCategoryLabel(b), 'nl');
    });
}

function renderNavCategoryMenu(menuElement, categories) {
    if (!menuElement) return;
    menuElement.innerHTML = '';
    categories.forEach(category => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = getCategoryHref(category.id);
        link.textContent = getNavCategoryLabel(category);
        li.appendChild(link);
        menuElement.appendChild(li);
    });
}

function getTabRedirectRoute(hashValue) {
    const hash = String(hashValue || '').replace(/^#/, '').trim();
    if (!hash) return null;
    return TAB_ROUTE_REDIRECT_MAP[hash] || null;
}

function getServiceDescription(categoryId, serviceName) {
    const normalizedCategory = slugify(categoryId);
    const normalizedName = normalizeText(serviceName);

    if (normalizedCategory === 'skin-treatments') {
        const descriptions = [
            { pattern: 'hydra', text: 'Intensieve hydratatie en diepe reiniging voor een frisse, stralende huid met directe glow.' },
            { pattern: 'tattoo', text: 'Gefaseerde behandeling die pigment doelgericht afbreekt en de huid zorgvuldig laat herstellen.' },
            { pattern: 'chemical peel', text: 'Verfijnt de huidstructuur, stimuleert celvernieuwing en helpt bij onzuiverheden en dofheid.' },
            { pattern: 'microneedling', text: 'Stimuleert collageenproductie en ondersteunt de huid bij littekens, textuur en fijne lijntjes.' },
            { pattern: 'dieptereiniging', text: 'Diepe reiniging met focus op poriën, onzuiverheden en het herstellen van een rustige huidbalans.' },
            { pattern: 'carbon laser peel', text: 'Zuiverende laserpeel die helpt bij grove poriën, vette huid en een egalere teint.' }
        ];
        const match = descriptions.find(item => normalizedName.includes(item.pattern));
        if (match) return match.text;
        return 'Professionele huidverbetering afgestemd op uw huidtype, klachten en gewenste resultaat.';
    }

    return 'Behandeling op maat met focus op zichtbare resultaten en een veilige, professionele aanpak.';
}

function sanitizeTime(value, fallback = '10:00') {
    const time = String(value || '').trim();
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time) ? time : fallback;
}

function minutesFromTime(value) {
    const time = sanitizeTime(value, '00:00');
    const [h, m] = time.split(':').map(Number);
    return (h * 60) + m;
}

function timeFromMinutes(totalMinutes) {
    const safe = Math.max(0, Math.min(23 * 60 + 59, Number(totalMinutes) || 0));
    const h = String(Math.floor(safe / 60)).padStart(2, '0');
    const m = String(safe % 60).padStart(2, '0');
    return `${h}:${m}`;
}

function parseDurationMinutes(durationText) {
    const text = String(durationText || '').toLowerCase();
    if (!text.trim()) return 60;

    const hourMatch = text.match(/(\d{1,2})\s*(uur|u|hr|hrs|hour|hours)/);
    const minuteMatch = text.match(/(\d{1,3})\s*(min|minuut|minuten|mins|minute|minutes)/);

    let total = 0;
    if (hourMatch) total += Number(hourMatch[1]) * 60;
    if (minuteMatch) total += Number(minuteMatch[1]);

    if (!total) {
        const fallback = text.match(/(\d{1,3})/);
        total = fallback ? Number(fallback[1]) : 60;
    }

    if (!Number.isFinite(total)) return 60;
    return Math.max(15, Math.min(360, total));
}

function getIsoDate(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getDefaultWeeklyAvailability() {
    return {
        0: { enabled: false, start: '10:00', end: '17:00' },
        1: { enabled: true, start: '10:00', end: '19:00' },
        2: { enabled: true, start: '10:00', end: '19:00' },
        3: { enabled: true, start: '10:00', end: '19:00' },
        4: { enabled: true, start: '10:00', end: '19:00' },
        5: { enabled: true, start: '10:00', end: '19:00' },
        6: { enabled: true, start: '10:00', end: '17:00' }
    };
}

function normalizeAvailabilitySettings(raw) {
    const defaults = getDefaultWeeklyAvailability();
    const weeklyRaw = raw && typeof raw.weeklyAvailability === 'object' ? raw.weeklyAvailability : {};
    const weeklyAvailability = {};

    Object.keys(defaults).forEach(dayKey => {
        const source = weeklyRaw[dayKey] || {};
        weeklyAvailability[dayKey] = {
            enabled: Boolean(source.enabled ?? defaults[dayKey].enabled),
            start: sanitizeTime(source.start, defaults[dayKey].start),
            end: sanitizeTime(source.end, defaults[dayKey].end)
        };
    });

    const intervalRaw = Number(raw && raw.slotIntervalMinutes);
    const slotIntervalMinutes = Number.isFinite(intervalRaw) ? Math.max(5, Math.min(180, intervalRaw)) : 30;

    const blockedDatesRaw = Array.isArray(raw && raw.blockedDates) ? raw.blockedDates : [];
    const blockedDates = Array.from(new Set(blockedDatesRaw
        .map(value => String(value || '').trim())
        .filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value))));

    return { weeklyAvailability, slotIntervalMinutes, blockedDates };
}

function getDaySlots(date, settings, serviceDurationMinutes) {
    const dayKey = String(date.getDay());
    const availability = settings?.availability || normalizeAvailabilitySettings({});
    const dayConfig = availability.weeklyAvailability?.[dayKey];
    const isoDate = getIsoDate(date);
    if (!dayConfig || !dayConfig.enabled) return [];
    if ((availability.blockedDates || []).includes(isoDate)) return [];

    const startMinutes = minutesFromTime(dayConfig.start);
    const endMinutes = minutesFromTime(dayConfig.end);
    if (endMinutes <= startMinutes) return [];

    const duration = Math.max(15, serviceDurationMinutes || 60);
    const interval = Math.max(5, availability.slotIntervalMinutes || 30);
    const slots = [];
    for (let minutes = startMinutes; minutes + duration <= endMinutes; minutes += interval) {
        slots.push(timeFromMinutes(minutes));
    }
    return slots;
}

function formatHoursLabel(dayConfig) {
    if (!dayConfig || !dayConfig.enabled) return 'Gesloten';
    const start = sanitizeTime(dayConfig.start, '10:00');
    const end = sanitizeTime(dayConfig.end, '19:00');
    if (minutesFromTime(end) <= minutesFromTime(start)) return 'Gesloten';
    return `${start} - ${end}`;
}

function applyAvailabilityToHoursTables(availabilityRaw) {
    const tables = document.querySelectorAll('.footer-hours, .opening-hours-contact table');
    if (!tables.length) return;

    const availability = normalizeAvailabilitySettings(availabilityRaw || {});
    const dayOrder = [1, 2, 3, 4, 5, 6, 0];
    const dayLabels = {
        0: 'Zondag',
        1: 'Maandag',
        2: 'Dinsdag',
        3: 'Woensdag',
        4: 'Donderdag',
        5: 'Vrijdag',
        6: 'Zaterdag'
    };

    const rows = dayOrder.map(day => {
        const dayConfig = availability.weeklyAvailability[String(day)];
        const hours = formatHoursLabel(dayConfig);
        return `<tr><td><strong>${dayLabels[day]}</strong></td><td>${hours}</td></tr>`;
    }).join('');

    tables.forEach(table => {
        table.innerHTML = rows;
    });
}

function normalizeAdminConfig(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const categoriesRaw = Array.isArray(raw.categories) ? raw.categories : [];
    const servicesRaw = Array.isArray(raw.services) ? raw.services : [];

    const categories = categoriesRaw
        .map(item => ({
            id: slugify(item.id),
            label: String(item.label || '').trim()
        }))
        .filter(item => item.id && item.label);

    const categoryIds = new Set(categories.map(item => item.id));

    const services = servicesRaw
        .map(item => ({
            id: slugify(item.id),
            category: String(item.category || '').trim().toLowerCase(),
            section: String(item.section || '').trim(),
            name: String(item.name || '').trim(),
            duration: String(item.duration || '').trim(),
            price: String(item.price || '').trim()
        }))
        .filter(item => item.id && item.category && item.name && categoryIds.has(item.category))
        .map(item => ({
            ...item,
            section: item.section || 'Diensten',
            duration: item.duration || '-',
            price: item.price || '€ 0,00'
        }));

    const legacyCategoryIds = ['micro', 'gezicht', 'wax', 'upgrade'];
    const hasLegacyCategories = legacyCategoryIds.some(id => categoryIds.has(id));
    const hasSyncedCatalogCategories = categoryIds.has('laser-hair-removal') || categoryIds.has('skin-treatments') || categoryIds.has('teeth-whitening');
    if (hasLegacyCategories && !hasSyncedCatalogCategories) return null;

    const settingsRaw = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
    const settings = {
        staffName: String(settingsRaw.staffName || 'Wenifer').trim() || 'Wenifer',
        staffStatus: String(settingsRaw.staffStatus || 'Beschikbaar volgens openingstijden').trim() || 'Beschikbaar volgens openingstijden',
        firstAvailabilityText: String(settingsRaw.firstAvailabilityText || 'vandaag').trim() || 'vandaag',
        availability: normalizeAvailabilitySettings(settingsRaw.availability)
    };

    if (!categories.length) return null;
    return { categories, services, settings };
}

function readAdminBookingConfig() {
    try {
        const raw = localStorage.getItem(ADMIN_BOOKING_CONFIG_KEY) || localStorage.getItem(LEGACY_ADMIN_BOOKING_CONFIG_KEY);
        if (!raw) return null;
        return normalizeAdminConfig(JSON.parse(raw));
    } catch (error) {
        return null;
    }
}

function writeAdminBookingConfig(config) {
    const normalized = normalizeAdminConfig(config);
    if (!normalized) return false;
    localStorage.setItem(ADMIN_BOOKING_CONFIG_KEY, JSON.stringify(normalized));
    return true;
}

function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') return null;

    const url = String(window.__SUPABASE_URL__ || '').trim();
    const anonKey = String(window.__SUPABASE_ANON_KEY__ || '').trim();
    if (!url || !anonKey) return null;

    try {
        supabaseClient = window.supabase.createClient(url, anonKey, {
            auth: { persistSession: false }
        });
        return supabaseClient;
    } catch (error) {
        console.warn('Supabase initialisatie mislukt:', error);
        return null;
    }
}

function hasSupabaseConfig() {
    return !!getSupabaseClient();
}

async function fetchAdminBookingConfigFromSupabase() {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
        const { data, error } = await client
            .from(SUPABASE_CONFIG_TABLE)
            .select('value')
            .eq('key', SUPABASE_CONFIG_ROW_KEY)
            .maybeSingle();

        if (error) throw error;
        if (!data || !data.value) return null;
        return normalizeAdminConfig(data.value);
    } catch (error) {
        console.warn('Supabase lezen mislukt:', error);
        return null;
    }
}

async function saveAdminBookingConfigToSupabase(config) {
    const client = getSupabaseClient();
    if (!client) return { ok: false, reason: 'supabase-not-configured' };

    try {
        const normalized = normalizeAdminConfig(config);
        if (!normalized) return { ok: false, reason: 'invalid-config' };

        const { error } = await client
            .from(SUPABASE_CONFIG_TABLE)
            .upsert(
                {
                    key: SUPABASE_CONFIG_ROW_KEY,
                    value: normalized,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'key' }
            );

        if (error) throw error;
        return { ok: true };
    } catch (error) {
        console.warn('Supabase opslaan mislukt:', error);
        return { ok: false, reason: 'supabase-write-failed' };
    }
}

async function syncAdminBookingConfigFromSupabase() {
    const remoteConfig = await fetchAdminBookingConfigFromSupabase();
    if (remoteConfig) writeAdminBookingConfig(remoteConfig);
    return remoteConfig;
}

async function loadAdminBookingConfigFromStore(defaultConfig) {
    const remoteConfig = await syncAdminBookingConfigFromSupabase();
    if (remoteConfig) return { config: remoteConfig, source: 'supabase' };

    const localConfig = readAdminBookingConfig();
    if (localConfig) return { config: localConfig, source: 'local' };

    const fallback = normalizeAdminConfig(defaultConfig);
    return { config: fallback || defaultConfig, source: 'default' };
}

async function persistAdminBookingConfigToStore(config) {
    const normalized = normalizeAdminConfig(config);
    if (!normalized) return { ok: false, source: 'invalid' };

    writeAdminBookingConfig(normalized);
    if (!hasSupabaseConfig()) return { ok: true, source: 'local' };

    const remoteResult = await saveAdminBookingConfigToSupabase(normalized);
    if (remoteResult.ok) return { ok: true, source: 'supabase' };
    return { ok: true, source: 'local-fallback' };
}

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initDynamicNavbarMenus();
    initExternalBookingLinks();
    initSmoothScroll();
    initContactForm();
    initAdminPanel();
    initTarievenPriceSync();
    initCategoryServicePage();
    initSiteAvailabilitySync();
    initBookingModal();
});

async function initSiteAvailabilitySync() {
    const defaultConfig = getAdminDefaultConfig();
    const loaded = await loadAdminBookingConfigFromStore(defaultConfig);
    const availability = loaded?.config?.settings?.availability || defaultConfig.settings.availability;
    applyAvailabilityToHoursTables(availability);
}

function initNavbar() {
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    const dropdowns = navLinks ? navLinks.querySelectorAll('.dropdown') : [];

    if (!navbar || !navToggle || !navLinks) return;

    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    function setNavOpen(open) {
        if (open) {
            navLinks.classList.add('open');
            navToggle.classList.add('active');
            document.body.classList.add('nav-open');
            const overlay = document.getElementById('navOverlay');
            if (overlay) overlay.setAttribute('aria-hidden', 'false');
        } else {
            navLinks.classList.remove('open');
            navToggle.classList.remove('active');
            document.body.classList.remove('nav-open');
            const overlay = document.getElementById('navOverlay');
            if (overlay) overlay.setAttribute('aria-hidden', 'true');
        }
    }

    navToggle.addEventListener('click', () => {
        setNavOpen(!navLinks.classList.contains('open'));
    });

    const navOverlay = document.getElementById('navOverlay');
    if (navOverlay) {
        navOverlay.addEventListener('click', () => setNavOpen(false));
    }

    function closeDropdowns(exceptDropdown = null) {
        dropdowns.forEach(dropdown => {
            if (dropdown === exceptDropdown) return;
            dropdown.classList.remove('open');
            const toggle = dropdown.querySelector('.dropdown-toggle');
            if (toggle) toggle.setAttribute('aria-expanded', 'false');
        });
    }

    navLinks.addEventListener('click', (event) => {
        const link = event.target.closest('a');
        if (!link || !navLinks.contains(link)) return;
        if (link.classList.contains('dropdown-toggle')) return;
        closeDropdowns();
        setNavOpen(false);
    });

    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        if (!toggle) return;

        toggle.addEventListener('click', (e) => {
            const isMobile = window.matchMedia('(max-width: 1024px)').matches;
            const isLinkToggle = toggle.tagName.toLowerCase() === 'a';
            if (!isMobile && isLinkToggle) {
                closeDropdowns();
                setNavOpen(false);
                return;
            }

            e.preventDefault();
            const isOpen = dropdown.classList.contains('open');
            closeDropdowns(dropdown);
            dropdown.classList.toggle('open', !isOpen);
            toggle.setAttribute('aria-expanded', String(!isOpen));
        });
    });

    document.addEventListener('click', (e) => {
        if (!navLinks.contains(e.target)) {
            closeDropdowns();
        }
        if (!navLinks.contains(e.target) && !navToggle.contains(e.target) && (!navOverlay || !navOverlay.contains(e.target))) {
            setNavOpen(false);
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDropdowns();
            if (navLinks.classList.contains('open')) setNavOpen(false);
        }
    });
}

async function initDynamicNavbarMenus() {
    const treatmentMenu = document.querySelector('[data-dynamic-menu="treatments"]');
    const pmuMenu = document.querySelector('[data-dynamic-menu="pmu"]');
    if (!treatmentMenu && !pmuMenu) return;

    const defaultConfig = getAdminDefaultConfig();
    const loaded = await loadAdminBookingConfigFromStore(defaultConfig);
    const config = loaded?.config || defaultConfig;

    const categoriesRaw = Array.isArray(config?.categories) ? config.categories : [];
    const servicesRaw = Array.isArray(config?.services) ? config.services : [];
    if (!categoriesRaw.length || !servicesRaw.length) return;

    const activeCategoryIds = new Set(
        servicesRaw
            .map(service => slugify(service?.category))
            .filter(Boolean)
    );

    const categories = categoriesRaw
        .map(category => ({
            id: slugify(category?.id),
            label: String(category?.label || '').trim()
        }))
        .filter(category => category.id && category.label && activeCategoryIds.has(category.id));

    if (!categories.length) return;

    const pmuCategories = sortCategoriesForNav(categories.filter(isPmuCategory));
    const treatmentCategories = sortCategoriesForNav(categories.filter(category => !isPmuCategory(category)));

    if (treatmentMenu && treatmentCategories.length) {
        renderNavCategoryMenu(treatmentMenu, treatmentCategories);
        const treatmentToggle = document.querySelector('[data-dynamic-link="treatments"]');
        if (treatmentToggle) treatmentToggle.setAttribute('href', getCategoryHref(treatmentCategories[0].id));
    }

    if (pmuMenu) {
        const pmuDropdown = pmuMenu.closest('.nav-dropdown-pmu');
        if (!pmuCategories.length) {
            if (pmuDropdown) pmuDropdown.remove();
        } else {
            renderNavCategoryMenu(pmuMenu, pmuCategories);
            const pmuToggle = document.querySelector('[data-dynamic-link="pmu"]');
            if (pmuToggle) pmuToggle.setAttribute('href', getCategoryHref(pmuCategories[0].id));
        }
    }
}

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (!targetId || targetId === '#') return;

            const target = document.querySelector(targetId);
            if (!target) return;

            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

function initExternalBookingLinks() {
    if (!USE_EXTERNAL_BOOKING) return;
    const targets = document.querySelectorAll('.open-booking');
    if (!targets.length) return;

    targets.forEach(target => {
        if (target.tagName.toLowerCase() === 'a') {
            target.setAttribute('href', ONLINE_BOOKING_URL);
            target.setAttribute('target', '_blank');
            target.setAttribute('rel', 'noopener noreferrer');
            return;
        }

        target.addEventListener('click', () => {
            window.open(ONLINE_BOOKING_URL, '_blank', 'noopener,noreferrer');
        });
    });
}

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    if (!tabBtns.length || !tabContents.length) return;

    function mapLegacyTarievenTabId(tabId) {
        const availableIds = Array.from(tabContents).map(content => content.id);
        const aliasMap = {
            'tab-gezicht': ['tab-skin-treatments', 'tab-popular'],
            'tab-huid': ['tab-skin-treatments', 'tab-popular'],
            'tab-pmu': ['tab-laser-hair-removal', 'tab-popular'],
            'tab-massage': ['tab-fat-freeze', 'tab-popular'],
            'tab-wax': ['tab-laser-hair-removal', 'tab-teeth-whitening'],
            'tab-upgrade': ['tab-popular']
        };
        const candidates = aliasMap[String(tabId || '').trim()] || [];
        return candidates.find(id => availableIds.includes(id)) || null;
    }

    function activateTab(tabId) {
        const directId = String(tabId || '').trim();
        const resolvedId = (directId && document.getElementById(directId))
            ? directId
            : mapLegacyTarievenTabId(directId);
        const tab = resolvedId ? document.getElementById(resolvedId) : null;
        if (!tab) return false;

        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        const btn = Array.from(tabBtns).find(button => button.getAttribute('data-tab') === resolvedId);
        if (btn) btn.classList.add('active');
        tab.classList.add('active');

        if (window.location.hash !== `#${resolvedId}`) {
            window.history.replaceState(null, '', `#${resolvedId}`);
        }
        return true;
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            activateTab(tabId);
        });
    });

    if (window.location.hash && activateTab(window.location.hash.slice(1))) {
        const tabsBlock = document.querySelector('.tarief-tabs');
        if (tabsBlock) tabsBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        window.alert('Bedankt voor uw bericht. We nemen zo snel mogelijk contact met u op.');
        form.reset();
    });
}

function findBestServiceMatch(rowTitle, services) {
    const normalizedTitle = normalizeText(rowTitle);
    if (!normalizedTitle) return null;

    const exact = services.find(service => normalizeText(service.name) === normalizedTitle);
    if (exact) return exact;

    const includeMatch = services.find(service => {
        const serviceName = normalizeText(service.name);
        return serviceName.includes(normalizedTitle) || normalizedTitle.includes(serviceName);
    });
    if (includeMatch) return includeMatch;

    const titleTokens = tokenize(rowTitle);
    let best = null;
    let bestScore = 0;

    services.forEach(service => {
        const serviceTokens = tokenize(service.name);
        if (!serviceTokens.length) return;
        const overlap = titleTokens.filter(token => serviceTokens.includes(token)).length;
        const score = overlap / Math.max(titleTokens.length, serviceTokens.length, 1);
        if (overlap >= 2 && score > bestScore) {
            best = service;
            bestScore = score;
        }
    });

    return bestScore >= 0.25 ? best : null;
}

function buildDynamicTarievenPage(config) {
    const tarievenSection = document.querySelector('.tarieven-section');
    const container = tarievenSection?.querySelector('.container');
    if (!container) return false;

    const categories = Array.isArray(config?.categories) ? config.categories : [];
    const services = Array.isArray(config?.services) ? config.services : [];
    if (!categories.length || !services.length) return false;

    const existingTabs = container.querySelector('.tarief-tabs');
    if (existingTabs) existingTabs.remove();
    const existingContentHost = container.querySelector('#tariefContents');
    if (existingContentHost) existingContentHost.remove();
    container.querySelectorAll('.tab-content').forEach(node => node.remove());

    const tabsHost = document.createElement('div');
    tabsHost.className = 'tarief-tabs';

    const contentHost = document.createElement('div');
    contentHost.id = 'tariefContents';

    categories.forEach((category, categoryIndex) => {
        const tabId = `tab-${String(category.id || '').trim()}`;

        const tabButton = document.createElement('button');
        tabButton.type = 'button';
        tabButton.className = `tab-btn${categoryIndex === 0 ? ' active' : ''}`;
        tabButton.setAttribute('data-tab', tabId);
        tabButton.textContent = String(category.label || category.id || 'Categorie');
        tabsHost.appendChild(tabButton);

        const tabContent = document.createElement('div');
        tabContent.className = `tab-content${categoryIndex === 0 ? ' active' : ''}`;
        tabContent.id = tabId;

        const grid = document.createElement('div');
        grid.className = 'price-grid';

        const categoryServices = services.filter(service => service.category === category.id);
        categoryServices.forEach(service => {
            const row = document.createElement('div');
            row.className = 'price-row';

            const info = document.createElement('div');
            info.className = 'price-info';

            const title = document.createElement('strong');
            title.textContent = String(service.name || '');
            info.appendChild(title);

            if (service.duration) {
                info.appendChild(document.createElement('br'));
                const duration = document.createElement('span');
                duration.textContent = String(service.duration);
                info.appendChild(duration);
            }

            const amount = document.createElement('div');
            amount.className = 'price-amount';
            amount.textContent = String(service.price || '€ 0,00');

            row.appendChild(info);
            row.appendChild(amount);
            grid.appendChild(row);
        });

        tabContent.appendChild(grid);
        contentHost.appendChild(tabContent);
    });

    const intro = container.querySelector('.tarieven-intro');
    if (intro) {
        intro.insertAdjacentElement('afterend', tabsHost);
        tabsHost.insertAdjacentElement('afterend', contentHost);
    } else {
        container.prepend(contentHost);
        container.prepend(tabsHost);
    }

    return true;
}

async function initTarievenPriceSync() {
    if (!document.getElementById('tariefTabs')) return;
    const currentPath = normalizePath(window.location.pathname);
    const isTarievenPath = currentPath === '/tarieven' || currentPath === '/tarieven.html' || currentPath.endsWith('/tarieven/index.html');
    if (isTarievenPath) {
        const redirectRoute = getTabRedirectRoute(window.location.hash);
        if (redirectRoute) {
            window.location.replace(redirectRoute);
            return;
        }
    }

    const defaultConfig = getAdminDefaultConfig();
    const loaded = await loadAdminBookingConfigFromStore(defaultConfig);
    const config = loaded?.config || defaultConfig;
    const built = buildDynamicTarievenPage(config);
    if (built) initTabs();
}

async function initCategoryServicePage() {
    const host = document.querySelector('[data-category-page]');
    if (!host) return;

    const categoryId = slugify(host.getAttribute('data-category-page'));
    if (!categoryId) return;

    const defaultConfig = getAdminDefaultConfig();
    const loaded = await loadAdminBookingConfigFromStore(defaultConfig);
    const config = loaded?.config || defaultConfig;
    const categories = Array.isArray(config?.categories) ? config.categories : [];
    const services = Array.isArray(config?.services) ? config.services : [];

    const category = categories.find(item => slugify(item?.id) === categoryId);
    const categoryServices = services.filter(service => slugify(service?.category) === categoryId);

    const titleElement = document.querySelector('[data-category-title]');
    if (titleElement && category) titleElement.textContent = getNavCategoryLabel(category);

    const introElement = document.querySelector('[data-category-intro]');
    if (introElement) {
        const introLabel = category ? getNavCategoryLabel(category).toLowerCase() : 'deze behandelingen';
        introElement.textContent = `Bekijk alle actuele diensten en prijzen voor ${introLabel}.`;
    }

    host.innerHTML = '';
    if (!categoryServices.length) {
        const note = document.createElement('p');
        note.className = 'upgrade-note';
        note.innerHTML = '<strong>Geen diensten gevonden.</strong> Voeg via het admin panel diensten toe in deze categorie.';
        host.appendChild(note);
        return;
    }

    const viewMode = String(host.getAttribute('data-category-view') || 'list').trim().toLowerCase();
    if (viewMode === 'detailed') {
        const detailGrid = document.createElement('div');
        detailGrid.className = 'service-detail-grid';

        categoryServices.forEach(service => {
            const card = document.createElement('article');
            card.className = 'service-detail-card';

            const meta = document.createElement('div');
            meta.className = 'service-detail-meta';

            const duration = document.createElement('span');
            duration.className = 'service-detail-duration';
            duration.textContent = String(service.duration || '-');
            meta.appendChild(duration);

            const price = document.createElement('span');
            price.className = 'service-detail-price';
            price.textContent = String(service.price || '€ 0,00');
            meta.appendChild(price);

            const title = document.createElement('h3');
            title.className = 'service-detail-name';
            title.textContent = String(service.name || '');

            const description = document.createElement('p');
            description.className = 'service-detail-description';
            description.textContent = getServiceDescription(categoryId, service.name);

            card.appendChild(meta);
            card.appendChild(title);
            card.appendChild(description);
            detailGrid.appendChild(card);
        });

        host.appendChild(detailGrid);
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'price-grid';

    categoryServices.forEach(service => {
        const row = document.createElement('div');
        row.className = 'price-row';

        const info = document.createElement('div');
        info.className = 'price-info';

        const title = document.createElement('strong');
        title.textContent = String(service.name || '');
        info.appendChild(title);

        if (service.duration) {
            info.appendChild(document.createElement('br'));
            const duration = document.createElement('span');
            duration.textContent = String(service.duration);
            info.appendChild(duration);
        }

        const amount = document.createElement('div');
        amount.className = 'price-amount';
        amount.textContent = String(service.price || '€ 0,00');

        row.appendChild(info);
        row.appendChild(amount);
        grid.appendChild(row);
    });

    host.appendChild(grid);
}

function getAdminDefaultConfig() {
    return {
    "categories": [
        {
            "id": "popular",
            "label": "Populaire diensten"
        },
        {
            "id": "fat-freeze",
            "label": "Fat Freeze"
        },
        {
            "id": "hair-loss-treatment",
            "label": "Hair Loss Treatment"
        },
        {
            "id": "consultation",
            "label": "Consultation"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "label": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!"
        },
        {
            "id": "laser-hair-removal",
            "label": "Laser Hair Removal"
        },
        {
            "id": "skin-treatments",
            "label": "Skin Treatments"
        },
        {
            "id": "teeth-whitening",
            "label": "Teeth Whitening"
        }
    ],
    "services": [
        {
            "id": "popular-sv-22396654",
            "category": "popular",
            "section": "Populaire diensten",
            "name": "Laser Hair Removal: Brazilian + Legs + Armpits",
            "duration": "1 uur, 20 min",
            "price": "€ 62,50"
        },
        {
            "id": "popular-sv-22396758",
            "category": "popular",
            "section": "Populaire diensten",
            "name": "Laser Hair Removal: Facial Complete",
            "duration": "35 min",
            "price": "€ 25"
        },
        {
            "id": "popular-sv-22396740",
            "category": "popular",
            "section": "Populaire diensten",
            "name": "Laser Hair Removal: Brazilian + Armpits",
            "duration": "55 min",
            "price": "€ 37,50"
        },
        {
            "id": "popular-sv-22396641",
            "category": "popular",
            "section": "Populaire diensten",
            "name": "Laser Hair Removal: Full Body (Women)",
            "duration": "2 uur, 5 min",
            "price": "€ 95"
        },
        {
            "id": "popular-sv-20987458",
            "category": "popular",
            "section": "Populaire diensten",
            "name": "Laser Hair Removal: Custom Package",
            "duration": "1 uur",
            "price": "vanaf € 40"
        },
        {
            "id": "popular-sv-22396767",
            "category": "popular",
            "section": "Populaire diensten",
            "name": "Laser Hair Removal: Upper Lips",
            "duration": "25 min",
            "price": "€ 7,50"
        },
        {
            "id": "fat-freeze-sv-24025933",
            "category": "fat-freeze",
            "section": "Fat Freeze",
            "name": "Skin Tightening + Fat Burning",
            "duration": "1 uur",
            "price": "€ 149"
        },
        {
            "id": "fat-freeze-sv-23981033",
            "category": "fat-freeze",
            "section": "Fat Freeze",
            "name": "Cryolipolysis - Package: 3 sessions (2 zones)",
            "duration": "1 uur",
            "price": "€ 450"
        },
        {
            "id": "fat-freeze-sv-23981020",
            "category": "fat-freeze",
            "section": "Fat Freeze",
            "name": "Cryolipolysis - Package: 3 sessions (1 zone)",
            "duration": "1 uur",
            "price": "€ 250"
        },
        {
            "id": "fat-freeze-sv-23980985",
            "category": "fat-freeze",
            "section": "Fat Freeze",
            "name": "Cryolipolysis - Onderkin",
            "duration": "50 min",
            "price": "€ 89"
        },
        {
            "id": "fat-freeze-sv-23980968",
            "category": "fat-freeze",
            "section": "Fat Freeze",
            "name": "Cryolipolysis - 2 Zones (2 cryo handles)",
            "duration": "1 uur",
            "price": "€ 179"
        },
        {
            "id": "fat-freeze-sv-23980944",
            "category": "fat-freeze",
            "section": "Fat Freeze",
            "name": "Cryolipolysis - 1 Zone (1 cryo handle)",
            "duration": "1 uur",
            "price": "€ 99"
        },
        {
            "id": "hair-loss-treatment-sv-22738223",
            "category": "hair-loss-treatment",
            "section": "Hair Loss Treatment",
            "name": "Free Consultation - Meso Hair Therapy",
            "duration": "25 min",
            "price": "gratis"
        },
        {
            "id": "hair-loss-treatment-sv-22723850",
            "category": "hair-loss-treatment",
            "section": "Hair Loss Treatment",
            "name": "Meso Hair Therapy",
            "duration": "50 min",
            "price": "vanaf € 120"
        },
        {
            "id": "consultation-sv-22548784",
            "category": "consultation",
            "section": "Consultation",
            "name": "Free Constultation",
            "duration": "30 min",
            "price": "gratis"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session-sv-23351680",
            "category": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "section": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!",
            "name": "Laser Hair Removal: Arms (half)",
            "duration": "25 min",
            "price": "€ 25"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session-sv-23351666",
            "category": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "section": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!",
            "name": "Laser Hair Removal: Shoulders",
            "duration": "25 min",
            "price": "€ 27,50"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session-sv-22988114",
            "category": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "section": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!",
            "name": "Face Complete: Dermaplaning + Laser Hair Removal",
            "duration": "40 min",
            "price": "€ 27,50"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session-sv-22396836",
            "category": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "section": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!",
            "name": "Laser Hair Removal: Complete (Men)",
            "duration": "2 uur, 20 min",
            "price": "€ 130"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session-sv-22396821",
            "category": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "section": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!",
            "name": "Laser Hair Removal: Stomach + Chest",
            "duration": "1 uur",
            "price": "€ 35"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session-sv-22396816",
            "category": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "section": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!",
            "name": "Laser Hair Removal: Back",
            "duration": "1 uur",
            "price": "€ 35"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session-sv-22396802",
            "category": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "section": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!",
            "name": "Laser Hair Removal: Buttocks",
            "duration": "45 min",
            "price": "€ 27,50"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session-sv-22396794",
            "category": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "section": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!",
            "name": "Laser Hair Removal: Full Arms",
            "duration": "45 min",
            "price": "€ 30"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session-sv-22396786",
            "category": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "section": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!",
            "name": "Laser Hair Removal: Brazilian",
            "duration": "45 min",
            "price": "€ 32,50"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session-sv-22396778",
            "category": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "section": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!",
            "name": "Laser Hair Removal: Chin",
            "duration": "25 min",
            "price": "€ 7,50"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session-sv-22396767",
            "category": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "section": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!",
            "name": "Laser Hair Removal: Upper Lips",
            "duration": "25 min",
            "price": "€ 7,50"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session-sv-22396758",
            "category": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "section": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!",
            "name": "Laser Hair Removal: Facial Complete",
            "duration": "35 min",
            "price": "€ 25"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session-sv-22396749",
            "category": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "section": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!",
            "name": "Laser Hair Removal: Legs Complete",
            "duration": "55 min",
            "price": "€ 40"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session-sv-22396740",
            "category": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "section": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!",
            "name": "Laser Hair Removal: Brazilian + Armpits",
            "duration": "55 min",
            "price": "€ 37,50"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session-sv-22396718",
            "category": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "section": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!",
            "name": "Laser Hair Removal: Brazilian + Armpits + Upper-lips",
            "duration": "1 uur",
            "price": "€ 45"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session-sv-22396694",
            "category": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "section": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!",
            "name": "Laser Hair Removal: Brazilian + Legs",
            "duration": "1 uur, 20 min",
            "price": "€ 55"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session-sv-22396654",
            "category": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "section": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!",
            "name": "Laser Hair Removal: Brazilian + Legs + Armpits",
            "duration": "1 uur, 20 min",
            "price": "€ 62,50"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session-sv-22396641",
            "category": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "section": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!",
            "name": "Laser Hair Removal: Full Body (Women)",
            "duration": "2 uur, 5 min",
            "price": "€ 95"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session-sv-22396624",
            "category": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "section": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!",
            "name": "Laser Hair Removal Complete: Body & Face (Women)",
            "duration": "2 uur, 20 min",
            "price": "€ 100"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session-sv-22396579",
            "category": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "section": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!",
            "name": "Laser Hair Removal: Armpits",
            "duration": "45 min",
            "price": "€ 15"
        },
        {
            "id": "limited-time-offer-50-off-your-first-laser-hair-removal-session-sv-22396566",
            "category": "limited-time-offer-50-off-your-first-laser-hair-removal-session",
            "section": "Limited-Time Offer: 50% Off Your First Laser Hair Removal Session!",
            "name": "Laser Hair Removal: Beard-line",
            "duration": "30 min",
            "price": "€ 12,50"
        },
        {
            "id": "laser-hair-removal-sv-23794481",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Neck/ Hairline",
            "duration": "25 min",
            "price": "€ 44"
        },
        {
            "id": "laser-hair-removal-sv-23531369",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Bikini",
            "duration": "25 min",
            "price": "€ 50"
        },
        {
            "id": "laser-hair-removal-sv-23351697",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Arms (half)",
            "duration": "1 uur",
            "price": "€ 50"
        },
        {
            "id": "laser-hair-removal-sv-23351662",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Shoulders",
            "duration": "25 min",
            "price": "€ 55"
        },
        {
            "id": "laser-hair-removal-sv-23215980",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Legs (half)",
            "duration": "1 uur",
            "price": "€ 50"
        },
        {
            "id": "laser-hair-removal-sv-23174760",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Brazilian + Hele Gezicht",
            "duration": "45 min",
            "price": "€ 80"
        },
        {
            "id": "laser-hair-removal-sv-22988142",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Face Complete: Dermaplaning + Laser Hair Removal",
            "duration": "40 min",
            "price": "€ 55"
        },
        {
            "id": "laser-hair-removal-sv-22396889",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Complete (Men)",
            "duration": "2 uur, 20 min",
            "price": "vanaf € 130"
        },
        {
            "id": "laser-hair-removal-sv-22396882",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Stomach + Chest",
            "duration": "1 uur",
            "price": "vanaf € 35"
        },
        {
            "id": "laser-hair-removal-sv-22396863",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Back",
            "duration": "1 uur",
            "price": "vanaf € 35"
        },
        {
            "id": "laser-hair-removal-sv-22396852",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Buttocks",
            "duration": "45 min",
            "price": "vanaf € 27,50"
        },
        {
            "id": "laser-hair-removal-sv-22270742",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Beard-line",
            "duration": "30 min",
            "price": "vanaf € 12,50"
        },
        {
            "id": "laser-hair-removal-sv-22270591",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Armpits",
            "duration": "35 min",
            "price": "vanaf € 15"
        },
        {
            "id": "laser-hair-removal-sv-22252901",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal Complete: Body + Face",
            "duration": "1 uur, 50 min",
            "price": "vanaf € 100"
        },
        {
            "id": "laser-hair-removal-sv-22252877",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Full Body",
            "duration": "1 uur, 40 min",
            "price": "vanaf € 95"
        },
        {
            "id": "laser-hair-removal-sv-20987509",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Brazilian + Legs + Armpits",
            "duration": "1 uur, 15 min",
            "price": "vanaf € 62,50"
        },
        {
            "id": "laser-hair-removal-sv-20987458",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Custom Package",
            "duration": "1 uur",
            "price": "vanaf € 40"
        },
        {
            "id": "laser-hair-removal-sv-20987441",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Brazilian + Legs",
            "duration": "1 uur, 15 min",
            "price": "vanaf € 55"
        },
        {
            "id": "laser-hair-removal-sv-20987410",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Brazilian + Armpits + Upper-lip",
            "duration": "1 uur",
            "price": "vanaf € 45"
        },
        {
            "id": "laser-hair-removal-sv-20987402",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Brazilian + Armpits",
            "duration": "55 min",
            "price": "vanaf € 37,50"
        },
        {
            "id": "laser-hair-removal-sv-20987366",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Legs Complete",
            "duration": "55 min",
            "price": "vanaf € 40"
        },
        {
            "id": "laser-hair-removal-sv-20987305",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Facial Complete",
            "duration": "30 min",
            "price": "vanaf € 25"
        },
        {
            "id": "laser-hair-removal-sv-20946541",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Upper Lips",
            "duration": "25 min",
            "price": "vanaf € 7,50"
        },
        {
            "id": "laser-hair-removal-sv-20946540",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Chin",
            "duration": "30 min",
            "price": "vanaf € 7,50"
        },
        {
            "id": "laser-hair-removal-sv-20946539",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Brazilian",
            "duration": "45 min",
            "price": "vanaf € 32,50"
        },
        {
            "id": "laser-hair-removal-sv-20946538",
            "category": "laser-hair-removal",
            "section": "Laser Hair Removal",
            "name": "Laser Hair Removal: Full Arms",
            "duration": "45 min",
            "price": "vanaf € 30"
        },
        {
            "id": "skin-treatments-sv-23647677",
            "category": "skin-treatments",
            "section": "Skin Treatments",
            "name": "Hydra-Facial + LED Light Therapy",
            "duration": "40 min - 50 min",
            "price": "vanaf € 69"
        },
        {
            "id": "skin-treatments-sv-20987381",
            "category": "skin-treatments",
            "section": "Skin Treatments",
            "name": "Tattoo Removal",
            "duration": "20 min",
            "price": "vanaf € 40"
        },
        {
            "id": "skin-treatments-sv-20987355",
            "category": "skin-treatments",
            "section": "Skin Treatments",
            "name": "Chemical Peel",
            "duration": "45 min",
            "price": "€ 95"
        },
        {
            "id": "skin-treatments-sv-20987343",
            "category": "skin-treatments",
            "section": "Skin Treatments",
            "name": "Microneedling (Zalm DNA)",
            "duration": "1 uur, 35 min",
            "price": "€ 125"
        },
        {
            "id": "skin-treatments-sv-20987325",
            "category": "skin-treatments",
            "section": "Skin Treatments",
            "name": "Dieptereiniging (inclusief LED Lichttherapie Masker)",
            "duration": "1 uur, 15 min",
            "price": "€ 70"
        },
        {
            "id": "skin-treatments-sv-20987316",
            "category": "skin-treatments",
            "section": "Skin Treatments",
            "name": "Dieptereiniging",
            "duration": "1 uur, 5 min",
            "price": "€ 50"
        },
        {
            "id": "skin-treatments-sv-20946692",
            "category": "skin-treatments",
            "section": "Skin Treatments",
            "name": "Carbon Laser Peel",
            "duration": "1 uur, 15 min",
            "price": "vanaf € 87,50"
        },
        {
            "id": "teeth-whitening-sv-22006636",
            "category": "teeth-whitening",
            "section": "Teeth Whitening",
            "name": "Teeth Whitening - 5 sessions",
            "duration": "2 uur, 5 min",
            "price": "€ 150"
        },
        {
            "id": "teeth-whitening-sv-22006624",
            "category": "teeth-whitening",
            "section": "Teeth Whitening",
            "name": "Teeth Whitening - 3 sessions",
            "duration": "1 uur, 25 min",
            "price": "€ 110"
        },
        {
            "id": "teeth-whitening-sv-22006592",
            "category": "teeth-whitening",
            "section": "Teeth Whitening",
            "name": "Teeth Whitening - 1 session",
            "duration": "40 min",
            "price": "€ 45"
        }
    ],
    "settings": {
        "staffName": "Wenifer",
        "staffStatus": "Beschikbaar volgens openingstijden",
        "firstAvailabilityText": "vandaag",
        "availability": {
            "weeklyAvailability": {
                "0": {
                    "enabled": false,
                    "start": "10:00",
                    "end": "17:00"
                },
                "1": {
                    "enabled": true,
                    "start": "10:00",
                    "end": "19:00"
                },
                "2": {
                    "enabled": true,
                    "start": "10:00",
                    "end": "19:00"
                },
                "3": {
                    "enabled": true,
                    "start": "10:00",
                    "end": "19:00"
                },
                "4": {
                    "enabled": true,
                    "start": "10:00",
                    "end": "19:00"
                },
                "5": {
                    "enabled": true,
                    "start": "10:00",
                    "end": "19:00"
                },
                "6": {
                    "enabled": true,
                    "start": "10:00",
                    "end": "17:00"
                }
            },
            "slotIntervalMinutes": 30,
            "blockedDates": []
        }
    }
};
}


function initAdminPanel() {
    const app = document.getElementById('adminApp');
    if (!app) return;

    const loginView = document.getElementById('adminLoginView');
    const panelView = document.getElementById('adminPanelView');
    const pinInput = document.getElementById('adminPinInput');
    const loginBtn = document.getElementById('adminLoginBtn');
    const logoutBtn = document.getElementById('adminLogoutBtn');
    const saveBtn = document.getElementById('adminSaveBtn');
    const resetBtn = document.getElementById('adminResetBtn');
    const exportBtn = document.getElementById('adminExportBtn');
    const importBtn = document.getElementById('adminImportBtn');
    const jsonArea = document.getElementById('adminJsonArea');
    const statusBox = document.getElementById('adminStatus');

    const categoriesTable = document.getElementById('adminCategoriesBody');
    const servicesTable = document.getElementById('adminServicesBody');
    const categoryIdInput = document.getElementById('adminCategoryId');
    const categoryLabelInput = document.getElementById('adminCategoryLabel');
    const addCategoryBtn = document.getElementById('adminAddCategoryBtn');

    const serviceIdInput = document.getElementById('adminServiceId');
    const serviceCategoryInput = document.getElementById('adminServiceCategory');
    const serviceSectionInput = document.getElementById('adminServiceSection');
    const serviceNameInput = document.getElementById('adminServiceName');
    const serviceDurationInput = document.getElementById('adminServiceDuration');
    const servicePriceInput = document.getElementById('adminServicePrice');
    const addServiceBtn = document.getElementById('adminAddServiceBtn');
    const cancelEditServiceBtn = document.getElementById('adminCancelEditServiceBtn');

    const staffNameInput = document.getElementById('adminStaffName');
    const staffStatusInput = document.getElementById('adminStaffStatus');
    const firstAvailabilityInput = document.getElementById('adminFirstAvailability');
    const slotIntervalInput = document.getElementById('adminSlotInterval');
    const blockedDatesInput = document.getElementById('adminBlockedDates');
    const dayInputs = Array.from({ length: 7 }, (_, day) => ({
        day,
        enabled: document.getElementById(`adminDay${day}Enabled`),
        start: document.getElementById(`adminDay${day}Start`),
        end: document.getElementById(`adminDay${day}End`)
    }));

    const dashboardCategories = document.getElementById('adminCountCategories');
    const dashboardServices = document.getElementById('adminCountServices');
    const dashboardUpdated = document.getElementById('adminLastUpdated');

    if (!loginView || !panelView) return;

    const storedPin = localStorage.getItem(ADMIN_PIN_KEY) || localStorage.getItem(LEGACY_ADMIN_PIN_KEY) || '1234';
    let config = cloneDeep(getAdminDefaultConfig());
    let editingServiceIndex = -1;
    let lastUpdated = new Date();
    let storageSource = hasSupabaseConfig() ? 'supabase' : 'local';

    function setStatus(message, type = 'ok') {
        if (!statusBox) return;
        statusBox.textContent = message;
        statusBox.className = `admin-status ${type}`;
    }

    function setSession(active) {
        if (active) {
            sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
            sessionStorage.removeItem(LEGACY_ADMIN_SESSION_KEY);
        } else {
            sessionStorage.removeItem(ADMIN_SESSION_KEY);
            sessionStorage.removeItem(LEGACY_ADMIN_SESSION_KEY);
        }
    }

    function showPanel() {
        loginView.style.display = 'none';
        panelView.style.display = 'block';
    }

    function showLogin() {
        panelView.style.display = 'none';
        loginView.style.display = 'block';
    }

    function updateDashboard() {
        if (dashboardCategories) dashboardCategories.textContent = String(config.categories.length);
        if (dashboardServices) dashboardServices.textContent = String(config.services.length);
        if (dashboardUpdated) dashboardUpdated.textContent = lastUpdated.toLocaleString('nl-NL');
    }

    function renderCategoryOptions() {
        if (!serviceCategoryInput) return;
        serviceCategoryInput.innerHTML = '';
        config.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = `${category.label} (${category.id})`;
            serviceCategoryInput.appendChild(option);
        });
    }

    function renderCategories() {
        if (!categoriesTable) return;
        categoriesTable.innerHTML = '';

        config.categories.forEach((category, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><code>${category.id}</code></td>
                <td>${category.label}</td>
                <td>
                    <button type="button" class="admin-table-btn" data-action="delete-category" data-index="${index}">Verwijder</button>
                </td>
            `;
            categoriesTable.appendChild(row);
        });
    }

    function resetServiceForm() {
        editingServiceIndex = -1;
        if (serviceIdInput) serviceIdInput.value = '';
        if (serviceSectionInput) serviceSectionInput.value = '';
        if (serviceNameInput) serviceNameInput.value = '';
        if (serviceDurationInput) serviceDurationInput.value = '';
        if (servicePriceInput) servicePriceInput.value = '';
        if (addServiceBtn) addServiceBtn.textContent = 'Dienst toevoegen';
        if (cancelEditServiceBtn) cancelEditServiceBtn.style.display = 'none';
        if (serviceCategoryInput && serviceCategoryInput.options.length) {
            serviceCategoryInput.value = serviceCategoryInput.options[0].value;
        }
    }

    function renderServices() {
        if (!servicesTable) return;
        servicesTable.innerHTML = '';

        config.services.forEach((service, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><code>${service.id}</code></td>
                <td>${service.category}</td>
                <td>${service.name}</td>
                <td>${service.duration}</td>
                <td>${service.price}</td>
                <td>
                    <button type="button" class="admin-table-btn" data-action="edit-service" data-index="${index}">Bewerk</button>
                    <button type="button" class="admin-table-btn danger" data-action="delete-service" data-index="${index}">Verwijder</button>
                </td>
            `;
            servicesTable.appendChild(row);
        });
    }

    function renderSettings() {
        if (staffNameInput) staffNameInput.value = config.settings.staffName;
        if (staffStatusInput) staffStatusInput.value = config.settings.staffStatus;
        if (firstAvailabilityInput) firstAvailabilityInput.value = config.settings.firstAvailabilityText;

        const availability = normalizeAvailabilitySettings(config.settings.availability);
        if (slotIntervalInput) slotIntervalInput.value = String(availability.slotIntervalMinutes);
        if (blockedDatesInput) blockedDatesInput.value = availability.blockedDates.join('\n');

        dayInputs.forEach(item => {
            const dayConfig = availability.weeklyAvailability[String(item.day)];
            if (!dayConfig) return;
            if (item.enabled) item.enabled.checked = Boolean(dayConfig.enabled);
            if (item.start) item.start.value = sanitizeTime(dayConfig.start, '10:00');
            if (item.end) item.end.value = sanitizeTime(dayConfig.end, '17:00');
        });
    }

    function renderAll() {
        renderCategoryOptions();
        renderCategories();
        renderServices();
        renderSettings();
        updateDashboard();
    }

    function getSourceLabel(source) {
        if (source === 'supabase') return 'Supabase';
        if (source === 'local-fallback') return 'Lokale fallback';
        if (source === 'local') return 'Lokale opslag';
        return 'Opslag';
    }

    async function persistConfig(message) {
        const result = await persistAdminBookingConfigToStore(config);
        if (!result.ok) {
            setStatus('Opslaan mislukt. Controleer categorieen en diensten.', 'error');
            return;
        }

        storageSource = result.source;
        lastUpdated = new Date();
        updateDashboard();
        if (result.source === 'local-fallback') {
            setStatus(`${message} (${getSourceLabel(result.source)})`, 'warn');
        } else {
            setStatus(`${message} (${getSourceLabel(result.source)})`, 'ok');
        }
    }

    categoriesTable?.addEventListener('click', async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.dataset.action !== 'delete-category') return;

        const index = Number(target.dataset.index);
        if (!Number.isInteger(index) || index < 0 || index >= config.categories.length) return;
        if (config.categories.length === 1) {
            setStatus('Minimaal 1 categorie is verplicht.', 'error');
            return;
        }

        const [removed] = config.categories.splice(index, 1);
        config.services = config.services.filter(service => service.category !== removed.id);
        renderAll();
        await persistConfig(`Categorie "${removed.label}" verwijderd.`);
    });

    servicesTable?.addEventListener('click', async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const action = target.dataset.action;
        const index = Number(target.dataset.index);
        if (!Number.isInteger(index) || index < 0 || index >= config.services.length) return;

        if (action === 'delete-service') {
            const [removed] = config.services.splice(index, 1);
            renderServices();
            updateDashboard();
            await persistConfig(`Dienst "${removed.name}" verwijderd.`);
            return;
        }

        if (action === 'edit-service') {
            const service = config.services[index];
            editingServiceIndex = index;
            if (serviceIdInput) serviceIdInput.value = service.id;
            if (serviceCategoryInput) serviceCategoryInput.value = service.category;
            if (serviceSectionInput) serviceSectionInput.value = service.section;
            if (serviceNameInput) serviceNameInput.value = service.name;
            if (serviceDurationInput) serviceDurationInput.value = service.duration;
            if (servicePriceInput) servicePriceInput.value = service.price;
            if (addServiceBtn) addServiceBtn.textContent = 'Dienst bijwerken';
            if (cancelEditServiceBtn) cancelEditServiceBtn.style.display = 'inline-flex';
            setStatus(`Je bewerkt nu: ${service.name}`, 'ok');
        }
    });

    addCategoryBtn?.addEventListener('click', async () => {
        const id = String(categoryIdInput?.value || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
        const label = String(categoryLabelInput?.value || '').trim();
        if (!id || !label) {
            setStatus('Vul categorie ID en label in.', 'error');
            return;
        }
        if (config.categories.some(category => category.id === id)) {
            setStatus(`Categorie ID "${id}" bestaat al.`, 'error');
            return;
        }
        config.categories.push({ id, label });
        if (categoryIdInput) categoryIdInput.value = '';
        if (categoryLabelInput) categoryLabelInput.value = '';
        renderAll();
        await persistConfig(`Categorie "${label}" toegevoegd.`);
    });

    addServiceBtn?.addEventListener('click', async () => {
        const manualId = String(serviceIdInput?.value || '').trim();
        const category = String(serviceCategoryInput?.value || '').trim().toLowerCase();
        const section = String(serviceSectionInput?.value || '').trim();
        const name = String(serviceNameInput?.value || '').trim();
        const generatedId = slugify(name);
        const id = slugify(manualId) || generatedId;
        const duration = String(serviceDurationInput?.value || '').trim();
        const price = String(servicePriceInput?.value || '').trim();

        if (!category || !name || !duration || !price) {
            setStatus('Vul alle verplichte velden van de dienst in.', 'error');
            return;
        }
        if (!id) {
            setStatus('Dienst ID kan niet worden gemaakt. Gebruik een geldige naam.', 'error');
            return;
        }
        if (!config.categories.some(item => item.id === category)) {
            setStatus(`Categorie "${category}" bestaat niet.`, 'error');
            return;
        }
        if (editingServiceIndex === -1 && config.services.some(service => service.id === id)) {
            setStatus(`Dienst ID "${id}" bestaat al.`, 'error');
            return;
        }

        const payload = { id, category, section, name, duration, price };
        if (editingServiceIndex >= 0) {
            config.services[editingServiceIndex] = payload;
            await persistConfig(`Dienst "${name}" bijgewerkt.`);
        } else {
            config.services.push(payload);
            await persistConfig(`Dienst "${name}" toegevoegd.`);
        }

        renderServices();
        updateDashboard();
        resetServiceForm();
    });

    cancelEditServiceBtn?.addEventListener('click', resetServiceForm);

    saveBtn?.addEventListener('click', async () => {
        config.settings.staffName = String(staffNameInput?.value || '').trim() || 'Wenifer';
        config.settings.staffStatus = String(staffStatusInput?.value || '').trim() || 'Beschikbaar volgens openingstijden';
        config.settings.firstAvailabilityText = String(firstAvailabilityInput?.value || '').trim() || 'vandaag';
        const weeklyAvailability = {};
        dayInputs.forEach(item => {
            weeklyAvailability[String(item.day)] = {
                enabled: Boolean(item.enabled?.checked),
                start: sanitizeTime(item.start?.value, '10:00'),
                end: sanitizeTime(item.end?.value, '17:00')
            };
        });
        config.settings.availability = normalizeAvailabilitySettings({
            slotIntervalMinutes: Number(slotIntervalInput?.value || 30),
            blockedDates: String(blockedDatesInput?.value || '')
                .split('\n')
                .map(value => value.trim())
                .filter(Boolean),
            weeklyAvailability
        });
        await persistConfig('Alle instellingen opgeslagen.');
    });

    resetBtn?.addEventListener('click', async () => {
        config = cloneDeep(getAdminDefaultConfig());
        resetServiceForm();
        renderAll();
        await persistConfig('Standaard admin data hersteld.');
    });

    exportBtn?.addEventListener('click', () => {
        if (jsonArea) jsonArea.value = JSON.stringify(config, null, 2);
        setStatus('JSON export gegenereerd.', 'ok');
    });

    importBtn?.addEventListener('click', async () => {
        try {
            const payload = JSON.parse(String(jsonArea?.value || '{}'));
            const normalized = normalizeAdminConfig(payload);
            if (!normalized) {
                setStatus('Import JSON is ongeldig.', 'error');
                return;
            }
            config = normalized;
            resetServiceForm();
            renderAll();
            await persistConfig('JSON import succesvol opgeslagen.');
        } catch (error) {
            setStatus('JSON import mislukt. Controleer de syntax.', 'error');
        }
    });

    logoutBtn?.addEventListener('click', () => {
        setSession(false);
        showLogin();
        setStatus('Je bent uitgelogd.', 'ok');
    });

    loginBtn?.addEventListener('click', () => {
        const pin = String(pinInput?.value || '').trim();
        if (pin !== storedPin) {
            setStatus('Onjuiste pincode.', 'error');
            return;
        }
        setSession(true);
        showPanel();
        setStatus('Ingelogd. Je kunt nu de site beheren.', 'ok');
    });

    if (pinInput) {
        pinInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') loginBtn?.click();
        });
    }

    if (sessionStorage.getItem(ADMIN_SESSION_KEY) === '1' || sessionStorage.getItem(LEGACY_ADMIN_SESSION_KEY) === '1') {
        showPanel();
    } else {
        showLogin();
    }

    setStatus('Data laden...', 'ok');
    loadAdminBookingConfigFromStore(getAdminDefaultConfig()).then((result) => {
        config = cloneDeep(result.config || getAdminDefaultConfig());
        storageSource = result.source;
        renderAll();
        resetServiceForm();

        if (result.source === 'supabase') {
            setStatus('Data geladen uit Supabase.', 'ok');
        } else if (result.source === 'local') {
            setStatus('Data geladen uit lokale opslag.', 'warn');
        } else {
            setStatus('Standaard data geladen.', 'warn');
        }
    });
}

function initBookingModal() {
    if (USE_EXTERNAL_BOOKING) return;
    const triggers = document.querySelectorAll('.open-booking');
    if (!triggers.length) return;

    const defaultConfig = getAdminDefaultConfig();
    const data = {
        categories: cloneDeep(defaultConfig.categories),
        services: cloneDeep(defaultConfig.services)
    };

    const defaultCategories = cloneDeep(data.categories);
    const defaultServices = cloneDeep(data.services);
    const defaultBookingSettings = cloneDeep(defaultConfig.settings);
    let bookingSettings = cloneDeep(defaultBookingSettings);

    function applyAdminBookingConfig() {
        const adminConfig = readAdminBookingConfig();
        data.categories = adminConfig?.categories?.length ? cloneDeep(adminConfig.categories) : cloneDeep(defaultCategories);
        data.services = adminConfig?.services?.length ? cloneDeep(adminConfig.services) : cloneDeep(defaultServices);
        bookingSettings = adminConfig?.settings ? { ...defaultBookingSettings, ...adminConfig.settings } : cloneDeep(defaultBookingSettings);
        bookingSettings.availability = normalizeAvailabilitySettings(bookingSettings.availability);
        applyAvailabilityToHoursTables(bookingSettings.availability);
    }

    applyAdminBookingConfig();
    syncAdminBookingConfigFromSupabase().then((configFromDb) => {
        if (configFromDb) applyAdminBookingConfig();
    });

    const state = {
        step: 1,
        category: data.categories[0] ? data.categories[0].id : '',
        search: '',
        selectedServiceId: null,
        selectedTime: '',
        weekOffset: 0,
        selectedDateOffset: 1,
        waitlistVisible: false,
        waitlistMode: 'specific',
        saveData: true
    };

    const modal = buildBookingModal();
    document.body.appendChild(modal);

    const overlay = document.getElementById('bookingModalOverlay');
    const closeBtn = document.getElementById('bmCloseBtn');
    const backBtn = document.getElementById('bmBackBtn');
    const localeFlag = document.getElementById('bmLocaleFlag');
    const titleEl = document.getElementById('bookingModalTitle');

    const categoryHost = document.getElementById('bmCategoryTabs');
    const serviceHost = document.getElementById('bmServiceSections');
    const servicesScroll = document.getElementById('bmServicesScroll');
    const searchInput = document.getElementById('bmSearchInput');
    const nextFromServices = document.getElementById('bmToStep2');

    const dateRow = document.getElementById('bmDateCards');
    const timeSlotWrap = document.getElementById('bmTimeSlotsWrap');
    const timeSlotHost = document.getElementById('bmTimeSlots');
    const waitlistPanel = document.getElementById('bmWaitlistPanel');
    const toDetailsBtn = document.getElementById('bmToStep3');
    const datePrev = document.getElementById('bmDatePrev');
    const dateNext = document.getElementById('bmDateNext');
    const staffNameEl = document.getElementById('bmStaffName');
    const staffStatusEl = document.getElementById('bmStaffStatus');
    const firstAvailabilityEl = document.getElementById('bmFirstAvailabilityLink');

    const summaryDate = document.getElementById('bmSummaryDate');
    const summaryDuration = document.getElementById('bmSummaryDuration');
    const summaryStaff = document.getElementById('bmSummaryStaff');
    const summaryService = document.getElementById('bmSummaryService');
    const summaryPrice = document.getElementById('bmSummaryPrice');
    const summaryTotal = document.getElementById('bmSummaryTotal');
    const step1Total = document.getElementById('bmStep1Total');
    const prevFooter = document.getElementById('bmPrevFooter');
    const totalFooter = document.getElementById('bmTotalFooter');
    const form = document.getElementById('bmForm');
    const saveData = document.getElementById('bmSaveData');
    let lockedScrollY = 0;

    function getSelectedService() {
        return data.services.find(service => service.id === state.selectedServiceId) || null;
    }

    function getFilteredServices() {
        const query = state.search.trim().toLowerCase();
        const hasPopularCategory = data.categories.some(category => category.id === 'popular');
        const hasMicroCategory = data.categories.some(category => category.id === 'micro');

        return data.services.filter(service => {
            const inCategory = state.category === 'popular' && hasPopularCategory
                ? service.category === 'popular' || (hasMicroCategory && service.category === 'micro')
                : service.category === state.category;
            if (!inCategory) return false;
            if (!query) return true;
            return service.name.toLowerCase().includes(query);
        });
    }

    function setCategory(categoryId) {
        if (!data.categories.some(category => category.id === categoryId)) return;
        state.category = categoryId;
        renderCategories();
        renderServices();
        if (servicesScroll) servicesScroll.scrollTop = 0;
        updateStepUI();
    }

    function renderCategories() {
        categoryHost.innerHTML = '';

        data.categories.forEach(category => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `bm-category-tab${state.category === category.id ? ' active' : ''}`;
            button.textContent = category.label;
            button.addEventListener('click', () => {
                setCategory(category.id);
            });
            categoryHost.appendChild(button);
        });
    }

    function renderServices() {
        const filteredServices = getFilteredServices();
        if (state.selectedServiceId && !filteredServices.some(service => service.id === state.selectedServiceId)) {
            state.selectedServiceId = null;
            state.selectedTime = '';
            state.waitlistVisible = false;
        }

        const sections = [];
        if (state.category === 'popular' && data.categories.some(category => category.id === 'popular')) {
            const popularServices = filteredServices.filter(service => service.category === 'popular');
            const microServices = filteredServices.filter(service => service.category === 'micro');
            if (popularServices.length) {
                sections.push({ title: 'POPULAIRE DIENSTEN', items: popularServices });
            }
            if (microServices.length) {
                sections.push({ title: 'MICROBLADING & INFRALASH', items: microServices });
            }
        } else {
            const grouped = {};
            filteredServices.forEach(service => {
                if (!grouped[service.section]) grouped[service.section] = [];
                grouped[service.section].push(service);
            });
            Object.keys(grouped).forEach(sectionName => {
                sections.push({ title: sectionName, items: grouped[sectionName] });
            });
        }

        serviceHost.innerHTML = '';

        if (!sections.length) {
            const empty = document.createElement('p');
            empty.className = 'bm-empty';
            empty.textContent = 'Geen diensten gevonden voor deze zoekopdracht.';
            serviceHost.appendChild(empty);
        }

        sections.forEach(sectionData => {
            const section = document.createElement('section');
            section.className = 'bm-service-section';

            const heading = document.createElement('h3');
            heading.textContent = sectionData.title;
            section.appendChild(heading);

            sectionData.items.forEach(service => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = `bm-service-item${state.selectedServiceId === service.id ? ' selected' : ''}`;

                const radio = document.createElement('span');
                radio.className = 'bm-radio';
                radio.setAttribute('aria-hidden', 'true');

                const content = document.createElement('span');
                content.className = 'bm-service-content';

                const title = document.createElement('strong');
                title.textContent = service.name;

                const duration = document.createElement('small');
                duration.textContent = service.duration;

                const price = document.createElement('span');
                price.className = 'bm-service-price';
                price.textContent = service.price;

                content.appendChild(title);
                content.appendChild(duration);
                button.appendChild(radio);
                button.appendChild(content);
                button.appendChild(price);

                button.addEventListener('click', () => {
                    state.selectedServiceId = service.id;
                    state.selectedTime = '';
                    state.waitlistVisible = false;
                    renderServices();
                    renderDateCards();
                    renderTimeSlots();
                    updateSummary();
                    updateStepUI();
                });

                section.appendChild(button);
            });

            serviceHost.appendChild(section);
        });

        updateSummary();
        updateStepUI();
    }

    function formatDay(date, withWeekday) {
        const weekdays = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
        const months = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
        const weekday = weekdays[date.getDay()];
        const day = date.getDate();
        const month = months[date.getMonth()];

        if (withWeekday) return `${weekday} ${day} ${month}`;
        return { weekday, day: String(day), month };
    }

    function getDateFromOffset(offset) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + offset);
        return date;
    }

    function getSlotsForOffset(offset) {
        const date = getDateFromOffset(offset);
        const selectedService = getSelectedService();
        const durationMinutes = parseDurationMinutes(selectedService?.duration || '60 minuten');
        return getDaySlots(date, bookingSettings, durationMinutes);
    }

    function getFirstAvailableDateLabel() {
        for (let offset = 0; offset < 90; offset += 1) {
            const slots = getSlotsForOffset(offset);
            if (slots.length) {
                return formatDay(getDateFromOffset(offset), true);
            }
        }
        return bookingSettings.firstAvailabilityText || 'momenteel niet beschikbaar';
    }

    function renderDateCards() {
        dateRow.innerHTML = '';

        for (let index = 0; index < 7; index += 1) {
            const absoluteOffset = state.weekOffset * 7 + index;
            const date = getDateFromOffset(absoluteOffset);
            const label = formatDay(date, false);
            const isSelected = absoluteOffset === state.selectedDateOffset;
            const isToday = absoluteOffset === 0;
            const slots = getSlotsForOffset(absoluteOffset);
            const isAvailable = slots.length > 0;

            const card = document.createElement('button');
            card.type = 'button';
            card.className = `bm-date-card${isSelected ? ' active' : ''}${isAvailable ? ' available' : ' unavailable'}`;
            card.innerHTML = `
                <span class="bm-date-top">${isToday ? 'Vandaag' : label.weekday}</span>
                <span class="bm-date-day">${label.day}</span>
                <span class="bm-date-month">${label.month}</span>
                <span class="bm-date-clock">◷</span>
            `;

            card.addEventListener('click', () => {
                state.selectedDateOffset = absoluteOffset;
                state.selectedTime = '';
                state.waitlistVisible = !isAvailable;
                renderDateCards();
                renderTimeSlots();
                updateStepUI();
                updateSummary();
            });

            dateRow.appendChild(card);
        }

        if (firstAvailabilityEl) firstAvailabilityEl.textContent = getFirstAvailableDateLabel();
    }

    function renderTimeSlots() {
        if (!timeSlotWrap || !timeSlotHost) return;

        const slots = getSlotsForOffset(state.selectedDateOffset);
        timeSlotHost.innerHTML = '';

        if (!slots.length) {
            timeSlotWrap.style.display = 'none';
            state.selectedTime = '';
            state.waitlistVisible = true;
            return;
        }

        timeSlotWrap.style.display = 'block';
        slots.forEach(slot => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `bm-time-slot${state.selectedTime === slot ? ' active' : ''}`;
            button.textContent = slot;
            button.addEventListener('click', () => {
                state.selectedTime = slot;
                state.waitlistVisible = false;
                renderTimeSlots();
                updateSummary();
                updateStepUI();
            });
            timeSlotHost.appendChild(button);
        });
    }

    function updateSummary() {
        const selectedService = getSelectedService();
        const selectedDate = getDateFromOffset(state.selectedDateOffset);
        const hasTime = Boolean(state.selectedTime);

        summaryDate.textContent = hasTime
            ? `${formatDay(selectedDate, true)} om ${state.selectedTime}`
            : formatDay(selectedDate, true);
        summaryDuration.textContent = selectedService ? selectedService.duration : 'n.v.t.';
        summaryService.textContent = selectedService ? selectedService.name : 'Nog geen dienst gekozen';
        summaryPrice.textContent = selectedService ? selectedService.price : '€ 0,00';
        summaryTotal.textContent = selectedService ? selectedService.price : '€ 0,00';
        if (step1Total) step1Total.textContent = selectedService ? selectedService.price : '€ 0,00';
    }

    function setStep(nextStep) {
        state.step = nextStep;
        updateStepUI();
        const stepEl = document.querySelector(`.bm-step[data-step="${nextStep}"]`);
        if (stepEl) stepEl.scrollTop = 0;
    }

    function updateStepUI() {
        const selectedService = getSelectedService();

        document.querySelectorAll('.bm-step').forEach(stepEl => {
            const stepId = Number(stepEl.dataset.step);
            stepEl.classList.toggle('active', stepId === state.step);
        });

        if (state.step === 1) {
            titleEl.textContent = 'Kies diensten';
            backBtn.style.display = 'none';
            localeFlag.style.display = 'inline-flex';
        }

        if (state.step === 2) {
            titleEl.textContent = 'Kies datum en tijd';
            backBtn.style.display = 'inline-flex';
            localeFlag.style.display = 'none';
        }

        if (state.step === 3) {
            titleEl.textContent = 'Jouw gegevens';
            backBtn.style.display = 'inline-flex';
            localeFlag.style.display = 'none';
        }

        nextFromServices.disabled = !selectedService;
        if (prevFooter && totalFooter) {
            prevFooter.style.display = state.step === 1 && !selectedService ? 'flex' : 'none';
            totalFooter.style.display = state.step === 1 && selectedService ? 'flex' : 'none';
        }
        waitlistPanel.style.display = state.waitlistVisible ? 'block' : 'none';
        if (toDetailsBtn) {
            toDetailsBtn.textContent = state.waitlistVisible
                ? 'Aanmelden voor wachtlijst →'
                : state.selectedTime ? 'Ga verder' : 'Kies eerst een tijd';
            toDetailsBtn.disabled = !state.waitlistVisible && !state.selectedTime;
        }
    }

    async function openModal() {
        await syncAdminBookingConfigFromSupabase();
        applyAdminBookingConfig();
        const defaultCategory = data.categories.some(category => category.id === 'popular')
            ? 'popular'
            : (data.categories[0] ? data.categories[0].id : '');

        state.step = 1;
        state.category = defaultCategory;
        state.search = '';
        state.selectedServiceId = null;
        state.selectedTime = '';
        state.weekOffset = 0;
        state.selectedDateOffset = 1;
        state.waitlistVisible = false;
        state.waitlistMode = 'specific';
        state.saveData = true;

        searchInput.value = '';
        saveData.checked = true;
        renderCategories();
        renderServices();
        renderDateCards();
        renderTimeSlots();
        updateSummary();
        updateStepUI();
        if (servicesScroll) servicesScroll.scrollTop = 0;

        if (staffNameEl) staffNameEl.textContent = bookingSettings.staffName;
        if (staffStatusEl) staffStatusEl.textContent = bookingSettings.staffStatus;
        if (firstAvailabilityEl) firstAvailabilityEl.textContent = getFirstAvailableDateLabel();
        if (summaryStaff) summaryStaff.textContent = bookingSettings.staffName;

        lockedScrollY = window.scrollY || window.pageYOffset || 0;
        document.body.style.top = `-${lockedScrollY}px`;
        document.documentElement.classList.add('modal-open');
        overlay.classList.add('open');
        document.body.classList.add('modal-open');
    }

    function closeModal() {
        overlay.classList.remove('open');
        document.body.classList.remove('modal-open');
        document.documentElement.classList.remove('modal-open');
        document.body.style.top = '';
        window.scrollTo(0, lockedScrollY);
    }

    triggers.forEach(trigger => {
        trigger.addEventListener('click', async (e) => {
            e.preventDefault();
            await openModal();
        });
    });

    closeBtn.addEventListener('click', closeModal);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) {
            closeModal();
        }
    });

    backBtn.addEventListener('click', () => {
        if (state.step > 1) {
            setStep(state.step - 1);
        }
    });

    searchInput.addEventListener('input', (e) => {
        state.search = e.target.value;
        renderServices();
    });

    document.getElementById('bmCategoryPrev').addEventListener('click', () => {
        if (!data.categories.length) return;
        const currentIndex = data.categories.findIndex(category => category.id === state.category);
        const safeIndex = currentIndex === -1 ? 0 : currentIndex;
        const nextIndex = (safeIndex - 1 + data.categories.length) % data.categories.length;
        setCategory(data.categories[nextIndex].id);
    });

    document.getElementById('bmCategoryNext').addEventListener('click', () => {
        if (!data.categories.length) return;
        const currentIndex = data.categories.findIndex(category => category.id === state.category);
        const safeIndex = currentIndex === -1 ? 0 : currentIndex;
        const nextIndex = (safeIndex + 1) % data.categories.length;
        setCategory(data.categories[nextIndex].id);
    });

    nextFromServices.addEventListener('click', () => {
        if (!state.selectedServiceId) return;
        setStep(2);
    });

    datePrev.addEventListener('click', () => {
        state.weekOffset = Math.max(0, state.weekOffset - 1);
        renderDateCards();
        renderTimeSlots();
        updateStepUI();
    });

    dateNext.addEventListener('click', () => {
        state.weekOffset += 1;
        renderDateCards();
        renderTimeSlots();
        updateStepUI();
    });

    document.querySelectorAll('input[name="bmWaitlistMode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            state.waitlistMode = radio.value;
        });
    });

    toDetailsBtn.addEventListener('click', () => {
        if (!state.waitlistVisible && !state.selectedTime) return;
        setStep(3);
    });

    saveData.addEventListener('change', () => {
        state.saveData = saveData.checked;
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (state.waitlistVisible) {
            window.alert('U bent succesvol op de wachtlijst geplaatst. We nemen contact met u op zodra er plek vrijkomt.');
        } else {
            window.alert(`Uw aanvraag is ontvangen voor ${summaryDate.textContent}. We nemen contact op ter bevestiging.`);
        }
        closeModal();
    });

    renderCategories();
    renderServices();
    renderDateCards();
    renderTimeSlots();
    updateStepUI();
}

function buildBookingModal() {
    const wrapper = document.createElement('div');
    wrapper.id = 'bookingModalOverlay';
    wrapper.className = 'booking-modal-overlay';
    wrapper.setAttribute('aria-hidden', 'true');

    wrapper.innerHTML = `
        <div class="booking-modal" role="dialog" aria-modal="true" aria-labelledby="bookingModalTitle">
            <header class="bm-header">
                <div class="bm-header-left">
                    <div class="bm-locale-flag" id="bmLocaleFlag" aria-hidden="true"></div>
                    <button type="button" class="bm-header-btn" id="bmBackBtn" aria-label="Terug">←</button>
                </div>
                <h2 id="bookingModalTitle">Kies diensten</h2>
                <button type="button" class="bm-header-btn bm-close" id="bmCloseBtn" aria-label="Sluiten">×</button>
            </header>

            <div class="bm-body">
                <section class="bm-step active" data-step="1">
                    <div class="bm-category-row">
                        <button type="button" id="bmCategoryPrev" class="bm-nav-arrow" aria-label="Vorige categorie">←</button>
                        <div class="bm-category-tabs" id="bmCategoryTabs"></div>
                        <button type="button" id="bmCategoryNext" class="bm-nav-arrow" aria-label="Volgende categorie">→</button>
                    </div>

                    <label class="bm-search">
                        <span>⌕</span>
                        <input id="bmSearchInput" type="text" placeholder="Zoek een dienst">
                    </label>

                    <div class="bm-services-scroll" id="bmServicesScroll">
                        <div id="bmServiceSections"></div>
                    </div>

                    <div class="bm-step-footer bm-prev-appointments" id="bmPrevFooter">
                        <span>Heb je hier al eerder geboekt?</span>
                        <button type="button">Bekijk afspraken</button>
                    </div>

                    <div class="bm-step-footer bm-total-footer" id="bmTotalFooter">
                        <div class="bm-total-text">
                            <small>Totaal:</small>
                            <strong id="bmStep1Total">€ 0,00</strong>
                        </div>
                        <button type="button" id="bmToStep2" class="bm-primary bm-inline" disabled>Kies een tijd</button>
                    </div>
                </section>

                <section class="bm-step" data-step="2">
                    <article class="bm-staff-card">
                        <div class="bm-staff-icon">◌</div>
                        <div>
                            <strong id="bmStaffName">Wenifer</strong>
                            <p id="bmStaffStatus">Beschikbaar volgens openingstijden</p>
                        </div>
                    </article>

                    <div class="bm-date-row">
                        <button type="button" id="bmDatePrev" class="bm-nav-arrow" aria-label="Vorige week">←</button>
                        <div class="bm-date-cards" id="bmDateCards"></div>
                        <button type="button" id="bmDateNext" class="bm-nav-arrow" aria-label="Volgende week">→</button>
                    </div>

                    <p class="bm-first-availability">Eerste mogelijkheid op <a id="bmFirstAvailabilityLink" href="#" onclick="return false;">vandaag</a></p>

                    <div class="bm-time-slots-wrap" id="bmTimeSlotsWrap" style="display:none;">
                        <p class="bm-time-slots-title">Beschikbare tijden</p>
                        <div class="bm-time-slots" id="bmTimeSlots"></div>
                    </div>

                    <div class="bm-waitlist-panel" id="bmWaitlistPanel">
                        <p>Schrijf je in op de wachtlijst zodat we contact kunnen opnemen als er een nieuwe plek beschikbaar is.</p>

                        <label class="bm-option">
                            <input type="radio" name="bmWaitlistMode" value="specific" checked>
                            <span>Breng me op de hoogte van beschikbare plekken op gekozen dag</span>
                        </label>

                        <label class="bm-option">
                            <input type="radio" name="bmWaitlistMode" value="all">
                            <span>Breng me op de hoogte van beschikbare plekken op meerdere dagen</span>
                        </label>
                    </div>

                    <div class="bm-step-footer bm-actions">
                        <button type="button" id="bmToStep3" class="bm-primary" disabled>Kies eerst een tijd</button>
                    </div>
                </section>

                <section class="bm-step" data-step="3">
                    <form id="bmForm" class="bm-form">
                        <div class="bm-form-head">
                            <h3>Jouw gegevens</h3>
                            <span>*Verplicht</span>
                        </div>

                        <div class="bm-grid two">
                            <input type="text" name="first_name" placeholder="Voornaam*" required>
                            <input type="text" name="last_name" placeholder="Achternaam*" required>
                        </div>

                        <div class="bm-grid one">
                            <input type="email" name="email" placeholder="E-mailadres*" required>
                        </div>

                        <div class="bm-grid one">
                            <input type="tel" name="phone" placeholder="Telefoonnummer*" required>
                        </div>

                        <div class="bm-grid one">
                            <input type="text" name="street" placeholder="Straatnaam en nummer*" required>
                        </div>

                        <div class="bm-grid two">
                            <input type="text" name="postcode" placeholder="Postcode*" required>
                            <input type="text" name="stad" placeholder="Stad*" required>
                        </div>

                        <div class="bm-grid one">
                            <input type="text" name="birthdate" placeholder="Geboortedatum">
                        </div>

                        <div class="bm-grid one">
                            <input type="text" name="notes" placeholder="Opmerkingen">
                        </div>

                        <article class="bm-summary-card">
                            <h4 id="bmSummaryDate">do 19 feb</h4>
                            <p class="bm-summary-meta"><span id="bmSummaryDuration">60 minuten</span> <span id="bmSummaryStaff">Wenifer</span></p>
                            <div class="bm-summary-line">
                                <span id="bmSummaryService">FIRST TIME: Microblading behandeling + intake</span>
                                <strong id="bmSummaryPrice">€ 350,00</strong>
                            </div>
                            <div class="bm-summary-total">
                                <span>Totaal</span>
                                <strong id="bmSummaryTotal">€ 350,00</strong>
                            </div>
                        </article>

                        <label class="bm-save-data">
                            <input type="checkbox" id="bmSaveData" checked>
                            <span>Bewaar mijn gegevens voor de volgende keer dat ik een afspraak maak</span>
                        </label>

                        <button type="submit" class="bm-primary bm-submit">Inschrijven op de wachtlijst</button>
                    </form>
                </section>
            </div>
        </div>
    `;

    return wrapper;
}
