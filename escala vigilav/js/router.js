// js/router.js
import { updateActiveNav } from './ui.js';

let routes = {};

function handleRouteChange() {
    console.log("[Router] handleRouteChange ativado.");
    let path = window.location.pathname;
    
    if (path === '/' || path === '/index.html') {
        console.log("[Router] Caminho raiz detectado. Redirecionando internamente para /dashboard.");
        path = '/dashboard';
    }
    
    const renderFunction = routes[path] || routes['/404'];
    
    if (renderFunction) {
        console.log(`[Router] Renderizando rota: ${path}`);
        renderFunction();
    } else {
        console.warn(`[Router] Nenhuma função de renderização encontrada para: ${path}. Renderizando 404.`);
        routes['/404']();
    }
    
    updateActiveNav(path);
    console.log("[Router] handleRouteChange finalizado.");
}

// **CORREÇÃO CRÍTICA AQUI**: Usando 'clickedLink' em vez de 'event.currentTarget'
function navigate(clickedLink, event) { // Agora aceita o elemento do link diretamente
    event.preventDefault(); // Impede o recarregamento padrão do navegador
    const path = clickedLink.getAttribute('href'); // Pega o href do link clicado

    console.log(`[Router] Navegando para: ${path}`); // Loga o path que o router vai usar

    if (window.location.pathname !== path) {
        window.history.pushState({}, '', path); // Muda a URL sem recarregar
        handleRouteChange(); // Chama a função de renderização
    } else {
        console.log(`[Router] Já na rota: ${path}. Nada a fazer.`);
        updateActiveNav(path); 
        // Força a recriação dos ícones Lucide, caso a página tenha sido re-renderizada com algum problema
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
             lucide.createIcons();
        }
    }
}

export function initRouter(pageRenderers) {
    console.log("[initRouter] Inicializando roteador.");
    routes = pageRenderers;

    document.body.addEventListener('click', (e) => {
        const navLink = e.target.closest('a.nav-link');
        
        if (navLink && navLink.getAttribute('href')) {
            console.log(`[Router Event Listener] nav-link clicado (href encontrado): ${navLink.getAttribute('href')}`);
            // **MUDANÇA CRÍTICA AQUI**: Passa o 'navLink' como primeiro argumento
            navigate(navLink, e); 
        } else {
            console.log(`[Router Event Listener] Clique ignorado (não é um nav-link válido ou não tem href). Target:`, e.target);
        }
    });

    window.addEventListener('popstate', handleRouteChange);
    
    // Garante que a rota inicial seja tratada no carregamento da página
    handleRouteChange();
    console.log("[initRouter] Roteador inicializado e rota inicial processada.");
}