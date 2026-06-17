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

        // Lấy toàn bộ card game đang có mặt trên HTML (đã được Jekyll render sẵn)
        allCards = Array.from(grid.querySelectorAll('.game-card'));
        if (allCards.length === 0) {
            setTimeout(initPituEngine, 100);
            return;
        }

        // Đảm bảo ban đầu toàn bộ card được nạp vào mảng filter
        filteredCards = [...allCards];

        const gametypeContainer = document.getElementById('gametype-filters');
        const engineContainer = document.getElementById('engine-filters');
        const genreContainer = document.getElementById('genre-filters');
        const loadMoreBtn = document.getElementById('btn-load-more');
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

        // Tự động gom dữ liệu từ các thuộc tính data- của card để sinh nút bộ lọc tự động
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

        // Hàm tạo các nút bấm Filter ở Sidebar
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
                
                // Thu gọn các nút Tags Game nếu vượt quá 15 nút
                if (type === 'genres' && index >= 15) btnFilter.style.display = 'none';
                
                btnFilter.onclick = function(e) {
                    e.preventDefault();
                    if (grid.classList.contains('pitu-loading')) return;

                    this.classList.toggle('active');
                    CONFIG.currentShown = CONFIG.itemsPerLoad; 
                    applyFilter();
                };
                btnFilter.dataset.val = keyVal;
                btnFilter.dataset.type = type;
                containerFilter.appendChild(btnFilter);
            });

            // Nút hiển thị thêm dấu ba chấm cho mục Tags
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

        // Khởi tạo danh sách nút bấm bên Sidebar
        createFilterBtns(gametypes, gametypeContainer, 'gametype');
        createFilterBtns(engines, engineContainer, 'engine');
        createFilterBtns(genres, genreContainer, 'genres');

        // Lắng nghe ô tìm kiếm nhanh danh sách nút Tags Game
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

        // Hàm render kiểm soát ẩn hiện số lượng card (Cơ chế loadout cũ)
        function renderGridDisplay() {
            // Ẩn tất cả các card trước
            allCards.forEach(card => card.style.display = 'none');

            // Cắt mảng lấy đúng số lượng cần hiển thị
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
                
                // Hiển thị các card hợp lệ
                itemsToShow.forEach(card => card.style.display = 'block');
            }

            // Kiểm tra xử lý ẩn/hiện nút "Xem thêm game..." dưới đáy trang
            if (loadMoreBtn) {
                if (CONFIG.currentShown >= filteredCards.length) {
                    loadMoreBtn.parentNode.style.display = 'none';
                    loadMoreBtn.style.display = 'none';
                } else {
                    loadMoreBtn.parentNode.style.display = 'block';
                    loadMoreBtn.style.display = 'inline-block';
                }
            }

            // Gọi hàm tải ảnh lười biếng nếu có cấu hình sẵn
            if (typeof loadVisibleImages === 'function') {
                try { loadVisibleImages(); } catch(e) {}
            }
        }

        // Đính sự kiện click cho nút Xem thêm game
        if (loadMoreBtn) {
            loadMoreBtn.onclick = function(e) {
                e.preventDefault();
                CONFIG.currentShown += CONFIG.itemsPerLoad;
                renderGridDisplay();
            };
        }

        // Xử lý bộ lọc đa điều kiện tổng hợp (Thể loại + Engine + Tags)
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

                    // Kiểm tra điều kiện Khớp Gametype
                    const gtMatch = activeGametypes.length === 0 || activeGametypes.includes(cardGametype);
                    // Kiểm tra điều kiện Khớp Engine
                    const eMatch = activeEngines.length === 0 || activeEngines.includes(cardEngine);
                    // Kiểm tra điều kiện Khớp tất cả các Tags lựa chọn cùng lúc
                    const gMatch = activeGenres.length === 0 || activeGenres.every(g => cardGenres.includes(g));

                    return gtMatch && eMatch && gMatch;
                });

                renderGridDisplay();
                grid.classList.remove('pitu-loading');
            }, CONFIG.fakeLoadTime);
        }

        // Chạy khởi tạo hiển thị lưới game ban đầu
        renderGridDisplay();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPituEngine);
    } else {
        initPituEngine();
    }
})();
