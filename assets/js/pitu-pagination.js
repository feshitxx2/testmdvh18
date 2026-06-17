(function() {
    const CONFIG = {
        itemsPerLoad: 15, // Số lượng game hiển thị thêm mỗi lần cuộn xuống đáy
        currentShown: 15, // Lượng game hiển thị mặc định ban đầu
        fakeLoadTime: 300, // Hiệu ứng load giả lập mượt mà
        scrollThreshold: 400 // Khoảng cách tới đáy trang (px) để kích hoạt tự động load
    };

    let originalHTML = ''; 
    let allCards = [];
    let filteredCards = [];
    let filteredData = []; 
    let isFiltering = false;
    let isLoadingMore = false; // Cờ chặn việc kích hoạt load trùng lặp khi đang cuộn

    function initPituEngine() {
        const grid = document.querySelector('.game-grid');
        if (!grid) return;

        const isHomePage = (typeof ALL_GAMES_DATA !== "undefined" && Array.isArray(ALL_GAMES_DATA));

        originalHTML = grid.innerHTML;
        allCards = Array.from(grid.querySelectorAll('.game-card'));

        const gametypeContainer = document.getElementById('gametype-filters');
        const engineContainer = document.getElementById('engine-filters');
        const genreContainer = document.getElementById('genre-filters');
        const loadMoreContainer = document.getElementById('load-more-container');
        const jekyllPaginator = document.getElementById('pitu-pagination-wrapper');
        const tagSearchInput = document.getElementById('pitu-tag-search');

        // Khóa hoặc ẩn cứng khu vực nút bấm cũ đi vì giờ chạy tự động rồi
        if (loadMoreContainer) loadMoreContainer.style.setProperty('display', 'none', 'important');

        const gametypes = new Map();
        const engines = new Map();
        const genres = new Map();

        function formatTagDisplay(tag) {
            const trimmed = tag.trim();
            if (trimmed.toLowerCase() === '3dcg') return '3DCG';
            if (trimmed.toLowerCase() === '2dcg') return '2DCG';
            return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        }

        // GOM DỮ LIỆU TẠO NÚT BẤM
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

        // SINH NÚT BẤM BỘ LỌC
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
                    CONFIG.currentShown = CONFIG.itemsPerLoad; // Reset mốc đếm về ban đầu khi đổi tag lọc
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

        // HÀM KẾT XUẤT RENDER ĐỒNG BỘ
        function renderGridDisplay() {
            if (isHomePage && isFiltering) {
                // Trang chủ + Đang có bộ lọc hoạt động
                const itemsToShow = filteredData.slice(0, CONFIG.currentShown);

                if (itemsToShow.length === 0) {
                    grid.innerHTML = '<div class="no-results" style="width:100%; text-align:center; padding:40px; font-weight:bold; color:#888;">Không tìm thấy game tương thích bộ lọc!</div>';
                } else {
                    let htmlContent = '';
                    itemsToShow.forEach(game => { htmlContent += generateCardHTML(game); });
                    grid.innerHTML = htmlContent;
                }
            } else {
                // Trang con (Pages) HOẶC Trang chủ mặc định không filter
                allCards.forEach(card => card.style.setProperty('display', 'none', 'important'));
                
                const currentArray = isFiltering ? filteredCards : allCards;
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
                    itemsToShow.forEach(card => card.style.setProperty('display', 'block', 'important'));
                }
            }

            // KIỂM SOÁT THANH ĐIỀU HƯỚNG PHÂN TRANG JEKÝLL
            if (isHomePage) {
                if (isFiltering) {
                    if (jekyllPaginator) jekyllPaginator.style.setProperty('display', 'none', 'important');
                } else {
                    if (jekyllPaginator) jekyllPaginator.style.setProperty('display', 'block', 'important');
                }
            } else {
                if (jekyllPaginator) jekyllPaginator.style.setProperty('display', 'none', 'important');
            }

            if (typeof loadVisibleImages === 'function') {
                try { loadVisibleImages(); } catch(e) {}
            }
        }

        // TỰ ĐỘNG BẮT SỰ KIỆN CUỘN CHUỘT VÔ HẠN (INFINITE SCROLL)
        window.addEventListener('scroll', function() {
            // Trường hợp không cần kích hoạt cuộn:
            // 1. Đang load dở dang
            // 2. Trang chủ đang hiển thị bình thường không bật bộ lọc (nhường quyền phân trang cho Jekyll)
            if (isLoadingMore) return;
            if (isHomePage && !isFiltering) return;

            let totalAvailable = isHomePage ? filteredData.length : (isFiltering ? filteredCards.length : allCards.length);
            
            // Nếu lượng hiển thị hiện tại đã quét sạch mảng game khả dụng thì dừng cuộn
            if (CONFIG.currentShown >= totalAvailable) return;

            // Tính toán khoảng cách cuộn
            const totalPageHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
            const currentScrollPosition = window.innerHeight + window.scrollY;

            // Hễ cuộn cách đáy trang nhỏ hơn mốc cấu hình (400px) là tự nạp thêm
            if (totalPageHeight - currentScrollPosition < CONFIG.scrollThreshold) {
                isLoadingMore = true;
                
                setTimeout(() => {
                    CONFIG.currentShown += CONFIG.itemsPerLoad;
                    renderGridDisplay();
                    isLoadingMore = false;
                }, 150); // Delay siêu nhỏ tạo cảm giác mượt
            }
        });

        // HÀM LỌC CHÍNH ĐA ĐIỀU KIỆN
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

        // KHỞI CHẠY GIAO DIỆN BAN ĐẦU
        if (isHomePage) {
            if (typeof loadVisibleImages === 'function') loadVisibleImages();
        } else {
