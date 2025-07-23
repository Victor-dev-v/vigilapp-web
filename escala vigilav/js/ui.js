// js/ui.js
import { logout } from './auth.js';

// Navegação quando o usuário NÃO está em um contexto de unidade
const ROOT_NAV_ITEMS = [
    { path: '/unidades', label: 'Unidades', icon: 'building-2' },
    { path: '/perfil', label: 'Meu Perfil', icon: 'user' },
];

// Navegação quando o usuário SELECIONOU uma unidade
const UNIT_NAV_ITEMS = [
    { path: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { path: '/locais', label: 'Locais e Pontos', icon: 'map-pin' },
    { path: '/rondas', label: 'Rondas', icon: 'shield-check' },
    { path: '/escalas', label: 'Escalas', icon: 'calendar-days' },
    { path: '/historico', label: 'Histórico', icon: 'history' },
    { path: '/equipe', label: 'Membros da Equipe', icon: 'users' },
];

const sidebar = document.getElementById('sidebar');
const bottomNav = document.getElementById('bottom-nav');
const openSidebarBtn = document.getElementById('open-sidebar-btn');
const sidebarOverlay = document.getElementById('sidebar-overlay');

function createNavItem(item) {
    return `<a href="${item.path}" class="nav-link flex items-center gap-3 rounded-lg px-3 py-2 text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]">
        <i data-lucide="${item.icon}" class="h-5 w-5"></i>
        <span>${item.label}</span>
    </a>`;
}

function createBottomNavItem(item) {
     return `<a href="${item.path}" class="nav-link flex flex-col items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent-color)] transition-colors w-full h-full">
        <i data-lucide="${item.icon}" class="w-6 h-6 mb-1"></i>
        <span class="text-xs">${item.label}</span>
    </a>`;
}

export function buildSidebar(userData) {
    console.log("[buildSidebar] Construindo sidebar.");
    const hasActiveUnit = userData && userData.activeCompanyId;
    const navItems = hasActiveUnit ? UNIT_NAV_ITEMS : ROOT_NAV_ITEMS;

    const backToUnitsLink = hasActiveUnit ? `
        <a href="/unidades" id="back-to-units-link" class="nav-link flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--accent-color)] border-t border-[var(--border-color)] mt-4 pt-4">
            <i data-lucide="arrow-left" class="h-5 w-5"></i>
            <span>Trocar de Unidade</span>
        </a>
    ` : '';

    const sidebarContent = `
        <div class="flex h-full max-h-screen flex-col">
            <div class="flex h-20 items-center border-b border-[var(--border-color)] px-4">
                <a href="/perfil" class="nav-link flex items-center gap-3 w-full rounded-lg p-2 transition-colors hover:bg-[var(--bg-primary)]">
                    <div class="w-10 h-10 rounded-full bg-[var(--bg-primary)] flex items-center justify-center flex-shrink-0">
                        <i data-lucide="user" class="w-6 h-6"></i>
                    </div>
                    <div class="flex-1 overflow-hidden">
                        <p class="font-semibold text-md truncate text-[var(--text-primary)]">${userData.displayName}</p>
                        <p class="text-xs truncate text-[var(--text-secondary)]">${userData.email}</p>
                    </div>
                </a>
            </div>
            <div class="flex-1 overflow-y-auto">
                <nav class="flex flex-col gap-1 px-2 py-4 text-sm font-medium lg:px-4">
                    ${navItems.map(createNavItem).join('')}
                    ${backToUnitsLink}
                </nav>
            </div>
            <div class="mt-auto p-4 border-t border-[var(--border-color)]">
                <button id="sidebar-logout-btn" class="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-[var(--text-secondary)] transition-all hover:text-red-500 hover:bg-red-500/10">
                    <i data-lucide="log-out" class="h-5 w-5"></i>
                    Sair
                </button>
            </div>
        </div>
    `;
    sidebar.innerHTML = sidebarContent;
    
    document.getElementById('sidebar-logout-btn').addEventListener('click', async () => {
        console.log("[sidebar-logout-btn] Clicado em Sair.");
        await logout();
        window.location.replace('/login.html');
    });
    console.log("[buildSidebar] Sidebar construída.");
}

export function buildBottomNav(userData) {
    console.log("[buildBottomNav] Construindo navegação inferior.");
    const hasActiveUnit = userData && userData.activeCompanyId;
    const navItems = hasActiveUnit ? UNIT_NAV_ITEMS : ROOT_NAV_ITEMS;
    bottomNav.innerHTML = navItems.slice(0, 5).map(createBottomNavItem).join('');
    console.log("[buildBottomNav] Navegação inferior construída.");
}

export function updateActiveNav(path) {
    console.log(`[updateActiveNav] Atualizando link ativo para: ${path}`);
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === path) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    if (sidebar && sidebarOverlay) {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('opacity-0', 'pointer-events-none');
    }
    console.log("[updateActiveNav] Links ativos atualizados.");
}

export function initUI(userData) {
    console.log("[initUI] Inicializando UI components.");
    buildSidebar(userData);
    buildBottomNav(userData);
    lucide.createIcons(); // Cria os ícones Lucide em todos os elementos injetados
    console.log("[initUI] Lucide icons criados.");

    openSidebarBtn.addEventListener('click', () => {
        console.log("[initUI] Abrir sidebar clicado.");
        sidebar.classList.remove('-translate-x-full');
        sidebarOverlay.classList.remove('opacity-0', 'pointer-events-none');
    });

    const closeSidebar = () => {
        console.log("[initUI] Fechar sidebar.");
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('opacity-0', 'pointer-events-none');
    };
    sidebarOverlay.addEventListener('click', closeSidebar);
    console.log("[initUI] UI components inicializados.");
}