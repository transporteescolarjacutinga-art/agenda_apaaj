document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM Elements ----
    const DOM = {
        agendaList: document.getElementById('agendaList'),
        btnNew: document.getElementById('btnNewAppointment'),
        btnNewMobile: document.getElementById('btnNewAppointmentMobile'),
        drawer: document.getElementById('drawer'),
        drawerOverlay: document.getElementById('drawerOverlay'),
        btnCloseDrawer: document.getElementById('closeDrawer'),
        drawerTitle: document.getElementById('drawerTitle'),
        form: document.getElementById('appointmentForm'),
        btnDownloadExcelTemplate: document.getElementById('btnDownloadExcelTemplate'),
        btnDownloadExcelTemplateMobile: document.getElementById('btnDownloadExcelTemplateMobile'),
        btnImportExcel: document.getElementById('btnImportExcel'),
        btnImportExcelMobile: document.getElementById('btnImportExcelMobile'),
        excelImportInput: document.getElementById('excelImportInput'),
        count: document.getElementById('appointmentCount'),
        countMobile: document.getElementById('appointmentCountMobile'),
        
        fData: document.getElementById('filterDataRef'),
        fProf: document.getElementById('filterProfissional'),
        fTurno: document.getElementById('filterTurno'),
        fEscola: document.getElementById('filterEscola'),
        fPaciente: document.getElementById('filterPaciente'),
        
        mainContainer: document.getElementById('mainContainer'),
        confirmModalOverlay: document.getElementById('confirmModalOverlay'),
        btnConfirmOk: document.getElementById('btnConfirmOk'),
        btnConfirmCancel: document.getElementById('btnConfirmCancel'),

        dashTotal: document.getElementById('dashTotal'),
        dashMorning: document.getElementById('dashMorning'),
        dashAfternoon: document.getElementById('dashAfternoon'),
        dashDateLabel: document.getElementById('dashDateLabel'),
        dashSchools: document.getElementById('dashSchools'),
        dashTotalCard: document.getElementById('dashTotalCard'),
        dashMorningCard: document.getElementById('dashMorningCard'),
        dashAfternoonCard: document.getElementById('dashAfternoonCard')
    };

    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        const icon = type === 'error' ? 'ph-warning-circle text-specRed' : 'ph-check-circle text-specGreen';
        toast.className = `bg-white p-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] flex items-center gap-3 transform transition-all duration-300 translate-x-full opacity-0 pointer-events-auto border-l-4 ${type === 'error' ? 'border-specRed' : 'border-specGreen'}`;
        toast.innerHTML = `<i class="ph ${icon} text-2xl"></i><span class="text-sm font-bold text-textMain">${message}</span>`;
        container.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        });

        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    function isAdmin() {
        return sessionStorage.getItem('isAdmin') === 'true';
    }

    const fixTextEncoding = (value) => {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/ÃƒÂ§/g, 'ç')
            .replace(/ÃƒÂ£/g, 'ã')
            .replace(/ÃƒÂ¡/g, 'á')
            .replace(/ÃƒÂ©/g, 'é')
            .replace(/ÃƒÂª/g, 'ê')
            .replace(/ÃƒÂ­/g, 'í')
            .replace(/ÃƒÂ³/g, 'ó')
            .replace(/ÃƒÂ´/g, 'ô')
            .replace(/ÃƒÂº/g, 'ú')
            .replace(/ÃƒÂ‡/g, 'Ç')
            .replace(/Ã§/g, 'ç')
            .replace(/Ã£/g, 'ã')
            .replace(/Ã¡/g, 'á')
            .replace(/Ã©/g, 'é')
            .replace(/Ãª/g, 'ê')
            .replace(/Ã­/g, 'í')
            .replace(/Ã³/g, 'ó')
            .replace(/Ã´/g, 'ô')
            .replace(/Ãº/g, 'ú')
            .replace(/Ã‡/g, 'Ç')
            .replace(/Âº/g, 'º')
            .replace(/Âª/g, 'ª')
            .replace(/Â·/g, '·')
            .replace(/Â/g, '');
    };

    const escapeHtml = (value) => fixTextEncoding(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));

    const escapeJsString = (value) => String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r?\n/g, ' ')
        .replace(/</g, '\\x3C')
        .replace(/>/g, '\\x3E');

    const parseJsonSafe = (value, fallback = {}) => {
        try {
            return JSON.parse(value || '{}');
        } catch(e) {
            return fallback;
        }
    };

    const getWeekdayFromISO = (dateValue) => {
        if (!dateValue) return '';
        const [y, m, d] = dateValue.split('-');
        const parsedDate = new Date(y, m - 1, d);
        const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        return weekdays[parsedDate.getDay()] || '';
    };

    const ADMIN_PASSCODE_HASH = '158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab';
    const ADMIN_PASSCODE_FALLBACK_HASH = '143b42d57035cd';

    function fallbackHash(value, seed = 0) {
        let h1 = 0xdeadbeef ^ seed;
        let h2 = 0x41c6ce57 ^ seed;
        for (let i = 0, ch; i < value.length; i++) {
            ch = value.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
    }

    async function validateAdminPasscode(value) {
        if (window.crypto?.subtle) {
            const data = new TextEncoder().encode(value);
            const digest = await crypto.subtle.digest('SHA-256', data);
            const hash = Array.from(new Uint8Array(digest))
                .map((byte) => byte.toString(16).padStart(2, '0'))
                .join('');
            return hash === ADMIN_PASSCODE_HASH;
        }

        return fallbackHash(value) === ADMIN_PASSCODE_FALLBACK_HASH;
    }

    const isAdminMode = () => !document.body.classList.contains('viewer-mode');

    const requireAdmin = (actionName = 'esta ação') => {
        if (isAdminMode()) return true;
        alert(`Acesso restrito: faça login como admin para ${actionName}.`);
        return false;
    };

    async function parseApiResponse(response) {
        const rawText = await response.text();
        let result = {};

        if (rawText) {
            try {
                result = JSON.parse(rawText);
            } catch(e) {
                result = { ok: response.ok, message: rawText };
            }
        }

        if (!response.ok && !Array.isArray(result)) {
            throw new Error(result.message || `Falha HTTP ${response.status}`);
        }

        if (result && result.error) {
            throw new Error(result.error);
        }

        return result;
    }

    const normalizeWhatsappPhone = (phoneValue) => {
        const digits = String(phoneValue || '').replace(/\D/g, '');
        if (!digits) return '';
        if (digits.startsWith('55')) return digits;
        return `55${digits}`;
    };

    const PROGRESS_STEPS = [
        {
            code: 'BUSCADO_ESCOLA',
            label: 'Buscado na escola',
            icon: 'ph-buildings',
            gpsField: 'gpsBuscadoEscola',
            timeField: 'timestampBuscadoEscola'
        },
        {
            code: 'ENTREGUE_ONG',
            label: 'Entregue na ONG',
            icon: 'ph-house-line',
            gpsField: 'gpsEntregueOng',
            timeField: 'timestampEntregueOng'
        },
        {
            code: 'SAIDA_ONG',
            label: 'Saida da ONG',
            icon: 'ph-sign-out',
            gpsField: 'gpsSaidaOng',
            timeField: 'timestampSaidaOng'
        },
        {
            code: 'DEVOLVIDO_ESCOLA',
            label: 'Devolvido na escola',
            icon: 'ph-graduation-cap',
            gpsField: 'gpsDevolvidoEscola',
            timeField: 'timestampDevolvidoEscola'
        }
    ];

    function getStatusParts(status) {
        return String(status || '').split(',').map(part => part.trim()).filter(Boolean);
    }

    function normalizeTurnoLabel(value, inicioValue = '') {
        const raw = fixTextEncoding(value)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9:]/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

        if (raw.includes('tarde')) return 'Tarde';
        if (raw.includes('manha') || raw.includes('mana') || raw.includes('manh')) return 'Manhã';

        const hourMatch = String(inicioValue || '').match(/\d{1,2}/);
        const hour = hourMatch ? parseInt(hourMatch[0], 10) : NaN;
        if (!Number.isNaN(hour)) return hour >= 13 ? 'Tarde' : 'Manhã';
        return '';
    }

    function normalizeFilterText(value) {
        return fixTextEncoding(value)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function valuesMatchFilter(value, selectedValue) {
        const selected = normalizeFilterText(selectedValue);
        if (!selected) return true;
        return normalizeFilterText(value) === selected;
    }

    function getProgressStepsForTransport(transporte) {
        if (transporte === 'Entrada') return PROGRESS_STEPS.slice(0, 2);
        if (fixTextEncoding(transporte) === 'Saída') return PROGRESS_STEPS.slice(2);
        return PROGRESS_STEPS;
    }

    function getProgressStep(code) {
        return PROGRESS_STEPS.find(step => step.code === code);
    }

    function extractGpsCoordinates(gpsValue) {
        const match = String(gpsValue || '').match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
        return match ? `${match[1]},${match[2]}` : '';
    }

    function getAnyGpsCoordinates(item) {
        for (const step of PROGRESS_STEPS) {
            const coords = extractGpsCoordinates(item[step.gpsField]);
            if (coords) return coords;
        }
        return extractGpsCoordinates(item.ausenciaGps);
    }

    function buildMapUrl(coords) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}`;
    }

    window.openGpsMap = (coords) => {
        const cleanCoords = extractGpsCoordinates(coords);
        if (!cleanCoords) {
            showToast('Mapa indisponível: GPS não registrado para esta etapa.', 'error');
            return false;
        }

        const mapUrl = buildMapUrl(cleanCoords);
        window.open(mapUrl, '_blank');
        return false;
    };

    // ---- Init Filters ----
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);
    if(DOM.fData) DOM.fData.value = localISOTime;

    let lastUserInteractionAt = 0;

    function markUserInteraction() {
        lastUserInteractionAt = Date.now();
    }

    function isBackgroundSyncPaused() {
        const activeTag = document.activeElement?.tagName;
        const userRecentlyTouchedUi = Date.now() - lastUserInteractionAt < 12000;
        const formElementFocused = ['INPUT', 'SELECT', 'TEXTAREA'].includes(activeTag);
        const confirmationOpen = DOM.confirmModalOverlay?.classList.contains('active');
        const drawerOpen = DOM.drawer && !DOM.drawer.classList.contains('translate-x-full');
        return userRecentlyTouchedUi || formElementFocused || confirmationOpen || drawerOpen;
    }

    ['pointerdown', 'touchstart', 'focusin', 'input', 'change'].forEach(eventName => {
        document.addEventListener(eventName, markUserInteraction, { capture: true, passive: true });
    });

    // ---- Data Management (Supabase REST API) ----
    const SUPABASE_URL = "https://ymgmlvrbydmxfnkeopra.supabase.co";
    const SUPABASE_KEY = "sb_publishable_iKPcSA5NVhhl--V35OP2cQ_ax2zvrob";
    const SUPABASE_TABLES = {
        appointments: 'appointments',
        monitors: 'monitors'
    };
    let appointments = [];
    const DEFAULT_MONITORAS = ["Vanessa", "Luciana", "Eliane", "Nenhuma"];
    let MONITORAS = parseJsonSafe(localStorage.getItem('lumina_monitoras'), null);
    if (!Array.isArray(MONITORAS) || MONITORAS.length === 0) {
        MONITORAS = [...DEFAULT_MONITORAS];
    }

    const supabaseHeaders = (extra = {}) => ({
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        ...extra
    });

    function buildSupabaseUrl(path) {
        return `${SUPABASE_URL}/rest/v1/${path}`;
    }

    async function supabaseRequest(path, options = {}) {
        let response;
        try {
            response = await fetch(buildSupabaseUrl(path), {
                mode: 'cors',
                cache: 'no-store',
                ...options,
                headers: supabaseHeaders(options.headers || {})
            });
        } catch(e) {
            throw new Error(`Não foi possível acessar o Supabase (${e.message}). Verifique bloqueio de rede, domínio do GitHub Pages ou extensões do navegador.`);
        }

        const rawText = await response.text();
        let result = null;
        if (rawText) {
            try {
                result = JSON.parse(rawText);
            } catch(e) {
                result = rawText;
            }
        }

        if (!response.ok) {
            const message = result?.message || result?.hint || rawText || `Falha Supabase ${response.status}`;
            throw new Error(message);
        }

        return result;
    }

    function formatSupabaseTime(value) {
        if (!value) return '';
        if (typeof value === 'string' && value.includes('T')) {
            const d = new Date(value);
            if (!isNaN(d)) return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        }
        return String(value).substring(0, 5);
    }

    function toSupabaseAppointment(item) {
        const payload = {
            id: String(item.id),
            data: item.data || null,
            profissional: fixTextEncoding(item.profissional),
            tipo: fixTextEncoding(item.tipo),
            paciente: fixTextEncoding(item.paciente),
            dia: fixTextEncoding(item.dia),
            turno: normalizeTurnoLabel(item.turno, item.inicio),
            inicio: item.inicio || null,
            termino: item.termino || null,
            escola: fixTextEncoding(item.escola),
            telefone: fixTextEncoding(item.telefone),
            transporte: fixTextEncoding(item.transporte) || 'Ambos',
            obs: fixTextEncoding(item.obs),
            status: item.status || '',
            monitora: fixTextEncoding(item.monitora),
            gps_entrada: item.gpsEntrada || item.gps_entrada || '',
            timestamp_entrada: item.timestampEntrada || item.timestamp_entrada || '',
            gps_saida: item.gpsSaida || item.gps_saida || '',
            timestamp_saida: item.timestampSaida || item.timestamp_saida || ''
        };

        const optionalColumns = [
            ['gps_buscado_escola', item.gpsBuscadoEscola || item.gps_buscado_escola],
            ['timestamp_buscado_escola', item.timestampBuscadoEscola || item.timestamp_buscado_escola],
            ['gps_entregue_ong', item.gpsEntregueOng || item.gps_entregue_ong],
            ['timestamp_entregue_ong', item.timestampEntregueOng || item.timestamp_entregue_ong],
            ['gps_saida_ong', item.gpsSaidaOng || item.gps_saida_ong],
            ['timestamp_saida_ong', item.timestampSaidaOng || item.timestamp_saida_ong],
            ['gps_devolvido_escola', item.gpsDevolvidoEscola || item.gps_devolvido_escola],
            ['timestamp_devolvido_escola', item.timestampDevolvidoEscola || item.timestamp_devolvido_escola],
            ['ausencia_motivo', item.ausenciaMotivo || item.ausencia_motivo],
            ['ausencia_timestamp', item.ausenciaTimestamp || item.ausencia_timestamp],
            ['ausencia_gps', item.ausenciaGps || item.ausencia_gps]
        ];

        optionalColumns.forEach(([key, value]) => {
            if (value) payload[key] = value;
        });

        return payload;
    }

    function toBaseSupabaseAppointment(item) {
        return {
            id: String(item.id),
            data: item.data || null,
            profissional: fixTextEncoding(item.profissional),
            tipo: fixTextEncoding(item.tipo),
            paciente: fixTextEncoding(item.paciente),
            dia: fixTextEncoding(item.dia),
            turno: normalizeTurnoLabel(item.turno, item.inicio),
            inicio: item.inicio || null,
            termino: item.termino || null,
            escola: fixTextEncoding(item.escola),
            telefone: fixTextEncoding(item.telefone),
            transporte: fixTextEncoding(item.transporte) || 'Ambos',
            obs: fixTextEncoding(item.obs),
            status: item.status || '',
            monitora: fixTextEncoding(item.monitora)
        };
    }

    function isMissingSupabaseColumnError(error) {
        return /column|schema cache|Could not find/i.test(error?.message || '');
    }

    function fromSupabaseAppointment(item) {
        return {
            id: item.id || '',
            data: item.data || '',
            profissional: fixTextEncoding(item.profissional),
            tipo: fixTextEncoding(item.tipo),
            paciente: fixTextEncoding(item.paciente),
            dia: fixTextEncoding(item.dia),
            turno: normalizeTurnoLabel(item.turno, item.inicio),
            inicio: formatSupabaseTime(item.inicio),
            termino: formatSupabaseTime(item.termino),
            escola: fixTextEncoding(item.escola),
            telefone: fixTextEncoding(item.telefone),
            transporte: fixTextEncoding(item.transporte) || 'Ambos',
            obs: fixTextEncoding(item.obs),
            status: item.status || '',
            monitora: fixTextEncoding(item.monitora),
            gpsEntrada: item.gpsEntrada || item.gps_entrada || '',
            timestampEntrada: item.timestampEntrada || item.timestamp_entrada || '',
            gpsSaida: item.gpsSaida || item.gps_saida || '',
            timestampSaida: item.timestampSaida || item.timestamp_saida || '',
            gpsBuscadoEscola: item.gpsBuscadoEscola || item.gps_buscado_escola || '',
            timestampBuscadoEscola: item.timestampBuscadoEscola || item.timestamp_buscado_escola || '',
            gpsEntregueOng: item.gpsEntregueOng || item.gps_entregue_ong || '',
            timestampEntregueOng: item.timestampEntregueOng || item.timestamp_entregue_ong || '',
            gpsSaidaOng: item.gpsSaidaOng || item.gps_saida_ong || '',
            timestampSaidaOng: item.timestampSaidaOng || item.timestamp_saida_ong || '',
            gpsDevolvidoEscola: item.gpsDevolvidoEscola || item.gps_devolvido_escola || '',
            timestampDevolvidoEscola: item.timestampDevolvidoEscola || item.timestamp_devolvido_escola || '',
            ausenciaMotivo: item.ausenciaMotivo || item.ausencia_motivo || '',
            ausenciaTimestamp: item.ausenciaTimestamp || item.ausencia_timestamp || '',
            ausenciaGps: item.ausenciaGps || item.ausencia_gps || ''
        };
    }

    async function supabaseCreateAppointments(records) {
        if (!records.length) return [];
        try {
            return await supabaseRequest(`${SUPABASE_TABLES.appointments}`, {
                method: 'POST',
                headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
                body: JSON.stringify(records.map(toSupabaseAppointment))
            });
        } catch(e) {
            if (!isMissingSupabaseColumnError(e)) throw e;
            console.warn('Colunas extras ainda não existem no Supabase. Salvando campos básicos:', e.message);
            return supabaseRequest(`${SUPABASE_TABLES.appointments}`, {
                method: 'POST',
                headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
                body: JSON.stringify(records.map(toBaseSupabaseAppointment))
            });
        }
    }

    async function supabaseUpdateAppointment(record) {
        try {
            return await supabaseRequest(`${SUPABASE_TABLES.appointments}?on_conflict=id`, {
                method: 'POST',
                headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
                body: JSON.stringify(toSupabaseAppointment(record))
            });
        } catch(e) {
            if (!isMissingSupabaseColumnError(e)) throw e;
            console.warn('Colunas extras ainda não existem no Supabase. Atualizando campos básicos:', e.message);
            return supabaseRequest(`${SUPABASE_TABLES.appointments}?on_conflict=id`, {
                method: 'POST',
                headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
                body: JSON.stringify(toBaseSupabaseAppointment(record))
            });
        }
    }

    async function supabaseDeleteAppointment(id) {
        return supabaseRequest(`${SUPABASE_TABLES.appointments}?id=eq.${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { Prefer: 'return=minimal' }
        });
    }

    async function syncLocalCacheToSupabaseIfEmpty(cloudData) {
        if (Array.isArray(cloudData) && cloudData.length > 0) return cloudData;

        const cachedRecords = parseJsonSafe(localStorage.getItem('lumina_agenda_cache'), []);
        if (!Array.isArray(cachedRecords) || cachedRecords.length === 0) return cloudData;

        try {
            await supabaseCreateAppointments(cachedRecords);
            showToast(`${cachedRecords.length} agendamento(s) enviados ao Supabase.`);
            return cachedRecords.map(fromSupabaseAppointment);
        } catch(e) {
            console.error('Erro ao enviar cache local ao Supabase:', e);
            showToast(`Supabase recusou os dados: ${e.message}`, 'error');
            return cloudData;
        }
    }

    function getOccurrencesForSixMonths(startDateStr) {
        if (!startDateStr) return [];
        const [year, month, day] = startDateStr.split('-').map(Number);
        const startDate = new Date(year, month - 1, day);
        const targetDayOfWeek = startDate.getDay();
        const endDate = new Date(year, month - 1 + 6, day);
        const occurrences = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            if (currentDate.getDay() === targetDayOfWeek) {
                const y = currentDate.getFullYear();
                const m = String(currentDate.getMonth() + 1).padStart(2, '0');
                const d = String(currentDate.getDate()).padStart(2, '0');
                occurrences.push(`${y}-${m}-${d}`);
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return occurrences;
    }

    function checkAndRunMigration(legacyData) {
        if (!Array.isArray(legacyData) || legacyData.length === 0) return legacyData;
        
        const getValSafe = (obj, keysArray) => {
            for (const key of keysArray) {
                if (obj[key] !== undefined && obj[key] !== null) return obj[key];
            }
            return '';
        };

        const needsMigration = legacyData.some(item => {
            const hasData = getValSafe(item, ['data', 'Data']);
            const hasDataInicio = getValSafe(item, ['dataInicio', 'datainicio', 'Data Início', 'Data Inicio', 'datainício']);
            const hasExcecoes = getValSafe(item, ['excecoes', 'Exceções', 'exceções', 'excecoes']);
            return !hasData && (hasDataInicio || hasExcecoes);
        });
        
        if (!needsMigration) return legacyData;
        
        showToast("Migrando banco de dados para modelo Flat...", "success");
        
        const flatRecords = [];
        legacyData.forEach(item => {
            const hasData = getValSafe(item, ['data', 'Data']);
            if (hasData) {
                flatRecords.push(item);
                return;
            }
            
            const dataInicio = getValSafe(item, ['dataInicio', 'datainicio', 'Data Início', 'Data Inicio', 'datainício']);
            if (!dataInicio) return;
            
            const occurrences = getOccurrencesForSixMonths(dataInicio);
            const excecoesRaw = getValSafe(item, ['excecoes', 'Exceções', 'exceções', 'excecoes']);
            const exc = parseJsonSafe(excecoesRaw, {});
            
            occurrences.forEach((dateStr, index) => {
                const excForDay = exc[dateStr] || {};
                let statusForDay = '';
                let monitorForDay = '';
                if (excForDay) {
                    if (typeof excForDay === 'object') {
                        statusForDay = excForDay.status || '';
                        monitorForDay = excForDay.monitora || '';
                    } else {
                        statusForDay = excForDay;
                    }
                }
                
                flatRecords.push({
                    id: `${getValSafe(item, ['id', 'ID']) || Date.now()}_flat_${dateStr}`,
                    data: dateStr,
                    profissional: getValSafe(item, ['profissional', 'Profissional']),
                    tipo: getValSafe(item, ['tipo', 'Tipo', 'Atendimento']),
                    paciente: getValSafe(item, ['paciente', 'Paciente']),
                    dia: getWeekdayFromISO(dateStr),
                    turno: normalizeTurnoLabel(getValSafe(item, ['turno', 'Turno']), getValSafe(item, ['inicio', 'Inicio', 'Início'])),
                    inicio: getValSafe(item, ['inicio', 'Inicio', 'Início']),
                    termino: getValSafe(item, ['termino', 'Termino', 'Término']),
                    escola: getValSafe(item, ['escola', 'Escola', 'Instituição', 'instituicao']),
                    telefone: getValSafe(item, ['telefone', 'Telefone']),
                    transporte: getValSafe(item, ['transporte', 'Transporte']) || 'Ambos',
                    obs: getValSafe(item, ['obs', 'Obs', 'Observações', 'observacoes']),
                    status: statusForDay,
                    monitora: monitorForDay,
                    gpsEntrada: '',
                    timestampEntrada: statusForDay.includes('ENTRADA') ? `${dateStr} 08:00:00 (Histórico)` : '',
                    gpsSaida: '',
                    timestampSaida: statusForDay.includes('SAIDA') ? `${dateStr} 12:00:00 (Histórico)` : ''
                });
            });
        });
        
        if (flatRecords.length === 0) {
            console.warn("Nenhum registro plano gerado durante a migração. Abortando escrita.");
            return legacyData;
        }

        appointments = flatRecords;
        localStorage.setItem('lumina_agenda_cache', JSON.stringify(flatRecords));
        
        supabaseCreateAppointments(flatRecords)
        .then(result => {
            console.log("Migração no Supabase concluída:", result);
            showToast("Banco de dados migrado com sucesso!", "success");
        })
        .catch(e => {
            console.error("Migration upload error:", e);
            showToast("Erro ao sincronizar migração na Nuvem.", "error");
        });
        
        return flatRecords;
    }

    async function loadData(silent = false) {
        if (!silent) {
            const cachedData = localStorage.getItem('lumina_agenda_cache');
            if (cachedData) {
                try {
                    appointments = JSON.parse(cachedData);
                    updateFilterOptions();
                    render();
                } catch(e) {}
            }
            DOM.agendaList.innerHTML = '<div class="py-12 flex flex-col items-center justify-center text-textMain/50 font-medium gap-4"><i class="ph ph-spinner-gap animate-spin text-4xl text-primaryStart"></i><div>Sincronizando com o Supabase...</div></div>';
        }

        try {
            if (!navigator.onLine) {
                if (!silent) showToast('Você está offline. Exibindo dados em cache.', 'error');
                return;
            }

            const data = await supabaseRequest(`${SUPABASE_TABLES.appointments}?select=*&order=data.asc&order=inicio.asc`, {
                method: 'GET'
            });
            const cloudOrSeededData = await syncLocalCacheToSupabaseIfEmpty(data);
            const newData = Array.isArray(cloudOrSeededData) ? cloudOrSeededData.map(fromSupabaseAppointment) : [];

            if (silent) {
                if (isBackgroundSyncPaused()) return;
                if (JSON.stringify(appointments) !== JSON.stringify(newData)) {
                    appointments = newData;
                    localStorage.setItem('lumina_agenda_cache', JSON.stringify(newData));
                    updateFilterOptions();
                    render();
                }
            } else {
                appointments = newData;
                localStorage.setItem('lumina_agenda_cache', JSON.stringify(newData));
                updateFilterOptions();
                render();
            }
        } catch(e) {
            if (!silent) {
                console.error('Supabase load error:', e);
                DOM.agendaList.innerHTML = `<div class="py-12 px-4 text-center text-red-500 font-medium">Falha na conexão com o Supabase.<br><span class="text-xs text-textMain/60">${escapeHtml(e.message)}</span></div>`;
            }
        }
    }
    async function loadMonitors(silent = false) {
        try {
            const data = await supabaseRequest(`${SUPABASE_TABLES.monitors}?select=*&order=monitora.asc`, {
                method: 'GET'
            });
            if (Array.isArray(data)) {
                const names = data.map(m => m.monitora || m.Monitora || m.name).filter(Boolean);
                if (names.length > 0) {
                    const changed = JSON.stringify(MONITORAS) !== JSON.stringify(names);
                    if (silent && isBackgroundSyncPaused()) return;
                    MONITORAS = names;
                    localStorage.setItem('lumina_monitoras', JSON.stringify(MONITORAS));
                    if (!silent || changed) render();
                }
            }
        } catch(e) {
            console.error('Error loading monitors from Supabase:', e);
        }
    }
    function normalizeImportKey(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
    }

    function firstImportValue(row, aliases) {
        for (const [key, value] of Object.entries(row)) {
            if (aliases.includes(normalizeImportKey(key)) && value !== undefined && value !== null && String(value).trim() !== '') {
                return value;
            }
        }
        return '';
    }

    function formatImportedDate(value) {
        if (!value) return '';

        if (typeof value === 'number' && window.XLSX?.SSF) {
            const parsed = window.XLSX.SSF.parse_date_code(value);
            if (parsed) {
                return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
            }
        }

        if (value instanceof Date && !isNaN(value)) {
            const y = value.getFullYear();
            const m = String(value.getMonth() + 1).padStart(2, '0');
            const d = String(value.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }

        const raw = String(value).trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);

        const brMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
        if (brMatch) {
            const day = brMatch[1].padStart(2, '0');
            const month = brMatch[2].padStart(2, '0');
            const year = brMatch[3].length === 2 ? `20${brMatch[3]}` : brMatch[3];
            return `${year}-${month}-${day}`;
        }

        const parsedDate = new Date(raw);
        if (!isNaN(parsedDate)) {
            const y = parsedDate.getFullYear();
            const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
            const d = String(parsedDate.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }

        return '';
    }

    function formatImportedTime(value) {
        if (value === undefined || value === null || value === '') return '';

        if (typeof value === 'number') {
            const totalMinutes = Math.round((value % 1) * 24 * 60);
            const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
            const mm = String(totalMinutes % 60).padStart(2, '0');
            return `${hh}:${mm}`;
        }

        if (value instanceof Date && !isNaN(value)) {
            return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
        }

        const raw = String(value).trim();
        const timeMatch = raw.match(/(\d{1,2})[:hH](\d{2})/);
        if (timeMatch) {
            return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
        }

        const hourOnly = raw.match(/^(\d{1,2})$/);
        if (hourOnly) return `${hourOnly[1].padStart(2, '0')}:00`;

        return raw.slice(0, 5);
    }

    function normalizeTurno(value, inicioValue) {
        return normalizeTurnoLabel(value, inicioValue);
    }

    function normalizeTransporte(value) {
        const raw = fixTextEncoding(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        if (raw.includes('entrada') && !raw.includes('saida')) return 'Entrada';
        if (raw.includes('saida') && !raw.includes('entrada')) return 'Saída';
        return 'Ambos';
    }

    const EXCEL_TEMPLATE_HEADERS = [
        'Data Inicio',
        'Profissional',
        'Atendimento',
        'Paciente',
        'Hora Inicio',
        'Hora Termino',
        'Instituicao',
        'Telefone',
        'Transporte',
        'Observacoes'
    ];

    function downloadBlob(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function downloadExcelImportTemplate() {
        if (!requireAdmin('baixar o modelo de importação')) return;

        const filename = 'modelo-importacao-agendamentos.xlsx';
        if (window.XLSX) {
            const worksheet = window.XLSX.utils.aoa_to_sheet([EXCEL_TEMPLATE_HEADERS]);
            worksheet['!cols'] = [
                { wch: 14 },
                { wch: 22 },
                { wch: 22 },
                { wch: 32 },
                { wch: 12 },
                { wch: 12 },
                { wch: 28 },
                { wch: 16 },
                { wch: 16 },
                { wch: 32 }
            ];
            const workbook = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Agendamentos');
            window.XLSX.writeFile(workbook, filename);
        } else {
            const csv = `${EXCEL_TEMPLATE_HEADERS.join(';')}\r\n`;
            downloadBlob(csv, 'modelo-importacao-agendamentos.csv', 'text/csv;charset=utf-8');
        }

        showToast('Modelo baixado. Preencha apenas a primeira data do atendimento; o sistema criará 6 meses.');
    }

    function buildImportedAppointments(rows) {
        const aliases = {
            id: ['id', 'codigo'],
            data: ['data', 'datadoatendimento', 'dataconsulta', 'dia'],
            dataInicio: ['datainicio', 'inicioagenda', 'datainicial'],
            profissional: ['profissional', 'terapeuta', 'responsavel'],
            tipo: ['tipo', 'atendimento', 'especialidade', 'servico'],
            paciente: ['paciente', 'aluno', 'crianca', 'nome', 'nomecompleto'],
            turno: ['turno', 'periodo'],
            inicio: ['horainicio', 'iniciohorario', 'horarioinicio', 'horario', 'entrada'],
            termino: ['horatermino', 'termino', 'fim', 'horafim', 'saida'],
            escola: ['escola', 'instituicao', 'unidade'],
            telefone: ['telefone', 'celular', 'whatsapp', 'contato'],
            transporte: ['transporte', 'trajeto'],
            obs: ['obs', 'observacao', 'observacoes', 'nota', 'notas']
        };

        const importedRecords = [];
        const skippedRows = [];

        rows.forEach((row, rowIndex) => {
            const inicio = formatImportedTime(firstImportValue(row, aliases.inicio));
            const termino = formatImportedTime(firstImportValue(row, aliases.termino));
            const paciente = String(firstImportValue(row, aliases.paciente) || '').trim();
            const profissional = String(firstImportValue(row, aliases.profissional) || '').trim();
            const tipo = String(firstImportValue(row, aliases.tipo) || '').trim();
            const data = formatImportedDate(firstImportValue(row, aliases.data));
            const dataInicio = formatImportedDate(firstImportValue(row, aliases.dataInicio));
            const dates = data ? [data] : getOccurrencesForSixMonths(dataInicio);

            if (!paciente || !inicio || dates.length === 0) {
                skippedRows.push(rowIndex + 2);
                return;
            }

            const sourceId = String(firstImportValue(row, aliases.id) || '').trim();
            dates.forEach((dateStr, dateIndex) => {
                const generatedId = `${Date.now()}_excel_${rowIndex}_${dateIndex}_${Math.random().toString(36).slice(2, 7)}`;
                const recordId = sourceId && dates.length === 1 ? sourceId : generatedId;
                importedRecords.push({
                    id: recordId,
                    data: dateStr,
                    profissional,
                    tipo,
                    paciente,
                    dia: getWeekdayFromISO(dateStr),
                    turno: normalizeTurno(firstImportValue(row, aliases.turno), inicio),
                    inicio,
                    termino,
                    escola: String(firstImportValue(row, aliases.escola) || '').trim(),
                    telefone: String(firstImportValue(row, aliases.telefone) || '').trim(),
                    transporte: normalizeTransporte(firstImportValue(row, aliases.transporte)),
                    obs: String(firstImportValue(row, aliases.obs) || '').trim(),
                    status: '',
                    monitora: '',
                    gpsEntrada: '',
                    timestampEntrada: '',
                    gpsSaida: '',
                    timestampSaida: ''
                });
            });
        });

        return { importedRecords, skippedRows };
    }

    async function syncImportedAppointments(records) {
        await supabaseCreateAppointments(records);
    }

    async function importAppointmentsFromExcel(file) {
        if (!file) return;
        if (!isAdmin()) {
            showToast('Acesso negado. Faça login como coordenador.', 'error');
            return;
        }
        if (!window.XLSX) {
            showToast('Biblioteca de Excel não carregada. Verifique a conexão.', 'error');
            return;
        }

        try {
            showToast('Lendo planilha...', 'success');
            const buffer = await file.arrayBuffer();
            const workbook = window.XLSX.read(buffer, { type: 'array', cellDates: true });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const rows = window.XLSX.utils.sheet_to_json(worksheet, { defval: '' });

            if (rows.length === 0) {
                showToast('A planilha está vazia.', 'error');
                return;
            }

            const { importedRecords, skippedRows } = buildImportedAppointments(rows);
            if (importedRecords.length === 0) {
                showToast('Nenhum agendamento válido encontrado no Excel.', 'error');
                return;
            }

            const confirmMessage = `${importedRecords.length} agendamento(s) serão importados.${skippedRows.length ? ` Linhas ignoradas: ${skippedRows.join(', ')}.` : ''} Continuar?`;
            if (!confirm(confirmMessage)) return;

            appointments.push(...importedRecords);
            localStorage.setItem('lumina_agenda_cache', JSON.stringify(appointments));
            updateFilterOptions();
            render();

            try {
                await syncImportedAppointments(importedRecords);
                showToast(`${importedRecords.length} agendamento(s) importados do Excel!`);
            } catch (e) {
                console.error('Erro ao sincronizar importação:', e);
                showToast('Importado localmente, mas falhou ao sincronizar na nuvem.', 'error');
            }
        } catch (e) {
            console.error('Erro ao importar Excel:', e);
            showToast('Não foi possível importar este arquivo Excel.', 'error');
        } finally {
            if (DOM.excelImportInput) DOM.excelImportInput.value = '';
        }
    }

    // ---- Drawer Logic ----
    function openDrawer(mode = 'create', id = null) {
        if (!requireAdmin(mode === 'edit' ? 'editar agendamentos' : 'criar agendamentos')) return;
        
        DOM.drawerOverlay.classList.remove('opacity-0', 'pointer-events-none');
        DOM.drawerOverlay.classList.add('opacity-100', 'pointer-events-auto');
        DOM.drawer.classList.remove('translate-x-full');
        DOM.drawer.classList.add('translate-x-0');
        DOM.form.reset();
        document.getElementById('formId').value = '';

        if (mode === 'edit' && id) {
            DOM.drawerTitle.textContent = 'Editar Agendamento';
            const item = appointments.find(a => String(a.id) === String(id));
            if(item) {
                document.getElementById('formId').value = item.id;
                document.getElementById('formProfissional').value = item.profissional || '';
                document.getElementById('formTipo').value = item.tipo || '';
                document.getElementById('formPaciente').value = item.paciente || '';
                if (document.getElementById('formDataInicio')) document.getElementById('formDataInicio').value = item.dataInicio || '';
                document.getElementById('formInicio').value = item.inicio || '';
                document.getElementById('formTermino').value = item.termino || '';
                document.getElementById('formEscola').value = item.escola || '';
                document.getElementById('formTelefone').value = item.telefone || '';
                const tr = item.transporte;
                const trVal = (tr === 'Entrada' || fixTextEncoding(tr) === 'Saída') ? fixTextEncoding(tr) : 'Ambos';
                if (document.getElementById('formTransporte')) document.getElementById('formTransporte').value = trVal;
                document.getElementById('formObs').value = item.obs || '';
            }
        } else {
            DOM.drawerTitle.textContent = 'Novo Agendamento';
        }
    }

    function closeDrawer() {
        DOM.drawerOverlay.classList.add('opacity-0', 'pointer-events-none');
        DOM.drawerOverlay.classList.remove('opacity-100', 'pointer-events-auto');
        DOM.drawer.classList.add('translate-x-full');
        DOM.drawer.classList.remove('translate-x-0');
    }

    // ---- Confirmation Modal Logic ----
    let currentConfirmationAction = null;

    function showConfirmationModal({ title, message, iconClass, colorClass, onConfirm }) {
        const titleEl = document.getElementById('confirmModalTitle');
        const messageEl = document.getElementById('confirmModalMessage');
        const iconContainer = document.getElementById('confirmModalIcon');
        
        titleEl.textContent = title;
        messageEl.textContent = message;
        iconContainer.className = `w-16 h-16 rounded-2xl flex items-center justify-center mb-2 ${colorClass}`;
        iconContainer.innerHTML = `<i class="ph ${iconClass} text-3xl"></i>`;
        
        currentConfirmationAction = onConfirm;
        DOM.confirmModalOverlay.classList.add('active');
    }

    function closeConfirmationModal() {
        DOM.confirmModalOverlay.classList.remove('active');
        currentConfirmationAction = null;
    }

    DOM.btnConfirmOk.addEventListener('click', () => {
        if (currentConfirmationAction) currentConfirmationAction();
        closeConfirmationModal();
    });

    DOM.btnConfirmCancel.addEventListener('click', closeConfirmationModal);
    DOM.confirmModalOverlay.addEventListener('click', (e) => {
        if (e.target.id === 'confirmModalOverlay') closeConfirmationModal();
    });

    // ---- Events ----
    DOM.btnNew.addEventListener('click', () => openDrawer('create'));
    if (DOM.btnNewMobile) DOM.btnNewMobile.addEventListener('click', () => openDrawer('create'));
    const openExcelImport = () => {
        if (!requireAdmin('importar dados via Excel')) return;
        DOM.excelImportInput?.click();
    };
    if (DOM.btnDownloadExcelTemplate) DOM.btnDownloadExcelTemplate.addEventListener('click', downloadExcelImportTemplate);
    if (DOM.btnDownloadExcelTemplateMobile) DOM.btnDownloadExcelTemplateMobile.addEventListener('click', downloadExcelImportTemplate);
    if (DOM.btnImportExcel) DOM.btnImportExcel.addEventListener('click', openExcelImport);
    if (DOM.btnImportExcelMobile) DOM.btnImportExcelMobile.addEventListener('click', openExcelImport);
    if (DOM.excelImportInput) {
        DOM.excelImportInput.addEventListener('change', (event) => importAppointmentsFromExcel(event.target.files?.[0]));
    }
    DOM.btnCloseDrawer.addEventListener('click', closeDrawer);
    DOM.drawerOverlay.addEventListener('click', closeDrawer);

    DOM.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!isAdmin()) {
            showToast('Acesso negado. Faça login como coordenador.', 'error');
            return;
        }

        const submitBtn = DOM.form.querySelector('button[type="submit"]');
        const fInicio = document.getElementById('formInicio').value;
        const fTermino = document.getElementById('formTermino').value;
        if (fInicio && fTermino && fInicio > fTermino) {
            showToast('O horário de início não pode ser maior que o término.', 'error');
            return;
        }
        
        const fPaciente = document.getElementById('formPaciente').value.trim();
        if (fPaciente.length < 3) {
            showToast('O nome do paciente é muito curto.', 'error');
            return;
        }

        const id = document.getElementById('formId').value;
        const dataInicioVal = document.getElementById('formDataInicio') ? document.getElementById('formDataInicio').value : '';
        const inicioValue = document.getElementById('formInicio').value;
        const horaInicio = parseInt(inicioValue.split(':')[0], 10);
        let turnoCalculado = 'Manhã';
        if (horaInicio >= 13) {
            turnoCalculado = 'Tarde';
        }

        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="ph ph-spinner-gap animate-spin text-xl inline-block mr-2"></i> Salvando...';
        submitBtn.disabled = true;

        if (id) {
            // Edição de um registro diário existente (UPDATE de linha única)
            const existing = appointments.find(a => String(a.id) === String(id));
            const updatedRecord = {
                ...existing,
                profissional: document.getElementById('formProfissional').value,
                tipo: document.getElementById('formTipo').value,
                paciente: document.getElementById('formPaciente').value,
                turno: turnoCalculado,
                inicio: inicioValue,
                termino: fTermino,
                escola: document.getElementById('formEscola').value,
                telefone: document.getElementById('formTelefone').value,
                transporte: document.getElementById('formTransporte') ? document.getElementById('formTransporte').value : 'Ambos',
                obs: document.getElementById('formObs').value
            };

            // Salvamento Otimista (local imediato)
            const idx = appointments.findIndex(a => String(a.id) === String(id));
            if(idx > -1) appointments[idx] = updatedRecord;
            localStorage.setItem('lumina_agenda_cache', JSON.stringify(appointments));
            updateFilterOptions();
            render();
            closeDrawer();
            showToast('Agendamento atualizado!');

            // Envio para Supabase em background
            supabaseUpdateAppointment(updatedRecord).catch(err => console.error("Erro ao sincronizar update:", err));

            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        } else {
            // Criação automática das datas de ocorrências para os próximos 6 meses (CREATE_BATCH)
            if (!dataInicioVal) {
                showToast('Informe a data de início para os 6 meses.', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                return;
            }

            const occurrences = getOccurrencesForSixMonths(dataInicioVal);
            const batchRecords = occurrences.map((dateStr, index) => {
                return {
                    id: `${Date.now()}_flat_${index}_${Math.random().toString(36).substr(2, 5)}`,
                    data: dateStr,
                    profissional: document.getElementById('formProfissional').value,
                    tipo: document.getElementById('formTipo').value,
                    paciente: document.getElementById('formPaciente').value,
                    dia: getWeekdayFromISO(dateStr),
                    turno: turnoCalculado,
                    inicio: inicioValue,
                    termino: fTermino,
                    escola: document.getElementById('formEscola').value,
                    telefone: document.getElementById('formTelefone').value,
                    transporte: document.getElementById('formTransporte') ? document.getElementById('formTransporte').value : 'Ambos',
                    obs: document.getElementById('formObs').value,
                    status: '',
                    monitora: '',
                    gpsEntrada: '',
                    timestampEntrada: '',
                    gpsSaida: '',
                    timestampSaida: ''
                };
            });

            // Salvamento Otimista (local imediato)
            appointments.push(...batchRecords);
            localStorage.setItem('lumina_agenda_cache', JSON.stringify(appointments));
            updateFilterOptions();
            render();
            closeDrawer();
            showToast(`${batchRecords.length} atendimentos cadastrados (6 meses)!`);

            // Envio em lote em background
            supabaseCreateAppointments(batchRecords)
                .then(result => console.log("Batch inserido no Supabase:", result))
                .catch(err => console.error("Erro ao inserir em lote:", err));

            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    window.deleteAppointment = async (id) => {
        if (!isAdmin()) {
            showToast('Acesso negado.', 'error');
            return;
        }
        if(confirm('Excluir este agendamento definitivamente?')) {
            DOM.agendaList.innerHTML = '<div class="py-12 flex flex-col items-center gap-2"><i class="ph ph-spinner-gap animate-spin text-2xl text-red-500"></i> Excluindo...</div>';
            
            try {
                await supabaseDeleteAppointment(id);
                
                appointments = appointments.filter(a => String(a.id) !== String(id));
                localStorage.setItem('lumina_agenda_cache', JSON.stringify(appointments));
                updateFilterOptions();
                render();
                showToast('Excluído com sucesso!');
            } catch(e) {
                console.error(e);
                showToast("Erro ao tentar deletar na Nuvem.", 'error');
                render(); 
            }
        }
    };

    window.editAppointment = (id) => {
        if (!isAdmin()) {
            showToast('Acesso negado.', 'error');
            return;
        }
        openDrawer('edit', id);
    };

    function handleFilterChange(event) {
        if (event?.currentTarget === DOM.fTurno) {
            const normalizedTurno = normalizeTurnoLabel(DOM.fTurno.value);
            DOM.fTurno.value = normalizedTurno || '';
        }
        render();
    }

    [DOM.fData, DOM.fProf, DOM.fTurno, DOM.fEscola].forEach(el => {
        if (el) el.addEventListener('change', handleFilterChange);
    });

    if (DOM.fTurno) {
        DOM.fTurno.addEventListener('input', handleFilterChange);
    }

    if (DOM.agendaList) {
        DOM.agendaList.addEventListener('click', (event) => {
            const button = event.target.closest('[data-action]');
            if (!button || !DOM.agendaList.contains(button)) return;

            const action = button.dataset.action;
            if (!action) return;

            event.preventDefault();
            event.stopPropagation();
            markUserInteraction();

            if (action === 'progress') {
                window.confirmProgressChange(button.dataset.id, button.dataset.date, button.dataset.stepCode, button.dataset.patient || 'paciente');
                return;
            }

            if (action === 'absence') {
                window.confirmAbsence(button.dataset.id, button.dataset.date, button.dataset.patient || 'paciente');
                return;
            }

            if (action === 'map') {
                window.openGpsMap(button.dataset.coords || '');
                return;
            }

            if (action === 'edit') {
                window.editAppointment(button.dataset.id);
                return;
            }

            if (action === 'delete') {
                window.deleteAppointment(button.dataset.id);
            }
        });

        DOM.agendaList.addEventListener('change', (event) => {
            const select = event.target.closest('.daily-monitor-select');
            if (!select || !DOM.agendaList.contains(select)) return;

            markUserInteraction();
            window.updateDailyMonitor(select.dataset.id, select.dataset.date, select.value);
        });
    }

    const btnPrint = document.getElementById('btnPrint');
    if (btnPrint) {
        btnPrint.addEventListener('click', () => {
            window.print();
        });
    }

    if (DOM.fPaciente) {
        let debounceTimer;
        DOM.fPaciente.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => render(), 300);
        });
    }

    const btnPrevDay = document.getElementById('btnPrevDay');
    const btnNextDay = document.getElementById('btnNextDay');
    
    function shiftDate(days) {
        if (!DOM.fData.value) return;
        const [y, m, d] = DOM.fData.value.split('-');
        const date = new Date(y, m - 1, d);
        date.setDate(date.getDate() + days);
        if (date.getDay() === 0) date.setDate(date.getDate() + (days > 0 ? 1 : -2));
        if (date.getDay() === 6 && days > 0) date.setDate(date.getDate() + 2);
        
        DOM.fData.value = date.toISOString().split('T')[0];
        render();
    }

    if (btnPrevDay) btnPrevDay.addEventListener('click', () => shiftDate(-1));
    if (btnNextDay) btnNextDay.addEventListener('click', () => shiftDate(1));

    const btnClearFilters = document.getElementById('btnClearFilters');
    function updateClearFiltersButton() {
        if (!btnClearFilters) return;
        const hasFilter = DOM.fProf.value || DOM.fTurno.value || DOM.fEscola.value || (DOM.fPaciente && DOM.fPaciente.value);
        if (hasFilter) {
            btnClearFilters.classList.remove('hidden');
        } else {
            btnClearFilters.classList.add('hidden');
        }
    }

    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', () => {
            if (DOM.fProf) DOM.fProf.value = '';
            if (DOM.fTurno) DOM.fTurno.value = '';
            if (DOM.fEscola) DOM.fEscola.value = '';
            if (DOM.fPaciente) DOM.fPaciente.value = '';
            render();
        });
    }

    if (DOM.dashTotalCard) {
        DOM.dashTotalCard.addEventListener('click', () => {
            if (DOM.fTurno) DOM.fTurno.value = '';
            if (DOM.fEscola) DOM.fEscola.value = '';
            render();
        });
    }

    if (DOM.dashMorningCard) {
        DOM.dashMorningCard.addEventListener('click', () => {
            if (DOM.fTurno) {
                DOM.fTurno.value = normalizeTurnoLabel(DOM.fTurno.value) === 'Manhã' ? '' : 'Manhã';
            }
            render();
        });
    }

    if (DOM.dashAfternoonCard) {
        DOM.dashAfternoonCard.addEventListener('click', () => {
            if (DOM.fTurno) {
                DOM.fTurno.value = normalizeTurnoLabel(DOM.fTurno.value) === 'Tarde' ? '' : 'Tarde';
            }
            render();
        });
    }

    function updateFilterOptions() {
        const profs = new Set(), escolas = new Set();
        appointments.forEach(a => {
            if(a.profissional) profs.add(a.profissional);
            if(a.escola) escolas.add(a.escola);
        });

        const sortAndPopulate = (set, sel) => {
            if(!sel) return;
            const currentObj = sel.value;
            sel.innerHTML = `<option value="">${sel.options[0].text}</option>`;
            Array.from(set).sort().forEach(val => {
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = val;
                sel.appendChild(opt);
            });
            if (currentObj && set.has(currentObj)) sel.value = currentObj;
        };

        sortAndPopulate(profs, DOM.fProf);
        sortAndPopulate(escolas, DOM.fEscola);

    }

    // ---- Admin Role Logic ----
    const btnAdminLogin = document.getElementById('btnAdminLogin');
    const btnAdminLogout = document.getElementById('btnAdminLogout');
    
    if (btnAdminLogin) {
        btnAdminLogin.addEventListener('click', async () => {
            const senha = prompt("Acesso Restrito. Digite a senha da coordenação:");
            if (!senha) return;

            const isValidPasscode = await validateAdminPasscode(senha);
            if (isValidPasscode) {
                document.body.classList.remove('viewer-mode');
                btnAdminLogin.classList.add('hidden');
                btnAdminLogout.classList.remove('hidden');
                sessionStorage.setItem('isAdmin', 'true');
            } else {
                alert("Senha incorreta!");
            }
        });
    }

    if (btnAdminLogout) {
        btnAdminLogout.addEventListener('click', () => {
            document.body.classList.add('viewer-mode');
            btnAdminLogin.classList.remove('hidden');
            btnAdminLogout.classList.add('hidden');
            sessionStorage.removeItem('isAdmin');
        });
    }

    if (sessionStorage.getItem('isAdmin') === 'true') {
        document.body.classList.remove('viewer-mode');
        if (btnAdminLogin) btnAdminLogin.classList.add('hidden');
        if (btnAdminLogout) btnAdminLogout.classList.remove('hidden');
    }

    function getDateFilterInfo() {
        const dateRef = DOM.fData ? DOM.fData.value : null;
        return {
            dateRef,
            targetWeekday: getWeekdayFromISO(dateRef)
        };
    }

    function getFilteredAppointments({ ignoreTurno = false, ignoreEscola = false, ignoreMonitora = false } = {}) {
        const { dateRef } = getDateFilterInfo();
        const selectedTurno = normalizeTurnoLabel(DOM.fTurno?.value || '');
        const selectedProfissional = DOM.fProf?.value || '';
        const selectedEscola = DOM.fEscola?.value || '';
        const searchVal = normalizeFilterText(DOM.fPaciente?.value || '');

        return appointments.filter(a => {
            const dateMatch = !dateRef || a.data === dateRef;
            const pMatch = valuesMatchFilter(a.profissional, selectedProfissional);
            const itemTurno = normalizeTurnoLabel(a.turno, a.inicio);
            const tMatch = ignoreTurno || !selectedTurno || itemTurno === selectedTurno;
            const eMatch = ignoreEscola || valuesMatchFilter(a.escola, selectedEscola);
            const mMatch = ignoreMonitora || !a.monitora; // No monitora filter in top bar, so ignore this or always return true.
            const pacienteMatch = !searchVal || normalizeFilterText(a.paciente).includes(searchVal);

            return dateMatch && pMatch && tMatch && eMatch && pacienteMatch;
        });
    }

    function renderDashboard(filtered) {
        if (!DOM.dashTotal) return;

        const { dateRef } = getDateFilterInfo();

        // Total: respeita todos os filtros ativos
        const activeFiltered = filtered.filter(a => a.status !== 'CANCELADO');

        // Manhã/Tarde: ignora filtro de turno mas respeita escola/profissional/busca
        const byTurnoBase = getFilteredAppointments({ ignoreTurno: true }).filter(a => a.status !== 'CANCELADO');
        const morningCount = byTurnoBase.filter(a => normalizeTurnoLabel(a.turno, a.inicio) === 'Manhã').length;
        const afternoonCount = byTurnoBase.filter(a => normalizeTurnoLabel(a.turno, a.inicio) === 'Tarde').length;

        // Escolas: ignora filtro de escola, mas respeita turno/profissional/busca
        const byEscolaBase = getFilteredAppointments({ ignoreEscola: true }).filter(a => a.status !== 'CANCELADO');

        // Monitoras: resumo informativo completo
        const byMonitoraBase = filtered.filter(a => a.status !== 'CANCELADO');

        DOM.dashTotal.textContent = activeFiltered.length;
        DOM.dashMorning.textContent = morningCount;
        DOM.dashAfternoon.textContent = afternoonCount;

        if (DOM.dashDateLabel) {
            const labelDate = dateRef ? new Date(`${dateRef}T12:00:00`) : new Date();
            DOM.dashDateLabel.textContent = new Intl.DateTimeFormat('pt-BR', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).format(labelDate);
        }

        DOM.dashMorningCard?.classList.toggle('active', !!DOM.fTurno?.value && normalizeTurnoLabel(DOM.fTurno.value) === 'Manhã');
        DOM.dashAfternoonCard?.classList.toggle('active', !!DOM.fTurno?.value && normalizeTurnoLabel(DOM.fTurno.value) === 'Tarde');
        DOM.dashTotalCard?.classList.toggle('active', !DOM.fTurno?.value && !DOM.fEscola?.value);

        // ---- Contagem de escolas ----
        const schoolCounts = new Map();
        byEscolaBase.forEach(item => {
            const school = item.escola;
            if (school) schoolCounts.set(school, (schoolCounts.get(school) || 0) + 1);
        });

        const dashSchoolsEl = document.getElementById('dashSchools');
        const dashSchoolsCount = document.getElementById('dashSchoolsCount');
        if (dashSchoolsCount) dashSchoolsCount.textContent = schoolCounts.size;

        if (dashSchoolsEl) {
            dashSchoolsEl.innerHTML = '';
            const schools = Array.from(schoolCounts.entries())
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

            if (schools.length === 0) {
                dashSchoolsEl.innerHTML = '<div class="text-xs font-semibold text-textMain/45">Sem dados para exibir</div>';
            } else {
                schools.forEach(([school, count]) => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'dashboard-school-row';
                    btn.classList.toggle('active', DOM.fEscola?.value === school);
                    btn.title = school;
                    btn.innerHTML = `<span></span><strong></strong>`;
                    btn.querySelector('span').textContent = school;
                    btn.querySelector('strong').textContent = count;
                    btn.addEventListener('click', () => {
                        if (!DOM.fEscola) return;
                        DOM.fEscola.value = DOM.fEscola.value === school ? '' : school;
                        render();
                    });
                    dashSchoolsEl.appendChild(btn);
                });
            }
        }

        // ---- Contagem de monitoras ----
        const monitorCounts = new Map();
        byMonitoraBase.forEach(item => {
            const todayMonitor = item.monitora || '';
            if (todayMonitor) {
                monitorCounts.set(todayMonitor, (monitorCounts.get(todayMonitor) || 0) + 1);
            }
        });

        const dashMonitorsEl = document.getElementById('dashMonitors');
        const dashMonitorsCount = document.getElementById('dashMonitorsCount');
        if (dashMonitorsCount) dashMonitorsCount.textContent = monitorCounts.size;

        if (dashMonitorsEl) {
            dashMonitorsEl.innerHTML = '';
            const monitors = Array.from(monitorCounts.entries())
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

            if (monitors.length === 0) {
                dashMonitorsEl.innerHTML = '<div class="text-xs font-semibold text-textMain/45">Nenhuma monitora escalada</div>';
            } else {
                monitors.forEach(([monitor, count]) => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'dashboard-school-row monitor-row';
                    btn.title = monitor;
                    btn.innerHTML = `<span></span><strong></strong>`;
                    btn.querySelector('span').textContent = monitor;
                    btn.querySelector('strong').textContent = count;
                    btn.disabled = true;
                    dashMonitorsEl.appendChild(btn);
                });
            }
        }
    }

    // ---- Render logic ----
    function render() {
        updateClearFiltersButton();
        const { dateRef } = getDateFilterInfo();
        let filtered = getFilteredAppointments();

        filtered.sort((a, b) => {
            const timeA = a.inicio || '24:00';
            const timeB = b.inicio || '24:00';
            return timeA.localeCompare(timeB);
        });

        DOM.count.textContent = filtered.length;
        if (DOM.countMobile) DOM.countMobile.textContent = filtered.length;
        renderDashboard(filtered);
        DOM.agendaList.innerHTML = '';

        if (filtered.length === 0) {
            DOM.agendaList.innerHTML = `<div class="py-12 text-center text-textMain/50 font-medium">Nenhum agendamento encontrado para os filtros atuais.</div>`;
            return;
        }

        filtered.forEach(item => {
            const todayStatus = item.status || '';
            const todayMonitor = item.monitora || '';
            const statusParts = getStatusParts(todayStatus);

            const isCancelled = todayStatus === 'CANCELADO';
            const cardOpacity = isCancelled ? 'opacity-40 grayscale' : '';

            const normalizedTurno = normalizeTurnoLabel(item.turno, item.inicio);
            const pillClass = normalizedTurno === 'Manhã' ? 'manha' : 'tarde';
            const phone = normalizeWhatsappPhone(item.telefone);
            const wppLink = phone ? `https://wa.me/${phone}` : '#';

            const trType = item.transporte;
            const allowedProgressSteps = getProgressStepsForTransport(trType);
            const completedProgressCount = allowedProgressSteps.filter(step => statusParts.includes(step.code)).length;
            const itemIdJs = escapeJsString(item.id);
            const patientNameText = item.paciente || 'Sem paciente';
            const patientNameHtml = escapeHtml(patientNameText);
            const profissionalHtml = escapeHtml(item.profissional || 'Sem profissional');
            const tipoHtml = escapeHtml(item.tipo || 'Sem atendimento');
            const turnoHtml = escapeHtml(normalizedTurno || '');
            const inicioHtml = escapeHtml(item.inicio || '--');
            const terminoHtml = escapeHtml(item.termino || '--');
            const diaHtml = escapeHtml(item.dia || '');
            const escolaHtml = escapeHtml(item.escola || '');
            const obsHtml = escapeHtml(item.obs || '');

            let actionButtons = '';
            if (dateRef) {
                const pName = escapeJsString(patientNameText);
                const monitorOptions = MONITORAS.map(m => `<option value="${escapeHtml(m)}" ${todayMonitor === m ? 'selected' : ''}>${escapeHtml(m)}</option>`).join('');
                const progressHtml = allowedProgressSteps.map((step, index) => {
                    const completed = statusParts.includes(step.code);
                    const timestamp = item[step.timeField] || '';
                    const stepStateClass = completed
                        ? 'bg-specGreen text-white border-specGreen shadow-sm'
                        : 'bg-white text-specBlue border-specBlue/40 hover:border-specBlue hover:text-specBlue';
                    const connectorClass = completed ? 'completed' : '';
                    const disabledAttr = isCancelled ? 'disabled' : '';
                    const title = timestamp ? `${step.label} - ${timestamp}` : step.label;

                    return `
                        <div class="progress-step-wrap">
                            ${index > 0 ? `<span class="progress-connector ${connectorClass}"></span>` : ''}
                            <button type="button" ${disabledAttr} data-action="progress" data-id="${escapeHtml(item.id)}" data-date="${escapeHtml(dateRef)}" data-step-code="${escapeHtml(step.code)}" data-patient="${escapeHtml(patientNameText)}" title="${escapeHtml(title)}" class="progress-step ${stepStateClass}">
                                <span class="progress-step-icon ${completed ? 'completed' : ''}"><i class="ph ${completed ? 'ph-check' : step.icon}"></i></span>
                                <span class="progress-step-label">${escapeHtml(step.label)}</span>
                                ${timestamp ? `<span class="progress-step-time">${escapeHtml(timestamp)}</span>` : ''}
                            </button>
                        </div>`;
                }).join('');

                actionButtons = `
                <div class="mt-1 pt-1.5 border-t border-textMain/5 flex flex-col gap-2 pointer-events-auto relative z-20">
                    <div class="monitor-action-row flex items-center gap-1.5">
                        <label class="text-[0.6rem] font-bold text-textMain/40 uppercase tracking-widest whitespace-nowrap">Monitora:</label>
                        <select class="daily-monitor-select flex-1 bg-surface border border-textMain/10 rounded-lg px-2 py-1 text-[0.7rem] font-medium outline-none" data-id="${escapeHtml(item.id)}" data-date="${escapeHtml(dateRef)}">
                            <option value="">Selecionar...</option>
                            ${monitorOptions}
                        </select>
                        <button type="button" data-action="absence" data-id="${escapeHtml(item.id)}" data-date="${escapeHtml(dateRef)}" data-patient="${escapeHtml(patientNameText)}" class="absence-btn ${isCancelled ? 'active' : ''}" title="${isCancelled && item.ausenciaMotivo ? escapeHtml(item.ausenciaMotivo) : 'Registrar que o paciente não irá'}">
                            <i class="ph ph-x-circle"></i> Não irá
                        </button>
                    </div>
                    <div class="progress-line" style="grid-template-columns: repeat(${allowedProgressSteps.length}, minmax(0, 1fr));" aria-label="Progresso do transporte">
                        ${progressHtml}
                    </div>
                </div>`;
            }

            let fullyDone = false;
            if (isCancelled) fullyDone = true;
            else fullyDone = allowedProgressSteps.length > 0 && allowedProgressSteps.every(step => statusParts.includes(step.code));

            const progressAuditItems = allowedProgressSteps
                .filter(step => item[step.timeField])
                .map(step => {
                    const gpsValue = item[step.gpsField] || '';
                    let gpsLink = '';
                    const coords = extractGpsCoordinates(gpsValue) || getAnyGpsCoordinates(item);
                    if (coords) {
                        gpsLink = `<button type="button" data-action="map" data-coords="${escapeHtml(coords)}" class="text-specBlue hover:underline ml-1 inline-flex items-center gap-0.5"><i class="ph ph-map-pin text-xs"></i> Ver Mapa</button>`;
                    }
                    return `<div><span class="text-specGreen font-bold"><i class="ph ${step.icon}"></i> ${escapeHtml(step.label)}:</span> ${escapeHtml(item[step.timeField])} ${gpsLink}</div>`;
                });

            if (isCancelled && item.ausenciaMotivo) {
                let ausenciaGpsLink = '';
                const coords = extractGpsCoordinates(item.ausenciaGps) || getAnyGpsCoordinates(item);
                if (coords) {
                    ausenciaGpsLink = `<button type="button" data-action="map" data-coords="${escapeHtml(coords)}" class="text-specBlue hover:underline ml-1 inline-flex items-center gap-0.5"><i class="ph ph-map-pin text-xs"></i> Ver Mapa</button>`;
                }
                progressAuditItems.push(`<div><span class="text-specRed font-bold"><i class="ph ph-x-circle"></i> Não irá:</span> ${escapeHtml(item.ausenciaMotivo)} <span class="text-textMain/45">${escapeHtml(item.ausenciaTimestamp || '')}</span> ${ausenciaGpsLink}</div>`);
            }

            const auditInfoHtml = progressAuditItems.length
                ? `<div class="mt-1.5 px-2.5 py-2 bg-specBlue/5 border border-specBlue/10 rounded-xl flex flex-col gap-1.5 text-[0.65rem] text-textMain/75 font-semibold relative z-25 pointer-events-auto shadow-sm">${progressAuditItems.join('')}</div>`
                : '';
            const card = document.createElement('div');
            card.className = 'agenda-card transition-all duration-300 ' + cardOpacity;
            card.dataset.id = item.id;
            card.dataset.inicio = item.inicio || '';
            card.dataset.cancelled = isCancelled ? 'true' : 'false';
            card.dataset.fullydone = fullyDone ? 'true' : 'false';
            card.innerHTML = `
                <div class="turno-pill ${pillClass}"></div>
                <div class="card-header flex items-start justify-between gap-2">
                    <div>
                        <div class="flex items-center gap-1.5 mb-0.5">
                            <div class="font-display font-bold text-specBlue text-[0.6rem] bg-specBlue/10 px-1.5 py-0.5 rounded-md">
                                <i class="ph ph-clock mr-1"></i>
                                ${inicioHtml} às ${terminoHtml}
                            </div>
                            <span class="text-[0.55rem] font-bold text-textMain/50 uppercase tracking-widest">${turnoHtml}</span>
                        </div>
                        <h3 class="patient-name">${patientNameHtml}</h3>
                    </div>
                    <div class="card-actions pointer-events-auto admin-only">
                        <button type="button" class="btn-icon edit pointer-events-auto" data-action="edit" data-id="${escapeHtml(item.id)}">
                            <i class="ph ph-pencil-simple text-lg"></i>
                        </button>
                        <button type="button" class="btn-icon delete pointer-events-auto" data-action="delete" data-id="${escapeHtml(item.id)}">
                            <i class="ph ph-trash text-lg"></i>
                        </button>
                    </div>
                </div>
                
                <div class="card-details">
                    <div class="detail-item">
                        <span class="detail-label">Profissional & Atendimento</span>
                        <span class="detail-value">
                            <div class="w-5 h-5 rounded-full bg-specPurple/10 shadow-sm flex items-center justify-center text-specPurple"><i class="ph ph-user"></i></div>
                            ${profissionalHtml} &bull; ${tipoHtml}
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Data</span>
                        <span class="detail-value"><i class="ph ph-calendar-blank text-textMain/50 text-base"></i> ${diaHtml} (${item.data})</span>
                    </div>
                    ${item.escola ? `
                    <div class="detail-item">
                        <span class="detail-label">Instituição</span>
                        <span class="detail-value"><i class="ph ph-buildings text-textMain/50 text-base"></i> ${escolaHtml}</span>
                    </div>` : ''}
                </div>

                <div class="flex justify-between items-center mt-0.5 gap-2">
                    <div class="flex gap-1.5 flex-wrap">
                        <span class="badge"><i class="ph ph-bus text-specGreen"></i> ${trType === 'Entrada' ? 'Somente Entrada' : (fixTextEncoding(trType) === 'Saída' ? 'Somente Saída' : 'Ida e Volta')}</span>
                        ${item.obs ? `<span class="badge bg-specYellow/10 text-specYellow"><i class="ph ph-info"></i> ${obsHtml}</span>` : ''}
                    </div>
                    ${!isCancelled ? `<a href="${wppLink}" target="_blank" class="whatsapp-link relative z-20 pointer-events-auto"><i class="ph ph-whatsapp-logo text-xl"></i> Contatar</a>` : ''}
                </div>
                ${actionButtons}
                ${auditInfoHtml}
            `;
            DOM.agendaList.appendChild(card);
        });
    }

    // ---- Date Specific Actions ----
    window.confirmProgressChange = (id, dateStr, stepCode, patientName) => {
        const step = getProgressStep(stepCode);
        if (!step) return;

        showConfirmationModal({
            title: step.label,
            message: `Deseja registrar "${step.label}" para ${patientName}? A localização, data e hora serão salvas.`,
            iconClass: step.icon,
            colorClass: 'bg-specGreen/10 text-specGreen',
            onConfirm: () => window.toggleProgressStatus(id, dateStr, stepCode)
        });
    };

    window.toggleProgressStatus = async (id, dateStr, stepCode) => {
        const step = getProgressStep(stepCode);
        const itemIdx = appointments.findIndex(a => String(a.id) === String(id));
        if (!step || itemIdx === -1) return;

        const item = appointments[itemIdx];
        const previousItem = { ...item };
        let parts = getStatusParts(item.status).filter(part => part !== 'CANCELADO' && part !== 'ENTRADA' && part !== 'SAIDA');
        const alreadyCompleted = parts.includes(stepCode);

        if (alreadyCompleted) {
            parts = parts.filter(part => part !== stepCode);
            item[step.timeField] = '';
            item[step.gpsField] = '';
        } else {
            parts.push(stepCode);
        }

        item.status = parts.join(',');
        const formattedTimestamp = new Date().toLocaleString('pt-BR');

        const applyGpsAndSave = async (lat = '', lng = '', accuracy = '') => {
            if (!alreadyCompleted) {
                item[step.timeField] = formattedTimestamp;
                const fallbackCoords = getAnyGpsCoordinates(item);
                if (lat && lng && extractGpsCoordinates(`${lat},${lng}`)) {
                    item[step.gpsField] = `${lat},${lng} (Precisão: ${accuracy}m)`;
                } else if (fallbackCoords) {
                    item[step.gpsField] = `${fallbackCoords} (GPS anterior)`;
                } else {
                    item[step.gpsField] = 'Sem GPS';
                }
            }

            localStorage.setItem('lumina_agenda_cache', JSON.stringify(appointments));
            render();

            try {
                await supabaseUpdateAppointment(item);
            } catch (e) {
                console.error('Erro ao salvar progresso diário:', e);
                appointments[itemIdx] = previousItem;
                localStorage.setItem('lumina_agenda_cache', JSON.stringify(appointments));
                render();
                showToast(`Falha no Supabase: ${e.message}`, 'error');
            }
        };

        if (!alreadyCompleted && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude.toFixed(6);
                    const lng = position.coords.longitude.toFixed(6);
                    const accuracy = position.coords.accuracy.toFixed(0);
                    applyGpsAndSave(lat, lng, accuracy);
                },
                (error) => {
                    console.warn('GPS indisponível ou recusado:', error.message);
                    let label = 'GPS Indisponível';
                    if (error.code === error.PERMISSION_DENIED) {
                        label = 'GPS Não Autorizado';
                    }
                    applyGpsAndSave(label, label, '0');
                },
                { enableHighAccuracy: true, timeout: 6000 }
            );
        } else {
            applyGpsAndSave();
        }
    };

    window.confirmAbsence = async (id, dateStr, patientName) => {
        const itemIdx = appointments.findIndex(a => String(a.id) === String(id));
        if (itemIdx === -1) return;

        const item = appointments[itemIdx];
        if (item.status === 'CANCELADO') {
            if (!confirm(`Reverter ausência de ${patientName}?`)) return;

            const previousItem = { ...item };
            item.status = '';
            item.ausenciaMotivo = '';
            item.ausenciaTimestamp = '';
            item.ausenciaGps = '';
            localStorage.setItem('lumina_agenda_cache', JSON.stringify(appointments));
            render();

            try {
                await supabaseUpdateAppointment(item);
                showToast('Ausência revertida.');
            } catch(e) {
                console.error('Erro ao reverter ausência:', e);
                appointments[itemIdx] = previousItem;
                localStorage.setItem('lumina_agenda_cache', JSON.stringify(appointments));
                render();
                showToast(`Falha no Supabase: ${e.message}`, 'error');
            }
            return;
        }

        const previousReason = item.ausenciaMotivo || '';
        const reason = prompt(`Informe o motivo da ausência de ${patientName}:`, previousReason);
        if (reason === null) return;

        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            showToast('Informe uma justificativa para registrar a ausência.', 'error');
            return;
        }

        const previousItem = { ...item };
        const parts = getStatusParts(item.status).filter(part => !PROGRESS_STEPS.some(step => step.code === part));
        if (!parts.includes('CANCELADO')) parts.push('CANCELADO');

        item.status = parts.join(',');
        item.ausenciaMotivo = trimmedReason;
        item.ausenciaTimestamp = new Date().toLocaleString('pt-BR');
        PROGRESS_STEPS.forEach(step => {
            item[step.timeField] = '';
            item[step.gpsField] = '';
        });

        const saveAbsence = async (lat = '', lng = '', accuracy = '') => {
            item.ausenciaGps = lat && lng ? `${lat},${lng} (Precisão: ${accuracy}m)` : 'Sem GPS';
            localStorage.setItem('lumina_agenda_cache', JSON.stringify(appointments));
            render();

            try {
                await supabaseUpdateAppointment(item);
                showToast('Ausência registrada.');
            } catch(e) {
                console.error('Erro ao registrar ausência:', e);
                appointments[itemIdx] = previousItem;
                localStorage.setItem('lumina_agenda_cache', JSON.stringify(appointments));
                render();
                showToast(`Falha no Supabase: ${e.message}`, 'error');
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude.toFixed(6);
                    const lng = position.coords.longitude.toFixed(6);
                    const accuracy = position.coords.accuracy.toFixed(0);
                    saveAbsence(lat, lng, accuracy);
                },
                (error) => {
                    console.warn('GPS indisponível ou recusado:', error.message);
                    let label = 'GPS Indisponível';
                    if (error.code === error.PERMISSION_DENIED) label = 'GPS Não Autorizado';
                    saveAbsence(label, label, '0');
                },
                { enableHighAccuracy: true, timeout: 6000 }
            );
        } else {
            saveAbsence();
        }
    };

    window.updateDailyMonitor = async (id, dateStr, monitorName) => {
        const itemIdx = appointments.findIndex(a => String(a.id) === String(id));
        if (itemIdx === -1) return;
        
        const item = appointments[itemIdx];
        const previousItem = { ...item };
        
        item.monitora = monitorName;
        
        // OPTIMISTIC SAVE
        localStorage.setItem('lumina_agenda_cache', JSON.stringify(appointments));
        render();
        
        try {
            await supabaseUpdateAppointment(item);
        } catch (e) {
            console.error("Erro ao salvar monitora:", e);
            appointments[itemIdx] = previousItem;
            localStorage.setItem('lumina_agenda_cache', JSON.stringify(appointments));
            render();
            showToast('Erro ao atualizar monitora na Nuvem.', 'error');
        }
    };

    // ---- Monitors Management Logic ----
    const btnManageMonitors = document.getElementById('btnManageMonitors');
    const monitorsModalOverlay = document.getElementById('monitorsModalOverlay');
    const monitorsModal = document.getElementById('monitorsModal');
    const btnCloseMonitors = document.getElementById('btnCloseMonitors');
    const btnSaveMonitors = document.getElementById('btnSaveMonitors');
    const btnAddMonitor = document.getElementById('btnAddMonitor');
    const newMonitorNameInput = document.getElementById('newMonitorName');
    const monitorsListContainer = document.getElementById('monitorsList');

    function openMonitorsModal() {
        if (!requireAdmin('gerenciar monitoras')) return;
        renderMonitorsList();
        monitorsModalOverlay.classList.add('active');
        monitorsModal.classList.add('active');
    }

    function closeMonitorsModal() {
        monitorsModalOverlay.classList.remove('active');
        monitorsModal.classList.remove('active');
        render();
    }

    function renderMonitorsList() {
        monitorsListContainer.innerHTML = '';
        MONITORAS.forEach((m, index) => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between p-3 bg-surface rounded-xl mb-2 group transition-all hover:bg-white hover:shadow-sm';
            const name = document.createElement('span');
            name.className = 'font-medium text-sm text-textMain';
            name.textContent = m;
            const removeButton = document.createElement('button');
            removeButton.className = 'text-textMain/20 hover:text-specRed transition-colors opacity-0 group-hover:opacity-100';
            removeButton.innerHTML = '<i class="ph ph-trash text-lg"></i>';
            removeButton.addEventListener('click', () => window.removeMonitor(index));
            item.appendChild(name);
            item.appendChild(removeButton);
            monitorsListContainer.appendChild(item);
        });
    }

    async function syncMonitorsToCloud() {
        localStorage.setItem('lumina_monitoras', JSON.stringify(MONITORAS));
    }

    window.removeMonitor = async (index) => {
        if (!requireAdmin('remover monitoras')) return;
        const monitorName = MONITORAS[index];

        try {
            await supabaseRequest(`${SUPABASE_TABLES.monitors}?monitora=eq.${encodeURIComponent(monitorName)}`, {
                method: 'DELETE',
                headers: { Prefer: 'return=minimal' }
            });
        } catch(e) {
            console.error(e);
            alert('Não foi possível remover a monitora no Supabase.');
            return;
        }

        MONITORAS.splice(index, 1);
        renderMonitorsList();
        syncMonitorsToCloud();
    };

    btnAddMonitor.addEventListener('click', async () => {
        if (!requireAdmin('adicionar monitoras')) return;
        const name = newMonitorNameInput.value.trim();
        if (name && !MONITORAS.includes(name)) {
            const newId = Date.now().toString();

            try {
                await supabaseRequest(`${SUPABASE_TABLES.monitors}`, {
                    method: 'POST',
                    headers: { Prefer: 'return=minimal' },
                    body: JSON.stringify({ id: newId, monitora: name })
                });
            } catch(e) {
                console.error(e);
                alert('Não foi possível adicionar a monitora no Supabase.');
                return;
            }

            MONITORAS.push(name);
            newMonitorNameInput.value = '';
            renderMonitorsList();
            syncMonitorsToCloud();
        }
    });
    if (btnManageMonitors) btnManageMonitors.addEventListener('click', openMonitorsModal);
    const btnManageMonitorsMobile = document.getElementById('btnManageMonitorsMobile');
    if (btnManageMonitorsMobile) btnManageMonitorsMobile.addEventListener('click', openMonitorsModal);
    
    if (btnCloseMonitors) btnCloseMonitors.addEventListener('click', closeMonitorsModal);
    if (btnSaveMonitors) btnSaveMonitors.addEventListener('click', closeMonitorsModal);
    monitorsModalOverlay.addEventListener('click', (e) => {
        if (e.target.id === 'monitorsModalOverlay') closeMonitorsModal();
    });

    // ---- Live Clock & Auto-Scroll ----
    const liveClockEl = document.getElementById('liveClock');
    let lastScrolledTimeStr = '';
    
    function updateClockAndScroll() {
        if (!liveClockEl) return;
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const timeStr = `${hh}:${mm}`;
        liveClockEl.textContent = timeStr;

        const fDataVal = DOM.fData ? DOM.fData.value : null;
        const tzOffset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 10);
        
        if (fDataVal !== localISOTime) return;
        
        if (timeStr !== lastScrolledTimeStr) {
            lastScrolledTimeStr = timeStr;
            highlightAndScrollCards(timeStr);
        }
    }
    
    let initialScrollDone = false;
    function highlightAndScrollCards(currentTimeStr) {
        const cards = document.querySelectorAll('.agenda-card');
        if (cards.length === 0) return;
        
        let targetCard = null;
        let minDiff = Infinity;
        
        cards.forEach(card => {
            const cardInicio = card.dataset.inicio;
            const isFullyDone = card.dataset.fullydone === 'true';
            
            if (!cardInicio || cardInicio.indexOf(':') === -1) return;
            
            if (isFullyDone) {
                if (!card.classList.contains('opacity-40')) {
                    card.classList.add('opacity-50');
                }
                card.classList.remove('ring-2', 'ring-specBlue', 'shadow-atmospheric-hover', 'scale-[1.02]');
            } else {
                card.classList.remove('opacity-50');
                
                const [cardH, cardM] = cardInicio.split(':').map(Number);
                const [curH, curM] = currentTimeStr.split(':').map(Number);
                const diffMins = (cardH * 60 + cardM) - (curH * 60 + curM);
                
                if (diffMins >= 0 && diffMins < minDiff) {
                    minDiff = diffMins;
                    targetCard = card;
                }
            }
        });
        
        if (targetCard) {
            cards.forEach(c => c.classList.remove('ring-2', 'ring-specBlue', 'shadow-atmospheric-hover', 'scale-[1.02]', 'border-transparent'));
            
            targetCard.classList.add('ring-2', 'ring-specBlue', 'shadow-atmospheric-hover', 'scale-[1.02]', 'border-transparent');
            
            if (!initialScrollDone) {
                const container = DOM.agendaList.parentElement;
                const cardTop = targetCard.offsetTop;
                
                container.scrollTo({
                    top: cardTop - 20, 
                    behavior: 'smooth'
                });
                initialScrollDone = true;
            }
        }
    }

    setInterval(updateClockAndScroll, 1000);

    // Init
    loadData(false);
    loadMonitors();
    setTimeout(updateClockAndScroll, 500);
    
    // Auto-sync em tempo real (Background polling a cada 5 segundos)
    setInterval(() => {
        if (isBackgroundSyncPaused()) return;
        loadData(true);
        loadMonitors(true);
    }, 5000);

    // Sincronizar IMEDIATAMENTE ao voltar para o app (útil no celular)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            if (isBackgroundSyncPaused()) return;
            loadData(true);
            loadMonitors(true);
        }
    });

    if (location.protocol !== 'file:' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations()
            .then((registrations) => registrations.forEach((registration) => registration.unregister()))
            .catch((error) => console.warn('Service worker indisponível:', error));
    }
});
