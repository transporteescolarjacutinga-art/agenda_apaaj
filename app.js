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
        
        navGravity: document.getElementById('navGravity'),
        navGravityMobile: document.getElementById('navGravityMobile'),
        mainContainer: document.getElementById('mainContainer'),
        confirmModalOverlay: document.getElementById('confirmModalOverlay'),
        btnConfirmOk: document.getElementById('btnConfirmOk'),
        btnConfirmCancel: document.getElementById('btnConfirmCancel')
    };

    // ---- Init Filters ----
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);
    if(DOM.fData) DOM.fData.value = localISOTime;

    // ---- Data Management (Google Sheets API) ----
    const API_URL = "https://script.google.com/macros/s/AKfycbw6Dza5i3iQajXG2xA87zd_tn84H5j0z7YMwuCGnG1rNsWbkJiK6DKl1I2Hx-vI4aepNg/exec";
    let appointments = [];

    async function loadData(silent = false) {
        if (!silent) {
            DOM.agendaList.innerHTML = '<div class="py-12 flex flex-col items-center justify-center text-textMain/50 font-medium gap-4"><i class="ph ph-spinner-gap animate-spin text-4xl text-primaryStart"></i><div>Sincronizando com o Google Sheets...</div></div>';
        }
        
        try {
            const response = await fetch(API_URL + "?nocache=" + Date.now(), { cache: 'no-store' });
            const data = await response.json();
            
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
                        updateFilterOptions();
                        if (!gravityActive) render();
                    }
                } else {
                    appointments = newData;
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

    // ---- Drawer Logic ----
    function openDrawer(mode = 'create', id = null) {
        
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
        
        const submitBtn = DOM.form.querySelector('button[type="submit"]');
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
            const [y, m, d] = dataInicioVal.split('-');
            const dummyDate = new Date(y, m-1, d);
            const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
            diaCalculado = weekdays[dummyDate.getDay()];
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

        // Preserve excecoes if it exists
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
            const result = await resp.json();
            
            if (id) {
                const idx = appointments.findIndex(a => String(a.id) === String(id));
                if(idx > -1) appointments[idx] = newRecord;
            } else {
                appointments.push(newRecord);
            }
            
            updateFilterOptions();
            render();
            closeDrawer();
        } catch(e) {
            console.error(e);
            alert('Falha ao comunicar com o Google Sheets.');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    window.deleteAppointment = async (id) => {
        if(gravityActive) return;
        if(confirm('Excluir este agendamento do Google Sheets definitivamente?')) {
            DOM.agendaList.innerHTML = '<div class="py-12 flex flex-col items-center gap-2"><i class="ph ph-spinner-gap animate-spin text-2xl text-red-500"></i> Excluindo da planilha...</div>';
            
            try {
                await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'DELETE', id: id })
                });
                
                appointments = appointments.filter(a => String(a.id) !== String(id));
                updateFilterOptions();
                render();
            } catch(e) {
                console.error(e);
                alert("Erro ao tentar deletar na Nuvem.");
                render(); // Restore UI on failure
            }
        }
    };

    window.editAppointment = (id) => openDrawer('edit', id);

    [DOM.fData, DOM.fProf, DOM.fTurno, DOM.fEscola].forEach(el => {
        if(el) el.addEventListener('change', render);
    });
    if (DOM.fPaciente) {
        DOM.fPaciente.addEventListener('input', render);
    }

    function updateFilterOptions() {
        // Build set of unique entries
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
        btnAdminLogin.addEventListener('click', () => {
            const senha = prompt("Acesso Restrito. Digite a senha da coordenação:");
            if (senha === "2026") {
                document.body.classList.remove('viewer-mode');
                btnAdminLogin.classList.add('hidden');
                btnAdminLogout.classList.remove('hidden');
                sessionStorage.setItem('isAdmin', 'true');
            } else if (senha !== null && senha !== "") {
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

    // ---- Render logic ----
    function render() {
        const dateRef = DOM.fData ? DOM.fData.value : null;
        let targetWeekday = '';
        if (dateRef) {
            const [y, m, d] = dateRef.split('-');
            const dummyDate = new Date(y, m-1, d);
            const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
            targetWeekday = weekdays[dummyDate.getDay()];
        }

        let filtered = appointments.filter(a => {
            const dateMatch = !targetWeekday || a.dia === targetWeekday;
            const pMatch = !DOM.fProf.value || a.profissional === DOM.fProf.value;
            const tMatch = !DOM.fTurno.value || a.turno === DOM.fTurno.value;
            const eMatch = !DOM.fEscola.value || a.escola === DOM.fEscola.value;
            
            const searchVal = DOM.fPaciente ? DOM.fPaciente.value.toLowerCase() : '';
            const pacienteMatch = !searchVal || (a.paciente && a.paciente.toLowerCase().includes(searchVal));
            
            let started = true;
            if (dateRef && a.dataInicio) {
                if (dateRef < a.dataInicio) {
                    started = false;
                }
            }
            
            return dateMatch && pMatch && tMatch && eMatch && started && pacienteMatch;
        });

        filtered.sort((a, b) => {
            const timeA = a.inicio || '24:00';
            const timeB = b.inicio || '24:00';
            return timeA.localeCompare(timeB);
        });

        DOM.count.textContent = filtered.length;
        if (DOM.countMobile) DOM.countMobile.textContent = filtered.length;
        DOM.agendaList.innerHTML = '';

        if (filtered.length === 0) {
            DOM.agendaList.innerHTML = `<div class="py-12 text-center text-textMain/50 font-medium">Nenhum agendamento encontrado para os filtros atuais.</div>`;
            return;
        }

        filtered.forEach(item => {
            let exc = {};
            try { exc = JSON.parse(item.excecoes || '{}'); } catch(e){}
            const todayStatus = dateRef ? exc[dateRef] : null;

            const isCancelled = todayStatus === 'CANCELADO';
            const isCompletedEntrada = todayStatus && todayStatus.includes('ENTRADA');
            const isCompletedSaida = todayStatus && todayStatus.includes('SAIDA');
            
            const cardOpacity = isCancelled ? 'opacity-40 grayscale' : '';
            
            const checkColorEntrada = isCompletedEntrada ? 'bg-specGreen text-white border-specGreen shadow-sm' : 'bg-surface border-textMain/10 text-textMain/40 hover:border-specGreen hover:text-specGreen';
            const checkColorSaida = isCompletedSaida ? 'bg-specGreen text-white border-specGreen shadow-sm' : 'bg-surface border-textMain/10 text-textMain/40 hover:border-specGreen hover:text-specGreen';
            const cancelColor = isCancelled ? 'bg-specRed text-white border-specRed shadow-sm' : 'bg-surface border-textMain/10 text-textMain/40 hover:border-specRed hover:text-specRed';

            const pillClass = item.turno === 'Manhã' ? 'manha' : 'tarde';
            const phone = item.telefone ? String(item.telefone).replace(/\D/g, '') : '';
            const wppLink = phone ? `https://wa.me/55${phone}` : '#';
            
            const trType = item.transporte;
            const repEntrada = (trType === 'Entrada' || trType === 'Ambos' || trType === true || !trType);
            const repSaida = (trType === 'Saída' || trType === 'Ambos' || trType === true || !trType);

            let actionButtons = '';
            if (dateRef) {
                let btnsHtml = '';
                const pName = (item.paciente || 'paciente').replace(/'/g, "\\'");
                if (repEntrada) {
                    btnsHtml += `
                    <button class="flex-1 py-1.5 sm:py-2 rounded-xl border-2 font-display font-bold text-[0.65rem] sm:text-xs flex items-center justify-center gap-1 sm:gap-2 transition-all ${checkColorEntrada}" onclick="confirmStatusChange('${item.id}', '${dateRef}', 'ENTRADA', '${pName}')">
                        <i class="ph ${isCompletedEntrada ? 'ph-check-circle' : 'ph-sign-in'} text-base"></i> Entrada
                    </button>`;
                }
                if (repSaida) {
                    btnsHtml += `
                    <button class="flex-1 py-1.5 sm:py-2 rounded-xl border-2 font-display font-bold text-[0.65rem] sm:text-xs flex items-center justify-center gap-1 sm:gap-2 transition-all ${checkColorSaida}" onclick="confirmStatusChange('${item.id}', '${dateRef}', 'SAIDA', '${pName}')">
                        <i class="ph ${isCompletedSaida ? 'ph-check-circle' : 'ph-sign-out'} text-base"></i> Saída
                    </button>`;
                }
                btnsHtml += `
                <button class="flex-1 py-1.5 sm:py-2 rounded-xl border-2 font-display font-bold text-[0.65rem] sm:text-xs flex items-center justify-center gap-1 sm:gap-2 transition-all ${cancelColor}" onclick="confirmStatusChange('${item.id}', '${dateRef}', 'CANCELADO', '${pName}')">
                    <i class="ph ${isCancelled ? 'ph-x-circle' : 'ph-x'} text-base"></i> Não irá
                </button>`;

                actionButtons = `
                <div class="mt-3 pt-3 border-t border-textMain/5 flex gap-2 pointer-events-auto relative z-20">
                    ${btnsHtml}
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
            card.dataset.fullydone = fullyDone ? 'true' : 'false';
            card.innerHTML = `
                <div class="turno-pill ${pillClass}"></div>
                <div class="card-header">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <div class="font-display font-bold text-specBlue text-[0.7rem] bg-specBlue/10 px-2 py-0.5 rounded-md">
                                <i class="ph ph-clock mr-1"></i>
                                ${item.inicio || '--'} às ${item.termino || '--'}
                            </div>
                            <span class="text-[0.65rem] font-bold text-textMain/50 uppercase tracking-widest">${item.turno}</span>
                        </div>
                        <h3 class="patient-name px-1">${item.paciente}</h3>
                    </div>
                    <div class="card-actions pointer-events-auto admin-only">
                        <button class="btn-icon edit pointer-events-auto" onclick="editAppointment('${item.id}')">
                            <i class="ph ph-pencil-simple text-lg"></i>
                        </button>
                        <button class="btn-icon delete pointer-events-auto" onclick="deleteAppointment('${item.id}')">
                            <i class="ph ph-trash text-lg"></i>
                        </button>
                    </div>
                </div>
                
                <div class="card-details">
                    <div class="detail-item">
                        <span class="detail-label">Profissional & Atendimento</span>
                        <span class="detail-value">
                            <div class="w-5 h-5 rounded-full bg-specPurple/10 shadow-sm flex items-center justify-center text-specPurple"><i class="ph ph-user"></i></div>
                            ${item.profissional} &bull; ${item.tipo}
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Data</span>
                        <span class="detail-value"><i class="ph ph-calendar-blank text-textMain/50 text-base"></i> ${item.dia}</span>
                    </div>
                    ${item.escola ? `
                    <div class="detail-item">
                        <span class="detail-label">Instituição</span>
                        <span class="detail-value"><i class="ph ph-buildings text-textMain/50 text-base"></i> ${item.escola}</span>
                    </div>` : ''}
                </div>

                <div class="flex justify-between items-center mt-2 px-1">
                    <div class="flex gap-2">
                        <span class="badge"><i class="ph ph-bus text-specGreen"></i> ${trType === 'Entrada' ? 'Somente Entrada' : (trType === 'Saída' ? 'Somente Saída' : 'Ida e Volta')}</span>
                        ${item.obs ? `<span class="badge bg-specYellow/10 text-specYellow"><i class="ph ph-info"></i> ${item.obs}</span>` : ''}
                    </div>
                    ${!isCancelled ? `<a href="${wppLink}" target="_blank" class="whatsapp-link relative z-20 pointer-events-auto"><i class="ph ph-whatsapp-logo text-xl"></i> Contatar</a>` : ''}
                </div>
                ${actionButtons}
            `;
            DOM.agendaList.appendChild(card);
        });
        
        // A rolagem automática a cada atualização foi removida para não incomodar o usuário
        // if (typeof lastScrolledTimeStr !== 'undefined') {
        //     lastScrolledTimeStr = '';
        // }
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
        let exc = {};
        try { exc = JSON.parse(item.excecoes || '{}'); } catch(e){}
        
        let currentStatus = exc[dateStr] || '';
        
        if (clickedStatus === 'CANCELADO') {
            if (currentStatus === 'CANCELADO') delete exc[dateStr];
            else exc[dateStr] = 'CANCELADO';
        } else {
            if (currentStatus === 'CANCELADO') currentStatus = '';
            let parts = currentStatus ? currentStatus.split(',') : [];
            if (parts.includes(clickedStatus)) {
                parts = parts.filter(p => p !== clickedStatus);
            } else {
                parts.push(clickedStatus);
            }
            if (parts.length === 0) delete exc[dateStr];
            else exc[dateStr] = parts.join(',');
        }
        
        item.excecoes = JSON.stringify(exc);
        render(); // Optimistic UI update
        
        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'UPDATE', data: item })
            });
        } catch (e) {
            console.error(e);
        }
    };

    // ---- Matter.js Anti-Gravity (V2 Refined) ----
    let gravityActive = false;
    let engine, renderMatter, runner, mouse, mouseConstraint;
    let bodiesMap = new Map();
    let originalCardStyles = new Map();

    const toggleGravityHandler = (e) => {
        e.preventDefault();
        if (gravityActive) stopGravity();
        else startGravity();
    };

    // DOM.navGravity.addEventListener('click', toggleGravityHandler);
    // if (DOM.navGravityMobile) DOM.navGravityMobile.addEventListener('click', toggleGravityHandler);

    function startGravity() {
        const cards = document.querySelectorAll('.agenda-card');
        if (cards.length === 0) return;

        gravityActive = true;
        document.body.classList.add('gravity-master');
        DOM.navGravity.innerHTML = '<i class="ph ph-arrows-in text-xl text-primaryStart"></i> Restaurar Ordem';
        DOM.navGravity.classList.add('bg-white', 'text-textMain', 'shadow-atmospheric');
        DOM.navGravity.classList.remove('text-textMain/60');
        
        if (DOM.navGravityMobile) {
            DOM.navGravityMobile.innerHTML = '<i class="ph ph-arrows-in text-xl text-primaryStart"></i>';
        }

        originalCardStyles.clear();
        bodiesMap.clear();

        const Engine = Matter.Engine,
              Render = Matter.Render,
              Runner = Matter.Runner,
              Bodies = Matter.Bodies,
              Composite = Matter.Composite,
              Mouse = Matter.Mouse,
              MouseConstraint = Matter.MouseConstraint;

        engine = Engine.create();
        const world = engine.world;
        engine.world.gravity.y = 1;

        const mainRect = DOM.mainContainer.getBoundingClientRect();
        const mainW = mainRect.width;
        const mainH = mainRect.height;

        const canvasContainer = document.createElement('div');
        canvasContainer.id = 'gravity-canvas-wrapper';
        canvasContainer.style.left = mainRect.left + 'px';
        canvasContainer.style.top = mainRect.top + 'px';
        canvasContainer.style.width = mainW + 'px';
        canvasContainer.style.height = mainH + 'px';
        document.body.appendChild(canvasContainer);

        renderMatter = Render.create({
            element: canvasContainer,
            engine: engine,
            options: {
                width: mainW,
                height: mainH,
                wireframes: false,
                background: 'transparent'
            }
        });
        renderMatter.canvas.style.opacity = '0'; 

        const ground = Bodies.rectangle(mainW/2, mainH + 50, mainW + 500, 100, { isStatic: true });
        const leftWall = Bodies.rectangle(-50, mainH/2, 100, mainH * 2, { isStatic: true });
        const rightWall = Bodies.rectangle(mainW + 50, mainH/2, 100, mainH * 2, { isStatic: true });
        const ceiling = Bodies.rectangle(mainW/2, -500, mainW * 2, 100, { isStatic: true });

        Composite.add(world, [ground, leftWall, rightWall, ceiling]);

        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const relX = rect.left - mainRect.left;
            const relY = rect.top - mainRect.top;
            const x = relX + rect.width / 2;
            const y = relY + rect.height / 2;

            originalCardStyles.set(card, {
                width: card.style.width,
                height: card.style.height,
                left: card.style.left,
                top: card.style.top,
                visibility: card.style.visibility,
                transform: card.style.transform
            });

            const body = Bodies.rectangle(x, y, rect.width, rect.height, {
                restitution: 0.6,
                friction: 0.1,
                frictionAir: 0.02,
                density: 0.001
            });

            Matter.Body.applyForce(body, body.position, {
                x: (Math.random() - 0.5) * 0.08,
                y: (Math.random() - 0.5) * 0.08
            });

            Composite.add(world, body);
            bodiesMap.set(card, body);

            canvasContainer.appendChild(card);

            card.style.width = rect.width + 'px';
            card.style.height = rect.height + 'px';
            card.style.left = (-rect.width/2) + 'px'; 
            card.style.top = (-rect.height/2) + 'px';
            card.classList.add('gravity-active');
        });

        mouse = Mouse.create(renderMatter.canvas);
        mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                angularStiffness: 0.5,
                render: { visible: false }
            }
        });
        
        Composite.add(world, mouseConstraint);
        renderMatter.mouse = mouse;

        mouse.element.removeEventListener("mousewheel", mouse.mousewheel);
        mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel);

        Render.run(renderMatter);
        runner = Runner.create();
        Runner.run(runner, engine);

        Matter.Events.on(engine, 'afterUpdate', () => {
            for (let [card, body] of bodiesMap.entries()) {
                card.style.transform = `translate(${body.position.x}px, ${body.position.y}px) rotate(${body.angle}rad)`;
            }
        });
    }

    function stopGravity() {
        gravityActive = false;
        document.body.classList.remove('gravity-master');
        DOM.navGravity.innerHTML = '<i class="ph ph-planet text-xl"></i> Modo Anti-Gravity';
        DOM.navGravity.classList.remove('bg-white', 'text-textMain', 'shadow-atmospheric');
        DOM.navGravity.classList.add('text-textMain/60');
        
        if (DOM.navGravityMobile) {
            DOM.navGravityMobile.innerHTML = '<i class="ph ph-planet text-xl"></i>';
        }

        if (runner) Matter.Runner.stop(runner);
        if (renderMatter) {
            Matter.Render.stop(renderMatter);
            renderMatter.canvas.remove();
        }
        if (engine) {
            Matter.World.clear(engine.world);
            Matter.Engine.clear(engine);
        }

        const wrapper = document.getElementById('gravity-canvas-wrapper');
        
        bodiesMap.forEach((body, card) => {
            card.classList.remove('gravity-active');
            const orig = originalCardStyles.get(card);
            card.style.width = orig.width;
            card.style.height = orig.height;
            card.style.left = orig.left;
            card.style.top = orig.top;
            card.style.visibility = orig.visibility;
            card.style.transform = orig.transform;
            DOM.agendaList.appendChild(card);
        });

        if (wrapper) wrapper.remove();
        bodiesMap.clear();
        originalCardStyles.clear();
        
        render(); // Force re-render to ensure pristine state
    }

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
        
        if (fDataVal !== localISOTime || gravityActive) return;
        
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
    setTimeout(updateClockAndScroll, 500);
    
    // Auto-sync em tempo real (Background polling a cada 15 segundos)
    setInterval(() => loadData(true), 15000);
});
