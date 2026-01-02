/**
 * Modal de Confirmação Customizado
 */

function mostrarConfirmacao(mensagem, onConfirm, onCancel = null) {
    // Remove modal existente se houver
    const modalExistente = document.getElementById('confirmModal');
    if (modalExistente) {
        modalExistente.remove();
    }

    // Cria modal
    const modal = document.createElement('div');
    modal.id = 'confirmModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div class="p-6">
                <div class="flex items-center gap-4 mb-4">
                    <div class="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="text-lg font-bold text-gray-900">Confirmar Exclusão</h3>
                    </div>
                </div>
                <p class="text-gray-700 mb-6">${mensagem}</p>
                <div class="flex justify-end gap-3">
                    <button 
                        type="button" 
                        id="btnCancelarConfirm"
                        class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium">
                        Cancelar
                    </button>
                    <button 
                        type="button" 
                        id="btnConfirmarConfirm"
                        class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium">
                        Excluir
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    const btnConfirmar = document.getElementById('btnConfirmarConfirm');
    const btnCancelar = document.getElementById('btnCancelarConfirm');

    btnConfirmar.addEventListener('click', () => {
        modal.remove();
        if (onConfirm) onConfirm();
    });

    btnCancelar.addEventListener('click', () => {
        modal.remove();
        if (onCancel) onCancel();
    });

    // Fecha ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            if (onCancel) onCancel();
        }
    });

    // Fecha com ESC
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEsc);
            if (onCancel) onCancel();
        }
    };
    document.addEventListener('keydown', handleEsc);
}

