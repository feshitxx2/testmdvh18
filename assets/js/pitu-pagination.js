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

        // Hàm hỗ trợ định dạng tag hiển thị cho đẹp (ví dụ: 3dcg -> 3DCG, hoặc hành động -> Hành động)
        function formatTagDisplay(tag) {
            const trimmed = tag.trim();
            if (trimmed.toLowerCase() === '3dcg') return '3DCG';
            if (trimmed.toLowerCase() === '2dcg') return '2DCG';
            // Viết hoa chữ cái đầu cho các tag thông thường
            return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        }

        // 1. Quét từ các thẻ HTML đang hiển thị trên trang hiện tại
        items.forEach(item => {
            if(item.dataset.engine) {
                const raw = item.dataset.engine.trim();
                if(raw) engines.set(raw.toLowerCase(), formatTagDisplay(raw));
            }
            if(item.dataset.genres) {
                item.dataset.genres.split(',').forEach(g => {
                    const raw = g.trim();
                    if(raw) genres.set(raw.toLowerCase(), formatTagDisplay(raw));
                });
            }
        });

        // 2. Quét sâu vào PITU_DATABASE để lấy tag của toàn bộ các trang khác
        PITU_DATABASE.forEach(game => {
            const gameEngine = game.engine || game.Engine || '';
            const gameGenre = game.genre || game.Genre || game.genres || '';

            if (gameEngine) {
                const raw = gameEngine.trim();
                if(raw) engines.set(raw.toLowerCase(), formatTagDisplay(raw));
            }
            if (gameGenre) {
                gameGenre.split(',').forEach(g => {
                    const raw = g.trim();
                    if(raw) genres.set(raw.toLowerCase(), formatTagDisplay(raw));
                });
            }
        });

        // Hàm vẽ các nút bấm bộ lọc ra Sidebar
        function createFilterBtns(mapItems, containerFilter, type) {
            if (!containerFilter) return; 
            containerFilter.innerHTML = ''; 
            
            // Sắp xếp danh sách tag theo bảng chữ cái
            const sortedKeys = Array.from(mapItems.keys()).sort();
            
            sortedKeys.forEach((keyVal, index) => {
                const displayVal = mapItems.get(keyVal); // Lấy tên tag đã định dạng chuẩn hóa
                const btnFilter = document.createElement('button');
                btnFilter.type = 'button';
                btnFilter.innerText = displayVal;
                btnFilter.className = 'filter-btn';
                if (index >= 15) btnFilter.style.display = 'none'; 
                
                btnFilter.onclick = function(e) {
                    e.preventDefault();
                    this.classList.toggle('active');
                    CONFIG.currentShown = CONFIG.itemsPerLoad; // Reset số lượng hiển thị về 15 khi đổi bộ lọc
                    filter();
                };
                btnFilter.dataset.val = keyVal; // Lưu giá trị so sánh dạng chữ thường viết liền (lowercase)
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

        // Khởi tạo hệ thống nút lọc ở Sidebar (Không lo bị trùng 3DCG và 3dcg nữa)
        createFilterBtns(engines, engineContainer, 'engine');
        createFilterBtns(genres, genreContainer, 'genres');

        // Hàm dựng lại cấu trúc HTML card game chính xác theo mẫu của bạn
        function generateCardHTML(game) {
            const gTypegame = game.typegame || game.Typegame || [];
            const gCategories = game.categories || game.Categories || [];
            const gUrl = game.url || game.Url || '#';
            const gBanner = game.banner || game.Banner || game.image || '';
            const gId = game.id || game.pitu_id || '';
            const gTitle = game.namebanner || game.title || '';

            let typeTagsHTML = '';
            if (gTypegame && Array.isArray(gTypegame)) {
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

            const baseUrl = window.location.origin + (window.JEKYLL_BASEURL || '');
            const gameUrl = gUrl.startsWith('http') ? gUrl : baseUrl + gUrl;

            return `
                <div class="game-card" data-engine="${game.engine || game.Engine || ''}" data-genres="${game.genre || game.Genre || ''}" style="display: block;">
                    <a href="${gameUrl}">
                        <div class="card-thumb">
                            <img src="${gBanner}" class="grid-pitu-img" data-pitu="${gId}" alt="${game.title || ''}">
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
            
            // Gọi lại hàm lazy load ảnh có sẵn của hệ thống
            if (typeof loadVisibleImages === 'function') {
                loadVisibleImages();
            }
        }

        // Xử lý sự kiện cuộn chuột để tự động hiện thêm game (Infinite Scroll)
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

        // Xử lý logic lọc khớp dữ liệu (Ép toàn bộ về chữ thường khi so sánh)
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
            if (grid) grid.classList.add('loading-grid');

            setTimeout(() => {
                filteredData = PITU_DATABASE.filter(game => {
                    const cardEngine = (game.engine || game.Engine || '').toLowerCase().trim();
                    const gameGenreRaw = game.genre || game.Genre || game.genres || '';
                    const cardGenres = gameGenreRaw ? gameGenreRaw.split(',').map(s => s.trim().toLowerCase()) : [];
                    
                    // So khớp tuyệt đối dạng chữ thường (lowercase)
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
