(function() {
    const CONFIG = {
        itemsPerLoad: 21,
        currentShown: 21};

    function initPituEngine() {
        if (typeof PITU_DATABASE === "undefined") {
            setTimeout(initPituEngine, 200);
            return;}

        const items = document.querySelectorAll('.pitu-item');
        const btn = document.getElementById('btn-load-more');
        const container = document.getElementById('load-more-container');
        if (items.length === 0) return;
        function loadVisibleImages() {
            items.forEach(item => {
                if (item.style.display !== 'none') {
                    const img = item.querySelector('.grid-pitu-img');
                    if (img && img.src.startsWith('data:image')) {
                        const pituId = img.getAttribute('data-pitu');
                        const gameData = PITU_DATABASE.find(g => g.id.trim() === pituId.trim());
                        if (gameData && gameData.banner) {
                            img.src = gameData.banner;}}}});}

        function updateDisplay() {
            items.forEach((item, index) => {
                if (index < CONFIG.currentShown) {
                    item.style.display = 'flex';
                    item.classList.add('is-visible');
                } else {
                    item.style.display = 'none';}});
            if (container) {container.style.display = (CONFIG.currentShown >= items.length) ? 'none' : 'block';}
            loadVisibleImages();}
        let isLoading = false;
window.addEventListener('scroll', () => {
    if (!isLoading && CONFIG.currentShown < items.length) {
        const triggerPoint = window.innerHeight + window.scrollY;
        if (triggerPoint >= document.body.offsetHeight - 400) {
            isLoading = true;
            setTimeout(() => {
                CONFIG.currentShown += CONFIG.itemsPerLoad;
                updateDisplay();
                isLoading = false;}, 500); }}});

        if (btn) {
            btn.onclick = function(e) {
                e.preventDefault();
                CONFIG.currentShown += CONFIG.itemsPerLoad;
                updateDisplay();};}
        updateDisplay();}

    window.addEventListener('load', initPituEngine);
})();
