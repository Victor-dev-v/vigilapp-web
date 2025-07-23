// js/app.js

import { checkAuthState, logout } from './js/auth.js';
import { initUI } from './js/ui.js';
import { initRouter } from './js/router.js';
import { getFirestore, doc, getDoc, updateDoc, setDoc, collection, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { app } from './js/firebase.js';

const appContent = document.getElementById('app-content');
const headerTitle = document.getElementById('header-title');
let currentUserData = null;
const auth = checkAuthState();

// --- FUNÇÕES AUXILIARES DE LOCALIZAÇÃO (IBGE API) ---
const locationCache = { states: null, cities: {} };
async function fetchStates() {
    if (locationCache.states) return locationCache.states;
    try {
        const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
        if (!response.ok) throw new Error('Falha na resposta da rede');
        const statesData = await response.json();
        locationCache.states = statesData;
        return statesData;
    } catch (error) { console.error('Falha ao buscar estados:', error); return []; }
}

async function fetchCitiesByState(stateUF) {
    if (!stateUF) return [];
    if (locationCache.cities[stateUF]) return locationCache.cities[stateUF];
    try {
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateUF}/municipios?orderBy=nome`);
        const citiesData = await response.json();
        locationCache.cities[stateUF] = citiesData;
        return citiesData;
    } catch (error) { console.error(`Falha ao buscar cidades para ${stateUF}:`, error); return []; }
}

// --- FUNÇÕES DE RENDERIZAÇÃO ---

function renderPlaceholder(title) {
    if (headerTitle) headerTitle.textContent = title;
    appContent.innerHTML = `<div class="p-8"><h1 class="text-3xl font-bold text-[var(--text-primary)]">${title}</h1><p class="mt-4 text-[var(--text-secondary)]">Página em construção...</p></div>`;
}

// --- LÓGICA DO FLUXO DE USUÁRIO (Lobby, Dashboards, Perfil, etc.) ---

function renderLobby(user) {
    if (headerTitle) headerTitle.textContent = 'Bem-vindo!';
    appContent.innerHTML = `
        <div class="p-4 sm:p-8 flex items-center justify-center h-full">
            <div class="max-w-md w-full mx-auto bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 rounded-2xl shadow-lg text-center">
                <i data-lucide="shield-off" class="w-16 h-16 mx-auto text-[var(--text-secondary)]"></i>
                <h1 class="text-2xl font-bold text-[var(--text-primary)] mt-6">Você ainda não está em uma unidade</h1>
                <p class="mt-2 text-[var(--text-secondary)]">Para ver suas rondas e escalas, você precisa se juntar a uma equipe.</p>
                <div class="mt-8 text-left">
                    <label for="invite-code" class="text-sm font-semibold text-[var(--text-primary)] opacity-90">Insira o código da unidade</label>
                    <div class="flex gap-2 mt-2">
                        <input id="invite-code" type="text" class="profile-input edit-mode flex-grow" placeholder="Código de 6 dígitos">
                        <button class="py-3 px-5 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white font-bold rounded-lg transition-colors">
                            Juntar-se
                        </button>
                    </div>
                </div>
                 <p class="mt-6 text-xs text-[var(--text-secondary)]">O administrador da unidade deve fornecer o código de convite. Você também pode criar sua própria unidade na página 'Meu Perfil'.</p>
            </div>
        </div>
    `;
    lucide.createIcons();
}

function renderAdminDashboard() {
    if (headerTitle) headerTitle.textContent = 'Dashboard';
    const companyName = currentUserData.companyName || "sua unidade";
    appContent.innerHTML = `<div class="p-8"><h1 class="text-3xl font-bold text-[var(--text-primary)]">Dashboard do Admin</h1><p class="mt-4 text-[var(--text-secondary)]">Gerenciando a unidade: <strong>${companyName}</strong></p></div>`;
}

function renderMemberDashboard() {
    if (headerTitle) headerTitle.textContent = 'Dashboard';
    const companyName = currentUserData.companyName || "sua unidade";
    appContent.innerHTML = `<div class="p-8"><h1 class="text-3xl font-bold text-[var(--text-primary)]">Dashboard do Vigilante</h1><p class="mt-4 text-[var(--text-secondary)]">Você faz parte da unidade: <strong>${companyName}</strong></p></div>`;
}

function renderCreateUnitForm(user) {
    if (headerTitle) headerTitle.textContent = 'Criar Nova Unidade';
    appContent.innerHTML = `
        <div class="p-4 sm:p-8 max-w-2xl mx-auto">
            <div class="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 sm:p-10 rounded-2xl shadow-lg">
                <h1 class="text-3xl font-bold text-[var(--text-primary)]">Dados da sua Unidade</h1>
                <p class="mt-2 text-[var(--text-secondary)]">Preencha as informações abaixo para criar sua equipe.</p>
                <form id="createUnitForm" class="space-y-6 mt-8">
                    <div>
                        <label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">Nome da Unidade/Empresa</label>
                        <input id="companyName" type="text" class="profile-input edit-mode" required>
                    </div>
                    <div>
                        <label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">CNPJ (opcional)</label>
                        <input id="companyCnpj" type="text" class="profile-input edit-mode">
                    </div>
                    <div class="flex flex-col sm:flex-row gap-4 !mt-8">
                        <button type="button" id="cancel-create-btn" class="w-full sm:w-auto py-3 px-5 bg-gray-600/20 text-gray-300 hover:bg-gray-600/40 font-bold rounded-lg transition-colors">Voltar para o Perfil</button>
                        <button type="submit" class="w-full sm:w-auto flex-grow py-3 px-5 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white font-bold rounded-lg transition-colors">
                            Finalizar e Criar Unidade
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('cancel-create-btn').addEventListener('click', renderPerfil);
    document.getElementById('createUnitForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.textContent = 'Criando...';
        submitButton.disabled = true;
        const companyName = document.getElementById('companyName').value.trim();
        const companyCnpj = document.getElementById('companyCnpj').value.trim();
        if (!companyName) {
            alert("O nome da unidade é obrigatório.");
            submitButton.textContent = 'Finalizar e Criar Unidade';
            submitButton.disabled = false;
            return;
        }
        try {
            const db = getFirestore(app);
            const batch = writeBatch(db);
            const companyRef = doc(collection(db, "companies_v1"));
            batch.set(companyRef, { name: companyName, cnpj: companyCnpj, ownerId: user.uid, createdAt: serverTimestamp(), plan: 'free' });
            const workProfileRef = doc(db, `users_v1/${user.uid}/work_profiles`, companyRef.id);
            batch.set(workProfileRef, { companyId: companyRef.id, companyName: companyName, role: 'admin', status: 'active', joinedAt: serverTimestamp() });
            const userDocRef = doc(db, "users_v1", user.uid);
            batch.update(userDocRef, { activeCompanyId: companyRef.id, activeRole: 'admin' });
            await batch.commit();
            window.location.href = '/'; 
        } catch (error) {
            console.error("Erro ao criar unidade:", error);
            alert("Ocorreu um erro. Tente novamente.");
            submitButton.textContent = 'Finalizar e Criar Unidade';
            submitButton.disabled = false;
        }
    });
}

function renderPerfil() {
    if (headerTitle) headerTitle.textContent = 'Meu Perfil';
    if (!currentUserData) {
        appContent.innerHTML = `<p class="p-8 text-red-500">Erro ao carregar seus dados.</p>`;
        return;
    }
    appContent.innerHTML = `
        <div class="p-4 sm:p-8 max-w-3xl mx-auto">
            <div id="profile-container" class="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 sm:p-10 rounded-2xl shadow-lg">
                <!-- Conteúdo dinâmico (visualização ou edição) entra aqui -->
            </div>
        </div>
    `;
    renderProfileViewMode();
}

function renderProfileViewMode() {
    const { displayName, email, description, phone, country, state, city } = currentUserData;
    const hasCompany = currentUserData && currentUserData.activeCompanyId;
    const container = document.getElementById('profile-container');
    if (!container) return;

    container.innerHTML = `
        <div class="flex items-center justify-between mb-10">
            <div class="flex items-center gap-6">
                <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[var(--bg-primary)] flex items-center justify-center flex-shrink-0">
                    <i data-lucide="user" class="w-10 h-10 text-[var(--text-secondary)]"></i>
                </div>
                <div class="overflow-hidden">
                    <h2 class="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] truncate">${displayName}</h2>
                    <p class="text-md text-[var(--text-secondary)] mt-1 truncate">${email}</p>
                </div>
            </div>
            <button id="edit-profile-btn" class="flex-shrink-0 py-2 px-4 bg-indigo-600/10 text-indigo-400 font-semibold rounded-lg hover:bg-indigo-600/20 transition">Editar</button>
        </div>
        <div class="space-y-6">
            <div><label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">Descrição</label><p class="text-[var(--text-secondary)] mt-1 min-h-[1.5rem]">${description || 'Não informado'}</p></div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
                 <div><label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">Telefone</label><p class="text-[var(--text-secondary)] mt-1 min-h-[1.5rem]">${phone || 'Não informado'}</p></div>
                 <div><label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">País</label><p class="text-[var(--text-secondary)] mt-1 min-h-[1.5rem]">${country || 'Brasil'}</p></div>
                 <div><label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">Estado</label><p class="text-[var(--text-secondary)] mt-1 min-h-[1.5rem]">${state || 'Não informado'}</p></div>
                 <div><label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">Cidade</label><p class="text-[var(--text-secondary)] mt-1 min-h-[1.5rem]">${city || 'Não informada'}</p></div>
            </div>
        </div>
        <div class="border-t border-[var(--border-color)] my-8"></div>
        <div id="unit-management-section">
            ${!hasCompany ? `
                <h2 class="text-xl font-bold text-[var(--text-primary)]">Gerenciamento de Unidade</h2>
                <p class="mt-2 text-[var(--text-secondary)]">Crie sua própria unidade para gerenciar equipes.</p>
                <button id="create-unit-btn" class="mt-4 py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg">Criar Nova Unidade</button>
            ` : `
                 <h2 class="text-xl font-bold text-[var(--text-primary)]">Sua Unidade</h2>
                 <p class="mt-2 text-[var(--text-secondary)]">Você atualmente é ${currentUserData.activeRole} da unidade <strong>${currentUserData.companyName || ''}</strong>.</p>
            `}
        </div>
    `;
    lucide.createIcons();
    document.getElementById('edit-profile-btn').addEventListener('click', renderProfileEditMode);
    if (!hasCompany) {
        document.getElementById('create-unit-btn').addEventListener('click', () => renderCreateUnitForm(auth.currentUser));
    }
}

async function renderProfileEditMode() {
    const { displayName, description, phone, state, city, uid } = currentUserData;
    const container = document.getElementById('profile-container');
    if (!container) return;
    
    container.innerHTML = `
        <h2 class="text-2xl font-bold text-[var(--text-primary)] mb-6">Editando Perfil</h2>
        <form id="edit-form" class="space-y-6">
            <div>
                <label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">Nome de Exibição</label>
                <input id="displayNameInput" type="text" value="${displayName}" class="profile-input edit-mode">
            </div>
            <div>
                <label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">Descrição</label>
                <textarea id="descriptionInput" class="profile-input edit-mode" rows="3">${description || ''}</textarea>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
                <div>
                    <label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">Telefone</label>
                    <input id="phoneInput" type="tel" value="${phone || ''}" class="profile-input edit-mode">
                </div>
                <div>
                    <label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">País</label>
                    <select id="countryInput" class="profile-input edit-mode"><option value="Brasil">Brasil</option></select>
                </div>
                <div>
                    <label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">Estado</label>
                    <select id="stateSelect" class="profile-input edit-mode"><option>Carregando...</option></select>
                </div>
                <div>
                    <label class="text-sm font-semibold text-[var(--text-primary)] opacity-90">Cidade</label>
                    <select id="citySelect" class="profile-input edit-mode" disabled><option>Selecione um estado</option></select>
                </div>
            </div>
            <div class="flex justify-end gap-4 pt-4">
                 <button type="button" id="cancel-edit-btn" class="py-2 px-4 bg-gray-600/20 text-gray-300 rounded-lg font-semibold">Cancelar</button>
                 <button type="submit" id="save-profile-btn" class="py-2 px-4 bg-emerald-600/20 text-emerald-400 rounded-lg font-semibold">Salvar Alterações</button>
            </div>
        </form>
    `;
    
    const stateSelect = document.getElementById('stateSelect');
    const citySelect = document.getElementById('citySelect');

    const populateCities = async (stateUF, cityToSelect) => { /* ... */ };
    const populateStates = async () => { /* ... */ };
    
    // As funções aninhadas que já funcionavam
    const populateCitiesFn = async (stateUF, cityToSelect) => {
        if (!stateUF) { citySelect.disabled = true; citySelect.innerHTML = '<option value="">Selecione um estado</option>'; return; }
        citySelect.disabled = true; citySelect.innerHTML = '<option>Carregando...</option>';
        const citiesList = await fetchCitiesByState(stateUF);
        let cityOptionsHTML = '<option value="">Selecione</option>';
        citiesList.forEach(c => { cityOptionsHTML += `<option value="${c.nome}" ${c.nome === cityToSelect ? 'selected' : ''}>${c.nome}</option>`; });
        citySelect.innerHTML = cityOptionsHTML;
        citySelect.disabled = false;
    };
    const populateStatesFn = async () => {
        const statesList = await fetchStates();
        stateSelect.innerHTML = '<option value="">Selecione</option>';
        statesList.forEach(s => { stateSelect.innerHTML += `<option value="${s.sigla}" ${s.sigla === state ? 'selected' : ''}>${s.nome}</option>`; });
        if (state) await populateCitiesFn(state, city);
    };
    
    await populateStatesFn();
    stateSelect.addEventListener('change', () => populateCitiesFn(stateSelect.value));

    document.getElementById('cancel-edit-btn').addEventListener('click', renderProfileViewMode);
    document.getElementById('edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('save-profile-btn');
        saveBtn.textContent = 'Salvando...';
        saveBtn.disabled = true;
        
        const dataToUpdate = {
            displayName: document.getElementById('displayNameInput').value.trim(),
            description: document.getElementById('descriptionInput').value.trim(),
            phone: document.getElementById('phoneInput').value.trim(),
            state: stateSelect.value,
            city: citySelect.value,
            country: document.getElementById('countryInput').value,
        };

        try {
            const db = getFirestore(app);
            await updateDoc(doc(db, "users_v1", uid), dataToUpdate);
            currentUserData = { ...currentUserData, ...dataToUpdate };
            renderProfileViewMode();
        } catch(error) {
            console.error("Erro ao salvar:", error);
            saveBtn.textContent = 'Salvar Alterações';
            saveBtn.disabled = false;
        }
    });
}


const pageRenderers = {
    '/unidades': () => renderPlaceholder('Unidades'),
    '/visao-geral': () => renderPlaceholder('Visão Geral'),
    '/dashboard': () => {
        if (currentUserData && currentUserData.activeRole === 'admin') renderAdminDashboard();
        else if (currentUserData && currentUserData.activeRole === 'member') renderMemberDashboard();
        else renderLobby(auth.currentUser);
    },
    '/rondas': () => renderPlaceholder('Rondas'),
    '/escalas': () => renderPlaceholder('Escalas'),
    '/historico': () => renderPlaceholder('Histórico'),
    '/equipe': () => renderPlaceholder('Minha Equipe'),
    '/perfil': renderPerfil,
    '/404': () => renderPlaceholder('Página não encontrada'),
};


async function main() {
    const user = await auth;
    if (user) {
        const db = getFirestore(app);
        try {
            const userDocSnap = await getDoc(doc(db, "users_v1", user.uid));
            if (userDocSnap.exists()) {
                currentUserData = userDocSnap.data();
                if (currentUserData.activeCompanyId) {
                    const companySnap = await getDoc(doc(db, "companies_v1", currentUserData.activeCompanyId));
                    if (companySnap.exists()) {
                        currentUserData.companyName = companySnap.data().name;
                    }
                }
            } else { throw new Error("Perfil do usuário não encontrado no Firestore."); }
        } catch (error) {
            console.error("Falha ao carregar dados do usuário:", error);
            appContent.innerHTML = `<p class="p-8 text-red-500">Erro crítico ao carregar seu perfil.</p>`;
            return;
        }

        // A lógica de roteamento agora decide se mostra a UI principal ou o Lobby
        if (currentUserData && currentUserData.activeRole) {
            initUI(currentUserData);
            initRouter(pageRenderers);
        } else {
            // Se não tem papel, o dashboard vira o Lobby e não mostramos a sidebar principal
            pageRenderers['/dashboard'](user);
        }
    } else {
        const publicPages = ['/login.html', '/registro.html'];
        if (!publicPages.includes(window.location.pathname)) {
            window.location.replace('/login.html');
        }
    }
}

main();