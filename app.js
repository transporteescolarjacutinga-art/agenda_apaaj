document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM Elements ----
    const DOM = {
        agendaList: document.getElementById('agendaList'),
        btnNewMobile: document.getElementById('navBtnNew'),
        drawer: document.getElementById('drawer'),
        drawerOverlay: document.getElementById('drawerOverlay'),
        btnCloseDrawer: document.getElementById('closeDrawer'),
        drawerTitle: document.getElementById('drawerTitle'),
        form: document.getElementById('appointmentForm'),
        editScopeGroup: document.getElementById('editScopeGroup'),
        editScope: document.getElementById('editScope'),
        excelImportInput: document.getElementById('excelImportInput'),
        
        fData: document.getElementById('filterDataRef'),
        fProf: document.getElementById('filterProfissional'),
        fTurno: document.getElementById('filterTurno'),
        fEscola: document.getElementById('filterEscola'),
        fPaciente: document.getElementById('filterPaciente'),
        displayDateLabel: document.getElementById('displayDateLabel'),
        btnClearFilters: document.getElementById('btnClearFilters'),
        
        confirmModalOverlay: document.getElementById('confirmModalOverlay'),
        confirmModal: document.getElementById('confirmModal'),
        btnConfirmOk: document.getElementById('btnConfirmOk'),
        btnConfirmCancel: document.getElementById('btnConfirmCancel'),

        // Modal de Auditoria GPS Timeline
        gpsModalOverlay: document.getElementById('gpsModalOverlay'),
        gpsModal: document.getElementById('gpsModal'),
        btnCloseGpsModal: document.getElementById('btnCloseGpsModal'),
        btnDismissGpsModal: document.getElementById('btnDismissGpsModal'),
        gpsModalAvatar: document.getElementById('gpsModalAvatar'),
        gpsModalPatient: document.getElementById('gpsModalPatient'),
        gpsModalDate: document.getElementById('gpsModalDate'),
        gpsModalStatusBadge: document.getElementById('gpsModalStatusBadge'),
        gpsModalBody: document.getElementById('gpsModalBody'),

        reportStartDate: document.getElementById('reportStartDate'),
        reportEndDate: document.getElementById('reportEndDate'),
        btnGenerateReport: document.getElementById('btnGenerateReport'),

        dashTotal: document.getElementById('dashTotal'),
        dashMorning: document.getElementById('dashMorning'),
        dashAfternoon: document.getElementById('dashAfternoon'),
        dashSchools: document.getElementById('dashSchools'),
        dashSchoolsCount: document.getElementById('dashSchoolsCount'),
        dashTotalCard: document.getElementById('dashTotalCard'),
        dashMorningCard: document.getElementById('dashMorningCard'),
        dashAfternoonCard: document.getElementById('dashAfternoonCard'),

        // Tab Navigation
        navAgenda: document.getElementById('navBtnAgenda'),
        navMonitors: document.getElementById('navBtnMonitors'),
        navMetrics: document.getElementById('navBtnMetrics'),
        navReports: document.getElementById('navBtnReports'),

        tabAgenda: document.getElementById('tabAgenda'),
        tabMonitors: document.getElementById('tabMonitors'),
        tabMetrics: document.getElementById('tabMetrics'),
        tabReports: document.getElementById('tabReports')
    };

    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        const icon = type === 'error' ? 'ph-warning-circle' : type === 'info' ? 'ph-info' : 'ph-check-circle';
        const colorClass = type === 'error' ? 'var(--tea-red)' : type === 'info' ? 'var(--tea-blue)' : 'var(--tea-green)';
        toast.className = 'agenda-card';
        toast.style.cssText = `position: fixed; top: 16px; right: 16px; z-index: 200; padding: 10px 14px; border-left: 4px solid ${colorClass}; box-shadow: var(--shadow-sheet); animation: slideIn 0.3s ease;`;
        toast.innerHTML = `<div class="flex items-center gap-2 font-bold" style="font-size:0.85rem;"><i class="ph ${icon} text-lg" style="color:${colorClass};"></i><span>${message}</span></div>`;
        container.appendChild(toast);

        setTimeout(() => toast.remove(), 3200);
    }

    // ---- Sistema de Captura de Geolocalização (GPS) ----
    function captureGeolocation() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve('');
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude.toFixed(6);
                    const lng = pos.coords.longitude.toFixed(6);
                    resolve(`${lat},${lng}`);
                },
                (err) => {
                    console.warn('Geolocation capture failed/denied:', err);
                    resolve('');
                },
                { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
            );
        });
    }

    function getInitials(name = '') {
        const parts = name.trim().split(/\s+/);
        if (parts.length === 0 || !parts[0]) return 'N';
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    
    function isAdmin() {
        return sessionStorage.getItem('isAdmin') === 'true';
    }

    const fixTextEncoding = (value) => {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/ÃƒÂ§/g, 'ç').replace(/ÃƒÂ£/g, 'ã').replace(/ÃƒÂ¡/g, 'á')
            .replace(/ÃƒÂ©/g, 'é').replace(/ÃƒÂª/g, 'ê').replace(/ÃƒÂ­/g, 'í')
            .replace(/ÃƒÂ³/g, 'ó').replace(/ÃƒÂ´/g, 'ô').replace(/ÃƒÂº/g, 'ú')
            .replace(/Ã§/g, 'ç').replace(/Ã£/g, 'ã').replace(/Ã¡/g, 'á')
            .replace(/Ã©/g, 'é').replace(/Ãª/g, 'ê').replace(/Ã­/g, 'í')
            .replace(/Ã³/g, 'ó').replace(/Ã´/g, 'ô').replace(/Ãº/g, 'ú')
            .replace(/Â/g, '');
    };

    const escapeHtml = (value) => fixTextEncoding(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));

    const parseJsonSafe = (value, fallback = {}) => {
        try { return JSON.parse(value || '{}'); } catch(e) { return fallback; }
    };

    const getWeekdayFromISO = (dateValue) => {
        if (!dateValue) return '';
        const [y, m, d] = dateValue.split('-');
        const parsedDate = new Date(y, m - 1, d);
        const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        return weekdays[parsedDate.getDay()] || '';
    };

    const formatDateBR = (dateValue) => {
        if (!dateValue) return '';
        const fixed = fixTextEncoding(dateValue);
        const isoMatch = fixed.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
        return fixed;
    };

    const ADMIN_PASSCODE_HASH = '158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab';
    const ADMIN_PASSCODE_FALLBACK_HASH = '143b42d57035cd';

    function fallbackHash(value, seed = 0) {
        let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
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
            const hash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
            return hash === ADMIN_PASSCODE_HASH;
        }
        return fallbackHash(value) === ADMIN_PASSCODE_FALLBACK_HASH;
    }

    const isAdminMode = () => !document.body.classList.contains('viewer-mode');

    const requireAdmin = (actionName = 'esta ação') => {
        if (isAdminMode()) return true;
        alert(`Acesso restrito: faça login como coordenador para ${actionName}.`);
        return false;
    };

    const normalizeWhatsappPhone = (phoneValue) => {
        const digits = String(phoneValue || '').replace(/\D/g, '');
        if (!digits) return '';
        if (digits.startsWith('55')) return digits;
        return `55${digits}`;
    };

    const PROGRESS_STEPS = [
        { code: 'BUSCADO_ESCOLA', label: 'Escola', icon: 'ph-buildings', gpsField: 'gpsBuscadoEscola', timeField: 'timestampBuscadoEscola' },
        { code: 'ENTREGUE_ONG', label: 'ONG', icon: 'ph-house-line', gpsField: 'gpsEntregueOng', timeField: 'timestampEntregueOng' },
        { code: 'SAIDA_ONG', label: 'Saída', icon: 'ph-sign-out', gpsField: 'gpsSaidaOng', timeField: 'timestampSaidaOng' },
        { code: 'DEVOLVIDO_ESCOLA', label: 'Devolvido', icon: 'ph-graduation-cap', gpsField: 'gpsDevolvidoEscola', timeField: 'timestampDevolvidoEscola' }
    ];

    function getStatusParts(status) {
        return String(status || '').split(',').map(part => part.trim()).filter(Boolean);
    }

    function normalizeTurnoLabel(value, inicioValue = '') {
        const raw = fixTextEncoding(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        if (raw.includes('tarde')) return 'Tarde';
        if (raw.includes('manha') || raw.includes('mana') || raw.includes('manh')) return 'Manhã';
        const hourMatch = String(inicioValue || '').match(/\d{1,2}/);
        const hour = hourMatch ? parseInt(hourMatch[0], 10) : NaN;
        if (!Number.isNaN(hour)) return hour >= 13 ? 'Tarde' : 'Manhã';
        return '';
    }

    function normalizeFilterText(value) {
        return fixTextEncoding(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
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

    // ---- Init Filters & Date ----
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);
    if(DOM.fData) DOM.fData.value = localISOTime;

    let lastUserInteractionAt = 0;
    function markUserInteraction() { lastUserInteractionAt = Date.now(); }
    function isBackgroundSyncPaused() {
        const activeTag = document.activeElement?.tagName;
        const userTouched = Date.now() - lastUserInteractionAt < 12000;
        const formFocused = ['INPUT', 'SELECT', 'TEXTAREA'].includes(activeTag);
        const modalOpen = DOM.confirmModalOverlay?.classList.contains('active') || DOM.gpsModalOverlay?.classList.contains('active');
        const sheetOpen = DOM.drawer?.classList.contains('active');
        return userTouched || formFocused || modalOpen || sheetOpen;
    }

    ['pointerdown', 'touchstart', 'focusin', 'input', 'change'].forEach(evt => {
        document.addEventListener(evt, markUserInteraction, { capture: true, passive: true });
    });

    // ---- Data Management (Supabase REST API) ----
    const SUPABASE_URL = "https://ymgmlvrbydmxfnkeopra.supabase.co";
    const SUPABASE_KEY = "sb_publishable_iKPcSA5NVhhl--V35OP2cQ_ax2zvrob";
    const SUPABASE_TABLES = { appointments: 'appointments', monitors: 'monitors' };
    let appointments = [];
    const DEFAULT_MONITORAS = ["Vanessa", "Luciana", "Eliane", "Nenhuma"];
    let MONITORAS = parseJsonSafe(localStorage.getItem('lumina_monitoras'), null);
    if (!Array.isArray(MONITORAS) || MONITORAS.length === 0) MONITORAS = [...DEFAULT_MONITORAS];

    const supabaseHeaders = (extra = {}) => ({
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        ...extra
    });

    async function supabaseRequest(path, options = {}) {
        let response;
        try {
            response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
                mode: 'cors', cache: 'no-store', ...options,
                headers: supabaseHeaders(options.headers || {})
            });
        } catch(e) {
            throw new Error(`Sem conexão com o servidor Supabase.`);
        }
        const rawText = await response.text();
        let result = rawText ? parseJsonSafe(rawText, rawText) : null;
        if (!response.ok) throw new Error(result?.message || `Erro ${response.status}`);
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
            monitora: fixTextEncoding(item.monitora),
            gps_buscado_escola: item.gpsBuscadoEscola ?? item.gps_buscado_escola ?? '',
            timestamp_buscado_escola: item.timestampBuscadoEscola ?? item.timestamp_buscado_escola ?? '',
            gps_entregue_ong: item.gpsEntregueOng ?? item.gps_entregue_ong ?? '',
            timestamp_entregue_ong: item.timestampEntregueOng ?? item.timestamp_entregue_ong ?? '',
            gps_saida_ong: item.gpsSaidaOng ?? item.gps_saida_ong ?? '',
            timestamp_saida_ong: item.timestampSaidaOng ?? item.timestamp_saida_ong ?? '',
            gps_devolvido_escola: item.gpsDevolvidoEscola ?? item.gps_devolvido_escola ?? '',
            timestamp_devolvido_escola: item.timestampDevolvidoEscola ?? item.timestamp_devolvido_escola ?? '',
            ausencia_motivo: item.ausenciaMotivo ?? item.ausencia_motivo ?? '',
            ausencia_timestamp: item.ausenciaTimestamp ?? item.ausencia_timestamp ?? '',
            ausencia_gps: item.ausenciaGps ?? item.ausencia_gps ?? ''
        };
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
        return supabaseRequest(`${SUPABASE_TABLES.appointments}`, {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
            body: JSON.stringify(records.map(toSupabaseAppointment))
        });
    }

    async function supabaseUpdateAppointment(record) {
        return supabaseRequest(`${SUPABASE_TABLES.appointments}?on_conflict=id`, {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify(toSupabaseAppointment(record))
        });
    }

    async function supabaseDeleteRecurringAppointments(paciente, dia, inicio) {
        const query = `paciente=eq.${encodeURIComponent(paciente)}&dia=eq.${encodeURIComponent(dia)}&inicio=eq.${encodeURIComponent(inicio)}`;
        return supabaseRequest(`${SUPABASE_TABLES.appointments}?${query}`, {
            method: 'DELETE', headers: { Prefer: 'return=minimal' }
        });
    }

    // ---- MOTOR DE PROJEÇÃO RECORRENTE PERPÉTUA (TEA SCHEDULER ENGINE) ----
    function getAppointmentsForDate(dateRef) {
        if (!dateRef) return appointments;

        const targetWeekday = getWeekdayFromISO(dateRef);
        const exactMatches = new Map();
        const templatesByKey = new Map();

        appointments.forEach(a => {
            const aWeekday = a.dia || getWeekdayFromISO(a.data);
            const key = `${normalizeFilterText(a.paciente)}|${normalizeFilterText(aWeekday)}|${a.inicio}|${normalizeFilterText(a.profissional)}`;

            if (a.data === dateRef) exactMatches.set(key, a);

            if (!templatesByKey.has(key)) {
                templatesByKey.set(key, a);
            } else {
                const existing = templatesByKey.get(key);
                if (a.data && existing.data && a.data < existing.data) {
                    templatesByKey.set(key, a);
                }
            }
        });

        const result = [];
        const processedKeys = new Set();

        exactMatches.forEach((record, key) => {
            result.push(record);
            processedKeys.add(key);
        });

        templatesByKey.forEach((template, key) => {
            if (processedKeys.has(key)) return;

            const tWeekday = template.dia || getWeekdayFromISO(template.data);
            if (tWeekday !== targetWeekday) return;

            const startDate = template.data || template.dataInicio;
            if (startDate && dateRef < startDate) return;

            result.push({
                ...template,
                id: template.id.includes(dateRef) ? template.id : `proj_${template.id}_${dateRef}`,
                data: dateRef,
                dia: targetWeekday,
                status: '', monitora: '',
                gpsBuscadoEscola: '', timestampBuscadoEscola: '',
                gpsEntregueOng: '', timestampEntregueOng: '',
                gpsSaidaOng: '', timestampSaidaOng: '',
                gpsDevolvidoEscola: '', timestampDevolvidoEscola: '',
                ausenciaMotivo: '', ausenciaTimestamp: '', ausenciaGps: '',
                isProjected: true, baseId: template.id
            });
        });

        return result;
    }

    function ensureConcreteRecord(item, dateStr) {
        let concrete = appointments.find(a => String(a.id) === String(item.id) || (a.data === dateStr && normalizeFilterText(a.paciente) === normalizeFilterText(item.paciente) && a.inicio === item.inicio));

        if (!concrete) {
            concrete = {
                ...item,
                id: item.id.includes(dateStr) ? item.id : `${item.baseId || item.id}_${dateStr}`,
                data: dateStr,
                isProjected: false
            };
            appointments.push(concrete);
        }
        return concrete;
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
            DOM.agendaList.innerHTML = '<div class="py-12 flex flex-col items-center justify-center text-tea-blue font-bold gap-3"><i class="ph ph-spinner-gap animate-spin text-4xl"></i><div>Sincronizando agendamentos...</div></div>';
        }

        try {
            if (!navigator.onLine) return;
            const data = await supabaseRequest(`${SUPABASE_TABLES.appointments}?select=*&order=data.asc&order=inicio.asc`, { method: 'GET' });
            const newData = Array.isArray(data) ? data.map(fromSupabaseAppointment) : [];

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
            if (!silent) console.error('Supabase error:', e);
        }
    }

    async function loadMonitors(silent = false) {
        try {
            const data = await supabaseRequest(`${SUPABASE_TABLES.monitors}?select=*&order=monitora.asc`, { method: 'GET' });
            if (Array.isArray(data)) {
                const names = data.map(m => m.monitora || m.Monitora || m.name).filter(Boolean);
                if (names.length > 0) {
                    MONITORAS = names;
                    localStorage.setItem('lumina_monitoras', JSON.stringify(MONITORAS));
                    renderMonitorsList();
                    if (!silent) render();
                }
            }
        } catch(e) {}
    }

    // ---- Control de Abas (Mobile Bottom Nav) ----
    function switchTab(tabName) {
        const tabs = {
            agenda: { btn: DOM.navAgenda, tab: DOM.tabAgenda },
            monitors: { btn: DOM.navMonitors, tab: DOM.tabMonitors },
            metrics: { btn: DOM.navMetrics, tab: DOM.tabMetrics },
            reports: { btn: DOM.navReports, tab: DOM.tabReports }
        };

        Object.values(tabs).forEach(t => {
            if (t.btn) t.btn.classList.remove('active');
            if (t.tab) t.tab.classList.remove('active');
        });

        if (tabs[tabName]) {
            if (tabs[tabName].btn) tabs[tabName].btn.classList.add('active');
            if (tabs[tabName].tab) tabs[tabName].tab.classList.add('active');
        }
    }

    if (DOM.navAgenda) DOM.navAgenda.addEventListener('click', () => switchTab('agenda'));
    if (DOM.navMonitors) DOM.navMonitors.addEventListener('click', () => switchTab('monitors'));
    if (DOM.navMetrics) DOM.navMetrics.addEventListener('click', () => switchTab('metrics'));
    if (DOM.navReports) DOM.navReports.addEventListener('click', () => switchTab('reports'));

    // ---- Drawer / Bottom Sheet Form ----
    function openDrawer(mode = 'create', id = null) {
        if (!requireAdmin(mode === 'edit' ? 'editar agendamentos' : 'criar agendamentos')) return;

        DOM.drawerOverlay.classList.add('active');
        DOM.drawer.classList.add('active');
        DOM.form.reset();
        document.getElementById('formId').value = '';
        if (DOM.editScopeGroup) DOM.editScopeGroup.classList.add('hidden');

        if (mode === 'edit' && id) {
            DOM.drawerTitle.textContent = 'Editar Agendamento';
            const { dateRef } = getDateFilterInfo();
            const currentList = getAppointmentsForDate(dateRef);
            const item = currentList.find(a => String(a.id) === String(id));
            if(item) {
                if (DOM.editScopeGroup) DOM.editScopeGroup.classList.remove('hidden');
                document.getElementById('formId').value = item.id;
                document.getElementById('formProfissional').value = item.profissional || '';
                document.getElementById('formTipo').value = item.tipo || '';
                document.getElementById('formPaciente').value = item.paciente || '';
                if (document.getElementById('formDataInicio')) document.getElementById('formDataInicio').value = item.data || localISOTime;
                document.getElementById('formInicio').value = item.inicio || '';
                document.getElementById('formTermino').value = item.termino || '';
                document.getElementById('formEscola').value = item.escola || '';
                document.getElementById('formTelefone').value = item.telefone || '';
                if (document.getElementById('formTransporte')) document.getElementById('formTransporte').value = item.transporte || 'Ambos';
                document.getElementById('formObs').value = item.obs || '';
            }
        } else {
            DOM.drawerTitle.textContent = 'Novo Agendamento TEA';
            if (document.getElementById('formDataInicio')) document.getElementById('formDataInicio').value = DOM.fData?.value || localISOTime;
        }
    }

    function closeDrawer() {
        DOM.drawerOverlay.classList.remove('active');
        DOM.drawer.classList.remove('active');
    }

    if (DOM.btnNewMobile) DOM.btnNewMobile.addEventListener('click', () => openDrawer('create'));
    if (DOM.btnCloseDrawer) DOM.btnCloseDrawer.addEventListener('click', closeDrawer);
    if (DOM.drawerOverlay) DOM.drawerOverlay.addEventListener('click', closeDrawer);

    // ---- Confirmation Modal ----
    let currentConfirmationAction = null;

    function showConfirmationModal({ title, message, iconClass, colorStyle, onConfirm }) {
        const titleEl = document.getElementById('confirmModalTitle');
        const messageEl = document.getElementById('confirmModalMessage');
        const iconContainer = document.getElementById('confirmModalIcon');

        titleEl.textContent = title;
        messageEl.innerHTML = message;
        iconContainer.innerHTML = `<i class="ph ${iconClass}"></i>`;
        
        currentConfirmationAction = onConfirm;
        DOM.confirmModalOverlay.classList.add('active');
        DOM.confirmModal.classList.add('active');
    }

    function closeConfirmationModal() {
        DOM.confirmModalOverlay.classList.remove('active');
        DOM.confirmModal.classList.remove('active');
        currentConfirmationAction = null;
    }

    DOM.btnConfirmOk.addEventListener('click', () => {
        if (currentConfirmationAction) currentConfirmationAction();
        closeConfirmationModal();
    });
    DOM.btnConfirmCancel.addEventListener('click', closeConfirmationModal);

    // ---- Modal de Auditoria GPS Timeline ----
    function openGpsAuditModal(item, dateRef) {
        if (!DOM.gpsModal) return;
        DOM.gpsModalAvatar.textContent = getInitials(item.paciente);
        DOM.gpsModalPatient.textContent = item.paciente || 'Paciente';
        DOM.gpsModalDate.textContent = formatDateBR(dateRef);

        const statusParts = getStatusParts(item.status);
        const allowedSteps = getProgressStepsForTransport(item.transporte);
        const isCancelled = item.status === 'CANCELADO';

        if (isCancelled) {
            DOM.gpsModalStatusBadge.textContent = 'Cancelado';
            DOM.gpsModalStatusBadge.className = 'badge-status-chip ausencia';
        } else if (allowedSteps.every(s => statusParts.includes(s.code))) {
            DOM.gpsModalStatusBadge.textContent = 'Concluído';
            DOM.gpsModalStatusBadge.className = 'badge-status-chip';
        } else if (statusParts.length > 0) {
            DOM.gpsModalStatusBadge.textContent = 'Em Transporte';
            DOM.gpsModalStatusBadge.className = 'badge-status-chip';
            DOM.gpsModalStatusBadge.style.background = 'var(--tea-yellow-light)';
            DOM.gpsModalStatusBadge.style.color = 'var(--tea-yellow)';
            DOM.gpsModalStatusBadge.style.borderColor = 'var(--tea-yellow-border)';
        } else {
            DOM.gpsModalStatusBadge.textContent = 'Aguardando';
            DOM.gpsModalStatusBadge.className = 'badge-status-chip';
            DOM.gpsModalStatusBadge.style.background = 'var(--surface-subtle)';
            DOM.gpsModalStatusBadge.style.color = 'var(--text-muted)';
            DOM.gpsModalStatusBadge.style.borderColor = 'var(--border-main)';
        }

        DOM.gpsModalBody.innerHTML = '';

        const trackGroup = document.createElement('div');
        trackGroup.className = 'timeline-track-group';

        let hasTimelineItems = false;

        allowedSteps.forEach(step => {
            const isDone = statusParts.includes(step.code);
            const timeStr = item[step.timeField] || '';
            const gpsStr = item[step.gpsField] || '';
            const mapsUrl = gpsStr ? `https://www.google.com/maps?q=${gpsStr}` : null;

            if (isDone || timeStr) {
                hasTimelineItems = true;
                const stepEl = document.createElement('div');
                stepEl.className = `timeline-step-item ${isDone ? 'completed' : ''}`;
                stepEl.innerHTML = `
                    <div class="timeline-dot"><i class="ph ${isDone ? 'ph-check' : step.icon}"></i></div>
                    <div class="timeline-content-card">
                        <div class="timeline-title-row">
                            <strong><i class="ph ${step.icon} text-tea-blue"></i> ${escapeHtml(step.label)}</strong>
                            ${timeStr ? `<span class="timeline-time-pill"><i class="ph ph-clock"></i> ${escapeHtml(timeStr)}</span>` : ''}
                        </div>
                        ${mapsUrl ? `
                            <a href="${mapsUrl}" target="_blank" class="btn-maps-link">
                                <i class="ph ph-map-pin"></i> Ver Localização no Google Maps
                            </a>
                        ` : `
                            <div class="text-xs font-semibold text-text-muted mt-1">
                                <i class="ph ph-info"></i> Marcação realizada (sem coordenadas GPS).
                            </div>
                        `}
                    </div>
                `;
                trackGroup.appendChild(stepEl);
            }
        });

        if (isCancelled) {
            hasTimelineItems = true;
            const mapsUrl = item.ausenciaGps ? `https://www.google.com/maps?q=${item.ausenciaGps}` : null;
            const absenceEl = document.createElement('div');
            absenceEl.className = 'timeline-step-item ausencia';
            absenceEl.innerHTML = `
                <div class="timeline-dot"><i class="ph ph-ban"></i></div>
                <div class="timeline-content-card" style="border-color: var(--tea-red-border); background: var(--tea-red-light);">
                    <div class="timeline-title-row">
                        <strong style="color: var(--tea-red);"><i class="ph ph-x-circle"></i> Cancelado pelo Usuário</strong>
                        ${item.ausenciaTimestamp ? `<span class="timeline-time-pill" style="background: var(--tea-red); color: #fff;">${escapeHtml(item.ausenciaTimestamp)}</span>` : ''}
                    </div>
                    ${item.ausenciaMotivo ? `<div class="text-xs font-bold" style="color: var(--text-primary);">Motivo: "${escapeHtml(item.ausenciaMotivo)}"</div>` : ''}
                    ${mapsUrl ? `
                        <a href="${mapsUrl}" target="_blank" class="btn-maps-link" style="background: var(--tea-red);">
                            <i class="ph ph-map-pin"></i> Ver Local do Cancelamento no Maps
                        </a>
                    ` : ''}
                </div>
            `;
            trackGroup.appendChild(absenceEl);
        }

        if (hasTimelineItems) {
            DOM.gpsModalBody.appendChild(trackGroup);
        } else {
            DOM.gpsModalBody.innerHTML = '<div class="text-center text-muted font-bold py-8 text-sm">Nenhum evento de transporte registrado.</div>';
        }

        DOM.gpsModalOverlay.classList.add('active');
        DOM.gpsModal.classList.add('active');
    }

    function closeGpsModal() {
        DOM.gpsModalOverlay.classList.remove('active');
        DOM.gpsModal.classList.remove('active');
    }

    if (DOM.btnCloseGpsModal) DOM.btnCloseGpsModal.addEventListener('click', closeGpsModal);
    if (DOM.btnDismissGpsModal) DOM.btnDismissGpsModal.addEventListener('click', closeGpsModal);
    if (DOM.gpsModalOverlay) DOM.gpsModalOverlay.addEventListener('click', closeGpsModal);

    // ---- Form Submission ----
    DOM.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isAdmin()) { showToast('Acesso negado.', 'error'); return; }

        const id = document.getElementById('formId').value;
        const dataInicioVal = document.getElementById('formDataInicio').value || localISOTime;
        const fInicio = document.getElementById('formInicio').value;
        const fTermino = document.getElementById('formTermino').value;

        const pVal = document.getElementById('formProfissional').value;
        const pacVal = document.getElementById('formPaciente').value;
        const tVal = document.getElementById('formTipo').value;
        const escVal = document.getElementById('formEscola').value;
        const telVal = document.getElementById('formTelefone').value;
        const transpVal = document.getElementById('formTransporte') ? document.getElementById('formTransporte').value : 'Ambos';
        const obsVal = document.getElementById('formObs').value;
        const horaInicio = parseInt(fInicio.split(':')[0], 10);
        const turnoCalculado = horaInicio >= 13 ? 'Tarde' : 'Manhã';

        if (id) {
            const { dateRef } = getDateFilterInfo();
            const currentList = getAppointmentsForDate(dateRef);
            const existing = currentList.find(a => String(a.id) === String(id));
            if (existing) {
                const concrete = ensureConcreteRecord(existing, dateRef);
                concrete.profissional = pVal; concrete.tipo = tVal; concrete.paciente = pacVal;
                concrete.turno = turnoCalculado; concrete.inicio = fInicio; concrete.termino = fTermino;
                concrete.escola = escVal; concrete.telefone = telVal; concrete.transporte = transpVal; concrete.obs = obsVal;

                localStorage.setItem('lumina_agenda_cache', JSON.stringify(appointments));
                updateFilterOptions(); render(); closeDrawer();
                await supabaseUpdateAppointment(concrete);
                showToast('Agendamento atualizado!');
            }
        } else {
            const newRecord = {
                id: `${Date.now()}_rec_${Math.random().toString(36).substr(2, 5)}`,
                data: dataInicioVal, profissional: pVal, tipo: tVal, paciente: pacVal,
                dia: getWeekdayFromISO(dataInicioVal), turno: turnoCalculado, inicio: fInicio, termino: fTermino,
                escola: escVal, telefone: telVal, transporte: transpVal, obs: obsVal, status: '', monitora: ''
            };
            appointments.push(newRecord);
            localStorage.setItem('lumina_agenda_cache', JSON.stringify(appointments));
            updateFilterOptions(); render(); closeDrawer();
            showToast('Série recorrente cadastrada!');
            await supabaseCreateAppointments([newRecord]);
        }
    });

    // ---- Date Navigation & Filters ----
    function getDateFilterInfo() {
        const dateRef = DOM.fData ? DOM.fData.value : localISOTime;
        return { dateRef, targetWeekday: getWeekdayFromISO(dateRef) };
    }

    function updateDisplayDateLabel() {
        if (!DOM.displayDateLabel || !DOM.fData) return;
        const [y, m, d] = DOM.fData.value.split('-');
        const dateObj = new Date(y, m - 1, d);
        const weekday = getWeekdayFromISO(DOM.fData.value);
        const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
        DOM.displayDateLabel.textContent = `${weekday}, ${formattedDate}`;
    }

    function shiftDate(days) {
        if (!DOM.fData.value) return;
        const [y, m, d] = DOM.fData.value.split('-');
        const date = new Date(y, m - 1, d);
        date.setDate(date.getDate() + days);
        if (date.getDay() === 0) date.setDate(date.getDate() + (days > 0 ? 1 : -2));
        if (date.getDay() === 6 && days > 0) date.setDate(date.getDate() + 2);
        DOM.fData.value = date.toISOString().split('T')[0];
        updateDisplayDateLabel();
        render();
    }

    const btnPrevDay = document.getElementById('btnPrevDay');
    const btnNextDay = document.getElementById('btnNextDay');
    if (btnPrevDay) btnPrevDay.addEventListener('click', () => shiftDate(-1));
    if (btnNextDay) btnNextDay.addEventListener('click', () => shiftDate(1));
    if (DOM.fData) DOM.fData.addEventListener('change', () => { updateDisplayDateLabel(); render(); });

    // Suporte para abrir o picker de calendário no Desktop ao clicar no filtro de data
    const dateDisplayBox = document.querySelector('.date-display-box');
    const triggerDatePicker = (inputEl) => {
        if (inputEl && typeof inputEl.showPicker === 'function') {
            try {
                inputEl.showPicker();
            } catch (err) {
                console.warn('Erro ao abrir o seletor de data:', err);
            }
        }
    };

    if (dateDisplayBox && DOM.fData) {
        dateDisplayBox.addEventListener('click', () => triggerDatePicker(DOM.fData));
    }

    document.querySelectorAll('input[type="date"]').forEach(input => {
        input.addEventListener('click', () => triggerDatePicker(input));
    });

    // Listeners de Filtro
    function handleFilterChange() {
        updateClearFiltersButton();
        render();
    }

    [DOM.fProf, DOM.fTurno, DOM.fEscola].forEach(el => {
        if (el) el.addEventListener('change', handleFilterChange);
    });

    if (DOM.fPaciente) {
        DOM.fPaciente.addEventListener('input', handleFilterChange);
    }

    function updateClearFiltersButton() {
        if (!DOM.btnClearFilters) return;
        const hasFilter = (DOM.fProf && DOM.fProf.value) || (DOM.fTurno && DOM.fTurno.value) || (DOM.fEscola && DOM.fEscola.value) || (DOM.fPaciente && DOM.fPaciente.value);
        if (hasFilter) {
            DOM.btnClearFilters.classList.remove('hidden');
        } else {
            DOM.btnClearFilters.classList.add('hidden');
        }
    }

    if (DOM.btnClearFilters) {
        DOM.btnClearFilters.addEventListener('click', () => {
            if (DOM.fProf) DOM.fProf.value = '';
            if (DOM.fTurno) DOM.fTurno.value = '';
            if (DOM.fEscola) DOM.fEscola.value = '';
            if (DOM.fPaciente) DOM.fPaciente.value = '';
            handleFilterChange();
        });
    }

    // Filtros rápidos pelos cartões de métrica
    if (DOM.dashTotalCard) {
        DOM.dashTotalCard.addEventListener('click', () => {
            if (DOM.fTurno) DOM.fTurno.value = '';
            if (DOM.fEscola) DOM.fEscola.value = '';
            switchTab('agenda');
            render();
        });
    }
    if (DOM.dashMorningCard) {
        DOM.dashMorningCard.addEventListener('click', () => {
            if (DOM.fTurno) DOM.fTurno.value = DOM.fTurno.value === 'Manhã' ? '' : 'Manhã';
            switchTab('agenda');
            render();
        });
    }
    if (DOM.dashAfternoonCard) {
        DOM.dashAfternoonCard.addEventListener('click', () => {
            if (DOM.fTurno) DOM.fTurno.value = DOM.fTurno.value === 'Tarde' ? '' : 'Tarde';
            switchTab('agenda');
            render();
        });
    }

    function getFilteredAppointments({ ignoreTurno = false, ignoreEscola = false } = {}) {
        const { dateRef } = getDateFilterInfo();
        const baseList = getAppointmentsForDate(dateRef);
        const selectedTurno = normalizeTurnoLabel(DOM.fTurno?.value || '');
        const selectedProfissional = DOM.fProf?.value || '';
        const selectedEscola = DOM.fEscola?.value || '';
        const searchVal = normalizeFilterText(DOM.fPaciente?.value || '');

        return baseList.filter(a => {
            const pMatch = valuesMatchFilter(a.profissional, selectedProfissional);
            const itemTurno = normalizeTurnoLabel(a.turno, a.inicio);
            const tMatch = ignoreTurno || !selectedTurno || itemTurno === selectedTurno;
            const eMatch = ignoreEscola || valuesMatchFilter(a.escola, selectedEscola);
            const pacienteMatch = !searchVal || normalizeFilterText(a.paciente).includes(searchVal);
            return pMatch && tMatch && eMatch && pacienteMatch;
        });
    }

    // ---- Main Render Function (HORIZONTAL TRACKING LINE) ----
    function render() {
        updateDisplayDateLabel();
        updateClearFiltersButton();
        const { dateRef } = getDateFilterInfo();
        let filtered = getFilteredAppointments();
        filtered.sort((a, b) => (a.inicio || '24:00').localeCompare(b.inicio || '24:00'));

        const activeFiltered = filtered.filter(a => a.status !== 'CANCELADO');
        if (DOM.dashTotal) DOM.dashTotal.textContent = activeFiltered.length;

        const byTurnoBase = getFilteredAppointments({ ignoreTurno: true }).filter(a => a.status !== 'CANCELADO');
        if (DOM.dashMorning) DOM.dashMorning.textContent = byTurnoBase.filter(a => normalizeTurnoLabel(a.turno, a.inicio) === 'Manhã').length;
        if (DOM.dashAfternoon) DOM.dashAfternoon.textContent = byTurnoBase.filter(a => normalizeTurnoLabel(a.turno, a.inicio) === 'Tarde').length;

        // ---- Contagem de Instituições Diferentes (Resumo) ----
        const byEscolaBase = getFilteredAppointments({ ignoreEscola: true }).filter(a => a.status !== 'CANCELADO');
        const schoolCounts = new Map();
        byEscolaBase.forEach(item => {
            const school = (item.escola || '').trim();
            if (school) schoolCounts.set(school, (schoolCounts.get(school) || 0) + 1);
        });

        if (DOM.dashSchoolsCount) DOM.dashSchoolsCount.textContent = schoolCounts.size;

        if (DOM.dashSchools) {
            DOM.dashSchools.innerHTML = '';
            const sortedSchools = Array.from(schoolCounts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
            if (sortedSchools.length === 0) {
                DOM.dashSchools.innerHTML = '<div class="text-xs font-semibold text-text-muted p-2">Nenhuma instituição registrada para hoje.</div>';
            } else {
                sortedSchools.forEach(([school, count]) => {
                    const row = document.createElement('div');
                    row.className = 'flex justify-between items-center p-2 rounded-lg cursor-pointer transition-all';
                    row.style.cssText = 'background: var(--surface-card); border: 1px solid var(--border-main);';
                    if (DOM.fEscola && DOM.fEscola.value === school) {
                        row.style.borderColor = 'var(--tea-blue)';
                        row.style.background = 'var(--tea-blue-light)';
                    }
                    row.innerHTML = `
                        <span class="font-bold text-sm" style="color: var(--text-primary);">${escapeHtml(school)}</span>
                        <span style="background: var(--tea-violet-light); color: var(--tea-violet); font-weight: 800; padding: 2px 10px; border-radius: 99px; font-size: 0.82rem;">${count}</span>
                    `;
                    row.addEventListener('click', () => {
                        if (!DOM.fEscola) return;
                        DOM.fEscola.value = DOM.fEscola.value === school ? '' : school;
                        switchTab('agenda');
                        render();
                    });
                    DOM.dashSchools.appendChild(row);
                });
            }
        }

        DOM.agendaList.innerHTML = '';

        if (filtered.length === 0) {
            DOM.agendaList.innerHTML = `<div class="agenda-card text-center text-muted font-bold py-6">Nenhum atendimento para a data selecionada.</div>`;
            return;
        }

        filtered.forEach(item => {
            const todayStatus = item.status || '';
            const todayMonitor = item.monitora || '';
            const statusParts = getStatusParts(todayStatus);
            const isCancelled = todayStatus === 'CANCELADO';
            const cardOpacity = isCancelled ? 'opacity-40' : '';
            const turnoLabel = normalizeTurnoLabel(item.turno, item.inicio);
            const turnoClass = turnoLabel === 'Tarde' ? 'turno-tarde' : '';
            const phone = normalizeWhatsappPhone(item.telefone);
            const wppLink = phone ? `https://wa.me/${phone}` : '#';

            const allowedSteps = getProgressStepsForTransport(item.transporte);
            const monitorOptions = MONITORAS.map(m => `<option value="${escapeHtml(m)}" ${todayMonitor === m ? 'selected' : ''}>${escapeHtml(m)}</option>`).join('');

            // Contagem de auditorias registradas
            let auditCount = 0;
            allowedSteps.forEach(step => { if (statusParts.includes(step.code)) auditCount++; });
            if (isCancelled && (item.ausenciaMotivo || item.ausenciaGps)) auditCount++;

            // Cálculo do preenchimento da linha de progresso
            let maxIndex = -1;
            allowedSteps.forEach((step, idx) => {
                if (statusParts.includes(step.code)) maxIndex = idx;
            });

            let fillPercent = 0;
            if (allowedSteps.length > 1 && maxIndex >= 0) {
                fillPercent = (maxIndex / (allowedSteps.length - 1)) * 100;
            } else if (allowedSteps.length === 1 && maxIndex >= 0) {
                fillPercent = 100;
            }

            const trackerNodesHtml = allowedSteps.map(step => {
                const completed = statusParts.includes(step.code);
                const timestamp = item[step.timeField] || '';
                return `
                    <button type="button" ${isCancelled ? 'disabled' : ''} data-action="progress" data-id="${escapeHtml(item.id)}" data-date="${escapeHtml(dateRef)}" data-step-code="${escapeHtml(step.code)}" data-patient="${escapeHtml(item.paciente)}" class="tracker-node-item ${completed ? 'completed' : ''}">
                        <div class="tracker-circle">
                            <i class="ph ${completed ? 'ph-check' : step.icon}"></i>
                        </div>
                        <span class="tracker-node-label">${escapeHtml(step.label)}</span>
                        ${timestamp ? `<span class="tracker-time-pill">${escapeHtml(timestamp)}</span>` : ''}
                    </button>
                `;
            }).join('');

            const card = document.createElement('div');
            card.className = `agenda-card ${turnoClass} ${cardOpacity}`;
            card.innerHTML = `
                <div class="card-top-bar">
                    <div class="card-header-left">
                        <h3 class="patient-name-title">${escapeHtml(item.paciente)}</h3>
                        <div class="card-badges-group">
                            <span class="badge-time"><i class="ph ph-clock"></i> ${escapeHtml(item.inicio || '--')} às ${escapeHtml(item.termino || '--')}</span>
                            <span class="badge-turno">${escapeHtml(turnoLabel)}</span>
                        </div>
                    </div>
                    <div class="card-actions-admin admin-only">
                        <button type="button" class="icon-btn-card" data-action="edit" data-id="${escapeHtml(item.id)}"><i class="ph ph-pencil-simple"></i></button>
                        <button type="button" class="icon-btn-card delete" data-action="delete" data-id="${escapeHtml(item.id)}"><i class="ph ph-trash"></i></button>
                    </div>
                </div>

                <div class="card-compact-meta">
                    <div class="meta-line-item">
                        <i class="ph ph-user"></i>
                        <span>${escapeHtml(item.profissional)} &bull; <strong>${escapeHtml(item.tipo)}</strong></span>
                    </div>
                    ${item.escola ? `
                    <div class="meta-line-item">
                        <i class="ph ph-buildings"></i>
                        <span>${escapeHtml(item.escola)}</span>
                    </div>` : ''}
                </div>

                <div class="card-actions-strip">
                    <div class="chips-left-group">
                        <span class="badge-transport"><i class="ph ph-bus"></i> ${item.transporte || 'Ida e Volta'}</span>
                        <button type="button" class="btn-audit-gps" data-action="audit-gps" data-id="${escapeHtml(item.id)}" data-date="${escapeHtml(dateRef)}">
                            <i class="ph ph-map-pin"></i> GPS (${auditCount})
                        </button>
                        ${!isCancelled ? `<a href="${wppLink}" target="_blank" class="whatsapp-float-btn" title="WhatsApp"><i class="ph ph-whatsapp-logo"></i></a>` : ''}
                    </div>

                    <div class="monitor-selector-inline">
                        <select class="monitor-select-compact daily-monitor-select" data-id="${escapeHtml(item.id)}" data-date="${escapeHtml(dateRef)}">
                            <option value="">Monitora...</option>
                            ${monitorOptions}
                        </select>
                        <button type="button" data-action="absence" data-id="${escapeHtml(item.id)}" data-date="${escapeHtml(dateRef)}" data-patient="${escapeHtml(item.paciente)}" class="absence-toggle-btn-compact ${isCancelled ? 'active' : ''}">
                            <i class="ph ph-ban"></i> ${isCancelled ? 'Cancelado' : 'Cancelar'}
                        </button>
                    </div>
                </div>

                <div class="progress-tracker-container">
                    <div class="tracker-track-bg">
                        <div class="tracker-track-fill" style="width: ${fillPercent}%;"></div>
                    </div>
                    <div class="tracker-nodes-row">
                        ${trackerNodesHtml}
                    </div>
                </div>
            `;
            DOM.agendaList.appendChild(card);
        });
    }

    function renderMonitorsList() {
        const container = document.getElementById('monitorsList');
        if (!container) return;
        container.innerHTML = '';
        MONITORAS.forEach((m, idx) => {
            const row = document.createElement('div');
            row.className = 'agenda-card flex justify-between items-center';
            row.style.cssText = 'padding: 10px 14px; border-left: 3px solid var(--tea-violet);';
            row.innerHTML = `<span class="font-bold text-sm">${escapeHtml(m)}</span><button type="button" class="icon-btn-card delete" onclick="removeMonitor(${idx})"><i class="ph ph-trash"></i></button>`;
            container.appendChild(row);
        });
    }

    window.removeMonitor = async (index) => {
        if (!requireAdmin('remover monitora')) return;
        const name = MONITORAS[index];
        MONITORAS.splice(index, 1);
        localStorage.setItem('lumina_monitoras', JSON.stringify(MONITORAS));
        renderMonitorsList(); render();
        try { await supabaseRequest(`${SUPABASE_TABLES.monitors}?monitora=eq.${encodeURIComponent(name)}`, { method: 'DELETE' }); } catch(e){}
    };

    const btnAddMonitor = document.getElementById('btnAddMonitor');
    if (btnAddMonitor) {
        btnAddMonitor.addEventListener('click', async () => {
            if (!requireAdmin('adicionar monitora')) return;
            const input = document.getElementById('newMonitorName');
            const name = input?.value.trim();
            if (name && !MONITORAS.includes(name)) {
                MONITORAS.push(name);
                localStorage.setItem('lumina_monitoras', JSON.stringify(MONITORAS));
                if (input) input.value = '';
                renderMonitorsList(); render();
                try { await supabaseRequest(`${SUPABASE_TABLES.monitors}`, { method: 'POST', body: JSON.stringify({ id: Date.now().toString(), monitora: name }) }); } catch(e){}
            }
        });
    }

    // ---- Interaction Listeners ----
    if (DOM.agendaList) {
        DOM.agendaList.addEventListener('click', async (event) => {
            const button = event.target.closest('[data-action]');
            if (!button) return;
            const action = button.dataset.action;

            if (action === 'audit-gps') {
                const currentList = getAppointmentsForDate(button.dataset.date);
                const item = currentList.find(a => String(a.id) === String(button.dataset.id));
                if (item) openGpsAuditModal(item, button.dataset.date);
            } else if (action === 'progress') {
                const currentList = getAppointmentsForDate(button.dataset.date);
                const rawItem = currentList.find(a => String(a.id) === String(button.dataset.id));
                if (!rawItem) return;

                const item = ensureConcreteRecord(rawItem, button.dataset.date);
                const step = getProgressStep(button.dataset.stepCode);
                let parts = getStatusParts(item.status).filter(p => p !== 'CANCELADO');

                if (parts.includes(button.dataset.stepCode)) {
                    parts = parts.filter(p => p !== button.dataset.stepCode);
                    item[step.timeField] = '';
                    item[step.gpsField] = '';
                } else {
                    parts.push(button.dataset.stepCode);
                    item[step.timeField] = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    showToast('Obtendo localização GPS...', 'info');
                    const coords = await captureGeolocation();
                    item[step.gpsField] = coords;
                }
                item.status = parts.join(',');
                localStorage.setItem('lumina_agenda_cache', JSON.stringify(appointments));
                render();
                await supabaseUpdateAppointment(item);
                if (parts.includes(button.dataset.stepCode)) {
                    showToast(`Passo ${step.label} registrado! ${item[step.gpsField] ? '📍 GPS capturado' : ''}`);
                }
            } else if (action === 'absence') {
                const currentList = getAppointmentsForDate(button.dataset.date);
                const rawItem = currentList.find(a => String(a.id) === String(button.dataset.id));
                if (!rawItem) return;
                const item = ensureConcreteRecord(rawItem, button.dataset.date);

                if (item.status === 'CANCELADO') {
                    item.status = ''; item.ausenciaMotivo = ''; item.ausenciaTimestamp = ''; item.ausenciaGps = '';
                } else {
                    const reason = prompt(`Motivo do cancelamento de ${button.dataset.patient}:`);
                    if (!reason || !reason.trim()) return;
                    item.status = 'CANCELADO';
                    item.ausenciaMotivo = reason.trim();
                    item.ausenciaTimestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    showToast('Obtendo localização GPS...', 'info');
                    const coords = await captureGeolocation();
                    item.ausenciaGps = coords;
                }
                localStorage.setItem('lumina_agenda_cache', JSON.stringify(appointments));
                render();
                await supabaseUpdateAppointment(item);
            } else if (action === 'edit') {
                openDrawer('edit', button.dataset.id);
            } else if (action === 'delete') {
                const currentList = getAppointmentsForDate(DOM.fData?.value);
                const item = currentList.find(a => String(a.id) === String(button.dataset.id));
                if (!item) return;
                showConfirmationModal({
                    title: 'Excluir Agendamento',
                    message: `Deseja excluir o agendamento de <strong>${escapeHtml(item.paciente)}</strong>?`,
                    iconClass: 'ph-trash',
                    onConfirm: async () => {
                        appointments = appointments.filter(a => String(a.id) !== String(button.dataset.id) && !(a.paciente === item.paciente && a.inicio === item.inicio));
                        localStorage.setItem('lumina_agenda_cache', JSON.stringify(appointments));
                        render();
                        await supabaseDeleteRecurringAppointments(item.paciente, item.dia || getWeekdayFromISO(item.data), item.inicio);
                    }
                });
            }
        });

        DOM.agendaList.addEventListener('change', (event) => {
            const select = event.target.closest('.daily-monitor-select');
            if (select) {
                const currentList = getAppointmentsForDate(select.dataset.date);
                const rawItem = currentList.find(a => String(a.id) === String(select.dataset.id));
                if (rawItem) {
                    const item = ensureConcreteRecord(rawItem, select.dataset.date);
                    item.monitora = select.value;
                    localStorage.setItem('lumina_agenda_cache', JSON.stringify(appointments));
                    render();
                    supabaseUpdateAppointment(item);
                }
            }
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
                opt.value = val; opt.textContent = val; sel.appendChild(opt);
            });
            if (currentObj && set.has(currentObj)) sel.value = currentObj;
        };

        sortAndPopulate(profs, DOM.fProf);
        sortAndPopulate(escolas, DOM.fEscola);
    }

    // ---- Admin Passcode ----
    const btnAdminLogin = document.getElementById('btnAdminLogin');
    const btnAdminLogout = document.getElementById('btnAdminLogout');
    if (btnAdminLogin) {
        btnAdminLogin.addEventListener('click', async () => {
            const senha = prompt("Acesso Coordenador (Senha):");
            if (!senha) return;
            if (await validateAdminPasscode(senha)) {
                document.body.classList.remove('viewer-mode');
                btnAdminLogin.classList.add('hidden');
                btnAdminLogout.classList.remove('hidden');
                sessionStorage.setItem('isAdmin', 'true');
            } else { alert("Senha incorreta!"); }
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

    // ---- Relatórios PDF ----
    if (DOM.btnGenerateReport) {
        DOM.btnGenerateReport.addEventListener('click', () => {
            if (!requireAdmin('gerar relatórios')) return;
            const start = DOM.reportStartDate?.value;
            const end = DOM.reportEndDate?.value;
            if (!start || !end || start > end) { showToast('Informe o período corretamente.', 'error'); return; }
            const records = appointments.filter(a => a.data >= start && a.data <= end);
            const reportWin = window.open('', '_blank');
            reportWin.document.write(`<html><head><title>Relatório Novo Olhar</title></head><body><h1>Relatório de Atendimentos (${formatDateBR(start)} a ${formatDateBR(end)})</h1><p>Total: ${records.length}</p><script>window.print();<\/script></body></html>`);
            reportWin.document.close();
        });
    }

    // ---- Relógio ao Vivo ----
    const liveClockEl = document.getElementById('liveClock');
    function updateClock() {
        if (!liveClockEl) return;
        const now = new Date();
        liveClockEl.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
    setInterval(updateClock, 1000); updateClock();

    // ---- Init ----
    loadData(false);
    loadMonitors();

    setInterval(() => {
        if (isBackgroundSyncPaused()) return;
        loadData(true); loadMonitors(true);
    }, 6000);
});
