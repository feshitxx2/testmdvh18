(function() {
    const CONFIG = {
        itemsPerLoad: 15, // Mỗi lần kéo xuống tải thêm 15 game
        currentShown: 15  // Lượng game hiển thị ban đầu khi bấm filter
    };

    let originalHTML = ''; 
    let filteredData = []; 
    let isFiltering = false;
    let isLoadingMore = false;

    function initPituEngine() {
        if (typeof PITU_DATABASE === "undefined") {
            setTimeout(initPituEngine, 200);
            return;
        }

        const grid = document.querySelector('.game-grid');
        if (!grid) return;

        const items = document.querySelectorAll('.game-card');
        if (items.length === 0) {
            setTimeout(initPituEngine, 100);
            return;
        }

        // Lưu giữ HTML gốc của Jekyll
        originalHTML = grid.innerHTML;

        const engineContainer = document.getElementById('engine-filters');
        const genreContainer = document.getElementById('genre-filters');
        const jekyllPaginator = document.getElementById('pitu-pagination-wrapper');

        const engines = new Map();
        const genres = new Map();

        // Định dạng chuẩn để gộp tag trùng (3dcg, 3DCG -> 3DCG)
        function formatTagDisplay(tag) {
            const trimmed = tag.trim();
            if (trimmed.toLowerCase() === '3dcg') return '3DCG';
            if (trimmed.toLowerCase() === '2dcg') return '2DCG';
            return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        }

        // Bước 1: Quét tag từ trang hiện tại trước
        items.forEach(item => {
            if (item.dataset.engine) {
                const raw = item.dataset.engine.trim();
                if (raw) engines.set(raw.toLowerCase(), formatTagDisplay(raw));
            }
            if (item.dataset.genres) {
                item.dataset.genres.split(',').forEach(g => {
                    const raw = g.trim();
                    if (raw) genres.set(raw.toLowerCase(), formatTagDisplay(raw));
                });
            }
        });

        // Bước 2: Quét tag từ PITU_DATABASE để lấy đủ danh mục toàn trang web
        PITU_DATABASE.forEach(game => {
            const gameEngine = game.engine || '';
            const gameGenre = game.genre || '';

            if (gameEngine) {
                const raw = gameEngine.trim();
                if (raw) engines.set(raw.toLowerCase(), raw);
            }
            if (gameGenre) {
                gameGenre.split(',').forEach(g => {
                    const raw = g.trim();
                    if (raw) genres.set(raw.toLowerCase(), formatTagDisplay(raw));
                });
            }
        });

        // Hàm tạo nút bộ lọc ở Sidebar
        function createFilterBtns(mapItems, containerFilter, type) {
            if (!containerFilter) return;
            containerFilter.innerHTML = '';
            
            const sortedKeys = Array.from(mapItems.keys()).sort();
            sortedKeys.forEach((keyVal, index) => {
                const displayVal = mapItems.get(keyVal);
                const btnFilter = document.createElement('button');
                btnFilter.type = 'button';
                btnFilter.innerText = displayVal;
                btnFilter.className = 'filter-btn';
                if (index >= 15) btnFilter.style.display = 'none';
                
                btnFilter.onclick = function(e) {
                    e.preventDefault();
                    this.classList.toggle('active');
                    CONFIG.currentShown = CONFIG.itemsPerLoad; // Reset số lượng về 15 khi đổi tag
                    filter();
                };
                btnFilter.dataset.val = keyVal;
                btnFilter.dataset.type = type;
                containerFilter.appendChild(btnFilter);
            });

            if (sortedKeys.length > 15) {
                const more = document.createElement('button');
                more.type = 'button';
                more.innerText = "...";
                more.className = 'show-more-btn';
                more.onclick = function(e) {
                    e.preventDefault();
                    containerFilter.querySelectorAll('.filter-btn').forEach(b => b.style.display = 'inline-block');
                    this.style.display = 'none';
                };
                containerFilter.appendChild(more);
            }
        }

        createFilterBtns(engines, engineContainer, 'engine');
        createFilterBtns(genres, genreContainer, 'genres');

        // Hàm sinh cây cấu trúc HTML chuẩn khớp 100% với file MD và hệ thống của bạn
        function generateCardHTML(game) {
            const gTypegame = game.typegame || [];
            const gCategories = game.categories || [];
            const gUrl = game.url || '#';
            const gId = game.pitu_id || (game.url ? game.url.split('/').pop().replace('.html', '') : '');
            const gTitle = game.namebanner || game.title || '';

            // Sinh tag nền tảng PC/APK
            let typeTagsHTML = '';
            if (Array.isArray(gTypegame)) {
                gTypegame.forEach(type => {
                    const slug = type.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    typeTagsHTML += `<span class="tag-item tag-${slug}">${type}</span>`;
                });
            }

            // Sinh badge góc ảnh
            let badgeHTML = '';
            if (gCategories && gCategories.length > 0) {
                const badgeText = gCategories[0].replace(/-/g, ' ');
                badgeHTML = `<div class="card-badge">${badgeText}</div>`;
            }

            const baseUrl = window.location.origin + (window.JEKYLL_BASEURL || '');
            const gameUrl = gUrl.startsWith('http') ? gUrl : baseUrl + gUrl;

            return `
                <div class="game-card" data-engine="${game.engine || ''}" data-genres="${game.genre || ''}">
                    <a href="${gameUrl}">
                        <div class="card-thumb">
                            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAANSURBVBhXYzh8+PB/AAffA0nNPuCLAAAAAElFTkSuQmCC" 
                                 class="grid-pitu-img" 
                                 data-pitu="${gId}" 
                                 alt="${game.title || ''}">
                            <div class="card-type-tags">${typeTagsHTML}</div>
                            <i class="fa-solid fa-angles-down download-icon-fa"></i> 
                            ${badgeHTML}
                        </div>
                        <div class="card-info">
                            <h3>${gTitle}</h3>
                        </div>
                    </a>
                </div>
            `;
        }

        function renderFilteredGrid() {
            const itemsToShow = filteredData.slice(0, CONFIG.currentShown);
            let htmlContent = '';
            
            itemsToShow.forEach(game => {
                htmlContent += generateCardHTML(game);
            });
            
            grid.innerHTML = htmlContent;
            
            // Kích hoạt hàm Lazy Load nạp ảnh thực tế từ PITU_DATABASE cho các thẻ mới dựng
            if (typeof loadVisibleImages === 'function') {
                loadVisibleImages();
            } else {
                // Phương án dự phòng nếu hàm gốc nằm ở file khác chưa chạy
                itemsToShow.forEach(game => {
                    const gId = game.pitu_id || (game.url ? game.url.split('/').pop().replace('.html', '') : '');
                    const img = grid.querySelector(`.grid-pitu-img[data-pitu="${gId}"]`);
                    if (img && game.banner) img.src = game.banner;
                });
            }
        }

        // Bắt sự kiện cuộn trang làm tăng số lượng game được hiển thị lên thêm 15 bài
        window.addEventListener('scroll', () => {
            if (!isFiltering || isLoadingMore) return;

            if (CONFIG.currentShown < filteredData.length) {
                const triggerPoint = window.innerHeight + window.scrollY;
                
                if (triggerPoint >= document.body.offsetHeight - 400) {
                    isLoadingMore = true;
                    setTimeout(() => {
                        CONFIG.currentShown += CONFIG.itemsPerLoad;
                        renderFilteredGrid();
                        isLoadingMore = false;
                    }, 200);
                }
            }
        });

        // Xử lý bộ lọc chính xác bằng cách ép toàn bộ chuỗi về chữ thường (lowercase)
        function filter() {
            const activeEngines = Array.from(document.querySelectorAll('.filter-btn[data-type="engine"].active')).map(b => b.dataset.val);
            const activeGenres = Array.from(document.querySelectorAll('.filter-btn[data-type="genres"].active')).map(b => b.dataset.val);
            
            const hasActiveFilter = activeEngines.length > 0 || activeGenres.length > 0;

            if (!hasActiveFilter) {
                isFiltering = false;
                grid.innerHTML = originalHTML;
                if (jekyllPaginator) jekyllPaginator.style.display = 'block';
                return;
            }

            isFiltering = true;
            if (jekyllPaginator) jekyllPaginator.style.display = 'none';

            filteredData = PITU_DATABASE.filter(game => {
                const cardEngine = (game.engine || '').toLowerCase().trim();
                const gameGenreRaw = game.genre || '';
                const cardGenres = gameGenreRaw ? gameGenreRaw.split(',').map(s => s.trim().toLowerCase()) : [];
                
                const eMatch = activeEngines.length === 0 || activeEngines.includes(cardEngine);
                const gMatch = activeGenres.length === 0 || activeGenres.every(g => cardGenres.includes(g));
                
                return eMatch && gMatch;
            });

            renderFilteredGrid();
        }

        filter();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPituEngine);
    } else {
        initPituEngine();
    }
})();
