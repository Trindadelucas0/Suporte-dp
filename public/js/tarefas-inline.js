/**
 * Edição Inline de Tarefas (Estilo Notion)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa edição inline para todos os campos editáveis
    initInlineEditing();
});

function initInlineEditing() {
    const editableCells = document.querySelectorAll('.editable-cell');
    
    editableCells.forEach(cell => {
        const textElement = cell.querySelector('.editable-text');
        const inputElement = cell.querySelector('.editable-input');
        const field = cell.dataset.field;
        const tarefaId = cell.dataset.tarefaId;
        
        if (!textElement || !inputElement) return;
        
        // Click no texto para editar
        textElement.addEventListener('click', (e) => {
            e.stopPropagation();
            entrarModoEdicao(cell, textElement, inputElement, field, tarefaId);
        });
        
        // Para selects, mudança direta salva automaticamente
        if (inputElement.tagName === 'SELECT') {
            inputElement.addEventListener('change', () => {
                salvarCampoInline(tarefaId, field, inputElement.value, cell, textElement, inputElement);
            });
        }
        
        // Para inputs de texto e textarea
        if (inputElement.tagName === 'INPUT' || inputElement.tagName === 'TEXTAREA') {
            // Enter salva
            inputElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    salvarCampoInline(tarefaId, field, inputElement.value, cell, textElement, inputElement);
                }
                // Escape cancela
                if (e.key === 'Escape') {
                    cancelarEdicao(cell, textElement, inputElement);
                }
            });
            
            // Blur salva
            inputElement.addEventListener('blur', () => {
                salvarCampoInline(tarefaId, field, inputElement.value, cell, textElement, inputElement);
            });
        }
        
        // Para inputs de data
        if (inputElement.type === 'date') {
            inputElement.addEventListener('change', () => {
                salvarCampoInline(tarefaId, field, inputElement.value, cell, textElement, inputElement);
            });
        }
    });
}

function entrarModoEdicao(cell, textElement, inputElement, field, tarefaId) {
    textElement.classList.add('hidden');
    inputElement.classList.remove('hidden');
    inputElement.focus();
    
    // Para inputs de texto, seleciona todo o texto
    if (inputElement.tagName === 'INPUT' && inputElement.type === 'text') {
        inputElement.select();
    }
}

function cancelarEdicao(cell, textElement, inputElement) {
    textElement.classList.remove('hidden');
    inputElement.classList.add('hidden');
}

function atualizarTextoExibido(cell, field, value) {
    const textElement = cell.querySelector('.editable-text');
    if (!textElement) return;
    
    // Atualiza o texto exibido baseado no campo
    switch(field) {
        case 'nome':
            textElement.innerHTML = `<span class="text-gray-900 font-medium">${value || '—'}</span>`;
            break;
            
        case 'tipo':
            if (value && value.trim() !== '') {
                textElement.innerHTML = `<span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">${value}</span>`;
            } else {
                textElement.innerHTML = `<span class="text-gray-400 text-xs">—</span>`;
            }
            break;
            
        case 'status':
            const statusConfig = {
                'nao_iniciado': { label: 'Não Iniciado', color: 'bg-gray-100 text-gray-700' },
                'em_andamento': { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700' },
                'feito': { label: 'Feito', color: 'bg-green-100 text-green-700' }
            };
            const status = statusConfig[value] || statusConfig['nao_iniciado'];
            textElement.innerHTML = `<span class="px-2 py-1 ${status.color} rounded text-xs">${status.label}</span>`;
            break;
            
        case 'prioridade':
            const prioridadeConfig = {
                'alta': { label: '🔴 Alta', color: 'text-red-600' },
                'media': { label: '🟡 Média', color: 'text-yellow-600' },
                'baixa': { label: '🟢 Baixa', color: 'text-green-600' }
            };
            const prioridade = prioridadeConfig[value] || prioridadeConfig['media'];
            textElement.innerHTML = `<span class="${prioridade.color} text-xs">${prioridade.label}</span>`;
            break;
            
        case 'data_vencimento':
            if (value) {
                const date = new Date(value);
                textElement.innerHTML = `<span class="text-sm text-gray-600">${date.toLocaleDateString('pt-BR')}</span>`;
            } else {
                textElement.innerHTML = `<span class="text-sm text-gray-600">—</span>`;
            }
            break;
            
        case 'data_conclusao':
            if (value && value.trim() !== '') {
                const date = new Date(value);
                textElement.innerHTML = `<span class="text-sm text-gray-600">${date.toLocaleDateString('pt-BR')}</span>`;
            } else {
                textElement.innerHTML = `<span class="text-sm text-gray-600">—</span>`;
            }
            break;
            
        case 'descricao':
            if (value && value.trim() !== '') {
                const truncated = value.length > 50 ? value.substring(0, 50) + '...' : value;
                textElement.innerHTML = `<span class="text-gray-500 text-xs truncate block max-w-xs" title="${value}">${truncated}</span>`;
            } else {
                textElement.innerHTML = `<span class="text-gray-400 text-xs">—</span>`;
            }
            break;
    }
}

async function salvarCampoInline(tarefaId, field, value, cell, textElement, inputElement) {
    // Validação básica
    if (field === 'nome' && (!value || value.trim().length === 0)) {
        alert('Nome da tarefa não pode ser vazio');
        inputElement.focus();
        return;
    }
    
    // Prepara dados para envio
    const data = {};
    data[field] = value && value.trim() !== '' ? value.trim() : null;
    
    // Para data_conclusao, se estiver vazia, envia null
    if (field === 'data_conclusao' && (!value || value.trim() === '')) {
        data[field] = null;
    }
    
    try {
        const headers = typeof getCSRFHeaders === 'function' ? getCSRFHeaders() : { 'Content-Type': 'application/json' };
        
        if (window.csrfToken) {
            data._csrf = window.csrfToken;
        }
        
        const response = await fetch(`/tarefas/${tarefaId}`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(data),
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`Erro ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Atualiza o texto exibido
            atualizarTextoExibido(cell, field, value);
            
            // Volta para modo de visualização
            textElement.classList.remove('hidden');
            inputElement.classList.add('hidden');
            
            // Se mudou status, recarrega para atualizar data_conclusao (trigger do banco)
            if (field === 'status') {
                // Recarrega a linha para mostrar data_conclusao atualizada pelo trigger
                setTimeout(() => {
                    location.reload();
                }, 300);
            }
        } else {
            throw new Error(result.error || 'Erro ao salvar');
        }
    } catch (error) {
        console.error('Erro ao salvar campo:', error);
        alert('Erro ao salvar: ' + error.message);
        // Mantém em modo de edição para tentar novamente
        inputElement.focus();
    }
}

