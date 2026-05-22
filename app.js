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

    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
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

    // ---- Init Filters ----
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);
    if(DOM.fData) DOM.fData.value = localISOTime;

    // ---- Data Management (Google Sheets API) ----
    const API_URL = "https://script.google.com/macros/s/AKfycbw6Dza5i3iQajXG2xA87zd_tn84H5j0z7YMwuCGnG1rNsWbkJiK6DKl1I2Hx-vI4aepNg/exec";
    let appointments = [];
    const DEFAULT_MONITORAS = ["Vanessa", "Luciana", "Eliane", "Nenhuma"];
    let MONITORAS = parseJsonSafe(localStorage.getItem('lumina_monitoras'), null);
    if (!Array.isArray(MONITORAS) || MONITORAS.length === 0) {
        MONITORAS = [...DEFAULT_MONITORAS];
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
            DOM.agendaList.innerHTML = '<div class="py-12 flex flex-col items-center justify-center text-textMain/50 font-medium gap-4"><i class="ph ph-spinner-gap animate-spin text-4xl text-primaryStart"></i><div>Sincronizando com a Nuvem...</div></div>';
        }
        
        try {
            if (!navigator.onLine) {
                if (!silent) showToast('Você está offline. Exibindo dados em cache.', 'error');
                return;
            }
            const response = await fetch(API_URL + "?nocache=" + Date.now(), { cache: 'no-store' });
            const data = await parseApiResponse(response);
            
            const formatTime = (val) => {
                if (!val) return '';
                if (typeof val === 'string' && val.includes('T')) {
                    const d = new Date(val);
                    if (!isNaN(d)) return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
                }
                return String(val).substring(0, 5);
            };

            if(!data.error) {
                const newData = data.map(item => {
                    let dInicio = item.dataInicio || item.datainicio || item['Data Início'] || item['Data Inicio'] || '';
                    if (dInicio && typeof dInicio === 'string') {
                        if (dInicio.includes('T')) {
                            dInicio = dInicio.split('T')[0];
                        } else if (dInicio.includes('/')) {
                            const datePart = dInicio.split(' ')[0];
                            const parts = datePart.split('/');
                            if (parts.length === 3) {
                                dInicio = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                            }
                        } else if (dInicio.includes(' ')) {
                            dInicio = dInicio.split(' ')[0];
                        }
                    }
                    return {
                        ...item,
                        dataInicio: dInicio,
                        inicio: formatTime(item.inicio),
                        termino: formatTime(item.termino)
                    };
                });
                
                if (silent) {
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
            } else {
                if (!silent) {
                    console.error("API Error:", data.error);
                    appointments = [];
                    updateFilterOptions();
                    render();
                }
            }
        } catch(e) {
            if (!silent) {
                console.error("Network Error:", e);
                DOM.agendaList.innerHTML = '<div class="py-12 text-center text-red-500 font-medium">Falha na conexão com a Nuvem. Tente recarregar.</div>';
            }
        }
    }

    async function loadMonitors() {
        try {
            const response = await fetch(API_URL + "?sheet=monitors&nocache=" + Date.now());
            const data = await parseApiResponse(response);
            if (Array.isArray(data)) {
                const names = data.map(m => m.monitora || m.Monitora || m.MONITORA).filter(Boolean);
                if (names.length > 0) {
                    MONITORAS = names;
                    render(); 
                }
            }
        } catch(e) {
            console.error("Error loading monitors:", e);
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
                const trVal = (tr === 'Entrada' || tr === 'Saída') ? tr : 'Ambos';
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

        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="ph ph-spinner-gap animate-spin text-xl inline-block mr-2"></i> Salvando na Planilha...';
        submitBtn.disabled = true;

        const id = document.getElementById('formId').value;
        const inicioValue = document.getElementById('formInicio').value;
        const horaInicio = parseInt(inicioValue.split(':')[0], 10);
        let turnoCalculado = 'Manhã';
        if (horaInicio >= 13) {
            turnoCalculado = 'Tarde';
        }

        const dataInicioVal = document.getElementById('formDataInicio') ? document.getElementById('formDataInicio').value : '';
        let diaCalculado = '';
        if (dataInicioVal) {
            diaCalculado = getWeekdayFromISO(dataInicioVal);
        }

        const newRecord = {
            id: id || Date.now().toString(),
            profissional: document.getElementById('formProfissional').value,
            tipo: document.getElementById('formTipo').value,
            paciente: document.getElementById('formPaciente').value,
            dia: diaCalculado,
            dataInicio: dataInicioVal,
            turno: turnoCalculado,
            inicio: inicioValue,
            termino: document.getElementById('formTermino').value,
            escola: document.getElementById('formEscola').value,
            telefone: document.getElementById('formTelefone').value,
            transporte: document.getElementById('formTransporte') ? document.getElementById('formTransporte').value : 'Ambos',
            obs: document.getElementById('formObs').value
        };

        const action = id ? 'UPDATE' : 'CREATE';

        if (id) {
            const existing = appointments.find(a => String(a.id) === String(id));
            if (existing && existing.excecoes) {
                newRecord.excecoes = existing.excecoes;
            }
        }

        try {
            const resp = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: action, data: newRecord })
            });
            await parseApiResponse(resp);
            
            if (id) {
                const idx = appointments.findIndex(a => String(a.id) === String(id));
                if(idx > -1) appointments[idx] = newRecord;
            } else {
                appointments.push(newRecord);
            }
            localStorage.setItem('lumina_agenda_cache', JSON.stringify(appointments));
            
            updateFilterOptions();
            render();
            closeDrawer();
            showToast(id ? 'Agendamento atualizado!' : 'Agendamento criado!');
        } catch(e) {
            console.error(e);
            showToast('Falha ao comunicar com o banco.', 'error');
        } finally {
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
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'DELETE', id: id })
                });
                await parseApiResponse(response);
                
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

    [DOM.fData, DOM.fProf, DOM.fTurno, DOM.fEscola].forEach(el => {
        if(el) el.addEventListener('change', render);
    });

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
            if (DOM.fTurno) DOM.fTurno.value = 'Manhã';
            render();
        });
    }

    if (DOM.dashAfternoonCard) {
        DOM.dashAfternoonCard.addEventListener('click', () => {
            if (DOM.fTurno) DOM.fTurno.value = 'Tarde';
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

    function getFilteredAppointments({ ignoreTurno = false, ignoreEscola = false } = {}) {
        const { dateRef, targetWeekday } = getDateFilterInfo();

        return appointments.filter(a => {
            const dateMatch = !targetWeekday || a.dia === targetWeekday;
            const pMatch = !DOM.fProf.value || a.profissional === DOM.fProf.value;
            const tMatch = ignoreTurno || !DOM.fTurno.value || a.turno === DOM.fTurno.value;
            const eMatch = ignoreEscola || !DOM.fEscola.value || a.escola === DOM.fEscola.value;

            const searchVal = DOM.fPaciente ? DOM.fPaciente.value.toLowerCase() : '';
            const pacienteMatch = !searchVal || (a.paciente && a.paciente.toLowerCase().includes(searchVal));

            let started = true;
            if (dateRef && a.dataInicio) {
                if (dateRef < a.dataInicio) started = false;
            }

            return dateMatch && pMatch && tMatch && eMatch && started && pacienteMatch;
        });
    }

    function renderDashboard(filtered) {
        if (!DOM.dashTotal) return;

        const { dateRef } = getDateFilterInfo();

        const isCancelledFn = (item) => {
            if (!dateRef) return false;
            const exc = parseJsonSafe(item.excecoes, {});
            const rawValue = exc[dateRef];
            if (rawValue) {
                return (typeof rawValue === 'object') ? rawValue.status === 'CANCELADO' : rawValue === 'CANCELADO';
            }
            return false;
        };

        // Total: respeita todos os filtros ativos
        const activeFiltered = filtered.filter(a => !isCancelledFn(a));

        // Manhã/Tarde: ignora filtro de turno mas respeita escola/profissional/busca
        const byTurnoBase = getFilteredAppointments({ ignoreTurno: true }).filter(a => !isCancelledFn(a));
        const morningCount = byTurnoBase.filter(a => a.turno === 'Manhã').length;
        const afternoonCount = byTurnoBase.filter(a => a.turno === 'Tarde').length;

        // Escolas: ignora filtro de escola, mas respeita turno/profissional/busca
        const byEscolaBase = getFilteredAppointments({ ignoreEscola: true }).filter(a => !isCancelledFn(a));

        // Monitoras: resumo informativo, sem filtragem por monitora
        const byMonitoraBase = filtered.filter(a => !isCancelledFn(a));

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

        DOM.dashMorningCard?.classList.toggle('active', DOM.fTurno?.value === 'Manhã');
        DOM.dashAfternoonCard?.classList.toggle('active', DOM.fTurno?.value === 'Tarde');
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
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                .slice(0, 8);

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

        // ---- Contagem de monitoras (lê exceções do dia) ----
        const monitorCounts = new Map();
        byMonitoraBase.forEach(item => {
            const exc = parseJsonSafe(item.excecoes, {});
            const rawValue = dateRef ? exc[dateRef] : null;
            let todayMonitor = '';
            if (rawValue && typeof rawValue === 'object') {
                todayMonitor = rawValue.monitora || '';
            }
            // fallback: monitora padrão do agendamento
            if (!todayMonitor) todayMonitor = item.monitora || '';
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
            let exc = {};
            exc = parseJsonSafe(item.excecoes, {});
            const rawValue = dateRef ? exc[dateRef] : null;
            let todayStatus = '';
            let todayMonitor = '';

            if (rawValue) {
                if (typeof rawValue === 'object') {
                    todayStatus = rawValue.status || '';
                    todayMonitor = rawValue.monitora || '';
                } else {
                    todayStatus = rawValue;
                }
            }

            const isCancelled = todayStatus === 'CANCELADO';
            const isCompletedEntrada = todayStatus && todayStatus.includes('ENTRADA');
            const isCompletedSaida = todayStatus && todayStatus.includes('SAIDA');
            
            const cardOpacity = isCancelled ? 'opacity-40 grayscale' : '';
            
            const checkColorEntrada = isCompletedEntrada ? 'bg-specGreen text-white border-specGreen shadow-sm' : 'bg-surface border-textMain/10 text-textMain/40 hover:border-specGreen hover:text-specGreen';
            const checkColorSaida = isCompletedSaida ? 'bg-specGreen text-white border-specGreen shadow-sm' : 'bg-surface border-textMain/10 text-textMain/40 hover:border-specGreen hover:text-specGreen';
            const cancelColor = isCancelled ? 'bg-specRed text-white border-specRed shadow-sm' : 'bg-surface border-textMain/10 text-textMain/40 hover:border-specRed hover:text-specRed';

            const pillClass = item.turno === 'Manhã' ? 'manha' : 'tarde';
            const phone = normalizeWhatsappPhone(item.telefone);
            const wppLink = phone ? `https://wa.me/${phone}` : '#';
            
            const trType = item.transporte;
            const repEntrada = (trType === 'Entrada' || trType === 'Ambos' || trType === true || !trType);
            const repSaida = (trType === 'Saída' || trType === 'Ambos' || trType === true || !trType);
            const itemIdJs = escapeJsString(item.id);
            const patientNameText = item.paciente || 'Sem paciente';
            const patientNameHtml = escapeHtml(patientNameText);
            const profissionalHtml = escapeHtml(item.profissional || 'Sem profissional');
            const tipoHtml = escapeHtml(item.tipo || 'Sem atendimento');
            const turnoHtml = escapeHtml(item.turno || '');
            const inicioHtml = escapeHtml(item.inicio || '--');
            const terminoHtml = escapeHtml(item.termino || '--');
            const diaHtml = escapeHtml(item.dia || '');
            const escolaHtml = escapeHtml(item.escola || '');
            const obsHtml = escapeHtml(item.obs || '');

            let actionButtons = '';
            if (dateRef) {
                let btnsHtml = '';
                const pName = escapeJsString(patientNameText);
                if (repEntrada) {
                    btnsHtml += `
                    <button class="flex-1 py-1.5 rounded-lg border-2 font-display font-bold text-[0.65rem] sm:text-[0.7rem] flex items-center justify-center gap-1 transition-all ${checkColorEntrada}" onclick="confirmStatusChange('${itemIdJs}', '${dateRef}', 'ENTRADA', '${pName}')">
                        <i class="ph ${isCompletedEntrada ? 'ph-check-circle' : 'ph-sign-in'} text-base"></i> Entrada
                    </button>`;
                }
                if (repSaida) {
                    btnsHtml += `
                    <button class="flex-1 py-1.5 rounded-lg border-2 font-display font-bold text-[0.65rem] sm:text-[0.7rem] flex items-center justify-center gap-1 transition-all ${checkColorSaida}" onclick="confirmStatusChange('${itemIdJs}', '${dateRef}', 'SAIDA', '${pName}')">
                        <i class="ph ${isCompletedSaida ? 'ph-check-circle' : 'ph-sign-out'} text-base"></i> Saída
                    </button>`;
                }
                btnsHtml += `
                <button class="flex-1 py-1.5 rounded-lg border-2 font-display font-bold text-[0.65rem] sm:text-[0.7rem] flex items-center justify-center gap-1 transition-all ${cancelColor}" onclick="confirmStatusChange('${itemIdJs}', '${dateRef}', 'CANCELADO', '${pName}')">
                    <i class="ph ${isCancelled ? 'ph-x-circle' : 'ph-x'} text-base"></i> Não irá
                </button>`;

                const monitorOptions = MONITORAS.map(m => `<option value="${escapeHtml(m)}" ${todayMonitor === m ? 'selected' : ''}>${escapeHtml(m)}</option>`).join('');

                actionButtons = `
                <div class="mt-1.5 pt-2 border-t border-textMain/5 flex flex-col gap-2 pointer-events-auto relative z-20">
                    <div class="flex items-center gap-1.5">
                        <label class="text-[0.6rem] font-bold text-textMain/40 uppercase tracking-widest whitespace-nowrap">Monitora:</label>
                        <select class="flex-1 bg-surface border border-textMain/10 rounded-lg px-2 py-1 text-xs font-medium outline-none" onchange="window.updateDailyMonitor('${itemIdJs}', '${dateRef}', this.value)">
                            <option value="">Selecionar...</option>
                            ${monitorOptions}
                        </select>
                    </div>
                    <div class="flex gap-1.5">
                        ${btnsHtml}
                    </div>
                </div>`;
            }
            
            let fullyDone = false;
            if (isCancelled) fullyDone = true;
            else if (repEntrada && repSaida) fullyDone = isCompletedEntrada && isCompletedSaida;
            else if (repEntrada) fullyDone = isCompletedEntrada;
            else if (repSaida) fullyDone = isCompletedSaida;

            const card = document.createElement('div');
            card.className = 'agenda-card transition-all duration-300 ' + cardOpacity;
            card.dataset.id = item.id;
            card.dataset.inicio = item.inicio || '';
            card.dataset.cancelled = isCancelled ? 'true' : 'false';
            card.dataset.fullydone = fullyDone ? 'true' : 'false';
            card.innerHTML = `
                <div class="turno-pill ${pillClass}"></div>
                <div class="card-header flex items-start justify-between gap-3">
                    <div>
                        <div class="flex items-center gap-1.5 mb-0.5">
                            <div class="font-display font-bold text-specBlue text-[0.65rem] bg-specBlue/10 px-1.5 py-0.5 rounded-md">
                                <i class="ph ph-clock mr-1"></i>
                                ${inicioHtml} às ${terminoHtml}
                            </div>
                            <span class="text-[0.6rem] font-bold text-textMain/50 uppercase tracking-widest">${turnoHtml}</span>
                        </div>
                        <h3 class="patient-name">${patientNameHtml}</h3>
                    </div>
                    <div class="card-actions pointer-events-auto admin-only">
                        <button class="btn-icon edit pointer-events-auto" onclick="editAppointment('${itemIdJs}')">
                            <i class="ph ph-pencil-simple text-lg"></i>
                        </button>
                        <button class="btn-icon delete pointer-events-auto" onclick="deleteAppointment('${itemIdJs}')">
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
                        <span class="detail-value"><i class="ph ph-calendar-blank text-textMain/50 text-base"></i> ${diaHtml}</span>
                    </div>
                    ${item.escola ? `
                    <div class="detail-item">
                        <span class="detail-label">Instituição</span>
                        <span class="detail-value"><i class="ph ph-buildings text-textMain/50 text-base"></i> ${escolaHtml}</span>
                    </div>` : ''}
                </div>

                <div class="flex justify-between items-center mt-0.5 gap-2">
                    <div class="flex gap-1.5 flex-wrap">
                        <span class="badge"><i class="ph ph-bus text-specGreen"></i> ${trType === 'Entrada' ? 'Somente Entrada' : (trType === 'Saída' ? 'Somente Saída' : 'Ida e Volta')}</span>
                        ${item.obs ? `<span class="badge bg-specYellow/10 text-specYellow"><i class="ph ph-info"></i> ${obsHtml}</span>` : ''}
                    </div>
                    ${!isCancelled ? `<a href="${wppLink}" target="_blank" class="whatsapp-link relative z-20 pointer-events-auto"><i class="ph ph-whatsapp-logo text-xl"></i> Contatar</a>` : ''}
                </div>
                ${actionButtons}
            `;
            DOM.agendaList.appendChild(card);
        });
    }

    // ---- Date Specific Actions ----
    window.confirmStatusChange = (id, dateStr, clickedStatus, patientName) => {
        let actionLabel = '';
        let icon = '';
        let color = '';
        
        if (clickedStatus === 'ENTRADA') {
            actionLabel = 'Confirmar entrada';
            icon = 'ph-sign-in';
            color = 'bg-specGreen/10 text-specGreen';
        } else if (clickedStatus === 'SAIDA') {
            actionLabel = 'Confirmar saída';
            icon = 'ph-sign-out';
            color = 'bg-specGreen/10 text-specGreen';
        } else if (clickedStatus === 'CANCELADO') {
            actionLabel = 'Confirmar falta (Não Irá)';
            icon = 'ph-x-circle';
            color = 'bg-specRed/10 text-specRed';
        }

        showConfirmationModal({
            title: actionLabel,
            message: `Deseja registrar esta ação para ${patientName}?`,
            iconClass: icon,
            colorClass: color,
            onConfirm: () => window.toggleDailyStatus(id, dateStr, clickedStatus)
        });
    };

    window.toggleDailyStatus = async (id, dateStr, clickedStatus) => {
        const itemIdx = appointments.findIndex(a => String(a.id) === String(id));
        if (itemIdx === -1) return;
        
        const item = appointments[itemIdx];
        const previousExcecoes = item.excecoes || '';
        let exc = parseJsonSafe(item.excecoes, {});
        
        const rawValue = exc[dateStr];
        let currentStatus = '';
        let currentMonitor = '';

        if (rawValue) {
            if (typeof rawValue === 'object') {
                currentStatus = rawValue.status || '';
                currentMonitor = rawValue.monitora || '';
            } else {
                currentStatus = rawValue;
            }
        }
        
        let newStatus = currentStatus;
        if (clickedStatus === 'CANCELADO') {
            if (currentStatus === 'CANCELADO') newStatus = '';
            else newStatus = 'CANCELADO';
        } else {
            if (currentStatus === 'CANCELADO') currentStatus = '';
            let parts = currentStatus ? currentStatus.split(',') : [];
            if (parts.includes(clickedStatus)) {
                parts = parts.filter(p => p !== clickedStatus);
            } else {
                parts.push(clickedStatus);
            }
            newStatus = parts.join(',');
        }

        if (newStatus || currentMonitor) {
            exc[dateStr] = { status: newStatus, monitora: currentMonitor };
        } else {
            delete exc[dateStr];
        }
        
        item.excecoes = JSON.stringify(exc);
        localStorage.setItem('lumina_agenda_cache', JSON.stringify(appointments));
        render();
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'UPDATE', data: item })
            });
            await parseApiResponse(response);
        } catch (e) {
            console.error(e);
            item.excecoes = previousExcecoes;
            render();
            alert('Não foi possível atualizar o status na nuvem.');
        }
    };

    window.updateDailyMonitor = async (id, dateStr, monitorName) => {
        const itemIdx = appointments.findIndex(a => String(a.id) === String(id));
        if (itemIdx === -1) return;
        
        const item = appointments[itemIdx];
        const previousExcecoes = item.excecoes || '';
        let exc = parseJsonSafe(item.excecoes, {});
        
        const rawValue = exc[dateStr];
        let currentStatus = '';

        if (rawValue) {
            if (typeof rawValue === 'object') {
                currentStatus = rawValue.status || '';
            } else {
                currentStatus = rawValue;
            }
        }

        if (monitorName || currentStatus) {
            exc[dateStr] = { status: currentStatus, monitora: monitorName };
        } else {
            delete exc[dateStr];
        }
        
        item.excecoes = JSON.stringify(exc);
        localStorage.setItem('lumina_agenda_cache', JSON.stringify(appointments));

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'UPDATE', data: item })
            });
            await parseApiResponse(response);
        } catch (e) {
            console.error(e);
            item.excecoes = previousExcecoes;
            render();
            alert('Não foi possível atualizar a monitora na nuvem.');
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
            const response = await fetch(API_URL + "?sheet=monitors");
            const cloudData = await parseApiResponse(response);
            const monitorEntry = cloudData.find(m => (m.monitora || m.Monitora || m.MONITORA) === monitorName);
            
            if (monitorEntry) {
                const targetId = monitorEntry.id || monitorEntry.ID;
                const deleteResponse = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ 
                        action: 'DELETE', 
                        sheet: 'monitors',
                        id: targetId 
                    })
                });
                await parseApiResponse(deleteResponse);
            }
        } catch(e) {
            console.error(e);
            alert('Não foi possível remover a monitora na nuvem.');
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
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ 
                        action: 'CREATE', 
                        sheet: 'monitors',
                        data: { id: newId, monitora: name } 
                    })
                });
                await parseApiResponse(response);
            } catch(e) {
                console.error(e);
                alert('Não foi possível adicionar a monitora na nuvem.');
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
        loadData(true);
        loadMonitors();
    }, 5000);

    // Sincronizar IMEDIATAMENTE ao voltar para o app (útil no celular)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            loadData(true);
            loadMonitors();
        }
    });

    if (location.protocol !== 'file:' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations()
            .then((registrations) => registrations.forEach((registration) => registration.unregister()))
            .catch((error) => console.warn('Service worker indisponível:', error));
    }
});
