/**
 * Sistema de Loading Global
 * Gerencia loading e transições em todo o sistema
 */

(function() {
    'use strict';

    // Cria overlay de loading se não existir
    function createLoadingOverlay() {
        if (document.getElementById('loadingOverlay')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="spinner"></div>
            <div class="loading-text">Carregando...</div>
        `;
        document.body.appendChild(overlay);
    }

    // Mostra loading
    function showLoading(text = 'Carregando...') {
        createLoadingOverlay();
        const overlay = document.getElementById('loadingOverlay');
        const textEl = overlay.querySelector('.loading-text');
        if (textEl) textEl.textContent = text;
        overlay.classList.add('active');
        
        // Adiciona classe de transição na página
        document.body.classList.add('page-transition', 'loading');
    }

    // Esconde loading
    function hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        document.body.classList.remove('loading');
    }

    // Adiciona loading em formulários
    document.addEventListener('DOMContentLoaded', function() {
        // Formulários
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', function(e) {
                // Não mostra loading se for validação HTML5
                if (form.checkValidity()) {
                    showLoading('Salvando...');
                }
            });
        });

        // Links importantes
        const importantLinks = [
            '/dashboard',
            '/admin',
            '/perfil',
            '/calendario',
            '/checklist'
        ];

        document.querySelectorAll('a[href]').forEach(link => {
            const href = link.getAttribute('href');
            if (importantLinks.some(path => href.startsWith(path))) {
                link.addEventListener('click', function() {
                    showLoading('Carregando...');
                });
            }
        });

        // Esconde loading quando página carrega
        window.addEventListener('load', function() {
            setTimeout(hideLoading, 300);
        });

        // Esconde loading se houver erro de navegação
        window.addEventListener('error', hideLoading);
    });

    // Expõe funções globalmente
    window.showLoading = showLoading;
    window.hideLoading = hideLoading;
})();




