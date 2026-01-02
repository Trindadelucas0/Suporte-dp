/**
 * Script para avisar usuário sobre inatividade e logout automático
 * Após 10 minutos de inatividade, o sistema força logout
 */

(function() {
    'use strict';

    const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutos
    const WARNING_TIME = 9 * 60 * 1000; // Avisa 1 minuto antes (9 minutos)
    
    let inactivityTimer;
    let warningShown = false;
    let lastActivity = Date.now();

    // Função para resetar timer de inatividade
    function resetInactivityTimer() {
        lastActivity = Date.now();
        warningShown = false;
        
        // Remove aviso se existir
        const existingWarning = document.getElementById('inactivity-warning');
        if (existingWarning) {
            existingWarning.remove();
        }
        
        clearTimeout(inactivityTimer);
        
        // Define timer para aviso (9 minutos)
        inactivityTimer = setTimeout(() => {
            showInactivityWarning();
        }, WARNING_TIME);
    }

    // Função para mostrar aviso de inatividade
    function showInactivityWarning() {
        if (warningShown) return;
        warningShown = true;

        // Remove aviso existente se houver
        const existingWarning = document.getElementById('inactivity-warning');
        if (existingWarning) {
            existingWarning.remove();
        }

        // Cria aviso
        const warning = document.createElement('div');
        warning.id = 'inactivity-warning';
        warning.className = 'fixed top-4 right-4 bg-yellow-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 flex items-center space-x-3';
        warning.innerHTML = `
            <i class="fas fa-exclamation-triangle text-xl"></i>
            <div>
                <p class="font-bold">Sessão expirando!</p>
                <p class="text-sm">Você será desconectado em 1 minuto por inatividade.</p>
            </div>
            <button onclick="document.getElementById('inactivity-warning').remove(); resetInactivityTimer();" 
                    class="ml-4 bg-white text-yellow-600 px-3 py-1 rounded hover:bg-yellow-50 font-semibold">
                Continuar
            </button>
        `;
        
        document.body.appendChild(warning);

        // Remove aviso após 60 segundos se usuário não interagir
        setTimeout(() => {
            if (warning.parentNode) {
                warning.remove();
            }
        }, 60000);
    }

    // Eventos que indicam atividade do usuário
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    activityEvents.forEach(event => {
        document.addEventListener(event, resetInactivityTimer, true);
    });

    // Inicia o timer quando a página carrega
    resetInactivityTimer();

    // Torna função acessível globalmente para o botão do aviso
    window.resetInactivityTimer = resetInactivityTimer;
})();

