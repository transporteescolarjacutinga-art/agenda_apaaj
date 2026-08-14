/**
 * Lumina Scheduler Pro - Sistema de Gestão de Transporte Especial (TEA)
 * Engine LuminaApp — Sincronização em Tempo Real Multi-Dispositivos e Coerência Total
 *
 * ============================================================================
 * SINCRONIZAÇÃO MULTI-APARELHOS (ELIMINAÇÃO DE DADOS DIVERGENTES):
 * ============================================================================
 * 1. SUPABASE COMO FONTE ÚNICA DA VERDADE (Master State):
 *    - Sincronização substitui o estado local diretamente pelo estado da nuvem,
 *      preservando apenas alterações locais não enviadas (pendingSync).
 *    - Se um aparelho excluir um agendamento ou alterar uma etapa, os demais
 *      aparelhos refletem a alteração imediatamente.
 *
 * 2. ATUALIZAÇÃO INSTANTÂNEA AO RETOMAR APLICATIVO (Focus / VisibilityChange):
 *    - Ao desbloquear o celular ou alternar abas, a sincronização dispara no
 *      mesmo milissegundo.
 *
 * 3. POLLER DE ALTA FREQUÊNCIA:
 *    - Poller ajustado para 3.5 segundos em segundo plano.
 *
 * 4. ISOLAMENTO DE ETAPAS DIÁRIAS (Zero Vazamento entre Semanas):
 *    - Projeções de templates semanais em datas futuras/distintas iniciam com
 *      as etapas de transporte limpas, exibindo progresso apenas quando houver
 *      ocorrência concreta registrada para a data exata.
 * ============================================================================
 */

class LuminaApp {
    constructor() {
        this.SUPABASE_URL = "https://ymgmlvrbydmxfnkeopra.supabase.co";
        this.SUPABASE_KEY = "sb_publishable_iKPcSA5NVhhl--V35OP2cQ_ax2zvrob";
        this.ADMIN_PASSCODE_HASH = '158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab';

        const tzOffset = new Date().getTimezoneOffset() * 60000;
        this.todayIso = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);

        let initialDate = this.todayIso;
        const [y, m, d] = initialDate.split('-');
        const dayOfWeek = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)).getDay();
        if (dayOfWeek === 6) { // Sábado -> Sexta
            const prev = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10) - 1);
            initialDate = prev.toISOString().slice(0, 10);
        } else if (dayOfWeek === 0) { // Domingo -> Segunda
            const next = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10) + 1);
            initialDate = next.toISOString().slice(0, 10);
        }
        this.selectedDate = initialDate;

        this.APP_VERSION = '20260814_V5';
        const storedVersion = localStorage.getItem('lumina_app_version');
        if (storedVersion !== this.APP_VERSION) {
            localStorage.removeItem('lumina_schedules_store');
            localStorage.setItem('lumina_app_version', this.APP_VERSION);
        }

        let savedSchedules = this.loadLocalStore('lumina_schedules_store', null);
        if (!Array.isArray(savedSchedules) || savedSchedules.length === 0) {
            if (window.INITIAL_DATA && Array.isArray(window.INITIAL_DATA.appointments)) {
                savedSchedules = window.INITIAL_DATA.appointments.map(r => this.fromSupabaseFormat(r));
            } else {
                savedSchedules = [];
            }
        }
        savedSchedules.forEach(s => {
            if (s && s.shift) s.shift = this.fixText(s.shift);
        });
        this.schedules = savedSchedules;

        let savedMonitors = this.loadLocalStore('lumina_monitors_store', null);
        if (!Array.isArray(savedMonitors) || savedMonitors.length === 0) {
            if (window.INITIAL_DATA && Array.isArray(window.INITIAL_DATA.monitors)) {
                savedMonitors = window.INITIAL_DATA.monitors;
            } else {
                savedMonitors = ["Vanessa", "Luciana", "Eliane", "Nenhuma"];
            }
        }
        this.monitors = savedMonitors;

        this.pendingSync = this.loadLocalStore('lumina_pending_sync_store', []);
        this.pendingDeletions = this.loadLocalStore('lumina_pending_deletions_store', []);
        this.pendingRemoteDeletions = this.loadLocalStore('lumina_pending_remote_deletions_store', []);

        this.dirtyIds = new Set((this.pendingSync || []).map(p => String(p.id)));

        this.filters = { search: '', professional: '', shift: '', school: '' };
        this.isAdmin = sessionStorage.getItem('isAdmin') === 'true';

        this.confirmCallback = null;

        this.initDOM();
        this.bindEvents();
        this.updateAdminUI();
        this.renderAll();

        this.syncFromSupabase();
        this.startBackgroundPoller();
    }

    // ---- Storage & Utilitários ----
    loadLocalStore(key, fallback) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : fallback;
        } catch(e) {
            return fallback;
        }
    }

    saveLocalStore(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch(e) {}
    }

    saveAllLocalState() {
        this.saveLocalStore('lumina_schedules_store', this.schedules);
        this.saveLocalStore('lumina_monitors_store', this.monitors);
        this.saveLocalStore('lumina_pending_sync_store', this.pendingSync);
        this.saveLocalStore('lumina_pending_deletions_store', this.pendingDeletions);
        this.saveLocalStore('lumina_pending_remote_deletions_store', this.pendingRemoteDeletions);
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        const icon = type === 'error' ? 'ph-warning-circle' : type === 'info' ? 'ph-info' : 'ph-check-circle';
        const color = type === 'error' ? 'var(--danger)' : type === 'info' ? 'var(--primary)' : 'var(--success)';
        toast.className = 'toast-item';
        toast.style.borderColor = color;
        toast.innerHTML = `<i class="ph ${icon}" style="color:${color}; font-size:1.1rem;"></i><span>${this.escapeHtml(message)}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3200);
    }

    fixText(str) {
        if (!str) return '';
        return String(str)
            .replace(/ÃƒÂ§/g, 'ç').replace(/ÃƒÂ£/g, 'ã').replace(/ÃƒÂ¡/g, 'á')
            .replace(/ÃƒÂ©/g, 'é').replace(/ÃƒÂª/g, 'ê').replace(/ÃƒÂ­/g, 'í')
            .replace(/ÃƒÂ³/g, 'ó').replace(/ÃƒÂ´/g, 'ô').replace(/ÃƒÂº/g, 'ú')
            .replace(/Ã§/g, 'ç').replace(/Ã£/g, 'ã').replace(/Ã¡/g, 'á')
            .replace(/Ã©/g, 'é').replace(/Ãª/g, 'ê').replace(/Ã­/g, 'í')
            .replace(/Ã³/g, 'ó').replace(/Ã´/g, 'ô').replace(/Ãº/g, 'ú')
            .replace(/Â/g, '').trim();
    }

    escapeHtml(str) {
        return this.fixText(str).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        }[c]));
    }

    normalizeText(str) {
        return this.fixText(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    }

    getWeekday(dateStr) {
        if (!dateStr) return '';
        const [y, m, d] = String(dateStr).split('-');
        const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
        if (isNaN(date.getTime())) return '';
        const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        return days[date.getDay()] || '';
    }

    formatDateBR(dateStr) {
        if (!dateStr) return '';
        const iso = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
        return dateStr;
    }

    formatTime(val) {
        if (!val) return '';
        if (typeof val === 'string' && val.includes('T')) {
            const d = new Date(val);
            if (!isNaN(d.getTime())) return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        }
        return String(val).substring(0, 5);
    }

    parseExcelDate(val) {
        if (!val) return this.todayIso;
        if (val instanceof Date) return val.toISOString().slice(0, 10);
        if (typeof val === 'number') {
            const date = new Date((val - (25567 + 2)) * 86400 * 1000);
            return date.toISOString().slice(0, 10);
        }
        const str = String(val).trim();
        if (str.match(/^\d{4}-\d{2}-\d{2}/)) return str.slice(0, 10);
        const br = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
        return this.todayIso;
    }

    getInitials(name) {
        const parts = this.fixText(name).split(/\s+/).filter(Boolean);
        if (!parts.length) return 'N';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    normalizePhone(phoneStr) {
        const digits = String(phoneStr || '').replace(/\D/g, '');
        if (!digits) return '';
        return digits.startsWith('55') ? digits : `55${digits}`;
    }

    extractCoords(gps) {
        const m = String(gps || '').match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
        return m ? `${m[1]},${m[2]}` : '';
    }

    async getGpsCoords() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) return resolve('');
            navigator.geolocation.getCurrentPosition(
                pos => resolve(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`),
                err => resolve(''),
                { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
            );
        });
    }

    // ---- Mapeadores do Banco de Dados (public.appointments) ----
    fromSupabaseFormat(row) {
        const rawId = String(row.id || '');
        const startRaw = this.formatTime(row.inicio);
        const hour = parseInt(String(startRaw || '8').split(':')[0], 10) || 8;
        const fixedShift = this.fixText(row.turno);
        const shift = (fixedShift === 'Manhã' || fixedShift === 'Tarde') ? fixedShift : (hour >= 12 ? 'Tarde' : 'Manhã');

        return {
            id: rawId,
            parent_id: null,
            base_id: rawId,
            patient_name: this.fixText(row.paciente),
            professional_name: this.fixText(row.profissional),
            therapy_type: this.fixText(row.tipo),
            school_name: this.fixText(row.escola),
            phone: this.fixText(row.telefone),
            transport_type: this.fixText(row.transporte) || 'Ambos',
            notes: this.fixText(row.obs),
            start_time: startRaw,
            end_time: this.formatTime(row.termino),
            shift: shift,
            day_of_week: this.fixText(row.dia) || this.getWeekday(row.data),
            start_date: row.data || '',
            override_date: row.data || null,
            status: row.status || '',
            assigned_monitor: this.fixText(row.monitora),
            step_escola_time: row.timestamp_buscado_escola || '',
            step_escola_gps: row.gps_buscado_escola || '',
            step_ong_time: row.timestamp_entregue_ong || '',
            step_ong_gps: row.gps_entregue_ong || '',
            step_saida_time: row.timestamp_saida_ong || '',
            step_saida_gps: row.gps_saida_ong || '',
            step_devolvido_time: row.timestamp_devolvido_escola || '',
            step_devolvido_gps: row.gps_devolvido_escola || '',
            cancel_reason: row.ausencia_motivo || '',
            cancel_time: row.ausencia_timestamp || '',
            cancel_gps: row.ausencia_gps || ''
        };
    }

    toSupabaseFormat(item) {
        const cleanId = String(item.id || '').startsWith('proj_') ? String(item.id).replace(/^proj_/, '') : String(item.id || '');

        return {
            id: cleanId,
            data: item.start_date || item.override_date || null,
            profissional: this.fixText(item.professional_name),
            tipo: this.fixText(item.therapy_type),
            paciente: this.fixText(item.patient_name),
            dia: item.day_of_week || this.getWeekday(item.start_date),
            turno: item.shift || 'Manhã',
            inicio: item.start_time || null,
            termino: item.end_time || null,
            escola: this.fixText(item.school_name),
            telefone: this.fixText(item.phone),
            transporte: item.transport_type || 'Ambos',
            obs: this.fixText(item.notes),
            status: item.status || '',
            monitora: this.fixText(item.assigned_monitor),
            gps_buscado_escola: item.step_escola_gps || '',
            timestamp_buscado_escola: item.step_escola_time || '',
            gps_entregue_ong: item.step_ong_gps || '',
            timestamp_entregue_ong: item.step_ong_time || '',
            gps_saida_ong: item.step_saida_gps || '',
            timestamp_saida_ong: item.step_saida_time || '',
            gps_devolvido_escola: item.step_devolvido_gps || '',
            timestamp_devolvido_escola: item.step_devolvido_time || '',
            ausencia_motivo: item.cancel_reason || '',
            ausencia_timestamp: item.cancel_time || '',
            ausencia_gps: item.cancel_gps || ''
        };
    }

    recomputeStatus(item) {
        if (!item) return;
        if (item.status === 'CANCELADO') return;
        const parts = [];
        if (item.step_escola_time) parts.push('BUSCADO_ESCOLA');
        if (item.step_ong_time) parts.push('ENTREGUE_ONG');
        if (item.step_saida_time) parts.push('SAIDA_ONG');
        if (item.step_devolvido_time) parts.push('DEVOLVIDO_ESCOLA');
        item.status = parts.join(',');
    }

    // ---- Mapeamento DOM ----
    initDOM() {
        this.DOM = {
            liveClockDisplay: document.getElementById('liveClockDisplay'),
            btnAdminAuth: document.getElementById('btnAdminAuth'),
            btnAdminLogout: document.getElementById('btnAdminLogout'),
            btnImportExcel: document.getElementById('btnImportExcel'),
            inputExcelFile: document.getElementById('inputExcelFile'),

            btnDatePrev: document.getElementById('btnDatePrev'),
            btnDateNext: document.getElementById('btnDateNext'),
            datePickerBox: document.getElementById('datePickerBox'),
            inputDateRef: document.getElementById('inputDateRef'),
            txtDateLabel: document.getElementById('txtDateLabel'),

            inputSearchPatient: document.getElementById('inputSearchPatient'),
            selectProfFilter: document.getElementById('selectProfFilter'),
            selectShiftFilter: document.getElementById('selectShiftFilter'),
            selectSchoolFilter: document.getElementById('selectSchoolFilter'),
            btnResetFilters: document.getElementById('btnResetFilters'),

            scheduleCardsContainer: document.getElementById('scheduleCardsContainer'),
            monitorsListContainer: document.getElementById('monitorsListContainer'),
            inputNewMonitor: document.getElementById('inputNewMonitor'),
            btnAddMonitor: document.getElementById('btnAddMonitor'),

            kpiTotal: document.getElementById('kpiTotal'),
            kpiMorning: document.getElementById('kpiMorning'),
            kpiAfternoon: document.getElementById('kpiAfternoon'),
            kpiSchoolsCount: document.getElementById('kpiSchoolsCount'),
            schoolsListContainer: document.getElementById('schoolsListContainer'),
            btnKpiTotal: document.getElementById('btnKpiTotal'),
            btnKpiMorning: document.getElementById('btnKpiMorning'),
            btnKpiAfternoon: document.getElementById('btnKpiAfternoon'),

            reportStartDate: document.getElementById('reportStartDate'),
            reportEndDate: document.getElementById('reportEndDate'),
            btnGenerateReportPdf: document.getElementById('btnGenerateReportPdf'),

            navTabAgenda: document.getElementById('navTabAgenda'),
            navTabMonitors: document.getElementById('navTabMonitors'),
            navFabNew: document.getElementById('navFabNew'),
            navTabSummary: document.getElementById('navTabSummary'),
            navTabReports: document.getElementById('navTabReports'),

            tabAgenda: document.getElementById('tabAgenda'),
            tabMonitors: document.getElementById('tabMonitors'),
            tabSummary: document.getElementById('tabSummary'),
            tabReports: document.getElementById('tabReports'),

            drawerBackdrop: document.getElementById('drawerBackdrop'),
            drawerSheet: document.getElementById('drawerSheet'),
            btnCloseDrawer: document.getElementById('btnCloseDrawer'),
            drawerTitle: document.getElementById('drawerTitle'),
            scheduleForm: document.getElementById('scheduleForm'),

            fieldScheduleId: document.getElementById('fieldScheduleId'),
            fieldProfessional: document.getElementById('fieldProfessional'),
            fieldTherapy: document.getElementById('fieldTherapy'),
            fieldPatient: document.getElementById('fieldPatient'),
            fieldStartDate: document.getElementById('fieldStartDate'),
            fieldStartTime: document.getElementById('fieldStartTime'),
            fieldEndTime: document.getElementById('fieldEndTime'),
            fieldSchool: document.getElementById('fieldSchool'),
            fieldPhone: document.getElementById('fieldPhone'),
            fieldTransport: document.getElementById('fieldTransport'),
            fieldNotes: document.getElementById('fieldNotes'),

            gpsModalBackdrop: document.getElementById('gpsModalBackdrop'),
            gpsModal: document.getElementById('gpsModal'),
            btnCloseGpsModal: document.getElementById('btnCloseGpsModal'),
            btnDismissGpsModal: document.getElementById('btnDismissGpsModal'),
            gpsModalAvatar: document.getElementById('gpsModalAvatar'),
            gpsModalPatientName: document.getElementById('gpsModalPatientName'),
            gpsModalDateLabel: document.getElementById('gpsModalDateLabel'),
            gpsModalStatusBadge: document.getElementById('gpsModalStatusBadge'),
            gpsModalTimelineBody: document.getElementById('gpsModalTimelineBody'),

            confirmModalBackdrop: document.getElementById('confirmModalBackdrop'),
            confirmModal: document.getElementById('confirmModal'),
            confirmModalTitle: document.getElementById('confirmModalTitle'),
            confirmModalText: document.getElementById('confirmModalText'),
            btnConfirmCancel: document.getElementById('btnConfirmCancel'),
            btnConfirmSubmit: document.getElementById('btnConfirmSubmit')
        };

        if (this.DOM.inputDateRef) this.DOM.inputDateRef.value = this.selectedDate;
    }

    // ---- Event Listeners ----
    bindEvents() {
        setInterval(() => this.updateClock(), 1000);
        this.updateClock();

        // SINCRONIZAÇÃO INSTANTÂNEA AO RETOMAR APLICATIVO OU MUDAR DE ABA
        window.addEventListener('online', () => { this.syncFromSupabase(); });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) this.syncFromSupabase();
        });
        window.addEventListener('focus', () => {
            this.syncFromSupabase();
        });

        this.DOM.btnAdminAuth.addEventListener('click', () => this.handleAdminLogin());
        this.DOM.btnAdminLogout.addEventListener('click', () => this.handleAdminLogout());

        this.DOM.btnDatePrev.addEventListener('click', () => this.shiftDate(-1));
        this.DOM.btnDateNext.addEventListener('click', () => this.shiftDate(1));
        this.DOM.inputDateRef.addEventListener('change', () => {
            this.selectedDate = this.DOM.inputDateRef.value || this.todayIso;
            this.renderAll();
        });

        this.DOM.inputSearchPatient.addEventListener('input', () => this.handleFilterChange());
        this.DOM.selectProfFilter.addEventListener('change', () => this.handleFilterChange());
        this.DOM.selectShiftFilter.addEventListener('change', () => this.handleFilterChange());
        this.DOM.selectSchoolFilter.addEventListener('change', () => this.handleFilterChange());
        this.DOM.btnResetFilters.addEventListener('click', () => this.resetFilters());

        this.DOM.btnKpiTotal.addEventListener('click', () => {
            this.DOM.selectShiftFilter.value = '';
            this.switchTab('agenda');
            this.handleFilterChange();
        });
        this.DOM.btnKpiMorning.addEventListener('click', () => {
            this.DOM.selectShiftFilter.value = 'Manhã';
            this.switchTab('agenda');
            this.handleFilterChange();
        });
        this.DOM.btnKpiAfternoon.addEventListener('click', () => {
            this.DOM.selectShiftFilter.value = 'Tarde';
            this.switchTab('agenda');
            this.handleFilterChange();
        });

        this.DOM.navTabAgenda.addEventListener('click', () => this.switchTab('agenda'));
        this.DOM.navTabMonitors.addEventListener('click', () => this.switchTab('monitors'));
        this.DOM.navTabSummary.addEventListener('click', () => this.switchTab('summary'));
        this.DOM.navTabReports.addEventListener('click', () => this.switchTab('reports'));

        this.DOM.navFabNew.addEventListener('click', () => this.openDrawer('create'));
        this.DOM.btnCloseDrawer.addEventListener('click', () => this.closeDrawer());
        this.DOM.drawerBackdrop.addEventListener('click', () => this.closeDrawer());
        this.DOM.scheduleForm.addEventListener('submit', (e) => this.handleFormSubmit(e));

        this.DOM.btnImportExcel.addEventListener('click', () => {
            if (!this.requireAdmin('importar planilhas')) return;
            this.DOM.inputExcelFile.click();
        });
        this.DOM.inputExcelFile.addEventListener('change', (e) => this.handleExcelImport(e));

        this.DOM.btnGenerateReportPdf.addEventListener('click', () => this.handlePdfReport());

        this.DOM.btnCloseGpsModal.addEventListener('click', () => this.closeGpsModal());
        this.DOM.btnDismissGpsModal.addEventListener('click', () => this.closeGpsModal());
        this.DOM.gpsModalBackdrop.addEventListener('click', () => this.closeGpsModal());

        this.DOM.btnConfirmCancel.addEventListener('click', () => this.closeConfirmModal());
        this.DOM.confirmModalBackdrop.addEventListener('click', () => this.closeConfirmModal());
        this.DOM.btnConfirmSubmit.addEventListener('click', () => {
            if (this.confirmCallback) this.confirmCallback();
            this.closeConfirmModal();
        });

        this.DOM.btnAddMonitor.addEventListener('click', () => this.addMonitor());

        this.DOM.scheduleCardsContainer.addEventListener('click', (e) => this.handleCardActionClick(e));
        this.DOM.scheduleCardsContainer.addEventListener('change', (e) => this.handleCardMonitorChange(e));

        if (this.DOM.monitorsListContainer) {
            this.DOM.monitorsListContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action="remove-monitor"]');
                if (!btn) return;
                this.removeMonitor(parseInt(btn.dataset.idx, 10));
            });
        }
    }

    // ---- Autenticação & Modo Coordenador ----
    updateClock() {
        const now = new Date();
        this.DOM.liveClockDisplay.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    async handleAdminLogin() {
        const pass = prompt("Digite a senha do Coordenador:");
        if (!pass) return;
        
        let isValid = false;
        if (window.crypto?.subtle) {
            const encoded = new TextEncoder().encode(pass);
            const digest = await crypto.subtle.digest('SHA-256', encoded);
            const hash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
            isValid = (hash === this.ADMIN_PASSCODE_HASH);
        } else {
            isValid = (pass === '2026');
        }

        if (isValid) {
            sessionStorage.setItem('isAdmin', 'true');
            this.isAdmin = true;
            this.updateAdminUI();
            this.showToast('Modo Coordenador ativado!');
        } else {
            alert('Senha incorreta!');
        }
    }

    handleAdminLogout() {
        sessionStorage.removeItem('isAdmin');
        this.isAdmin = false;
        this.updateAdminUI();
        this.showToast('Modo Coordenador encerrado.', 'info');
    }

    updateAdminUI() {
        if (this.isAdmin) {
            document.body.classList.remove('viewer-mode');
            this.DOM.btnAdminAuth.classList.add('hidden');
            this.DOM.btnAdminLogout.classList.remove('hidden');
        } else {
            document.body.classList.add('viewer-mode');
            this.DOM.btnAdminAuth.classList.remove('hidden');
            this.DOM.btnAdminLogout.classList.add('hidden');
        }
    }

    requireAdmin(actionLabel) {
        if (this.isAdmin) return true;
        alert(`Acesso Restrito: faça login como coordenador para ${actionLabel}.`);
        return false;
    }

    // ---- Navegação de Datas ----
    shiftDate(days) {
        const [y, m, d] = (this.selectedDate || this.todayIso).split('-');
        const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
        date.setDate(date.getDate() + days);

        if (date.getDay() === 6) date.setDate(date.getDate() + (days > 0 ? 2 : -1));
        else if (date.getDay() === 0) date.setDate(date.getDate() + (days > 0 ? 1 : -2));

        const newIso = date.toISOString().slice(0, 10);
        this.selectedDate = newIso;
        this.DOM.inputDateRef.value = newIso;
        this.renderAll();
    }

    updateDateLabel() {
        if (!this.selectedDate) {
            this.DOM.txtDateLabel.textContent = 'Todas as Datas';
            return;
        }
        const weekday = this.getWeekday(this.selectedDate);
        const formatted = this.formatDateBR(this.selectedDate);
        this.DOM.txtDateLabel.textContent = weekday ? `${weekday}, ${formatted}` : formatted;
    }

    // ---- Controle de Abas ----
    switchTab(tabName) {
        const tabs = {
            agenda: { btn: this.DOM.navTabAgenda, pane: this.DOM.tabAgenda },
            monitors: { btn: this.DOM.navTabMonitors, pane: this.DOM.tabMonitors },
            summary: { btn: this.DOM.navTabSummary, pane: this.DOM.tabSummary },
            reports: { btn: this.DOM.navTabReports, pane: this.DOM.tabReports }
        };

        Object.values(tabs).forEach(t => {
            if (t.btn) t.btn.classList.remove('active');
            if (t.pane) t.pane.classList.remove('active');
        });

        if (tabs[tabName]) {
            if (tabs[tabName].btn) tabs[tabName].btn.classList.add('active');
            if (tabs[tabName].pane) tabs[tabName].pane.classList.add('active');
        }
    }

    // ---- READ: Motor de Projeção com Isolamento Limpo por Data ----
    getSchedulesForDate(dateStr) {
        if (!dateStr) return this.schedules;

        const targetWeekday = this.getWeekday(dateStr);
        const map = new Map();

        this.schedules.forEach(item => {
            const itemWeekday = item.day_of_week || this.getWeekday(item.start_date || item.override_date);
            const itemDate = item.override_date || item.start_date || '';

            const isExactDate = (itemDate === dateStr);
            const isWeekdayMatch = (this.normalizeText(itemWeekday) === this.normalizeText(targetWeekday));

            if (isExactDate || isWeekdayMatch) {
                const slotKey = `${this.normalizeText(item.patient_name)}|${this.normalizeText(item.professional_name)}|${this.normalizeText(item.therapy_type || '')}|${(item.start_time || '').trim()}`;
                
                // ISOLAMENTO DE ETAPAS: se for um template projetado de outra data, inicia com etapas limpas para dateStr
                let effectiveItem = item;
                if (!isExactDate) {
                    effectiveItem = {
                        ...item,
                        start_date: dateStr,
                        override_date: dateStr,
                        step_escola_time: '',
                        step_escola_gps: '',
                        step_ong_time: '',
                        step_ong_gps: '',
                        step_saida_time: '',
                        step_saida_gps: '',
                        step_devolvido_time: '',
                        step_devolvido_gps: '',
                        status: '',
                        cancel_reason: '',
                        cancel_time: '',
                        cancel_gps: ''
                    };
                }

                if (!map.has(slotKey)) {
                    map.set(slotKey, effectiveItem);
                } else {
                    // Ocorrência concreta com dados reais gravados para hoje substitui o template limpo
                    if (isExactDate) {
                        map.set(slotKey, item);
                    }
                }
            }
        });

        return Array.from(map.values());
    }

    // ---- Instância Concreta Padronizada ----
    ensureConcreteSchedule(item, dateStr) {
        if (!item) return null;
        const itemDate = item.override_date || item.start_date;
        if (itemDate === dateStr && String(item.id).includes('_inst_')) return item;

        const clone = JSON.parse(JSON.stringify(item));
        clone.id = `${Date.now()}_inst_${Math.random().toString(36).substring(2, 7)}`;
        clone.parent_id = item.id;
        clone.base_id = item.base_id || item.id;
        clone.start_date = dateStr;
        clone.override_date = dateStr;
        clone.day_of_week = this.getWeekday(dateStr);
        clone.shift = item.shift || (parseInt(String(item.start_time || '8').split(':')[0], 10) >= 12 ? 'Tarde' : 'Manhã');

        this.schedules.push(clone);
        this.saveAllLocalState();
        return clone;
    }

    // ---- Filtros ----
    handleFilterChange() {
        this.filters.search = this.normalizeText(this.DOM.inputSearchPatient.value);
        this.filters.professional = this.DOM.selectProfFilter ? this.DOM.selectProfFilter.value : '';
        this.filters.shift = this.DOM.selectShiftFilter ? this.DOM.selectShiftFilter.value : '';
        this.filters.school = this.DOM.selectSchoolFilter ? this.DOM.selectSchoolFilter.value : '';

        const hasFilter = Boolean(this.filters.search || this.filters.professional || this.filters.shift || this.filters.school);
        if (hasFilter) this.DOM.btnResetFilters.classList.remove('hidden');
        else this.DOM.btnResetFilters.classList.add('hidden');

        this.renderAll();
    }

    resetFilters() {
        if (this.DOM.inputSearchPatient) this.DOM.inputSearchPatient.value = '';
        if (this.DOM.selectProfFilter) this.DOM.selectProfFilter.value = '';
        if (this.DOM.selectShiftFilter) this.DOM.selectShiftFilter.value = '';
        if (this.DOM.selectSchoolFilter) this.DOM.selectSchoolFilter.value = '';
        this.handleFilterChange();
    }

    getFilteredSchedules() {
        const rawList = this.getSchedulesForDate(this.selectedDate);

        return rawList.filter(item => {
            const pMatch = !this.filters.professional || item.professional_name === this.filters.professional;
            const sMatch = !this.filters.shift || item.shift === this.filters.shift;
            const eMatch = !this.filters.school || item.school_name === this.filters.school;
            const patientMatch = !this.filters.search || this.normalizeText(item.patient_name).includes(this.filters.search);

            return pMatch && sMatch && eMatch && patientMatch;
        });
    }

    updateFilterDropdowns() {
        const profs = new Set(), schools = new Set();
        this.schedules.forEach(s => {
            if (s.professional_name) profs.add(s.professional_name);
            if (s.school_name) schools.add(s.school_name);
        });

        const populate = (set, selectEl) => {
            if (!selectEl) return;
            const current = selectEl.value;
            const firstOpt = selectEl.options.length ? selectEl.options[0].text : '';
            selectEl.innerHTML = `<option value="">${firstOpt}</option>`;
            Array.from(set).sort().forEach(val => {
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = val;
                selectEl.appendChild(opt);
            });
            if (current && set.has(current)) selectEl.value = current;
        };

        populate(profs, this.DOM.selectProfFilter);
        populate(schools, this.DOM.selectSchoolFilter);
    }

    // ---- Renderização da Interface ----
    renderAll() {
        this.updateDateLabel();
        this.updateFilterDropdowns();
        this.renderScheduleCards();
        this.renderMonitorsList();
        this.renderSummaryMetrics();
    }

    renderScheduleCards() {
        const filtered = this.getFilteredSchedules();
        filtered.sort((a, b) => (a.start_time || '24:00').localeCompare(b.start_time || '24:00'));

        this.DOM.scheduleCardsContainer.innerHTML = '';

        if (filtered.length === 0) {
            this.DOM.scheduleCardsContainer.innerHTML = `<div class="dashboard-banner blue text-center py-6 font-bold text-muted">Nenhum atendimento encontrado para os filtros selecionados.</div>`;
            return;
        }

        filtered.forEach(item => {
            const isCancelled = item.status === 'CANCELADO';
            const isAfternoon = item.shift === 'Tarde';
            const phone = this.normalizePhone(item.phone);
            const effectiveDate = item.override_date || item.start_date || this.selectedDate;

            const monitorOptions = this.monitors.map(m => `<option value="${this.escapeHtml(m)}" ${item.assigned_monitor === m ? 'selected' : ''}>${this.escapeHtml(m)}</option>`).join('');

            const steps = [
                { code: 'BUSCADO_ESCOLA', label: 'Escola', icon: 'ph-buildings', time: item.step_escola_time },
                { code: 'ENTREGUE_ONG', label: 'ONG', icon: 'ph-house-line', time: item.step_ong_time },
                { code: 'SAIDA_ONG', label: 'Saída', icon: 'ph-sign-out', time: item.step_saida_time },
                { code: 'DEVOLVIDO_ESCOLA', label: 'Devolvido', icon: 'ph-graduation-cap', time: item.step_devolvido_time }
            ];

            let doneCount = 0;
            steps.forEach(s => { if (s.time) doneCount++; });
            if (isCancelled && item.cancel_reason) doneCount++;

            let lastDoneIdx = -1;
            steps.forEach((s, idx) => { if (s.time) lastDoneIdx = idx; });
            const fillPercent = lastDoneIdx >= 0 ? (lastDoneIdx / (steps.length - 1)) * 100 : 0;

            const trackerHtml = steps.map(s => `
                <button type="button" ${isCancelled ? 'disabled' : ''} data-action="progress" data-id="${this.escapeHtml(item.id)}" data-date="${this.escapeHtml(effectiveDate)}" data-step="${s.code}" class="node-btn ${s.time ? 'done' : ''}">
                    <div class="node-icon-circle"><i class="ph ${s.time ? 'ph-check' : s.icon}"></i></div>
                    <span class="node-text">${this.escapeHtml(s.label)}</span>
                    ${s.time ? `<span class="node-time">${this.escapeHtml(s.time)}</span>` : ''}
                </button>
            `).join('');

            const card = document.createElement('div');
            card.className = `schedule-card ${isAfternoon ? 'afternoon-shift' : ''} ${isCancelled ? 'opacity-40' : ''}`;
            card.innerHTML = `
                <div class="card-head">
                    <div>
                        <h3 class="patient-title">${this.escapeHtml(item.patient_name)}</h3>
                        <div class="badges-stack">
                            <span class="time-badge"><i class="ph ph-clock"></i> ${this.escapeHtml(item.start_time)} às ${this.escapeHtml(item.end_time)}</span>
                            <span class="shift-badge">${this.escapeHtml(item.shift)}</span>
                        </div>
                    </div>
                    <div class="card-admin-actions admin-only">
                        <button type="button" class="card-icon-btn" data-action="edit" data-id="${this.escapeHtml(item.id)}" data-date="${this.escapeHtml(effectiveDate)}"><i class="ph ph-pencil-simple"></i></button>
                        <button type="button" class="card-icon-btn delete" data-action="delete" data-id="${this.escapeHtml(item.id)}" data-date="${this.escapeHtml(effectiveDate)}"><i class="ph ph-trash"></i></button>
                    </div>
                </div>

                <div class="meta-details">
                    <div class="meta-item"><i class="ph ph-user"></i> <span>${this.escapeHtml(item.professional_name)} &bull; <strong>${this.escapeHtml(item.therapy_type)}</strong></span></div>
                    ${item.school_name ? `<div class="meta-item"><i class="ph ph-buildings"></i> <span>${this.escapeHtml(item.school_name)}</span></div>` : ''}
                </div>

                <div class="actions-row">
                    <div class="flex items-center gap-2">
                        <span class="transport-chip"><i class="ph ph-bus"></i> ${this.escapeHtml(item.transport_type || 'Ambos')}</span>
                        <button type="button" class="gps-btn" data-action="audit-gps" data-id="${this.escapeHtml(item.id)}" data-date="${this.escapeHtml(effectiveDate)}">
                            <i class="ph ph-map-pin"></i> GPS (${doneCount})
                        </button>
                        ${!isCancelled && phone ? `<a href="https://wa.me/${phone}" target="_blank" rel="noopener noreferrer" class="wpp-btn" title="WhatsApp"><i class="ph ph-whatsapp-logo"></i></a>` : ''}
                    </div>

                    <div class="flex items-center gap-2">
                        <select class="monitor-select card-monitor-select" data-id="${this.escapeHtml(item.id)}" data-date="${this.escapeHtml(effectiveDate)}">
                            <option value="">Monitora...</option>
                            ${monitorOptions}
                        </select>
                        <button type="button" data-action="cancel" data-id="${this.escapeHtml(item.id)}" data-date="${this.escapeHtml(effectiveDate)}" data-patient="${this.escapeHtml(item.patient_name)}" class="cancel-btn ${isCancelled ? 'active' : ''}">
                            <i class="ph ph-ban"></i> ${isCancelled ? 'Cancelado' : 'Cancelar'}
                        </button>
                    </div>
                </div>

                <div class="tracker-box">
                    <div class="tracker-bg-line"><div class="tracker-fill-line" style="width:${fillPercent}%;"></div></div>
                    <div class="tracker-nodes">${trackerHtml}</div>
                </div>
            `;

            this.DOM.scheduleCardsContainer.appendChild(card);
        });
    }

    renderMonitorsList() {
        this.DOM.monitorsListContainer.innerHTML = '';
        this.monitors.forEach((name, idx) => {
            const item = document.createElement('div');
            item.className = 'schedule-card flex-between';
            item.style.padding = '12px 16px';
            item.innerHTML = `
                <span class="font-bold text-main">${this.escapeHtml(name)}</span>
                <button type="button" class="card-icon-btn delete admin-only" data-action="remove-monitor" data-idx="${idx}"><i class="ph ph-trash"></i></button>
            `;
            this.DOM.monitorsListContainer.appendChild(item);
        });
    }

    renderSummaryMetrics() {
        const raw = this.getSchedulesForDate(this.selectedDate).filter(s => s.status !== 'CANCELADO');
        this.DOM.kpiTotal.textContent = raw.length;
        this.DOM.kpiMorning.textContent = raw.filter(s => s.shift === 'Manhã').length;
        this.DOM.kpiAfternoon.textContent = raw.filter(s => s.shift === 'Tarde').length;

        const schoolCounts = new Map();
        raw.forEach(s => {
            if (s.school_name) schoolCounts.set(s.school_name, (schoolCounts.get(s.school_name) || 0) + 1);
        });

        this.DOM.kpiSchoolsCount.textContent = schoolCounts.size;
        this.DOM.schoolsListContainer.innerHTML = '';

        if (schoolCounts.size === 0) {
            this.DOM.schoolsListContainer.innerHTML = '<div class="text-muted font-bold text-sm">Nenhuma escola atendida nesta data.</div>';
            return;
        }

        Array.from(schoolCounts.entries()).sort((a,b) => b[1] - a[1]).forEach(([school, count]) => {
            const row = document.createElement('div');
            row.className = 'schedule-card flex-between cursor-pointer';
            row.style.padding = '10px 14px';
            row.innerHTML = `
                <span class="font-bold text-sm">${this.escapeHtml(school)}</span>
                <span style="background:var(--purple-light); color:var(--purple); font-weight:800; padding:2px 10px; border-radius:99px; font-size:0.8rem;">${count}</span>
            `;
            row.addEventListener('click', () => {
                this.DOM.selectSchoolFilter.value = this.DOM.selectSchoolFilter.value === school ? '' : school;
                this.handleFilterChange();
                this.switchTab('agenda');
            });
            this.DOM.schoolsListContainer.appendChild(row);
        });
    }

    // ---- Ações dos Cards & UPDATE Padronizado ----
    async handleCardActionClick(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;
        const targetId = btn.dataset.id;
        const targetDate = btn.dataset.date || this.selectedDate;

        const currentList = this.getSchedulesForDate(targetDate);
        const item = currentList.find(s => String(s.id) === String(targetId)) || this.schedules.find(s => String(s.id) === String(targetId));
        if (!item) return;

        if (action === 'progress') {
            const concrete = this.ensureConcreteSchedule(item, targetDate);
            const step = btn.dataset.step;
            const timeFieldMap = {
                BUSCADO_ESCOLA: 'step_escola_time', ENTREGUE_ONG: 'step_ong_time',
                SAIDA_ONG: 'step_saida_time', DEVOLVIDO_ESCOLA: 'step_devolvido_time'
            };
            const gpsFieldMap = {
                BUSCADO_ESCOLA: 'step_escola_gps', ENTREGUE_ONG: 'step_ong_gps',
                SAIDA_ONG: 'step_saida_gps', DEVOLVIDO_ESCOLA: 'step_devolvido_gps'
            };

            const tField = timeFieldMap[step];
            const gField = gpsFieldMap[step];

            if (concrete[tField]) {
                concrete[tField] = '';
                concrete[gField] = '';
            } else {
                concrete[tField] = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                this.showToast('Obtendo localização GPS...', 'info');
                concrete[gField] = await this.getGpsCoords();
                this.showToast('Passo registrado com sucesso!');
            }

            this.recomputeStatus(concrete);
            this.saveAllLocalState();
            this.renderAll();
            await this.saveScheduleToSupabase(concrete);
        } else if (action === 'cancel') {
            const concrete = this.ensureConcreteSchedule(item, targetDate);
            if (concrete.status === 'CANCELADO') {
                concrete.status = '';
                concrete.cancel_reason = '';
                concrete.cancel_time = '';
                concrete.cancel_gps = '';
                this.recomputeStatus(concrete);
            } else {
                const reason = prompt(`Motivo do cancelamento de ${item.patient_name}:`);
                if (!reason || !reason.trim()) return;
                concrete.status = 'CANCELADO';
                concrete.cancel_reason = reason.trim();
                concrete.cancel_time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                this.showToast('Obtendo localização GPS...', 'info');
                concrete.cancel_gps = await this.getGpsCoords();
            }

            this.saveAllLocalState();
            this.renderAll();
            await this.saveScheduleToSupabase(concrete);
        } else if (action === 'edit') {
            this.openDrawer('edit', targetId);
        } else if (action === 'delete') {
            if (!this.requireAdmin('excluir agendamentos')) return;

            const isConcreteInstance = (item.start_date === targetDate || item.override_date === targetDate) && String(item.id).includes('_inst_');
            const deleteScopeText = isConcreteInstance 
                ? `Deseja excluir a ocorrência de <strong>${this.escapeHtml(item.patient_name)}</strong> do dia <strong>${this.formatDateBR(targetDate)}</strong>?`
                : `Deseja excluir o agendamento de <strong>${this.escapeHtml(item.patient_name)}</strong>?`;

            this.showConfirmModal({
                title: 'Excluir Agendamento',
                text: deleteScopeText,
                onConfirm: async () => {
                    const targetIdStr = String(item.id);

                    // Exclusão cirúrgica por ID exato
                    this.schedules = this.schedules.filter(s => String(s.id) !== targetIdStr);

                    if (!this.pendingDeletions) this.pendingDeletions = [];
                    this.pendingDeletions.push(item.id);

                    if (!this.pendingRemoteDeletions) this.pendingRemoteDeletions = [];
                    this.pendingRemoteDeletions.push({ id: item.id });

                    this.dirtyIds.delete(targetIdStr);
                    this.saveAllLocalState();
                    this.renderAll();
                    this.showToast('Agendamento excluído com sucesso!');

                    await this.deleteScheduleFromSupabase(item.id);
                }
            });
        } else if (action === 'audit-gps') {
            this.openGpsModal(item, targetDate);
        }
    }

    async handleCardMonitorChange(e) {
        const select = e.target.closest('.card-monitor-select');
        if (!select) return;

        const targetId = select.dataset.id;
        const targetDate = select.dataset.date || this.selectedDate;

        const currentList = this.getSchedulesForDate(targetDate);
        const item = currentList.find(s => String(s.id) === String(targetId)) || this.schedules.find(s => String(s.id) === String(targetId));
        if (!item) return;

        const concrete = this.ensureConcreteSchedule(item, targetDate);
        concrete.assigned_monitor = select.value;
        this.dirtyIds.add(String(concrete.id));
        this.saveAllLocalState();
        this.renderAll();
        await this.saveScheduleToSupabase(concrete);
    }

    // ---- Drawer Form & Modais ----
    openDrawer(mode = 'create', id = null) {
        if (!this.requireAdmin(mode === 'edit' ? 'editar agendamentos' : 'criar agendamentos')) return;

        this.DOM.drawerBackdrop.classList.add('active');
        this.DOM.drawerSheet.classList.add('active');
        this.DOM.scheduleForm.reset();
        this.DOM.fieldScheduleId.value = '';

        if (mode === 'edit' && id) {
            this.DOM.drawerTitle.textContent = 'Editar Agendamento';
            const item = this.getSchedulesForDate(this.selectedDate).find(s => String(s.id) === String(id)) || this.schedules.find(s => String(s.id) === String(id));
            if (item) {
                this.DOM.fieldScheduleId.value = item.id;
                this.DOM.fieldProfessional.value = item.professional_name || '';
                this.DOM.fieldTherapy.value = item.therapy_type || '';
                this.DOM.fieldPatient.value = item.patient_name || '';
                this.DOM.fieldStartDate.value = item.start_date || this.selectedDate;
                this.DOM.fieldStartTime.value = item.start_time || '';
                this.DOM.fieldEndTime.value = item.end_time || '';
                
                if (item.school_name) {
                    const exists = Array.from(this.DOM.fieldSchool.options).some(opt => opt.value === item.school_name);
                    if (!exists) {
                        const opt = document.createElement('option');
                        opt.value = item.school_name;
                        opt.textContent = item.school_name;
                        this.DOM.fieldSchool.appendChild(opt);
                    }
                }
                this.DOM.fieldSchool.value = item.school_name || '';
                this.DOM.fieldPhone.value = item.phone || '';
                this.DOM.fieldTransport.value = item.transport_type || 'Ambos';
                this.DOM.fieldNotes.value = item.notes || '';
            }
        } else {
            this.DOM.drawerTitle.textContent = 'Novo Agendamento TEA';
            this.DOM.fieldStartDate.value = this.selectedDate;
        }
    }

    closeDrawer() {
        this.DOM.drawerBackdrop.classList.remove('active');
        this.DOM.drawerSheet.classList.remove('active');
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        if (!this.requireAdmin('salvar agendamentos')) return;

        const id = this.DOM.fieldScheduleId.value;
        const startDate = this.DOM.fieldStartDate.value || this.selectedDate;
        const startTime = this.DOM.fieldStartTime.value;
        const endTime = this.DOM.fieldEndTime.value;
        const hour = parseInt(startTime.split(':')[0], 10) || 8;
        const shift = hour >= 12 ? 'Tarde' : 'Manhã';

        const payloadData = {
            patient_name: this.fixText(this.DOM.fieldPatient.value),
            professional_name: this.fixText(this.DOM.fieldProfessional.value),
            therapy_type: this.fixText(this.DOM.fieldTherapy.value),
            school_name: this.fixText(this.DOM.fieldSchool.value),
            phone: this.fixText(this.DOM.fieldPhone.value),
            transport_type: this.fixText(this.DOM.fieldTransport.value),
            notes: this.fixText(this.DOM.fieldNotes.value),
            start_time: startTime,
            end_time: endTime,
            shift: shift,
            start_date: startDate,
            day_of_week: this.getWeekday(startDate)
        };

        const patientNorm = this.normalizeText(payloadData.patient_name);
        if (this.pendingDeletions && id) {
            this.pendingDeletions = this.pendingDeletions.filter(i => String(i) !== String(id));
        }

        if (id) {
            let item = this.schedules.find(s => String(s.id) === String(id));
            if (!item) {
                item = this.getSchedulesForDate(this.selectedDate).find(s => String(s.id) === String(id));
            }

            if (item) {
                const concrete = this.ensureConcreteSchedule(item, this.selectedDate);
                Object.assign(concrete, payloadData);
                this.recomputeStatus(concrete);
                this.dirtyIds.add(String(concrete.id));
                this.saveAllLocalState();
                this.renderAll();
                this.closeDrawer();
                this.showToast('Agendamento atualizado com sucesso!');
                await this.saveScheduleToSupabase(concrete);
            }
        } else {
            const duplicate = this.schedules.find(s => 
                (s.start_date === startDate || s.override_date === startDate) &&
                this.normalizeText(s.patient_name) === patientNorm &&
                this.normalizeText(s.professional_name) === this.normalizeText(payloadData.professional_name) &&
                (s.start_time || '').trim() === (startTime || '').trim()
            );

            if (duplicate) {
                if (!confirm('Já existe um agendamento para este paciente no mesmo horário e data. Deseja atualizar o registro existente?')) {
                    return;
                }
                Object.assign(duplicate, payloadData);
                this.recomputeStatus(duplicate);
                this.dirtyIds.add(String(duplicate.id));
                this.saveAllLocalState();
                this.renderAll();
                this.closeDrawer();
                this.showToast('Agendamento existente atualizado!');
                await this.saveScheduleToSupabase(duplicate);
                return;
            }

            const newSchedule = {
                id: `${Date.now()}_rec_${Math.random().toString(36).substring(2, 6)}`,
                ...payloadData
            };
            this.dirtyIds.add(String(newSchedule.id));
            this.schedules.push(newSchedule);
            this.saveAllLocalState();
            this.renderAll();
            this.closeDrawer();
            this.showToast('Novo agendamento recorrente salvo!');
            await this.saveScheduleToSupabase(newSchedule);
        }
    }

    openGpsModal(item, dateStr) {
        this.DOM.gpsModalAvatar.textContent = this.getInitials(item.patient_name);
        this.DOM.gpsModalPatientName.textContent = item.patient_name;
        this.DOM.gpsModalDateLabel.textContent = this.formatDateBR(dateStr);

        const isCancelled = item.status === 'CANCELADO';
        if (isCancelled) {
            this.DOM.gpsModalStatusBadge.textContent = 'Cancelado';
            this.DOM.gpsModalStatusBadge.className = 'status-chip danger';
        } else {
            this.DOM.gpsModalStatusBadge.textContent = 'Em Andamento/Concluído';
            this.DOM.gpsModalStatusBadge.className = 'status-chip';
        }

        const steps = [
            { label: 'Escola', icon: 'ph-buildings', time: item.step_escola_time, gps: item.step_escola_gps },
            { label: 'ONG', icon: 'ph-house-line', time: item.step_ong_time, gps: item.step_ong_gps },
            { label: 'Saída ONG', icon: 'ph-sign-out', time: item.step_saida_time, gps: item.step_saida_gps },
            { label: 'Devolvido', icon: 'ph-graduation-cap', time: item.step_devolvido_time, gps: item.step_devolvido_gps }
        ];

        let html = '';
        steps.forEach(s => {
            if (s.time) {
                const coords = this.extractCoords(s.gps);
                const mapsUrl = coords ? `https://www.google.com/maps?q=${coords}` : null;
                html += `
                    <div class="schedule-card mb-2" style="border-left: 3px solid var(--primary);">
                        <div class="flex-between font-bold">
                            <span><i class="ph ${s.icon} text-blue"></i> ${this.escapeHtml(s.label)}</span>
                            <span class="time-badge">${this.escapeHtml(s.time)}</span>
                        </div>
                        ${mapsUrl ? `<a href="${mapsUrl}" target="_blank" class="btn-submit mt-2" style="height:32px; font-size:0.78rem;"><i class="ph ph-map-pin"></i> Ver Local no Google Maps</a>` : ''}
                    </div>
                `;
            }
        });

        if (isCancelled) {
            const coords = this.extractCoords(item.cancel_gps);
            const mapsUrl = coords ? `https://www.google.com/maps?q=${coords}` : null;
            html += `
                <div class="schedule-card mb-2" style="border-left: 3px solid var(--danger); background: var(--danger-light);">
                    <div class="flex-between font-bold" style="color:var(--danger);">
                        <span><i class="ph ph-ban"></i> Cancelado</span>
                        ${item.cancel_time ? `<span class="time-badge" style="background:var(--danger); color:#fff;">${this.escapeHtml(item.cancel_time)}</span>` : ''}
                    </div>
                    ${item.cancel_reason ? `<div class="font-bold text-sm mt-1">Motivo: "${this.escapeHtml(item.cancel_reason)}"</div>` : ''}
                    ${mapsUrl ? `<a href="${mapsUrl}" target="_blank" class="btn-submit mt-2" style="background:var(--danger); height:32px; font-size:0.78rem;"><i class="ph ph-map-pin"></i> Ver Local no Google Maps</a>` : ''}
                </div>
            `;
        }

        this.DOM.gpsModalTimelineBody.innerHTML = html || '<div class="text-center text-muted font-bold py-6">Nenhum evento gravado.</div>';
        this.DOM.gpsModalBackdrop.classList.add('active');
        this.DOM.gpsModal.classList.add('active');
    }

    closeGpsModal() {
        this.DOM.gpsModalBackdrop.classList.remove('active');
        this.DOM.gpsModal.classList.remove('active');
    }

    showConfirmModal({ title, text, onConfirm }) {
        this.DOM.confirmModalTitle.textContent = title;
        this.DOM.confirmModalText.innerHTML = text;
        this.confirmCallback = onConfirm;
        this.DOM.confirmModalBackdrop.classList.add('active');
        this.DOM.confirmModal.classList.add('active');
    }

    closeConfirmModal() {
        this.DOM.confirmModalBackdrop.classList.remove('active');
        this.DOM.confirmModal.classList.remove('active');
        this.confirmCallback = null;
    }

    // ---- Monitoras ----
    addMonitor() {
        if (!this.requireAdmin('adicionar monitora')) return;
        const name = this.fixText(this.DOM.inputNewMonitor.value);
        if (!name) return;

        const exists = this.monitors.some(m => this.normalizeText(m) === this.normalizeText(name));
        if (exists) {
            this.showToast('Esta monitora já está cadastrada.', 'error');
            return;
        }

        this.monitors.push(name);
        this.DOM.inputNewMonitor.value = '';
        this.saveAllLocalState();
        this.renderAll();
        this.showToast(`Monitora "${name}" adicionada com sucesso!`);
        this.saveMonitorToSupabase(name);
    }

    removeMonitor(index) {
        if (!this.requireAdmin('remover monitora')) return;
        const name = this.monitors[index];
        this.monitors.splice(index, 1);
        this.saveAllLocalState();
        this.renderAll();
        this.showToast(`Monitora "${name}" removida.`);
        this.deleteMonitorFromSupabase(name);
    }

    // ---- Importação Excel ----
    handleExcelImport(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const wb = XLSX.read(data, { type: 'array' });
                const sheet = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet);

                if (!rows || rows.length === 0) {
                    this.showToast('Planilha vazia.', 'error');
                    return;
                }

                const imported = [];
                rows.forEach(r => {
                    const patient = r.Paciente || r.paciente || r.PACIENTE;
                    const prof = r.Profissional || r.profissional || r.PROFISSIONAL;
                    const therapy = r.Atendimento || r.atendimento || r.Tipo || r.tipo || 'Terapia';
                    const school = r.Instituição || r.Instituicao || r.escola || '';
                    const phone = r.Telefone || r.telefone || '';
                    const transp = r.Transporte || r.transporte || 'Ambos';
                    const notes = r.Obs || r.obs || '';
                    const startTime = String(r.Início || r.Inicio || r.inicio || '08:00').substring(0, 5);
                    const endTime = String(r.Término || r.Termino || r.termino || '09:00').substring(0, 5);
                    const dateVal = this.parseExcelDate(r.Data || r.data);

                    if (patient && prof) {
                        const hour = parseInt(startTime.split(':')[0], 10) || 8;
                        const shift = hour >= 12 ? 'Tarde' : 'Manhã';

                        const item = {
                            id: `${Date.now()}_imp_${Math.random().toString(36).substring(2, 6)}`,
                            patient_name: this.fixText(patient),
                            professional_name: this.fixText(prof),
                            therapy_type: this.fixText(therapy),
                            school_name: this.fixText(school),
                            phone: this.fixText(phone),
                            transport_type: this.fixText(transp),
                            notes: this.fixText(notes),
                            start_time: startTime,
                            end_time: endTime,
                            shift: shift,
                            start_date: dateVal,
                            day_of_week: this.getWeekday(dateVal)
                        };
                        imported.push(item);
                        this.dirtyIds.add(String(item.id));
                        this.schedules.push(item);
                    }
                });

                if (imported.length > 0) {
                    this.saveAllLocalState();
                    this.renderAll();
                    this.showToast(`${imported.length} agendamento(s) importado(s)!`);
                    await this.saveBatchSchedulesToSupabase(imported);
                } else {
                    this.showToast('Nenhum registro válido encontrado.', 'info');
                }
            } catch(err) {
                console.error(err);
                this.showToast('Falha ao ler arquivo Excel.', 'error');
            } finally {
                this.DOM.inputExcelFile.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    }

    handlePdfReport() {
        if (!this.requireAdmin('gerar relatórios')) return;
        const start = this.DOM.reportStartDate.value;
        const end = this.DOM.reportEndDate.value;

        if (!start || !end || start > end) {
            this.showToast('Período de datas inválido.', 'error');
            return;
        }

        const [sy, sm, sd] = start.split('-');
        const [ey, em, ed] = end.split('-');
        const curr = new Date(parseInt(sy, 10), parseInt(sm, 10) - 1, parseInt(sd, 10));
        const endDt = new Date(parseInt(ey, 10), parseInt(em, 10) - 1, parseInt(ed, 10));

        const records = [];
        while (curr <= endDt) {
            const y = curr.getFullYear();
            const m = String(curr.getMonth() + 1).padStart(2, '0');
            const d = String(curr.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;

            const dayList = this.getSchedulesForDate(dateStr);
            dayList.forEach(rec => records.push({ ...rec, rDate: dateStr }));
            curr.setDate(curr.getDate() + 1);
        }

        const rows = records.map(r => `
            <tr>
                <td style="padding:6px; border:1px solid #ccc;">${this.formatDateBR(r.rDate)}</td>
                <td style="padding:6px; border:1px solid #ccc;">${this.escapeHtml(r.patient_name)}</td>
                <td style="padding:6px; border:1px solid #ccc;">${this.escapeHtml(r.professional_name)} (${this.escapeHtml(r.therapy_type)})</td>
                <td style="padding:6px; border:1px solid #ccc;">${this.escapeHtml(r.start_time)} - ${this.escapeHtml(r.end_time)} (${this.escapeHtml(r.shift)})</td>
                <td style="padding:6px; border:1px solid #ccc;">${this.escapeHtml(r.school_name)}</td>
                <td style="padding:6px; border:1px solid #ccc;">${this.escapeHtml(r.assigned_monitor || 'Não atribuída')}</td>
                <td style="padding:6px; border:1px solid #ccc;">${r.status === 'CANCELADO' ? 'Cancelado' : 'Concluído/Em Transporte'}</td>
            </tr>
        `).join('');

        const win = window.open('', '_blank');
        win.document.write(`
            <html>
            <head>
                <title>Relatório Transporte TEA</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    h1 { color: #1e40af; font-size: 1.4rem; }
                    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 10px; }
                    th { background: #f1f5f9; padding: 8px; border: 1px solid #ccc; text-align: left; }
                </style>
            </head>
            <body>
                <h1>Relatório de Atendimentos Transporte Especial TEA</h1>
                <p>Período: <strong>${this.formatDateBR(start)}</strong> a <strong>${this.formatDateBR(end)}</strong> &bull; Total: <strong>${records.length}</strong></p>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th><th>Paciente</th><th>Profissional</th><th>Horário</th><th>Instituição</th><th>Monitora</th><th>Status</th>
                        </tr>
                    </thead>
                    <tbody>${rows || '<tr><td colspan="7" style="text-align:center; padding:10px;">Nenhum registro.</td></tr>'}</tbody>
                </table>
                <script>window.print();<\/script>
            </body>
            </html>
        `);
        win.document.close();
    }

    // ---- Sincronização Master Multi-Aparelhos com Supabase ----
    async supabaseFetch(endpoint, options = {}) {
        const response = await fetch(`${this.SUPABASE_URL}/rest/v1/${endpoint}`, {
            mode: 'cors', cache: 'no-store', ...options,
            headers: {
                apikey: this.SUPABASE_KEY,
                Authorization: `Bearer ${this.SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        });
        const text = await response.text();
        let json = text ? JSON.parse(text) : null;
        if (!response.ok) throw new Error(json?.message || `HTTP ${response.status}`);
        return json;
    }

    async flushPendingSync() {
        if (!navigator.onLine) return;

        // 1. Processar exclusões pendentes
        if (this.pendingRemoteDeletions && this.pendingRemoteDeletions.length > 0) {
            const queue = [...this.pendingRemoteDeletions];
            const remaining = [];
            for (const item of queue) {
                try {
                    if (item.id) {
                        await this.supabaseFetch(`appointments?id=eq.${encodeURIComponent(item.id)}`, { method: 'DELETE' });
                    }
                } catch(e) {
                    remaining.push(item);
                }
            }
            this.pendingRemoteDeletions = remaining;
            this.saveLocalStore('lumina_pending_remote_deletions_store', this.pendingRemoteDeletions);
        }

        // 2. Processar upserts pendentes
        if (this.pendingSync && this.pendingSync.length > 0) {
            const queue = [...this.pendingSync];
            const remaining = [];
            for (const item of queue) {
                try {
                    const payload = this.toSupabaseFormat(item);
                    await this.supabaseFetch('appointments?on_conflict=id', {
                        method: 'POST',
                        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
                        body: JSON.stringify(payload)
                    });
                    this.dirtyIds.delete(String(item.id));
                } catch(e) {
                    remaining.push(item);
                }
            }
            this.pendingSync = remaining;
            this.saveLocalStore('lumina_pending_sync_store', this.pendingSync);
        }
    }

    // SINCRONIZAÇÃO MASTER: Garante 100% de paridade entre múltiplos aparelhos
    async syncFromSupabase() {
        if (!navigator.onLine) return;

        await this.flushPendingSync();

        try {
            const rawData = await this.supabaseFetch('appointments?select=*&order=data.asc&limit=10000');
            if (Array.isArray(rawData)) {
                const remoteItems = rawData.map(r => this.fromSupabaseFormat(r));
                
                // Mapeia rascunhos locais que ainda estão sendo enviados
                const pendingMap = new Map();
                (this.pendingSync || []).forEach(p => pendingMap.set(String(p.id), p));

                // Mapa mestre: Supabase como fonte da verdade absoluta
                const masterMap = new Map();
                remoteItems.forEach(r => {
                    const idStr = String(r.id || '');
                    if (pendingMap.has(idStr)) {
                        masterMap.set(idStr, pendingMap.get(idStr));
                    } else {
                        masterMap.set(idStr, r);
                    }
                });

                // Inclui novos rascunhos locais que ainda não foram persistidos no Supabase
                pendingMap.forEach((val, key) => {
                    if (!masterMap.has(key)) {
                        masterMap.set(key, val);
                    }
                });

                this.schedules = Array.from(masterMap.values());
                this.saveLocalStore('lumina_schedules_store', this.schedules);
                this.renderAll();
            }

            const remoteMonitors = await this.supabaseFetch('monitors?select=*');
            if (Array.isArray(remoteMonitors) && remoteMonitors.length > 0) {
                const names = remoteMonitors.map(m => m.monitora || m.name).filter(Boolean);
                if (names.length > 0) {
                    this.monitors = Array.from(new Set(names));
                    this.saveLocalStore('lumina_monitors_store', this.monitors);
                    this.renderMonitorsList();
                }
            }
        } catch(e) {
            console.warn('Sincronização em segundo plano:', e);
        }
    }

    async saveScheduleToSupabase(item) {
        this.dirtyIds.add(String(item.id));
        if (!navigator.onLine) {
            if (!this.pendingSync.some(p => String(p.id) === String(item.id))) {
                this.pendingSync.push(item);
                this.saveLocalStore('lumina_pending_sync_store', this.pendingSync);
            }
            return;
        }
        try {
            const payload = this.toSupabaseFormat(item);
            await this.supabaseFetch('appointments?on_conflict=id', {
                method: 'POST',
                headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
                body: JSON.stringify(payload)
            });
            this.dirtyIds.delete(String(item.id));
            this.pendingSync = this.pendingSync.filter(p => String(p.id) !== String(item.id));
            this.saveLocalStore('lumina_pending_sync_store', this.pendingSync);
        } catch(e) {
            if (!this.pendingSync.some(p => String(p.id) === String(item.id))) {
                this.pendingSync.push(item);
                this.saveLocalStore('lumina_pending_sync_store', this.pendingSync);
            }
        }
    }

    async saveBatchSchedulesToSupabase(items) {
        if (!navigator.onLine || !Array.isArray(items) || items.length === 0) return;
        try {
            const payloads = items.map(item => this.toSupabaseFormat(item));
            for (let i = 0; i < payloads.length; i += 100) {
                const chunk = payloads.slice(i, i + 100);
                await this.supabaseFetch('appointments?on_conflict=id', {
                    method: 'POST',
                    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
                    body: JSON.stringify(chunk)
                });
            }
            items.forEach(it => this.dirtyIds.delete(String(it.id)));
        } catch(e) {
            console.error('Falha no salvamento em lote:', e);
        }
    }

    async deleteScheduleFromSupabase(id) {
        if (!id) return;
        const task = { id };
        if (!this.pendingRemoteDeletions) this.pendingRemoteDeletions = [];

        if (!navigator.onLine) {
            if (!this.pendingRemoteDeletions.some(t => t.id === id)) {
                this.pendingRemoteDeletions.push(task);
                this.saveLocalStore('lumina_pending_remote_deletions_store', this.pendingRemoteDeletions);
            }
            return;
        }

        try {
            await this.supabaseFetch(`appointments?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
            this.pendingRemoteDeletions = this.pendingRemoteDeletions.filter(t => t.id !== id);
            this.pendingDeletions = (this.pendingDeletions || []).filter(i => i !== id);
            this.saveLocalStore('lumina_pending_remote_deletions_store', this.pendingRemoteDeletions);
            this.saveLocalStore('lumina_pending_deletions_store', this.pendingDeletions);
        } catch(e) {
            if (!this.pendingRemoteDeletions.some(t => t.id === id)) {
                this.pendingRemoteDeletions.push(task);
                this.saveLocalStore('lumina_pending_remote_deletions_store', this.pendingRemoteDeletions);
            }
        }
    }

    async saveMonitorToSupabase(name) {
        if (!navigator.onLine) return;
        try {
            await this.supabaseFetch('monitors', {
                method: 'POST',
                body: JSON.stringify({ id: Date.now().toString(), monitora: name })
            });
        } catch(e) {}
    }

    async deleteMonitorFromSupabase(name) {
        if (!navigator.onLine) return;
        try {
            await this.supabaseFetch(`monitors?monitora=eq.${encodeURIComponent(name)}`, { method: 'DELETE' });
        } catch(e) {}
    }

    // Poller de 3.5s para paridade em tempo real entre aparelhos
    startBackgroundPoller() {
        setInterval(() => {
            if (!document.hidden) this.syncFromSupabase();
        }, 3500);
    }
}

// Inicialização Global
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new LuminaApp();
});
