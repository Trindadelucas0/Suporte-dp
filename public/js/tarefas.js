/**
 * Tarefas - Gerenciamento
 */

let modoEdicao = false;

// Carrega script de confirmação
if (typeof mostrarConfirmacao === 'undefined') {
    const script = document.createElement('script');
    script.src = '/js/confirm-modal.js';
    document.head.appendChild(script);
}

document.addEventListener('DOMContentLoaded', () => {
    const btnNovaTarefa = document.getElementById('btnNovaTarefa');
    const btnFecharModal = document.getElementById('btnFecharModal');
    const btnCancelar = document.getElementById('btnCancelar');
    const formTarefa = document.getElementById('formTarefa');
    const modalTarefa = document.getElementById('modalTarefa');

    // Event listeners
    if (btnNovaTarefa) {
        btnNovaTarefa.addEventListener('click', () => abrirModalNova());
    }

    if (btnFecharModal) {
        btnFecharModal.addEventListener('click', fecharModal);
    }

    if (btnCancelar) {
        btnCancelar.addEventListener('click', fecharModal);
    }

    if (formTarefa) {
        formTarefa.addEventListener('submit', handleSubmit);
    }

    // Fechar modal ao clicar fora
    modalTarefa?.addEventListener('click', (e) => {
        if (e.target === modalTarefa) {
            fecharModal();
        }
    });

    // Event listeners para botões de excluir serão adicionados na view (tarefas/index.ejs)
    // para garantir que funcionem mesmo após carregamento dinâmico
});

/**
 * Abre modal para nova tarefa
 */
function abrirModalNova() {
    modoEdicao = false;
    const modal = document.getElementById('modalTarefa');
    const form = document.getElementById('formTarefa');
    const titulo = document.getElementById('modalTitulo');
    const statusContainer = document.getElementById('statusContainer');

    // Limpa formulário
    form.reset();
    document.getElementById('tarefaId').value = '';
    
    // Define data padrão (hoje)
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('data_vencimento').value = hoje;

    // Esconde campo de status na criação
    if (statusContainer) {
        statusContainer.style.display = 'none';
    }

    titulo.textContent = 'Nova Tarefa';
    modal.classList.remove('hidden');
}

/**
 * Abre modal para editar tarefa
 */
function abrirModalEditar(tarefa) {
    modoEdicao = true;
    const modal = document.getElementById('modalTarefa');
    const form = document.getElementById('formTarefa');
    const titulo = document.getElementById('modalTitulo');
    const statusContainer = document.getElementById('statusContainer');

    // Preenche formulário
    document.getElementById('tarefaId').value = tarefa.id;
    document.getElementById('nome').value = tarefa.nome || '';
    document.getElementById('tipo').value = tarefa.tipo || '';
    document.getElementById('prioridade').value = tarefa.prioridade || 'media';
    document.getElementById('data_vencimento').value = tarefa.data_vencimento || '';
    document.getElementById('status').value = tarefa.status || 'nao_iniciado';
    document.getElementById('descricao').value = tarefa.descricao || '';

    // Mostra campo de status na edição
    if (statusContainer) {
        statusContainer.style.display = 'block';
    }

    titulo.textContent = 'Editar Tarefa';
    modal.classList.remove('hidden');
}

/**
 * Fecha modal
 */
function fecharModal() {
    const modal = document.getElementById('modalTarefa');
    modal.classList.add('hidden');
    const form = document.getElementById('formTarefa');
    form.reset();
}

/**
 * Busca tarefa por ID
 */
async function buscarTarefa(id) {
    try {
        const headers = typeof getCSRFHeaders === 'function' ? getCSRFHeaders() : { 'Content-Type': 'application/json' };
        
        const response = await fetch(`/tarefas/api/${id}`, {
            headers: headers,
            credentials: 'same-origin'
        });
        const data = await response.json();
        
        if (data.success) {
            abrirModalEditar(data.data);
        } else {
            alert('Erro ao buscar tarefa: ' + (data.error || 'Tarefa não encontrada'));
        }
    } catch (error) {
        console.error('Erro ao buscar tarefa:', error);
        alert('Erro ao buscar tarefa');
    }
}

/**
 * Handle submit do formulário
 */
async function handleSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const tipo = formData.get('tipo');
    const descricao = formData.get('descricao');
    
    const data = {
        nome: formData.get('nome').trim(),
        tipo: tipo && tipo.trim() !== '' ? tipo.trim() : null,
        descricao: descricao && descricao.trim() !== '' ? descricao.trim() : null,
        prioridade: formData.get('prioridade') || 'media',
        data_vencimento: formData.get('data_vencimento'),
        status: formData.get('status') || 'nao_iniciado'
    };

    const tarefaId = formData.get('id');
    const url = tarefaId ? `/tarefas/${tarefaId}` : '/tarefas';
    const method = tarefaId ? 'PUT' : 'POST';

    try {
        // Prepara headers com CSRF
        const headers = typeof getCSRFHeaders === 'function' ? getCSRFHeaders() : { 'Content-Type': 'application/json' };
        
        // Adiciona CSRF no body também (csurf aceita de ambas as formas)
        if (window.csrfToken) {
            data._csrf = window.csrfToken;
        }
        
        // Debug (remover em produção)
        console.log('Enviando tarefa:', { url, method, data, headers: { ...headers, 'X-CSRF-Token': '***' } });
        
        const response = await fetch(url, {
            method: method,
            headers: headers,
            body: JSON.stringify(data),
            credentials: 'same-origin' // Importante para cookies CSRF
        });

        // Verifica status da resposta
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro HTTP:', response.status, errorText);
            throw new Error(`Erro ${response.status}: ${errorText}`);
        }

        // Verifica se a resposta é JSON
        let result;
        try {
            result = await response.json();
        } catch (jsonError) {
            const text = await response.text();
            console.error('Resposta do servidor (não JSON):', text);
            throw new Error('Resposta inválida do servidor');
        }

        if (result.success) {
            fecharModal();
            // Recarrega a página para atualizar a tabela
            location.reload();
        } else {
            // Mostra erros de validação se houver
            if (result.errors && Array.isArray(result.errors)) {
                const errorMessages = result.errors.map(e => e.msg || e.message).join('\n');
                alert('Erro de validação:\n' + errorMessages);
            } else {
                alert('Erro: ' + (result.error || 'Erro ao salvar tarefa'));
            }
        }
    } catch (error) {
        console.error('Erro ao salvar tarefa:', error);
        alert('Erro ao salvar tarefa: ' + error.message);
    }
}

/**
 * Exclui tarefa
 */
async function excluirTarefa(id) {
    if (!id) {
        console.error('ID da tarefa não fornecido');
        mostrarConfirmacao('Erro: ID da tarefa não encontrado', null);
        return;
    }

    mostrarConfirmacao(
        'Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.',
        () => executarExclusao(id)
    );
}

async function executarExclusao(id) {
    try {
        const headers = typeof getCSRFHeaders === 'function' ? getCSRFHeaders() : { 'Content-Type': 'application/json' };
        
        // Adiciona CSRF no body para DELETE também
        const bodyData = {};
        if (window.csrfToken) {
            bodyData._csrf = window.csrfToken;
        }
        
        console.log('Excluindo tarefa ID:', id);
        
        const response = await fetch(`/tarefas/${id}`, {
            method: 'DELETE',
            headers: headers,
            body: Object.keys(bodyData).length > 0 ? JSON.stringify(bodyData) : undefined,
            credentials: 'same-origin'
        });

        // Verifica status da resposta
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro HTTP:', response.status, errorText);
            throw new Error(`Erro ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('Resposta do servidor:', data);

        if (data.success) {
            // Remove linha da tabela
            const row = document.querySelector(`tr[data-id="${id}"]`);
            if (row) {
                // Animação de fade out antes de remover
                row.style.transition = 'opacity 0.3s ease';
                row.style.opacity = '0';
                setTimeout(() => {
                    row.remove();
                    
                    // Verifica se não há mais tarefas
                    const tbody = document.getElementById('tbodyTarefas');
                    if (tbody && tbody.querySelectorAll('tr.tarefa-row').length === 0) {
                        location.reload();
                    }
                }, 300);
            } else {
                // Se não encontrou, recarrega
                location.reload();
            }
        } else {
            alert('Erro: ' + (data.error || 'Erro ao excluir tarefa'));
        }
    } catch (error) {
        console.error('Erro ao excluir tarefa:', error);
        alert('Erro ao excluir tarefa: ' + error.message);
    }
}

