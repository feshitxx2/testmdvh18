(function() {
    const CONFIG = {
        itemsPerLoad: 15, // Số lượng hiển thị thêm khi bấm nút
        currentShown: 15, // Số lượng mặc định ban đầu
        fakeLoadTime: 300 // Giảm thời gian load giả lập xuống cho mượt
    };

    let originalHTML = ''; 
    let allCards = [];
    let filteredCards = [];
    let filteredData = []; 
    let isFiltering = false;

    function initPituEngine() {
        const grid = document.querySelector('.game-grid');
        if (!grid) return;

        const isHomePage = (typeof ALL_GAMES_DATA !== "undefined" && Array.isArray(ALL_GAMES_DATA));

        // Lưu giữ HTML gốc và danh sách card sinh ra từ Liquid
        originalHTML = grid.innerHTML;
        allCards = Array.from(grid.querySelectorAll('.game-card'));

        const gametypeContainer = document.getElementById('gametype-filters');
        const engineContainer = document.getElementById('engine-filters');
        const genreContainer = document.getElementById('genre-filters');
        const loadMoreBtn = document.getElementById('btn-load-more');
        const loadMoreContainer = document.getElementById('load-more-container');
        const jekyllPaginator = document.getElementById('pitu-pagination-wrapper');
        const tagSearchInput = document.getElementById('pitu-tag-search');

        const gametypes = new Map();
        const engines = new Map();
        const genres = new Map();

        function formatTagDisplay(tag) {
            const trimmed = tag.trim();
            if (trimmed.toLowerCase() === '3dcg') return '3DCG';
            if (trimmed.toLowerCase() === '2dcg') return '2DCG';
            return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        }

        // GOM NÚT BỘ LỌC TỪ CẢ 2 NGUỒN
        if (isHomePage) {
            ALL_GAMES_DATA.forEach(game => {
                if (game.gametype && game.gametype.toString().trim()) gametypes.set(game.gametype.toString().trim().toLowerCase(), formatTagDisplay(game.gametype));
                if (game.engine && game.engine.toString().trim()) engines.set(game.engine.toString().trim().toLowerCase(), formatTagDisplay(game.engine));
                if (game.genre && game.genre.toString().trim()) {
                    game.genre.toString().split(',').forEach(g => {
                        if (g.trim()) genres.set(g.trim().toLowerCase(), formatTagDisplay(g));
                    });
                }
            });
        }
        
        allCards.forEach(card => {
            const gt = card.dataset.gametype;
            const eg = card.dataset.engine;
            const gr = card.dataset.genres;
            if (gt && gt.trim()) gametypes.set(gt.trim().toLowerCase(), formatTagDisplay(gt));
            if (eg && eg.trim()) engines.set(eg.trim().toLowerCase(), formatTagDisplay(eg));
            if (gr && gr.trim()) {
                gr.split(',').forEach(g => {
                    if (g.trim()) genres.set(g.trim().toLowerCase(), formatTagDisplay(g));
                });
            }
        });

        // TẠO NÚT TRÊN SIDEBAR
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
                
                if (type === 'genres' && index >= 15) btnFilter.style.display = 'none';
                
                btnFilter.onclick = function(e) {
                    e.preventDefault();
                    if (grid.classList.contains('pitu-loading')) return;

                    this.classList.toggle('active');
                    CONFIG.currentShown = CONFIG.itemsPerLoad; // Reset mốc đếm về 15 khi chuyển bộ lọc
                    applyFilter();
                };
                btnFilter.dataset.val = keyVal;
                btnFilter.dataset.type = type;
                containerFilter.appendChild(btnFilter);
            });

            if (type === 'genres' && sortedKeys.length > 15) {
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

        createFilterBtns(gametypes, gametypeContainer, 'gametype');
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
                        if (tagText.includes(query) || btn.classList.contains('active')) {
                            btn.style.display = 'inline-block';
                        } else {
                            btn.style.display = 'none';
                        }
                    });
                }
            });
        }

        function generateCardHTML(game) {
            const gTypegame = game.typegame || [];
            const gCategories = game.categories || [];
            const gUrl = game.url || '#';
            const gId = game.id || game.url.split('/').pop().replace('.html', '');
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
                <div class="game-card" style="display: block !important;" data-engine="${game.engine || ''}" data-genres="${game.genre || ''}" data-gametype="${game.gametype || ''}">
                    <a href="${gUrl}">
                        <div class="card-thumb">
                            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAANSURBVBhXYzh8+PB/AAffA0nNPuCLAAAAAElFTkSuQmCC" 
                                 class="grid-pitu-img" 
                                 data-pitu="${gId}" 
                                 alt="${gTitle}">
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

        // HÀM ĐIỀU KHIỂN ĐỌC HIỂN THỊ VÀ TÍNH TOÁN PHÂN TRANG CHUẨN XÁC
        function renderGridDisplay() {
            let totalAvailable = 0;

            if (isHomePage && isFiltering) {
                // 1. TRANG CHỦ + ĐANG BẬT BỘ LỌC (Dùng data tổng mảng tĩnh)
                totalAvailable = filteredData.length;
                const itemsToShow = filteredData.slice(0, CONFIG.currentShown);

                if (itemsToShow.length === 0) {
                    grid.innerHTML = '<div class="no-results" style="width:100%; text-align:center; padding:40px; font-weight:bold; color:#888;">Không tìm thấy game tương thích bộ lọc!</div>';
                } else {
                    let htmlContent = '';
                    itemsToShow.forEach(game => { htmlContent += generateCardHTML(game); });
                    grid.innerHTML = htmlContent;
                }
            } else {
                // 2. TRANG CON HOẶC TRANG CHỦ MẶC ĐỊNH KHÔNG FILTER (Dùng DOM HTML trực tiếp)
                // Ép ẩn toàn bộ card có trong danh sách gốc để kiểm soát lại
                allCards.forEach(card => card.style.setProperty('display', 'none', 'important'));
                
                const currentArray = isFiltering ? filteredCards : allCards;
                totalAvailable = currentArray.length;
                
                const itemsToShow = currentArray.slice(0, CONFIG.currentShown);

                if (itemsToShow.length === 0) {
                    let noResultEl = grid.querySelector('.no-results');
                    if (!noResultEl) {
                        noResultEl = document.createElement('div');
                        noResultEl.className = 'no-results';
                        noResultEl.style.cssText = 'width:100%; text-align:center; padding:40px; font-weight:bold; color:#888;';
                        noResultEl.innerText = 'Không tìm thấy game tương thích bộ lọc!';
                        grid.appendChild(noResultEl);
                    } else { noResultEl.style.display = 'block'; }
                } else {
                    const noResultEl = grid.querySelector('.no-results');
                    if (noResultEl) noResultEl.style.display = 'none';
                    // Hiện đúng số lượng chỉ định từ mốc slice
                    itemsToShow.forEach(card => card.style.setProperty('display', 'block', 'important'));
                }
            }

            // ĐIỀU KHIỂN NÚT XEM THÊM CHÍNH XÁC THEO TỔNG SỐ LƯỢNG GAME THỰC TẾ ĐANG CÓ
            if (isHomePage && !isFiltering) {
                // Trang chủ không bật lọc -> Hiện phân trang tĩnh Jekyll, ẩn cụm Xem thêm JS đi
                if (loadMoreContainer) loadMoreContainer.style.setProperty('display', 'none', 'important');
                if (jekyllPaginator) jekyllPaginator.style.setProperty('display', 'block', 'important');
            } else {
                // Trang con HOẶC Trang chủ khi lọc -> Ẩn phân trang Jekyll, bật nút Xem thêm JS
                if (jekyllPaginator) jekyllPaginator.style.setProperty('display', 'none', 'important');
                
                if (loadMoreContainer) {
                    if (CONFIG.currentShown >= totalAvailable) {
                        loadMoreContainer.style.setProperty('display', 'none', 'important');
                    } else {
                        loadMoreContainer.style.setProperty('display', 'block', 'important');
                    }
                }
            }

            if (typeof loadVisibleImages === 'function') {
                try { loadVisibleImages(); } catch(e) {}
            }
        }

        // GẮN LẠI SỰ KIỆN CLICK NÚT XEM THÊM - KHÔNG BỊ TRÙNG LẶP ĐÈ CHẾT LỆNH
        if (loadMoreBtn) {
            loadMoreBtn.onclick = function(e) {
                e.preventDefault();
                CONFIG.currentShown += CONFIG.itemsPerLoad; // Tăng thêm 15 game hiển thị
                renderGridDisplay();
            };
        }

        // HÀM XỬ LÝ LỌC
        function applyFilter() {
            const activeGametypes = Array.from(document.querySelectorAll('.filter-btn[data-type="gametype"].active')).map(b => b.dataset.val);
            const activeEngines = Array.from(document.querySelectorAll('.filter-btn[data-type="engine"].active')).map(b => b.dataset.val);
            const activeGenres = Array.from(document.querySelectorAll('.filter-btn[data-type="genres"].active')).map(b => b.dataset.val);

            const hasActiveFilter = activeGametypes.length > 0 || activeEngines.length > 0 || activeGenres.length > 0;
            grid.classList.add('pitu-loading');

            setTimeout(() => {
                if (!hasActiveFilter) {
                    isFiltering = false;
                    if (isHomePage) {
                        grid.innerHTML = originalHTML;
                        allCards = Array.from(grid.querySelectorAll('.game-card'));
                    }
                    renderGridDisplay();
                    grid.classList.remove('pitu-loading');
                    if (typeof loadVisibleImages === 'function') loadVisibleImages();
                    return;
                }

                isFiltering = true;

                if (isHomePage) {
                    filteredData = ALL_GAMES_DATA.filter(game => {
                        const cardGametype = (game.gametype || '').toString().toLowerCase().trim();
                        const cardEngine = (game.engine || '').toString().toLowerCase().trim();
                        const gameGenreRaw = game.genre || '';
                        const cardGenres = gameGenreRaw ? gameGenreRaw.toString().split(',').map(s => s.trim().toLowerCase()) : [];

                        const gtMatch = activeGametypes.length === 0 || activeGametypes.includes(cardGametype);
                        const eMatch = activeEngines.length === 0 || activeEngines.includes(cardEngine);
                        const gMatch = activeGenres.length === 0 || activeGenres.every(g => cardGenres.includes(g));

                        return gtMatch && eMatch && gMatch;
                    });
                } else {
                    filteredCards = allCards.filter(card => {
                        const cardGametype = (card.dataset.gametype || '').toLowerCase().trim();
                        const cardEngine = (card.dataset.engine || '').toLowerCase().trim();
                        const cardGenresRaw = card.dataset.genres || '';
                        const cardGenres = cardGenresRaw ? cardGenresRaw.split(',').map(s => s.trim().toLowerCase()) : [];

                        const gtMatch = activeGametypes.length === 0 || activeGametypes.includes(cardGametype);
                        const eMatch = activeEngines.length === 0 || activeEngines.includes(cardEngine);
                        const gMatch = activeGenres.length === 0 || activeGenres.every(g => cardGenres.includes(g));

                        return gtMatch && eMatch && gMatch;
                    });
                }

                renderGridDisplay();
                grid.classList.remove('pitu-loading');
            }, CONFIG.fakeLoadTime);
        }

        // CHẠY HIỂN THỊ BAN ĐẦU TRANG
        renderGridDisplay();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPituEngine);
    } else {
        initPituEngine();
    }
})();
