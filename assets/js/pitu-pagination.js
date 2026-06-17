(function() {
    const CONFIG = {
        itemsPerLoad: 15, // Số lượng game hiển thị thêm mỗi lần
        currentShown: 15, // Lượng game hiển thị ban đầu
        fakeLoadTime: 400 // Thời gian giả vờ load trang (400ms)
    };

    let originalHTML = ''; 
    let filteredData = []; 
    let isFiltering = false;
    let isLoadingMore = false;

    function initPituEngine() {
        const grid = document.querySelector('.game-grid');
        if (!grid) return;

        // KIỂM TRA XEM ĐANG Ở TRANG CHỦ HAY TRANG CON
        const isHomePage = (typeof ALL_GAMES_DATA !== "undefined");

        if (!isHomePage) {
            // ==========================================
            // LOGIC XỬ LÝ CHO TRANG CON (GENRE / TAGS PAGE)
            // ==========================================
            const staticItems = grid.querySelectorAll('.game-card.pitu-item');
            if (staticItems.length === 0) {
                // Nếu chưa render xong HTML thì đợi một chút
                setTimeout(initPituEngine, 100);
                return;
            }

            const loadMoreBtn = document.getElementById('btn-load-more');
            const loadMoreContainer = document.getElementById('load-more-container');
            let currentVisibleCount = CONFIG.itemsPerLoad;

            // Hàm hiển thị game theo số lượng cấu hình
            function showStaticItems() {
                staticItems.forEach((item, index) => {
                    if (index < currentVisibleCount) {
                        item.style.display = 'block'; // Hiện game lên
                    } else {
                        item.style.display = 'none';
                    }
                });

                // Ẩn/hiện nút Xem thêm dựa vào số lượng game còn lại
                if (loadMoreContainer) {
                    if (currentVisibleCount >= staticItems.length) {
                        loadMoreContainer.style.display = 'none';
                    } else {
                        loadMoreContainer.style.display = 'block';
                    }
                }

                // Chạy hàm nạp ảnh thực tế của bro
                if (typeof loadVisibleImages === 'function') {
                    try { loadVisibleImages(); } catch(e) { console.log(e); }
                }
            }

            // Kích hoạt sự kiện bấm nút Xem Thêm
            if (loadMoreBtn) {
                loadMoreBtn.onclick = function(e) {
                    e.preventDefault();
                    currentVisibleCount += CONFIG.itemsPerLoad;
                    showStaticItems();
                };
            }

            // Kích hoạt hiển thị 15 game đầu tiên cho trang con luôn
            showStaticItems();
            return; // Dừng script tại đây, không chạy xuống phần filter trang chủ nữa
        }

        // ==========================================
        // LOGIC XỬ LÝ CHO TRANG CHỦ (HOME FILTER ENGINE/TAGS)
        // ==========================================
        const items = document.querySelectorAll('.game-card');
        if (items.length === 0) {
            setTimeout(initPituEngine, 100);
            return;
        }

        originalHTML = grid.innerHTML;

        const engineContainer = document.getElementById('engine-filters');
        const genreContainer = document.getElementById('genre-filters');
        const jekyllPaginator = document.getElementById('pitu-pagination-wrapper');
        const tagSearchInput = document.getElementById('pitu-tag-search');

        const engines = new Map();
        const genres = new Map();

        function formatTagDisplay(tag) {
            const trimmed = tag.trim();
            if (trimmed.toLowerCase() === '3dcg') return '3DCG';
            if (trimmed.toLowerCase() === '2dcg') return '2DCG';
            return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        }

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
                    if (grid.classList.contains('pitu-loading')) return;

                    this.classList.toggle('active');
                    CONFIG.currentShown = CONFIG.itemsPerLoad; 
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

        if (tagSearchInput) {
            tagSearchInput.addEventListener('input', function() {
                const query = this.value.toLowerCase().trim();
                const genreButtons = genreContainer.querySelectorAll('.filter-btn');
                const moreBtn = genreContainer.querySelector('.show-more-btn');

                if (query.length === 0) {
                    genreButtons.forEach((btn, index) => {
                        btn.style.display = index < 15 ? 'inline-block' : 'none';
                    });
                    if (moreBtn) moreBtn.style.display = 'inline-block';
                } else {
                    if (moreBtn) moreBtn.style.display = 'none';
                    genreButtons.forEach(btn => {
                        const tagText = btn.innerText.toLowerCase();
                        if (tagText.includes(query)) {
                            btn.style.display = 'inline-block';
                        } else {
                            if (btn.classList.contains('active')) {
                                btn.style.display = 'inline-block';
                            } else {
                                btn.style.display = 'none';
                            }
                        }
                    });
                }
            });
        }

        function generateCardHTML(game) {
            const gTypegame = game.typegame || [];
            const gCategories = game.categories || [];
            const gUrl = game.url || '#';
            const gId = game.id || '';
            const gTitle = game.namebanner || game.title || '';

            let typeTagsHTML = '';
            if (Array.isArray(gTypegame)) {
                gTypegame.forEach(type => {
                    const slug = type.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    typeTagsHTML += `<span class="tag-item tag-${slug}">${type}</span>`;
                });
            }

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

            if (typeof loadVisibleImages === 'function') {
                try { loadVisibleImages(); } catch(e) { console.log(e); }
            }
        }

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

        function filter() {
            const activeEngines = Array.from(document.querySelectorAll('.filter-btn[data-type="engine"].active')).map(b => b.dataset.val);
            const activeGenres = Array.from(document.querySelectorAll('.filter-btn[data-type="genres"].active')).map(b => b.dataset.val);
            const hasActiveFilter = activeEngines.length > 0 || activeGenres.length > 0;

            grid.classList.add('pitu-loading');

            setTimeout(() => {
                if (!hasActiveFilter) {
                    isFiltering = false;
                    grid.innerHTML = originalHTML;
                    if (jekyllPaginator) jekyllPaginator.style.display = 'block';
                    if (typeof loadVisibleImages === 'function') loadVisibleImages();
                    grid.classList.remove('pitu-loading');
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
                grid.classList.remove('pitu-loading');
            }, CONFIG.fakeLoadTime);
        }

        const initialActive = document.querySelectorAll('.filter-btn.active').length > 0;
        if (initialActive) {
            filter();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPituEngine);
    } else {
        initPituEngine();
    }
})();
