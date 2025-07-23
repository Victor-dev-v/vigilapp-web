// js/app.js

import { checkAuthState, logout } from './js/auth.js';
import { initUI } from './js/ui.js';
import { initRouter } from './js/router.js';
import { getFirestore, doc, getDoc, updateDoc, setDoc, collection, writeBatch, serverTimestamp, getDocs, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { app } from './js/firebase.js';

const appContent = document.getElementById('app-content');
const headerTitle = document.getElementById('header-title');
let currentUserData = null;
const auth = checkAuthState();

// --- FUNÇÕES AUXILIARES ---
const locationCache = { states: null, cities: {} };
async function fetchStates() {
    console.log("[fetchStates] Buscando estados...");
    if (locationCache.states) {
        console.log("[fetchStates] Estados do cache local.");
        return locationCache.states;
    }
    try {
        const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
        if (!response.ok) throw new Error('Falha na resposta da rede');
        const statesData = await response.json();
        locationCache.states = statesData;
        console.log("[fetchStates] Estados buscados da API e salvos no cache local.");
        return statesData;
    } catch (error) { console.error('Falha ao buscar estados:', error); return []; }
}

async function fetchCitiesByState(stateUF) {
    console.log(`[fetchCitiesByState] Buscando cidades para ${stateUF}...`);
    if (!stateUF) return [];
    if (locationCache.cities[stateUF]) {
        console.log(`[fetchCitiesByState] Cidades de ${stateUF} do cache local.`);
        return locationCache.cities[stateUF];
    }
    try {
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateUF}/municipios?orderBy=nome`);
        if (!response.ok) throw new Error('Falha na resposta da rede');
        const citiesData = await response.json();
        locationCache.cities[stateUF] = citiesData;
        console.log(`[fetchCitiesByState] Cidades de ${stateUF} buscadas da API e salvas no cache local.`);
        return citiesData;
    } catch (error) { console.error(`Falha ao buscar cidades para ${stateUF}:`, error); return []; }
}

function showModal(title, contentHTML, onSave) {
    console.log(`[showModal] Abrindo modal: ${title}`);
    const existingModal = document.getElementById('modal-backdrop');
    if (existingModal) existingModal.remove();
    const modalContainer = document.createElement('div');
    modalContainer.id = 'modal-backdrop';
    modalContainer.className = 'fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 opacity-0 transition-opacity duration-300';
    modalContainer.innerHTML = `
        <div class="bg-[var(--bg-secondary)] w-full max-w-md rounded-2xl shadow-xl transform scale-95 transition-transform duration-300">
            <header class="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                <h2 class="text-lg font-bold text-[var(--text-primary)]">${title}</h2>
                <button id="close-modal-btn" class="p-1 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"><i data-lucide="x" class="w-5 h-5"></i></button>
            </header>
            <main class="p-6">${contentHTML}</main>
            <footer class="flex justify-end gap-4 p-4 bg-[var(--bg-primary)] rounded-b-2xl border-t border-[var(--border-color)]">
                <button id="cancel-modal-btn" class="py-2 px-4 bg-gray-600/20 text-gray-300 rounded-lg font-semibold hover:bg-gray-600/40">Cancelar</button>
                <button id="save-modal-btn" class="py-2 px-4 bg-[var(--accent-color)] text-white rounded-lg font-semibold">${onSave ? 'Salvar' : 'OK'}</button>
            </footer>
        </div>
    `;
    document.body.appendChild(modalContainer);
    lucide.createIcons();
    requestAnimationFrame(() => {
        modalContainer.classList.remove('opacity-0');
        modalContainer.querySelector('div').classList.remove('scale-95');
    });
    const closeModal = () => {
        console.log("[showModal] Fechando modal.");
        modalContainer.classList.add('opacity-0');
        modalContainer.querySelector('div').classList.add('scale-95');
        setTimeout(() => modalContainer.remove(), 300);
    };
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('cancel-modal-btn').addEventListener('click', closeModal);
    modalContainer.addEventListener('click', (e) => {
        if (e.target.id === 'modal-backdrop') closeModal();
    });
    if (onSave) {
        document.getElementById('save-modal-btn').addEventListener('click', () => {
            if (onSave()) { closeModal(); }
        });
    } else {
        document.getElementById('save-modal-btn').addEventListener('click', closeModal);
    }
}

// --- FUNÇÕES DE RENDERIZAÇÃO DE PÁGINAS ---
function renderPlaceholder(title) {
    console.log(`[renderPlaceholder] Renderizando: ${title}`);
    if (headerTitle) headerTitle.textContent = title;
    appContent.innerHTML = `<div class="p-8"><h1 class="text-3xl font-bold text-[var(--text-primary)]">${title}</h1><p class="mt-4 text-[var(--text-secondary)]">Página em construção...</p></div>`;
}

async function renderUnidadesPage(user) {
    console.log("[renderUnidadesPage] Renderizando página de Unidades.");
    if (headerTitle) headerTitle.textContent = 'Minhas Unidades';
    
    const db = getFirestore(app);
    const userDocRef = doc(db, 'users_v1', user.uid);
    
    // **MUDANÇA CRÍTICA AQUI**: AQUI GARANTIMOS QUE O CONTEXTO ESTÁ ZERADO
    // E A UI ATUALIZADA ANTES DE PEGAR OS PERFIS.
    if (currentUserData.activeCompanyId) {
        console.log("[renderUnidadesPage] Usuário tinha unidade ativa. Resetando contexto.");
        await updateDoc(userDocRef, { activeCompanyId: null, activeRole: null });
        currentUserData.activeCompanyId = null;
        currentUserData.activeRole = null;
        initUI(currentUserData); // Reconstrói a sidebar para o modo "raiz"
    }

    const profilesRef = collection(db, `users_v1/${user.uid}/work_profiles`);
    const profilesSnap = await getDocs(profilesRef);
    const workProfiles = profilesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const cardsHTML = workProfiles.map(profile => {
        const isAdmin = profile.role === 'admin';
        const adminActions = isAdmin ? `
            <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button title="Editar Unidade" class="edit-unit-btn p-2 rounded-full hover:bg-[var(--bg-primary)]" data-company-id="${profile.companyId}" data-company-name="${profile.companyName}"><i data-lucide="pencil" class="w-4 h-4 text-[var(--text-secondary)] pointer-events-none"></i></button>
                <button title="Apagar Unidade" class="delete-unit-btn p-2 rounded-full hover:bg-red-500/10" data-company-id="${profile.companyId}" data-company-name="${profile.companyName}"><i data-lucide="trash-2" class="w-4 h-4 text-red-500 pointer-events-none"></i></button>
            </div>
        ` : '';
        return `
            <div class="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-lg p-6 transition-all group">
                <div class="unit-card-selectable cursor-pointer" data-company-id="${profile.companyId}" data-role="${profile.role}">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-[var(--bg-primary)] rounded-lg flex items-center justify-center"><i data-lucide="building-2" class="w-6 h-6 text-[var(--accent-color)]"></i></div>
                        <div><h3 class="font-bold text-lg text-[var(--text-primary)]">${profile.companyName}</h3><p class="text-sm text-[var(--text-secondary)] capitalize">${profile.role}</p></div>
                    </div>
                </div>
                ${adminActions}
            </div>`;
    }).join('');
    appContent.innerHTML = `
        <div class="p-4 sm:p-8">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 class="text-2xl font-bold text-[var(--text-primary)]">Selecione uma unidade</h2>
                <button id="show-create-unit-form-btn" class="flex items-center gap-2 w-full sm:w-auto py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"><i data-lucide="plus" class="w-5 h-5"></i><span>Criar Nova Unidade</span></button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${cardsHTML.length > 0 ? cardsHTML : `<div class="col-span-full text-center p-8"><p class="text-[var(--text-secondary)]">Você ainda não faz parte de nenhuma unidade.</p></div>`}
            </div>
        </div>
    `;
    lucide.createIcons();
    
    document.getElementById('show-create-unit-form-btn').addEventListener('click', () => renderCreateUnitForm(user));
    
    // **MUDANÇA CRÍTICA AQUI**: Listener para cards de unidade agora usa a classe 'unit-card-selectable'
    // E chama main() para reiniciar o fluxo com o novo contexto
    document.querySelectorAll('.unit-card-selectable').forEach(card => card.addEventListener('click', async (e) => {
        const companyId = e.currentTarget.dataset.companyId;
        const role = e.currentTarget.dataset.role;
        console.log(`[renderUnidadesPage] Clicado no card da unidade: ${companyId}`);
        await updateDoc(userDocRef, { activeCompanyId: companyId, activeRole: role });
        // Opcional: Atualizar currentUserData em memória imediatamente para reatividade
        currentUserData.activeCompanyId = companyId;
        currentUserData.activeRole = role;
        // Re-executa main para recarregar dados e rotear para o dashboard com o novo contexto
        window.history.replaceState({}, '', '/dashboard'); // <--- LINHA ALTERADA/ADICIONADA
        main(); 
    }));
    document.querySelectorAll('.edit-unit-btn').forEach(button => button.addEventListener('click', (e) => {
        e.stopPropagation();
        const companyId = e.currentTarget.dataset.companyId;
        const currentName = e.currentTarget.dataset.companyName;
        console.log(`[renderUnidadesPage] Clicado em editar unidade: ${companyId}`);
        const formHTML = `<input type="text" id="edit-company-name" class="profile-input edit-mode" value="${currentName}">`;
        showModal('Editar Nome da Unidade', formHTML, async () => {
            const newName = document.getElementById('edit-company-name').value.trim();
            if (!newName || newName === currentName) return true;
            const companyDocRef = doc(db, 'companies_v1', companyId);
            await updateDoc(companyDocRef, { name: newName });
            await updateDoc(doc(db, `users_v1/${user.uid}/work_profiles`, companyId), { companyName: newName });
            renderUnidadesPage(user); // Re-renderiza para mostrar a mudança
            return true;
        });
    }));
    document.querySelectorAll('.delete-unit-btn').forEach(button => button.addEventListener('click', (e) => {
        e.stopPropagation();
        const companyId = e.currentTarget.dataset.companyId;
        const companyName = e.currentTarget.dataset.companyName;
        console.log(`[renderUnidadesPage] Clicado em apagar unidade: ${companyId}`);
        const confirmationHTML = `<p>Você tem certeza que deseja apagar a unidade "<strong>${companyName}</strong>"?<br><br><strong class="text-red-500">Atenção:</strong> Esta ação é irreversível.</p>`;
        showModal('Confirmar Exclusão', confirmationHTML, async () => {
            try {
                await deleteDoc(doc(db, 'companies_v1', companyId));
                await deleteDoc(doc(db, `users_v1/${user.uid}/work_profiles`, companyId));
                renderUnidadesPage(user);
            } catch (error) { console.error("Erro ao apagar unidade:", error); alert("Ocorreu um erro. Verifique as permissões."); }
            return true;
        });
    }));
}

async function renderLocaisPage(user) {
    console.log("[renderLocaisPage] Renderizando Locais.");
    if (!currentUserData.activeCompanyId) { 
        console.warn("[renderLocaisPage] Nenhum activeCompanyId. Redirecionando para Unidades.");
        window.history.replaceState({}, '', '/unidades'); // Navega internamente
        renderUnidadesPage(user); // Chama a função de renderização
        return; 
    }
    if (headerTitle) headerTitle.textContent = 'Locais e Pontos de Ronda';
    appContent.innerHTML = `<div class="p-8">Carregando locais...</div>`;
    const db = getFirestore(app);
    const locationsRef = collection(db, `companies_v1/${currentUserData.activeCompanyId}/locations`);
    const locationsSnap = await getDocs(locationsRef);
    const locations = locationsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    let locationsHTML = locations.length === 0 ? `<p class="text-[var(--text-secondary)]">Nenhum local cadastrado para esta unidade.</p>` : locations.map(loc => `<div class="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-lg"><h3 class="font-bold text-[var(--text-primary)]">${loc.name}</h3><p class="text-sm text-[var(--text-secondary)]">${loc.address || 'Endereço não informado'}</p></div>`).join('');
    appContent.innerHTML = `
        <div class="p-4 sm:p-8">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-2xl font-bold text-[var(--text-primary)]">Locais</h1>
                <button id="add-location-btn" class="flex items-center gap-2 py-2 px-4 bg-[var(--accent-color)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"><i data-lucide="plus"></i>Adicionar Local</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${locationsHTML}</div>
        </div>
    `;
    lucide.createIcons();
    document.getElementById('add-location-btn').addEventListener('click', () => {
        console.log("[renderLocaisPage] Clicado em adicionar local.");
        const formHTML = `<form id="add-location-form" class="space-y-4"><div><label class="text-sm font-semibold">Nome do Local</label><input type="text" id="location-name" class="profile-input edit-mode" required placeholder="Ex: Loja Matriz"></div><div><label class="text-sm font-semibold">Endereço (opcional)</label><input type="text" id="location-address" class="profile-input edit-mode" placeholder="Ex: Av. Principal, 123"></div></form>`;
        showModal('Adicionar Novo Local', formHTML, () => {
            const name = document.getElementById('location-name').value.trim();
            if (!name) { alert('O nome do local é obrigatório.'); return false; }
            const address = document.getElementById('location-address').value.trim();
            const locationsCol = collection(db, `companies_v1/${currentUserData.activeCompanyId}/locations`);
            addDoc(locationsCol, { name, address, createdAt: serverTimestamp() }).then(() => {
                console.log("[renderLocaisPage] Local adicionado com sucesso. Re-renderizando.");
                renderLocaisPage(user);
            }).catch(err => console.error("Erro ao adicionar local:", err));
            return true;
        });
    });
}

function renderAdminDashboard() {
    console.log("[renderAdminDashboard] Renderizando Dashboard Admin.");
    if (headerTitle) headerTitle.textContent = 'Dashboard';
    const companyName = currentUserData.companyName || "sua unidade";
    appContent.innerHTML = `<div class="p-8"><h1 class="text-3xl font-bold text-[var(--text-primary)]">Dashboard do Admin</h1><p class="mt-4 text-[var(--text-secondary)]">Gerenciando a unidade: <strong>${companyName}</strong></p></div>`;
}

function renderMemberDashboard() {
    console.log("[renderMemberDashboard] Renderizando Dashboard Vigilante.");
    if (headerTitle) headerTitle.textContent = 'Dashboard';
    const companyName = currentUserData.companyName || "sua unidade";
    appContent.innerHTML = `<div class="p-8"><h1 class="text-3xl font-bold text-[var(--text-primary)]">Dashboard do Vigilante</h1><p class="mt-4 text-[var(--text-secondary)]">Você faz parte da unidade: <strong>${companyName}</strong></p></div>`;
}

function renderCreateUnitForm(user) {
    console.log("[renderCreateUnitForm] Renderizando formulário de Criação de Unidade.");
    if (headerTitle) headerTitle.textContent = 'Criar Nova Unidade';
    appContent.innerHTML = `<div class="p-4 sm:p-8 max-w-2xl mx-auto"><div class="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 sm:p-10 rounded-2xl shadow-lg"><h1 class="text-3xl font-bold text-[var(--text-primary)]">Dados da sua Unidade</h1><p class="mt-2 text-[var(--text-secondary)]">Preencha as informações abaixo para criar sua equipe.</p><form id="createUnitForm" class="space-y-6 mt-8"><div><label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">Nome da Unidade/Empresa</label><input id="companyName" type="text" class="profile-input edit-mode" required></div><div><label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">CNPJ (opcional)</label><input type="text" id="companyCnpj" class="profile-input edit-mode"></div><div class="flex flex-col sm:flex-row gap-4 !mt-8"><button type="button" id="cancel-create-btn" class="w-full sm:w-auto py-3 px-5 bg-gray-600/20 text-gray-300 hover:bg-gray-600/40 font-bold rounded-lg transition-colors">Voltar para o Perfil</button><button type="submit" class="w-full sm:w-auto flex-grow py-3 px-5 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white font-bold rounded-lg transition-colors">Finalizar e Criar Unidade</button></div></form></div></div>`;
    document.getElementById('cancel-create-btn').addEventListener('click', renderPerfil);
    document.getElementById('createUnitForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.textContent = 'Criando...';
        submitButton.disabled = true;
        const companyName = document.getElementById('companyName').value.trim();
        const companyCnpj = document.getElementById('companyCnpj').value.trim();
        if (!companyName) { alert("O nome da unidade é obrigatório."); submitButton.textContent = 'Finalizar e Criar Unidade'; submitButton.disabled = false; return; }
        try {
            const db = getFirestore(app); const batch = writeBatch(db); const companyRef = doc(collection(db, "companies_v1")); batch.set(companyRef, { name: companyName, cnpj: companyCnpj, ownerId: user.uid, createdAt: serverTimestamp(), plan: 'free' }); const workProfileRef = doc(db, `users_v1/${user.uid}/work_profiles`, companyRef.id); batch.set(workProfileRef, { companyId: companyRef.id, companyName: companyName, role: 'admin', status: 'active', joinedAt: serverTimestamp() }); const userDocRef = doc(db, "users_v1", user.uid); batch.update(userDocRef, { activeCompanyId: companyRef.id, activeRole: 'admin' }); await batch.commit(); 
            console.log("[renderCreateUnitForm] Unidade criada e perfil atualizado. Redirecionando para Dashboard.");
            // Re-executa main para recarregar dados e rotear para o dashboard
            window.history.replaceState({}, '', '/dashboard'); // Garante que a URL esteja correta
            main(); 
        } catch (error) { console.error("Erro ao criar unidade:", error); alert("Ocorreu um erro. Tente novamente."); submitButton.textContent = 'Finalizar e Criar Unidade'; submitButton.disabled = false; }
    });
}

function renderPerfil() {
    console.log("[renderPerfil] Renderizando Meu Perfil.");
    if (headerTitle) headerTitle.textContent = 'Meu Perfil';
    if (!currentUserData) { console.error("[renderPerfil] currentUserData é nulo."); appContent.innerHTML = `<p class="p-8 text-red-500">Erro ao carregar seus dados.</p>`; return; }
    appContent.innerHTML = `<div class="p-4 sm:p-8 max-w-3xl mx-auto"><div id="profile-container" class="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 sm:p-10 rounded-2xl shadow-lg"></div></div>`;
    renderProfileViewMode();
}

function renderProfileViewMode() {
    console.log("[renderProfileViewMode] Renderizando modo de visualização do Perfil.");
    const { displayName, email, description, phone, country, state, city } = currentUserData;
    const container = document.getElementById('profile-container'); if (!container) return;
    container.innerHTML = `
        <div class="flex items-center justify-between mb-10"><div class="flex items-center gap-6"><div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[var(--bg-primary)] flex items-center justify-center flex-shrink-0"><i data-lucide="user" class="w-10 h-10 text-[var(--text-secondary)]"></i></div><div class="overflow-hidden"><h2 class="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] truncate">${displayName}</h2><p class="text-md text-[var(--text-secondary)] mt-1 truncate">${email}</p></div></div><button id="edit-profile-btn" class="flex-shrink-0 py-2 px-4 bg-indigo-600/10 text-indigo-400 font-semibold rounded-lg hover:bg-indigo-600/20 transition">Editar</button></div>
        <div class="space-y-6"><div><label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">Descrição</label><p class="text-[var(--text-secondary)] mt-1 min-h-[1.5rem]">${description || 'Não informado'}</p></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6"><div><label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">Telefone</label><p class="text-[var(--text-secondary)] mt-1 min-h-[1.5rem]">${phone || 'Não informado'}</p></div><div><label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">País</label><p class="text-[var(--text-secondary)] mt-1 min-h-[1.5rem]">${country || 'Brasil'}</p></div><div><label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">Estado</label><p class="text-[var(--text-secondary)] mt-1 min-h-[1.5rem]">${state || 'Não informado'}</p></div><div><label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">Cidade</label><p class="text-[var(--text-secondary)] mt-1 min-h-[1.5rem]">${city || 'Não informada'}</p></div></div></div>
        <div class="border-t border-[var(--border-color)] my-8"></div>
        <div id="unit-management-section"><h2 class="text-xl font-bold text-[var(--text-primary)]">Gerenciamento de Unidade</h2>${!currentUserData.activeCompanyId ? `<p class="mt-2 text-[var(--text-secondary)]">Crie sua primeira unidade para gerenciar equipes.</p><button id="create-unit-btn" class="mt-4 py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg">Criar Nova Unidade</button>` : `<p class="mt-2 text-[var(--text-secondary)]">Visite a página 'Unidades' para ver todas as suas equipes ou criar uma nova.</p><a href="/unidades" class="nav-link inline-block mt-4 py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg">Ver Minhas Unidades</a>`}</div>
    `;
    lucide.createIcons();
    document.getElementById('edit-profile-btn').addEventListener('click', renderProfileEditMode);
    const createBtn = document.getElementById('create-unit-btn');
    if (createBtn) createBtn.addEventListener('click', () => renderCreateUnitForm(auth.currentUser));
}

async function renderProfileEditMode() {
    console.log("[renderProfileEditMode] Renderizando modo de edição do Perfil.");
    const { displayName, description, phone, state, city, uid } = currentUserData;
    const container = document.getElementById('profile-container'); if (!container) return;
    container.innerHTML = `
        <h2 class="text-2xl font-bold text-[var(--text-primary)] mb-6">Editando Perfil</h2>
        <form id="edit-form" class="space-y-6">
            <div><label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">Nome de Exibição</label><input id="displayNameInput" type="text" value="${displayName}" class="profile-input edit-mode"></div>
            <div><label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">Descrição</label><textarea id="descriptionInput" class="profile-input edit-mode" rows="3">${description || ''}</textarea></div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
                <div><label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">Telefone</label><input type="tel" id="phoneInput" value="${phone || ''}" class="profile-input edit-mode"></div>
                <div><label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">País</label><select id="countryInput" class="profile-input edit-mode"><option value="Brasil">Brasil</option></select></div>
                <div><label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">Estado</label><select id="stateSelect" class="profile-input edit-mode"><option>Carregando...</option></select></div>
                <div><label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">Cidade</label><select id="citySelect" class="profile-input edit-mode" disabled><option>Selecione um estado</option></select></div>
            </div>
            <div class="flex justify-end gap-4 pt-4"><button type="button" id="cancel-edit-btn" class="py-2 px-4 bg-gray-600/20 text-gray-300 rounded-lg font-semibold">Cancelar</button><button type="submit" id="save-profile-btn" class="py-2 px-4 bg-emerald-600/20 text-emerald-400 rounded-lg font-semibold">Salvar Alterações</button></div>
        </form>
    `;
    const stateSelect = document.getElementById('stateSelect');
    const citySelect = document.getElementById('citySelect');
    const populateCities = async (stateUF, cityToSelect) => {
        if (!stateUF) { citySelect.disabled = true; citySelect.innerHTML = '<option value="">Selecione um estado</option>'; return; }
        citySelect.disabled = true; citySelect.innerHTML = '<option>Carregando...</option>';
        const citiesList = await fetchCitiesByState(stateUF);
        let cityOptionsHTML = '<option value="">Selecione</option>';
        citiesList.forEach(c => { cityOptionsHTML += `<option value="${c.nome}" ${c.nome === cityToSelect ? 'selected' : ''}>${c.nome}</option>`; });
        citySelect.innerHTML = cityOptionsHTML;
        citySelect.disabled = false;
    };
    const populateStates = async () => {
        const statesList = await fetchStates();
        stateSelect.innerHTML = '<option value="">Selecione</option>';
        statesList.forEach(s => { stateSelect.innerHTML += `<option value="${s.sigla}" ${s.sigla === state ? 'selected' : ''}>${s.nome}</option>`; });
        if (state) await populateCities(state, city);
    };
    await populateStates();
    stateSelect.addEventListener('change', () => populateCities(stateSelect.value));
    document.getElementById('cancel-edit-btn').addEventListener('click', renderProfileViewMode);
    document.getElementById('edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('save-profile-btn'); saveBtn.textContent = 'Salvando...'; saveBtn.disabled = true;
        const dataToUpdate = {
            displayName: document.getElementById('displayNameInput').value.trim(), description: document.getElementById('descriptionInput').value.trim(), phone: document.getElementById('phoneInput').value.trim(), state: stateSelect.value, city: citySelect.value, country: document.getElementById('countryInput').value,
        };
        try {
            const db = getFirestore(app); await updateDoc(doc(db, "users_v1", uid), dataToUpdate); currentUserData = { ...currentUserData, ...dataToUpdate }; renderProfileViewMode();
        } catch(error) { console.error("Erro ao salvar:", error); saveBtn.textContent = 'Salvar Alterações'; saveBtn.disabled = false; }
    });
}

const pageRenderers = {
    '/unidades': (user) => renderUnidadesPage(user),
    '/locais': (user) => renderLocaisPage(user),
    '/dashboard': (user) => {
        if (currentUserData && currentUserData.activeCompanyId) {
            console.log("[Router] Dashboard: Usuário com unidade ativa. Renderizando dashboard específico.");
            if (currentUserData.activeRole === 'admin') renderAdminDashboard(); else renderMemberDashboard();
        } else {
            console.log("[Router] Dashboard: Usuário sem unidade ativa. Redirecionando para /unidades.");
            window.history.replaceState({}, '', '/unidades'); // Atualiza a URL
            renderUnidadesPage(user); // Chama a função de renderização diretamente
        }
    },
    '/rondas': () => renderPlaceholder('Rondas'),
    '/escalas': () => renderPlaceholder('Escalas'),
    '/historico': () => renderPlaceholder('Histórico'),
    '/equipe': (user) => renderEquipePage(user),
    '/perfil': renderPerfil,
    '/404': () => renderPlaceholder('Página não encontrada'),
};

async function main() {
    console.log("[main] Iniciando a aplicação...");
    const user = await auth; // Espera a autenticação ser verificada
    
    if (user) {
        console.log(`[main] Usuário logado: ${user.uid}.`);
        const db = getFirestore(app);
        try {
            const userDocSnap = await getDoc(doc(db, "users_v1", user.uid));
            if (userDocSnap.exists()) {
                currentUserData = userDocSnap.data();
                if (currentUserData.activeCompanyId) {
                    const companySnap = await getDoc(doc(db, "companies_v1", currentUserData.activeCompanyId));
                    if (companySnap.exists()) currentUserData.companyName = companySnap.data().name;
                    console.log(`[main] Usuário em unidade ativa: ${currentUserData.companyName} (${currentUserData.activeRole}).`);
                } else {
                    console.log("[main] Usuário sem unidade ativa.");
                }
            } else { throw new Error("Perfil do usuário não encontrado no Firestore."); }
        } catch (error) {
            console.error("[main] Falha ao carregar dados do usuário:", error);
            appContent.innerHTML = `<p class="p-8 text-red-500">Erro crítico ao carregar seu perfil. Tente recarregar a página.</p>`;
            return; // Impede a inicialização se os dados do usuário falharem
        }

        console.log("[main] Inicializando UI e Roteador.");
        initUI(currentUserData); // Sempre inicializa a UI se o usuário estiver logado
        
        const routerFunctions = {};
        for (const path in pageRenderers) {
            routerFunctions[path] = () => pageRenderers[path](user);
        }
        initRouter(routerFunctions); // Sempre inicializa o roteador
        console.log("[main] Inicialização completa. Roteador ativo.");

    } else {
        console.log("[main] Usuário não logado.");
        const publicPages = ['/login.html', '/registro.html'];
        if (!publicPages.includes(window.location.pathname)) {
            console.log("[main] Redirecionando para login.");
            window.location.replace('/login.html');
        } else {
            console.log("[main] Já em página pública (login/registro).");
        }
    }
}
main();