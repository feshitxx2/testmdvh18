(function() {
    const CONFIG = {
        itemsPerLoad: 15, // Số lượng game hiển thị thêm mỗi lần cuộn xuống
        currentShown: 15  // Lượng game hiển thị ban đầu khi chọn bộ lọc
    };

    let originalHTML = ''; 
    let filteredData = []; 
    let isFiltering = false;
    let isLoadingMore = false;

    function initPituEngine() {
        // Kiểm tra kho tổng dữ liệu bài viết vừa tạo từ Jekyll
        if (typeof ALL_GAMES_DATA === "undefined") {
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

        // Lưu giữ nguyên bản cấu trúc trang chủ gốc của Jekyll
        originalHTML = grid.innerHTML;

        const engineContainer = document.getElementById('engine-filters');
        const genreContainer = document.getElementById('genre-filters');
        const jekyllPaginator = document.getElementById('pitu-pagination-wrapper');

        const engines = new Map();
        const genres = new Map();

        // Gộp tag trùng lặp và định dạng chữ viết hoa đẹp (3dcg -> 3DCG)
        function formatTagDisplay(tag) {
            const trimmed = tag.trim();
            if (trimmed.toLowerCase() === '3dcg') return '3DCG';
            if (trimmed.toLowerCase() === '2dcg') return '2DCG';
            return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        }

        // Quét toàn bộ tag/engine từ mảng ALL_GAMES_DATA tổng để hiển thị đủ danh mục ra Sidebar
        ALL_GAMES_DATA.forEach(game => {
            if (game.engine) {
                const raw = game.engine.trim();
                if (raw) engines.set(raw.toLowerCase(), formatTagDisplay(raw));
            }
            if (game.genre) {
                game.genre.split(',').forEach(g => {
                    const raw = g.trim();
                    if (raw) genres.set(raw.toLowerCase(), formatTagDisplay(raw));
                });
            }
        });

        // Hàm dựng nút bộ lọc ở Sidebar
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
                    CONFIG.currentShown = CONFIG.itemsPerLoad; // Reset về 15 game khi đổi tag
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

        // Hàm dựng cấu trúc HTML card game đồng bộ hoàn toàn với mẫu thiết kế của bạn
        function generateCardHTML(game) {
            const gTypegame = game.typegame || [];
            const gCategories = game.categories || [];
            const gUrl = game.url || '#';
            const gId = game.id || '';
            const gTitle = game.namebanner || game.title || '';

            // Tạo chuỗi HTML cho tag hệ máy (PC, APK)
            let typeTagsHTML = '';
            if (Array.isArray(gTypegame)) {
                gTypegame.forEach(type => {
                    const slug = type.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    typeTagsHTML += `<span class="tag-item tag-${slug}">${type}</span>`;
                });
            }

            // Tạo chuỗi HTML cho Badge góc ảnh
            let badgeHTML = '';
            if (gCategories && gCategories.length > 0) {
                const badgeText = gCategories[0].replace(/-/g, ' ');
                badgeHTML = `<div class="card-badge">${badgeText}</div>`;
            }

            return `
                <div class="game-card" data-engine="${game.engine || ''}" data-genres="${game.genre || ''}">
                    <a href="${gUrl}">
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

        // Đổ danh sách kết quả lọc ra ngoài màn hình lưới game
        function renderFilteredGrid() {
            const itemsToShow = filteredData.slice(0, CONFIG.currentShown);
            
            if (itemsToShow.length === 0) {
                grid.innerHTML = '<div class="no-results" style="width:100%; text-align:center; padding: 40px; font-weight:bold; color:#888;">Không tìm thấy game tương thích bộ lọc!</div>';
                return;
            }

            let htmlContent = '';
            itemsToShow.forEach(game => {
                htmlContent += generateCardHTML(game);
            });
            
            grid.innerHTML = htmlContent;

            // Gọi hàm xử lý ảnh gốc của bạn để nạp banner thực tế thông qua thuộc tính data-pitu
            if (typeof loadVisibleImages === 'function') {
                try { loadVisibleImages(); } catch(e) { console.log(e); }
            }
        }

        // Lắng nghe sự kiện cuộn trang để kích hoạt cuộn vô hạn (Infinite Scroll)
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

        // Xử lý bộ lọc so khớp chuẩn hóa dạng chữ thường (lowercase)
        function filter() {
            const activeEngines = Array.from(document.querySelectorAll('.filter-btn[data-type="engine"].active')).map(b => b.dataset.val);
            const activeGenres = Array.from(document.querySelectorAll('.filter-btn[data-type="genres"].active')).map(b => b.dataset.val);
            
            const hasActiveFilter = activeEngines.length > 0 || activeGenres.length > 0;

            if (!hasActiveFilter) {
                isFiltering = false;
                grid.innerHTML = originalHTML;
                if (jekyllPaginator) jekyllPaginator.style.display = 'block';
                // Chạy lại lazy load ảnh gốc cho trạng thái mặc định
                if (typeof loadVisibleImages === 'function') loadVisibleImages();
                return;
            }

            isFiltering = true;
            if (jekyllPaginator) jekyllPaginator.style.display = 'none';

            filteredData = ALL_GAMES_DATA.filter(game => {
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
