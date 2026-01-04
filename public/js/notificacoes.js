/**
 * Sistema de Notificações
 */

let notificacoesCache = [];
let notificacoesCarregadas = false;

// Função helper para escapar HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Lista de rotas de autenticação onde as notificações NÃO devem ser carregadas
const AUTH_ROUTES = ['/login', '/register', '/cadastro/', '/', '/adquirir', '/cobranca/assinar-direto'];

function isAuthRoute(pathname) {
    return AUTH_ROUTES.some(route => pathname.startsWith(route));
}

// Flag para rastrear se estamos em processo de redirecionamento
let isRedirecting = false;

// Detecta redirecionamentos
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
    isRedirecting = true;
    setTimeout(() => { isRedirecting = false; }, 2000);
    return originalPushState.apply(history, args);
};

history.replaceState = function(...args) {
    isRedirecting = true;
    setTimeout(() => { isRedirecting = false; }, 2000);
    return originalReplaceState.apply(history, args);
};

// Detecta navegação via window.location
let lastLocation = window.location.href;
setInterval(() => {
    if (window.location.href !== lastLocation) {
        isRedirecting = true;
        lastLocation = window.location.href;
        setTimeout(() => { isRedirecting = false; }, 2000);
    }
}, 100);

document.addEventListener('DOMContentLoaded', () => {
    // Verifica imediatamente se está em página de autenticação
    if (isAuthRoute(window.location.pathname)) {
        console.log('🚫 [Notificações] Página de autenticação detectada, não carregando notificações');
        return; // Sai imediatamente sem fazer nada
    }

    const btnNotificacoes = document.getElementById('btnNotificacoes');
    const btnNotificacoesMobile = document.getElementById('btnNotificacoesMobile');
    const dropdown = document.getElementById('notificacoesDropdown');
    const btnMarcarTodasLidas = document.getElementById('btnMarcarTodasLidas');

    // Só carrega notificações se os elementos existirem (usuário está logado)
    if (!btnNotificacoes && !btnNotificacoesMobile) {
        console.log('🚫 [Notificações] Elementos de notificação não encontrados, não carregando');
        return; // Sai se não encontrar os elementos
    }

    // Aguarda mais tempo para garantir que o redirecionamento já aconteceu completamente
    setTimeout(() => {
        // Verifica novamente se ainda está na página correta
        if (isAuthRoute(window.location.pathname) || isRedirecting) {
            console.log('🚫 [Notificações] Ainda em página de autenticação ou redirecionando, não carregando');
            return;
        }

        // Verifica se os elementos ainda existem (pode ter mudado de página)
        const btnNotificacoesCheck = document.getElementById('btnNotificacoes');
        const btnNotificacoesMobileCheck = document.getElementById('btnNotificacoesMobile');
        if (!btnNotificacoesCheck && !btnNotificacoesMobileCheck) {
            console.log('🚫 [Notificações] Elementos não encontrados após delay, não carregando');
            return;
        }

        // Carrega notificações ao iniciar
        carregarNotificacoes();
        atualizarContador();

        // Atualiza a cada 30 segundos
        setInterval(() => {
            // Verifica novamente antes de carregar
            if (!isAuthRoute(window.location.pathname) && !isRedirecting) {
                const btnCheck = document.getElementById('btnNotificacoes');
                const btnMobileCheck = document.getElementById('btnNotificacoesMobile');
                if (btnCheck || btnMobileCheck) {
                    carregarNotificacoes();
                    atualizarContador();
                }
            }
        }, 30000);
    }, 2000); // Aumenta delay para 2 segundos para garantir que redirecionamento completou

    // Toggle dropdown desktop
    if (btnNotificacoes) {
        btnNotificacoes.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown();
        });
    }

    // Toggle dropdown mobile
    if (btnNotificacoesMobile) {
        btnNotificacoesMobile.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdownMobile = document.getElementById('notificacoesDropdownMobile');
            if (dropdownMobile) {
                dropdownMobile.classList.toggle('hidden');
                if (!dropdownMobile.classList.contains('hidden') && !notificacoesCarregadas) {
                    carregarNotificacoes();
                }
            }
        });
    }

    // Marcar todas como lidas
    if (btnMarcarTodasLidas) {
        btnMarcarTodasLidas.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await marcarTodasComoLidas();
        });
    }
    
    const btnMarcarTodasLidasMobile = document.getElementById('btnMarcarTodasLidasMobile');
    if (btnMarcarTodasLidasMobile) {
        btnMarcarTodasLidasMobile.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await marcarTodasComoLidas();
        });
    }

    // Fecha dropdown ao clicar fora
    document.addEventListener('click', (e) => {
        const dropdownMobile = document.getElementById('notificacoesDropdownMobile');
        if (dropdown && !dropdown.contains(e.target) && !btnNotificacoes?.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
        if (dropdownMobile && !dropdownMobile.contains(e.target) && !btnNotificacoesMobile?.contains(e.target)) {
            dropdownMobile.classList.add('hidden');
        }
    });
});

function toggleDropdown() {
    const dropdown = document.getElementById('notificacoesDropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden') && !notificacoesCarregadas) {
            carregarNotificacoes();
        }
    }
}

async function carregarNotificacoes() {
    // Verifica se estamos em uma página de autenticação ou redirecionando
    if (isAuthRoute(window.location.pathname) || isRedirecting) {
        console.log('🚫 [Notificações] Tentativa de carregar em página de autenticação ou durante redirecionamento, bloqueando');
        return; // Não carrega notificações em páginas de autenticação ou durante redirecionamento
    }

    // Verifica se os elementos existem antes de fazer requisição
    const btnNotificacoes = document.getElementById('btnNotificacoes');
    const btnNotificacoesMobile = document.getElementById('btnNotificacoesMobile');
    if (!btnNotificacoes && !btnNotificacoesMobile) {
        console.log('🚫 [Notificações] Elementos não encontrados, não fazendo requisição');
        return;
    }
    
    // Verifica novamente se ainda está em página de autenticação ou redirecionando (proteção extra)
    if (isAuthRoute(window.location.pathname) || isRedirecting) {
        console.log('🚫 [Notificações] Ainda em página de autenticação ou redirecionando, cancelando requisição');
        return;
    }

    try {
        const headers = { 'Content-Type': 'application/json' };
        
        if (window.csrfToken) {
            headers['X-CSRF-Token'] = window.csrfToken;
        } else if (typeof getCSRFHeaders === 'function') {
            Object.assign(headers, getCSRFHeaders());
        }
        
        // Verifica novamente ANTES de fazer a requisição (proteção extra)
        if (isAuthRoute(window.location.pathname) || isRedirecting) {
            console.log('🚫 [Notificações] Cancelando requisição - ainda em página de autenticação ou redirecionando');
            return;
        }
        
        const response = await fetch('/notificacoes/api/nao-lidas', {
            headers: headers,
            credentials: 'same-origin'
        });

        // Verifica novamente DEPOIS de receber a resposta (pode ter redirecionado)
        if (isAuthRoute(window.location.pathname) || isRedirecting) {
            console.log('🚫 [Notificações] Cancelando processamento - redirecionado para página de autenticação ou em processo de redirecionamento');
            return;
        }

        // Verifica se a resposta é realmente JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.warn('Resposta não é JSON, ignorando:', contentType);
            return;
        }

        if (!response.ok) {
            // Se não for OK e estiver em página de autenticação ou redirecionando, não faz nada
            if (isAuthRoute(window.location.pathname) || isRedirecting) {
                return;
            }
            throw new Error('Erro ao carregar notificações');
        }

        const data = await response.json();
        
        // Verifica novamente após parse do JSON
        if (isAuthRoute(window.location.pathname) || isRedirecting) {
            console.log('🚫 [Notificações] Cancelando processamento - em página de autenticação ou redirecionando após parse');
            return;
        }
        
        if (data.success) {
            notificacoesCache = data.data || [];
            notificacoesCarregadas = true;
            renderizarNotificacoes(notificacoesCache);
            atualizarContador();
        }
    } catch (error) {
        console.error('Erro ao carregar notificações:', error);
        // Não mostra alerta para não incomodar o usuário
    }
}

function renderizarNotificacoes(notificacoes) {
    const container = document.getElementById('notificacoesList');
    const containerMobile = document.getElementById('notificacoesListMobile');
    
    if (!container && !containerMobile) return;
    
    const containers = [container, containerMobile].filter(c => c !== null);

    if (notificacoes.length === 0) {
        const emptyHtml = `
            <div class="p-6 text-center text-gray-500">
                <i class="fas fa-bell-slash text-3xl mb-2"></i>
                <p class="text-sm">Nenhuma notificação</p>
            </div>
        `;
        containers.forEach(c => c.innerHTML = emptyHtml);
        return;
    }

    const notificacoesHtml = notificacoes.map(notif => {
        const tipoIcon = {
            'info': 'fa-info-circle',
            'warning': 'fa-exclamation-triangle',
            'success': 'fa-check-circle',
            'error': 'fa-times-circle'
        }[notif.tipo] || 'fa-bell';

        const tipoColor = {
            'info': 'text-blue-600',
            'warning': 'text-yellow-600',
            'success': 'text-green-600',
            'error': 'text-red-600'
        }[notif.tipo] || 'text-gray-600';

        const dataFormatada = new Date(notif.created_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const notifId = notif.id || '';
        const titulo = escapeHtml(notif.titulo || '');
        const mensagem = escapeHtml(notif.mensagem || '');
        const linkHtml = notif.link ? `<a href="${notif.link}" class="text-primary-red text-xs hover:underline" onclick="event.stopPropagation();">Ver detalhes</a>` : '';

        return `
            <div class="border-b border-gray-200 hover:bg-gray-50 transition cursor-pointer notificacao-item" data-id="${notifId}">
                <div class="p-3 flex items-start gap-3">
                    <div class="flex-shrink-0 mt-1">
                        <i class="fas ${tipoIcon} ${tipoColor}"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-semibold text-gray-900 text-sm mb-1">${titulo}</h4>
                        <p class="text-gray-600 text-xs mb-2">${mensagem}</p>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-400 text-xs">${dataFormatada}</span>
                            ${linkHtml}
                        </div>
                    </div>
                    <button type="button" class="btn-marcar-lida text-gray-400 hover:text-blue-600 p-1 flex-shrink-0" data-id="${notifId}" title="Marcar como lida">
                        <i class="fas fa-check text-xs"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Renderiza em todos os containers
    containers.forEach(container => {
        container.innerHTML = notificacoesHtml;
        
        // Event listeners para marcar como lida
        container.querySelectorAll('.btn-marcar-lida').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const notifId = btn.getAttribute('data-id');
                console.log('Marcar como lida - ID:', notifId);
                if (notifId) {
                    await marcarComoLida(notifId);
                } else {
                    console.error('ID da notificação não encontrado');
                }
            });
        });

        // Event listeners para clicar na notificação (apenas se tiver link)
        container.querySelectorAll('.notificacao-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Não faz nada se clicou no botão de marcar como lida ou em links
                if (e.target.closest('.btn-marcar-lida') || e.target.closest('a')) {
                    return;
                }
                const notifId = item.getAttribute('data-id');
                const notif = notificacoes.find(n => n.id === notifId);
                if (notif && notif.link) {
                    window.location.href = notif.link;
                }
            });
        });
    });
}

async function marcarComoLida(notifId) {
    if (!notifId) {
        console.error('ID da notificação não fornecido');
        return;
    }

    console.log('Marcando notificação como lida:', notifId);

    // Verifica se o token CSRF está disponível
    if (!window.csrfToken || window.csrfToken === '') {
        console.error('Token CSRF não disponível. Tentando obter...');
        
        // Tenta obter do helper se disponível
        if (typeof getCSRFHeaders === 'function') {
            const tempHeaders = getCSRFHeaders();
            if (tempHeaders && tempHeaders['X-CSRF-Token']) {
                window.csrfToken = tempHeaders['X-CSRF-Token'];
                console.log('Token CSRF obtido via getCSRFHeaders');
            }
        }
        
        // Se ainda não tiver token, tenta buscar em um input hidden (fallback)
        if (!window.csrfToken || window.csrfToken === '') {
            const csrfInput = document.querySelector('input[name="_csrf"]');
            if (csrfInput && csrfInput.value) {
                window.csrfToken = csrfInput.value;
                console.log('Token CSRF obtido via input hidden');
            }
        }
        
        // Se ainda não tiver, mostra erro mas não recarrega (pode ser que a página não tenha token ainda)
        if (!window.csrfToken || window.csrfToken === '') {
            console.error('Token CSRF não encontrado. A requisição pode falhar.');
            // Não recarrega automaticamente, apenas loga o erro
            // O servidor retornará erro 403 se o token estiver realmente ausente
        }
    }

    try {
        const headers = { 'Content-Type': 'application/json' };
        
        // Adiciona token CSRF em múltiplos formatos para garantir compatibilidade
        headers['x-csrf-token'] = window.csrfToken;
        headers['X-CSRF-Token'] = window.csrfToken;
        headers['csrf-token'] = window.csrfToken;

        const body = {
            _csrf: window.csrfToken
        };

        console.log('Enviando requisição para:', `/notificacoes/api/${notifId}/marcar-lida`);
        console.log('Headers:', headers);
        console.log('Body:', body);
        console.log('CSRF Token disponível:', !!window.csrfToken);

        const response = await fetch(`/notificacoes/api/${notifId}/marcar-lida`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body),
            credentials: 'same-origin'
        });

        console.log('Resposta status:', response.status);
        console.log('Resposta headers:', Object.fromEntries(response.headers.entries()));

        let result;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const errorText = await response.text();
            console.error('Resposta não é JSON:', errorText);
            throw new Error(`Erro ${response.status}: ${errorText || 'Resposta inválida do servidor'}`);
        }

        console.log('Resultado:', result);
        
        if (result.success) {
            // Remove da lista
            notificacoesCache = notificacoesCache.filter(n => n.id !== notifId);
            renderizarNotificacoes(notificacoesCache);
            atualizarContador();
        } else {
            console.error('Erro ao marcar como lida:', result.error);
            alert('Erro: ' + (result.error || 'Não foi possível marcar como lida'));
        }
    } catch (error) {
        console.error('Erro completo ao marcar como lida:', error);
        console.error('Stack:', error.stack);
        const errorMessage = error.message || 'Erro desconhecido';
        alert('Erro ao marcar notificação como lida: ' + errorMessage + '\n\nVerifique o console para mais detalhes.');
    }
}

async function marcarTodasComoLidas() {
    // Verifica se o token CSRF está disponível
    if (!window.csrfToken || window.csrfToken === '') {
        console.error('Token CSRF não disponível. Tentando obter...');
        
        // Tenta obter do helper se disponível
        if (typeof getCSRFHeaders === 'function') {
            const tempHeaders = getCSRFHeaders();
            if (tempHeaders && tempHeaders['X-CSRF-Token']) {
                window.csrfToken = tempHeaders['X-CSRF-Token'];
                console.log('Token CSRF obtido via getCSRFHeaders');
            }
        }
        
        // Se ainda não tiver token, tenta buscar em um input hidden (fallback)
        if (!window.csrfToken || window.csrfToken === '') {
            const csrfInput = document.querySelector('input[name="_csrf"]');
            if (csrfInput && csrfInput.value) {
                window.csrfToken = csrfInput.value;
                console.log('Token CSRF obtido via input hidden');
            }
        }
        
        // Se ainda não tiver, mostra erro mas não recarrega
        if (!window.csrfToken || window.csrfToken === '') {
            console.error('Token CSRF não encontrado. A requisição pode falhar.');
        }
    }

    try {
        const headers = { 'Content-Type': 'application/json' };
        
        // Adiciona token CSRF em múltiplos formatos
        headers['x-csrf-token'] = window.csrfToken;
        headers['X-CSRF-Token'] = window.csrfToken;
        headers['csrf-token'] = window.csrfToken;

        const body = {
            _csrf: window.csrfToken
        };

        const response = await fetch('/notificacoes/api/marcar-todas-lidas', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body),
            credentials: 'same-origin'
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro na resposta:', response.status, errorText);
            throw new Error(`Erro ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        
        if (result.success) {
            notificacoesCache = [];
            renderizarNotificacoes([]);
            atualizarContador();
        } else {
            console.error('Erro ao marcar todas como lidas:', result.error);
            alert('Erro: ' + (result.error || 'Não foi possível marcar todas como lidas'));
        }
    } catch (error) {
        console.error('Erro ao marcar todas como lidas:', error);
        alert('Erro ao marcar todas as notificações como lidas. Tente novamente.');
    }
}

async function atualizarContador() {
    // Verifica se está em página de autenticação ou redirecionando antes de fazer requisição
    if (isAuthRoute(window.location.pathname) || isRedirecting) {
        return; // Não atualiza contador em páginas de autenticação ou durante redirecionamento
    }
    
    try {
        const headers = { 'Content-Type': 'application/json' };
        
        if (window.csrfToken) {
            headers['X-CSRF-Token'] = window.csrfToken;
        } else if (typeof getCSRFHeaders === 'function') {
            Object.assign(headers, getCSRFHeaders());
        }
        
        // Verifica novamente ANTES de fazer a requisição
        if (isAuthRoute(window.location.pathname) || isRedirecting) {
            return;
        }
        
        const response = await fetch('/notificacoes/api/count', {
            headers: headers,
            credentials: 'same-origin'
        });

        // Verifica novamente DEPOIS de receber a resposta
        if (isAuthRoute(window.location.pathname) || isRedirecting) {
            return;
        }

        if (response.ok) {
            const data = await response.json();
            
            // Verifica novamente após parse do JSON
            if (isAuthRoute(window.location.pathname) || isRedirecting) {
                return;
            }
            const count = data.count || 0;
            
            const countDesktop = document.getElementById('notificacaoCount');
            const countMobile = document.getElementById('notificacaoCountMobile');
            
            if (countDesktop) {
                if (count > 0) {
                    countDesktop.textContent = count > 99 ? '99+' : count;
                    countDesktop.classList.remove('hidden');
                } else {
                    countDesktop.classList.add('hidden');
                }
            }
            
            if (countMobile) {
                if (count > 0) {
                    countMobile.textContent = count > 99 ? '99+' : count;
                    countMobile.classList.remove('hidden');
                } else {
                    countMobile.classList.add('hidden');
                }
            }
        }
    } catch (error) {
        console.error('Erro ao atualizar contador:', error);
    }
}
