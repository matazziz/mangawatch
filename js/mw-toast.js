/**
 * Notifications MangaWatch — affichage au-dessus du header.
 */
(function(global) {
    const DEFAULT_DURATION = 2800;

    function removeExistingFloating() {
        document.querySelectorAll('.mw-floating-toast, #drag-help-msg, #drag-select-help-msg').forEach(function(el) {
            el.remove();
        });
    }

    function showMangaWatchToast(message, type, duration) {
        if (!message) return;
        type = type || 'success';
        duration = typeof duration === 'number' ? duration : DEFAULT_DURATION;

        removeExistingFloating();

        const el = document.createElement('div');
        el.className = 'mw-floating-toast mw-floating-toast--' + type;
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        el.textContent = String(message);
        document.body.appendChild(el);

        setTimeout(function() {
            if (el.parentNode) el.remove();
        }, duration);
    }

    global.showMangaWatchToast = showMangaWatchToast;
})(typeof window !== 'undefined' ? window : globalThis);
