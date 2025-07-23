// js/router.js
import { updateActiveNav } from './ui.js';

let routes = {};

// Função que renderiza a página correta com base na URL
function routeHandler() {
    // Se o caminho for a raiz, redireciona internamente para /dashboard
    let path = window.location.pathname;
    if (path === '/') {
        path = '/dashboard';
    }
    
    // Encontra a função de renderização para o caminho atual ou usa a de 404
    const renderFunction = routes[path] || routes['/404'];
    
    // Garante que a função existe antes de chamar
    if (renderFunction) {
        renderFunction(); // Executa a função de renderização da página
    }
    
    updateActiveNav(path); // Atualiza o link ativo na navegação
}

// Função para ser chamada quando um link de navegação é clicado
function navigate(event) {
    event.preventDefault(); // Impede o recarregamento da página
    const path = event.currentTarget.getAttribute('href');

    // Só atualiza a URL e renderiza se o caminho for diferente do atual
    if (window.location.pathname !== path) {
        // Atualiza a URL na barra de endereço do navegador
        window.history.pushState({}, '', path);
        // Chama o nosso manipulador de rotas para renderizar a nova página
        routeHandler();
    }
}

// Inicia o roteador
export function initRouter(pageRenderers) {
    routes = pageRenderers;

    // Após a UI ser criada, adiciona o listener de clique a cada link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', navigate);
    });

    // Lida com o uso dos botões de voltar/avançar do navegador
    window.addEventListener('popstate', routeHandler);

    // Renderiza a rota inicial ao carregar a página
    // Precisamos garantir que o estado inicial seja renderizado corretamente
    if (window.location.pathname === '/') {
        // Se estamos na raiz, forçamos a navegação para o dashboard
        window.history.replaceState({}, '', '/dashboard');
    }
    
    routeHandler();
}