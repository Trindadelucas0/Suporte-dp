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

document.addEventListener('DOMContentLoaded', () => {
    const btnNotificacoes = document.getElementById('btnNotificacoes');
    const btnNotificacoesMobile = document.getElementById('btnNotificacoesMobile');
    const dropdown = document.getElementById('notificacoesDropdown');
    const btnMarcarTodasLidas = document.getElementById('btnMarcarTodasLidas');

    // Carrega notificações ao iniciar
    carregarNotificacoes();
    atualizarContador();

    // Atualiza a cada 30 segundos
    setInterval(() => {
        carregarNotificacoes();
        atualizarContador();
    }, 30000);

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
    try {
        const headers = { 'Content-Type': 'application/json' };
        
        if (window.csrfToken) {
            headers['X-CSRF-Token'] = window.csrfToken;
        } else if (typeof getCSRFHeaders === 'function') {
            Object.assign(headers, getCSRFHeaders());
        }
        
        const response = await fetch('/notificacoes/api/nao-lidas', {
            headers: headers,
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar notificações');
        }

        const data = await response.json();
        
        if (data.success) {
            notificacoesCache = data.data || [];
            notificacoesCarregadas = true;
            renderizarNotificacoes(notificacoesCache);
            atualizarContador();
        }
    } catch (error) {
        console.error('Erro ao carregar notificações:', error);
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

    try {
        const headers = { 'Content-Type': 'application/json' };
        
        // Adiciona token CSRF
        if (window.csrfToken) {
            headers['X-CSRF-Token'] = window.csrfToken;
        } else if (typeof getCSRFHeaders === 'function') {
            Object.assign(headers, getCSRFHeaders());
        }

        const body = {};
        if (window.csrfToken) {
            body._csrf = window.csrfToken;
        }

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
    try {
        const headers = { 'Content-Type': 'application/json' };
        
        // Adiciona token CSRF
        if (window.csrfToken) {
            headers['X-CSRF-Token'] = window.csrfToken;
        } else if (typeof getCSRFHeaders === 'function') {
            Object.assign(headers, getCSRFHeaders());
        }

        const body = {};
        if (window.csrfToken) {
            body._csrf = window.csrfToken;
        }

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
    try {
        const headers = { 'Content-Type': 'application/json' };
        
        if (window.csrfToken) {
            headers['X-CSRF-Token'] = window.csrfToken;
        } else if (typeof getCSRFHeaders === 'function') {
            Object.assign(headers, getCSRFHeaders());
        }
        
        const response = await fetch('/notificacoes/api/count', {
            headers: headers,
            credentials: 'same-origin'
        });

        if (response.ok) {
            const data = await response.json();
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
