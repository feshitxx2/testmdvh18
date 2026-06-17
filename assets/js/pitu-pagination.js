(function() {
    const CONFIG = {
        itemsPerLoad: 15, // Số lượng game hiển thị thêm mỗi lần bấm
        currentShown: 15, // Lượng game hiển thị mặc định ban đầu
        fakeLoadTime: 400 // Hiệu ứng load giả vờ 400ms
    };

    let allCards = [];
    let filteredCards = [];

    function initPituEngine() {
        const grid = document.querySelector('.game-grid');
        if (!grid) return;

        // Lấy toàn bộ card game đang có mặt trên giao diện HTML
        allCards = Array.from(grid.querySelectorAll('.game-card'));
        if (allCards.length === 0) {
            setTimeout(initPituEngine, 100);
            return;
        }

        // Ban đầu gán mảng filter bằng toàn bộ card hiện có
        filteredCards = [...allCards];

        const gametypeContainer = document.getElementById('gametype-filters');
        const engineContainer = document.getElementById('engine-filters');
        const genreContainer = document.getElementById('genre-filters');
        const loadMoreBtn = document.getElementById('btn-load-more');
        const loadMoreContainer = document.getElementById('load-more-container');
        const tagSearchInput = document.getElementById('pitu-tag-search');

        const gametypes = new Map();
        const engines = new Map();
        const genres = new Map();

        // Hàm chuẩn hóa chuỗi hiển thị nút bấm
        function formatTagDisplay(tag) {
            const trimmed = tag.trim();
            if (trimmed.toLowerCase() === '3dcg') return '3DCG';
            if (trimmed.toLowerCase() === '2dcg') return '2DCG';
            return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        }

        // BƯỚC 1: QUÉT NGUỒN DỮ LIỆU ĐỂ TẠO NÚT BỘ LỌC
        // Nếu có biến ALL_GAMES_DATA toàn cục (Trang chủ), ưu tiên quét nó để không sót nút
        if (typeof ALL_GAMES_DATA !== "undefined" && Array.isArray(ALL_GAMES_DATA)) {
            ALL_GAMES_DATA.forEach(game => {
                const gt = game.gametype;
                const eg = game.engine;
                const gr = game.genre;

                if (gt && gt.trim()) gametypes.set(gt.trim().toLowerCase(), formatTagDisplay(gt));
                if (eg && eg.trim()) engines.set(eg.trim().toLowerCase(), formatTagDisplay(eg));
                if (gr && gr.trim()) {
                    gr.split(',').forEach(g => {
                        if (g.trim()) genres.set(g.trim().toLowerCase(), formatTagDisplay(g));
                    });
                }
            });
        } else {
            // Nếu ở trang Pages (không có mảng tĩnh), quét trực tiếp từ HTML các card đang hiển thị
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
        }

        // BƯỚC 2: HÀM TẠO NÚT BẤM FILTER RA SIDEBAR
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
                
                // Thu gọn bớt các nút Tags Game nếu quá nhiều (trên 15 nút)
                if (type === 'genres' && index >= 15) btnFilter.style.display = 'none';
                
                btnFilter.onclick = function(e) {
                    e.preventDefault();
                    if (grid.classList.contains('pitu-loading')) return;

                    this.classList.toggle('active');
                    CONFIG.currentShown = CONFIG.itemsPerLoad; // Reset số lượng hiển thị về 15 khi chọn bộ lọc mới
                    applyFilter();
                };
                btnFilter.dataset.val = keyVal;
                btnFilter.dataset.type = type;
                containerFilter.appendChild(btnFilter);
            });

            // Nút hiển thị thêm ba chấm dành riêng cho khu vực Tags Game
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

        // Khởi sinh các cụm nút bấm bộ lọc
        createFilterBtns(gametypes, gametypeContainer, 'gametype');
        createFilterBtns(engines, engineContainer, 'engine');
        createFilterBtns(genres, genreContainer, 'genres');

        // Tìm kiếm nhanh cho ô Search Tag
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

        // BƯỚC 3: HÀM ĐIỀU KHIỂN HIỂN THỊ LƯỚI VÀ PHÂN TRANG "XEM THÊM"
        function renderGridDisplay() {
            // Ẩn toàn bộ thẻ game trên HTML trước để tính toán lại
            allCards.forEach(card => {
                card.style.setProperty('display', 'none', 'important');
            });

            // Cắt mảng lấy danh sách các phần tử được hiển thị ở hiện tại
            const itemsToShow = filteredCards.slice(0, CONFIG.currentShown);
            
            if (itemsToShow.length === 0) {
                let noResultEl = grid.querySelector('.no-results');
                if (!noResultEl) {
                    noResultEl = document.createElement('div');
                    noResultEl.className = 'no-results';
                    noResultEl.style.cssText = 'width:100%; text-align:center; padding:40px; font-weight:bold; color:#888;';
                    noResultEl.innerText = 'Không tìm thấy game tương thích bộ lọc!';
                    grid.appendChild(noResultEl);
                } else {
                    noResultEl.style.display = 'block';
                }
            } else {
                const noResultEl = grid.querySelector('.no-results');
                if (noResultEl) noResultEl.style.display = 'none';
                
                // Hiển thị chuẩn xác các item hợp lệ
                itemsToShow.forEach(card => {
                    card.style.setProperty('display', 'block', 'important');
                });
            }

            // Xử lý logic ẩn/hiện Container bọc nút và nút "Xem thêm game..." dưới đáy
            if (loadMoreContainer || loadMoreBtn) {
                if (CONFIG.currentShown >= filteredCards.length) {
                    if (loadMoreContainer) loadMoreContainer.style.setProperty('display', 'none', 'important');
                    if (loadMoreBtn) loadMoreBtn.style.setProperty('display', 'none', 'important');
                } else {
                    if (loadMoreContainer) loadMoreContainer.style.setProperty('display', 'block', 'important');
                    if (loadMoreBtn) loadMoreBtn.style.setProperty('display', 'inline-block', 'important');
                }
            }

            // Gọi hàm tải Lazy-load ảnh của bro nếu có
            if (typeof loadVisibleImages === 'function') {
                try { loadVisibleImages(); } catch(e) {}
            }
        }

        // Gán sự kiện click trực tiếp cho nút Xem thêm bài viết
        if (loadMoreBtn) {
            loadMoreBtn.onclick = function(e) {
                e.preventDefault();
                CONFIG.currentShown += CONFIG.itemsPerLoad;
                renderGridDisplay();
            };
        }

        // BƯỚC 4: LOGIC BỘ LỌC ĐA ĐIỀU KIỆN (GAMETYPE + ENGINE + TAGS)
        function applyFilter() {
            const activeGametypes = Array.from(document.querySelectorAll('.filter-btn[data-type="gametype"].active')).map(b => b.dataset.val);
            const activeEngines = Array.from(document.querySelectorAll('.filter-btn[data-type="engine"].active')).map(b => b.dataset.val);
            const activeGenres = Array.from(document.querySelectorAll('.filter-btn[data-type="genres"].active')).map(b => b.dataset.val);

            grid.classList.add('pitu-loading');

            setTimeout(() => {
                filteredCards = allCards.filter(card => {
                    const cardGametype = (card.dataset.gametype || '').toLowerCase().trim();
                    const cardEngine = (card.dataset.engine || '').toLowerCase().trim();
                    const cardGenresRaw = card.dataset.genres || '';
                    const cardGenres = cardGenresRaw ? cardGenresRaw.split(',').map(s => s.trim().toLowerCase()) : [];

                    // Thỏa mãn điều kiện lọc Gametype
                    const gtMatch = activeGametypes.length === 0 || activeGametypes.includes(cardGametype);
                    // Thỏa mãn điều kiện lọc Engine
                    const eMatch = activeEngines.length === 0 || activeEngines.includes(cardEngine);
                    // Thỏa mãn điều kiện lọc đồng thời tất cả các Tags tích chọn
                    const gMatch = activeGenres.length === 0 || activeGenres.every(g => cardGenres.includes(g));

                    return gtMatch && eMatch && gMatch;
                });

                renderGridDisplay();
                grid.classList.remove('pitu-loading');
            }, CONFIG.fakeLoadTime);
        }

        // Thực thi kết xuất giao diện ban đầu khi vừa tải trang xong
        renderGridDisplay();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPituEngine);
    } else {
        initPituEngine();
    }
})();
