(function() {
    const CONFIG = {
        itemsPerLoad: 15, // Số lượng game tải thêm mỗi lượt
        currentShown: 15  // Số lượng game hiển thị ban đầu khi chọn bộ lọc
    };

    let originalHTML = ''; // Bộ nhớ tạm lưu mã HTML gốc của Jekyll
    let filteredData = []; // Mảng chứa dữ liệu game sau khi lọc từ PITU_DATABASE
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

        // Lưu giữ cấu trúc HTML ban đầu của trang chủ Jekyll
        originalHTML = grid.innerHTML;

        const engineContainer = document.getElementById('engine-filters');
        const genreContainer = document.getElementById('genre-filters');
        const jekyllPaginator = document.getElementById('load-more-container');

        const engines = new Map();
        const genres = new Map();

        // Thu thập toàn bộ Engine và Tags từ PITU_DATABASE để bộ lọc hiển thị đầy đủ
        PITU_DATABASE.forEach(game => {
            if (game.engine) {
                const raw = game.engine.trim();
                if (raw) engines.set(raw.toLowerCase(), raw);
            }
            if (game.genre) {
                game.genre.split(',').forEach(g => {
                    const raw = g.trim();
                    if (raw) genres.set(raw.toLowerCase(), raw);
                });
            }
        });

        function createFilterBtns(mapItems, containerFilter, type) {
            if (!containerFilter) return; 
            containerFilter.innerHTML = ''; 
            
            const sortedItems = Array.from(mapItems.values()).sort();
            sortedItems.forEach((displayVal, index) => {
                const btnFilter = document.createElement('button');
                btnFilter.type = 'button';
                btnFilter.innerText = displayVal;
                btnFilter.className = 'filter-btn';
                if (index >= 15) btnFilter.style.display = 'none'; 
                
                btnFilter.onclick = function(e) {
                    e.preventDefault();
                    this.classList.toggle('active');
                    CONFIG.currentShown = CONFIG.itemsPerLoad; // Đổi bộ lọc thì reset số lượng về 15
                    filter();
                };
                btnFilter.dataset.val = displayVal.toLowerCase();
                btnFilter.dataset.type = type;
                containerFilter.appendChild(btnFilter);
            });

            if (sortedItems.length > 15) {
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

        // Hàm tự dựng cấu trúc HTML card game chính xác theo mẫu thiết kế của bạn
        function generateCardHTML(game) {
            // Xử lý tạo chuỗi danh sách thẻ loại game (PC, APK...)
            let typeTagsHTML = '';
            if (game.typegame && Array.isArray(game.typegame)) {
                game.typegame.forEach(type => {
                    const slug = type.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    typeTagsHTML += `<span class="tag-item tag-${slug}">${type}</span>`;
                });
            }

            // Xử lý tạo thẻ danh mục (Badge góc ảnh)
            let badgeHTML = '';
            if (game.categories && game.categories.length > 0) {
                const badgeText = game.categories[0].replace(/-/g, ' ');
                badgeHTML = `<div class="card-badge">${badgeText}</div>`;
            }

            // Đồng bộ đường dẫn URL của game theo chuẩn Jekyll
            const baseUrl = window.location.origin + (window.JEKYLL_BASEURL || '');
            const gameUrl = game.url ? (game.url.startsWith('http') ? game.url : baseUrl + game.url) : '#';

            return `
                <div class="game-card" data-engine="${game.engine || ''}" data-genres="${game.genre || ''}" style="display: block;">
                    <a href="${gameUrl}">
                        <div class="card-thumb">
                            <img src="${game.banner || ''}" class="grid-pitu-img" data-pitu="${game.id || ''}" alt="${game.title || ''}">
                            <div class="card-type-tags">${typeTagsHTML}</div>
                            <i class="fa-solid fa-angles-down download-icon-fa"></i> 
                            ${badgeHTML}
                        </div>
                        <div class="card-info">
                            <h3>${game.namebanner || game.title || ''}</h3>
                        </div>
                    </a>
                </div>
            `;
        }

        // Đổ danh sách dữ liệu game đã lọc ra màn hình theo số lượng giới hạn hiện tại
        function renderFilteredGrid() {
            const itemsToShow = filteredData.slice(0, CONFIG.currentShown);
            let htmlContent = '';
            
            itemsToShow.forEach(game => {
                htmlContent += generateCardHTML(game);
            });
            
            grid.innerHTML = htmlContent;
            
            // Kích hoạt hàm Lazy Load ảnh có sẵn trên hệ thống của bạn để quét và nạp ảnh thực tế
            if (typeof loadVisibleImages === 'function') {
                loadVisibleImages();
            }
        }

        // Lắng nghe sự kiện cuộn màn hình để xử lý load thêm game tự động khi chọn bộ lọc
        window.addEventListener('scroll', () => {
            if (!isFiltering || isLoadingMore) return;

            if (CONFIG.currentShown < filteredData.length) {
                const triggerPoint = window.innerHeight + window.scrollY;
                
                // Khi người dùng cuộn chuột cách chân trang dưới 400px thì nạp thêm bài mới
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

        // Xử lý logic lọc so khớp dữ liệu chính
        function filter() {
            const activeEngines = Array.from(document.querySelectorAll('.filter-btn[data-type="engine"].active')).map(b => b.dataset.val);
            const activeGenres = Array.from(document.querySelectorAll('.filter-btn[data-type="genres"].active')).map(b => b.dataset.val);
            
            const hasActiveFilter = activeEngines.length > 0 || activeGenres.length > 0;

            if (!hasActiveFilter) {
                // TRẠNG THÁI MẶC ĐỊNH: Trả lại nguyên vẹn HTML trang chủ của Jekyll, hiện lại phân trang Jekyll
                isFiltering = false;
                grid.innerHTML = originalHTML;
                if (jekyllPaginator) jekyllPaginator.style.display = 'block';
                return;
            }

            // TRẠNG THÁI ĐANG CHỌN FILTER: Chuyển sang quét dữ liệu động toàn trang từ PITU_DATABASE
            isFiltering = true;
            if (jekyllPaginator) jekyllPaginator.style.display = 'none';
            if (grid) grid.classList.add('loading-grid');

            setTimeout(() => {
                filteredData = PITU_DATABASE.filter(game => {
                    const cardEngine = game.engine ? game.engine.toLowerCase() : '';
                    const cardGenres = game.genre ? game.genre.split(',').map(s => s.trim().toLowerCase()) : [];
                    
                    const eMatch = activeEngines.length === 0 || activeEngines.includes(cardEngine);
                    const gMatch = activeGenres.length === 0 || activeGenres.every(g => cardGenres.includes(g));
                    
                    return eMatch && gMatch;
                });

                renderFilteredGrid();
                if (grid) grid.classList.remove('loading-grid');
            }, 100);
        }

        filter();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPituEngine);
    } else {
        initPituEngine();
    }
})();
