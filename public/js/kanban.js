/**
 * Kanban Drag & Drop
 */

let draggedElement = null;
let draggedStatus = null;

document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.kanban-card');
    const columns = document.querySelectorAll('.kanban-column');

    // Adiciona event listeners aos cards
    cards.forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });

    // Adiciona event listeners às colunas
    columns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
        column.addEventListener('dragenter', handleDragEnter);
        column.addEventListener('dragleave', handleDragLeave);
    });
});

function handleDragStart(e) {
    draggedElement = this;
    draggedStatus = this.dataset.status;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    
    // Remove classes de drag-over de todas as colunas
    document.querySelectorAll('.kanban-column').forEach(col => {
        col.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    this.classList.remove('drag-over');

    if (draggedElement != null) {
        const newStatus = this.dataset.status;
        const cardsContainer = this.querySelector('.kanban-cards');
        
        // Move o card para a nova coluna
        cardsContainer.appendChild(draggedElement);
        draggedElement.dataset.status = newStatus;

        // Atualiza ordem e status no servidor
        atualizarOrdemTarefas();
    }

    return false;
}

/**
 * Atualiza ordem das tarefas após drag & drop
 */
async function atualizarOrdemTarefas() {
    const tarefas = [];
    const columns = document.querySelectorAll('.kanban-column');

    columns.forEach((column, colIndex) => {
        const status = column.dataset.status;
        const cards = column.querySelectorAll('.kanban-card');
        
        cards.forEach((card, cardIndex) => {
            tarefas.push({
                id: card.dataset.id,
                status: status,
                ordem: cardIndex
            });
        });
    });

    try {
        const response = await fetch('/tarefas/update-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tarefas })
        });

        const data = await response.json();
        
        if (data.success) {
            // Atualiza contadores
            atualizarContadores();
        } else {
            console.error('Erro ao atualizar ordem:', data.error);
            // Recarrega a página em caso de erro
            location.reload();
        }
    } catch (error) {
        console.error('Erro ao atualizar ordem:', error);
        location.reload();
    }
}

/**
 * Atualiza contadores das colunas
 */
function atualizarContadores() {
    const columns = document.querySelectorAll('.kanban-column');
    
    columns.forEach(column => {
        const cardsContainer = column.querySelector('.kanban-cards');
        const count = cardsContainer.querySelectorAll('.kanban-card').length;
        const badge = column.querySelector('.badge-count');
        
        if (badge) {
            badge.textContent = count;
        }
    });
}

