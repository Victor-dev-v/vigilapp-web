// js/ui.js
import { logout } from './auth.js';

// **NOVO**: A estrutura da navegação vai mudar dinamicamente.
// Esta é a navegação FORA do contexto de uma unidade.
const ROOT_NAV_ITEMS = [
    { path: '/dashboard', label: 'Dashboard', icon: 'home' }, // Dashboard agora é o lobby
    { path: '/unidades', label: 'Unidades', icon: 'building-2' },
    { path: '/perfil', label: 'Meu Perfil', icon: 'user' },
];

// Navegação DENTRO do contexto de uma unidade.
const UNIT_NAV_ITEMS = [
    { path: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { path: '/rondas', label: 'Rondas', icon: 'shield-check' },
    { path: '/escalas', label: 'Escalas', icon: 'calendar-days' },
    { path: '/historico', label: 'Histórico', icon: 'history' },
];

const sidebar = document.getElementById('sidebar');
const bottomNav = document.getElementById('bottom-nav');
const openSidebarBtn = document.getElementById('open-sidebar-btn');
const sidebarOverlay = document.getElementById('sidebar-overlay');

function createNavItem(item) {
    return `<a href="${item.path}" class="nav-link flex items-center gap-3 rounded-lg px-3 py-2 text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]">
        <i data-lucide="${item.icon}" class="h-5 w-5"></i>
        ${item.label}
    </a>`;
}

function createBottomNavItem(item) {
     return `<a href="${item.path}" class="nav-link flex flex-col items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent-color)] transition-colors">
        <i data-lucide="${item.icon}" class="w-6 h-6 mb-1"></i>
        <span class="text-xs">${item.label}</span>
    </a>`;
}

export function buildSidebar(userData, activeUnit = null) {
    // Por enquanto, vamos usar apenas a navegação raiz. A lógica de contexto virá depois.
    const navItems = ROOT_NAV_ITEMS;

    const sidebarContent = `
        <div class="flex h-full max-h-screen flex-col">
            <!-- RESUMO DO PERFIL NO TOPO -->
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
        await logout();
        window.location.replace('/login.html');
    });
}

export function buildBottomNav(userData, activeUnit = null) {
    const navItems = ROOT_NAV_ITEMS; // Usando a navegação raiz por enquanto
    bottomNav.innerHTML = navItems.slice(0, 5).map(createBottomNavItem).join('');
}


export function updateActiveNav(path) {
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
}

export function initUI(userData) {
    buildSidebar(userData);
    buildBottomNav(userData);
    lucide.createIcons();

    openSidebarBtn.addEventListener('click', () => {
        sidebar.classList.remove('-translate-x-full');
        sidebarOverlay.classList.remove('opacity-0', 'pointer-events-none');
    });

    const closeSidebar = () => {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('opacity-0', 'pointer-events-none');
    };

    sidebarOverlay.addEventListener('click', closeSidebar);
}