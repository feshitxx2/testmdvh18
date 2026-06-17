(function() {
    const CONFIG = {
        itemsPerLoad: 21,
        currentShown: 21
    };

    let filteredItems = [];

    function initPituEngine() {
        // Kiểm tra xem database đã sẵn sàng chưa
        if (typeof PITU_DATABASE === "undefined") {
            setTimeout(initPituEngine, 200);
            return;
        }

        // Lấy danh sách thẻ game
        const items = document.querySelectorAll('.pitu-item');
        
        // CƠ CHẾ SỬA LỖI: Nếu HTML chưa render xong thẻ game, đợi thêm 100ms rồi thử lại
        if (items.length === 0) {
            setTimeout(initPituEngine, 100);
            return;
        }

        const grid = document.querySelector('.pitu-grid') || document.querySelector('.game-grid') || document.querySelector('.grid'); 
        const engineContainer = document.getElementById('engine-filters');
        const genreContainer = document.getElementById('genre-filters');
        const btn = document.getElementById('btn-load-more');
        const container = document.getElementById('load-more-container');

        const engines = new Map();
        const genres = new Map();

        // Thu thập dữ liệu làm bộ lọc từ data-attributes
        items.forEach(item => {
            if(item.dataset.engine) {
                const raw = item.dataset.engine.trim();
                engines.set(raw.toLowerCase(), raw);
            }
            if(item.dataset.genres) {
                item.dataset.genres.split(',').forEach(g => {
                    const raw = g.trim();
                    if(raw) genres.set(raw.toLowerCase(), raw);
                });
            }
        });

        // Hàm tạo các nút bấm bộ lọc
        function createBtns(mapItems, containerFilter, type) {
            if (!containerFilter) return; // Tránh lỗi nếu thiếu div container trong HTML
            containerFilter.innerHTML = ''; // Xóa sạch dữ liệu cũ trước khi chèn để tránh trùng lặp
            
            const sortedItems = Array.from(mapItems.values()).sort();
            sortedItems.forEach((displayVal, index) => {
                const btnFilter = document.createElement('button');
                btnFilter.innerText = displayVal;
                btnFilter.className = 'filter-btn';
                if (index >= 15) btnFilter.style.display = 'none'; 
                btnFilter.onclick = function() {
                    this.classList.toggle('active');
                    CONFIG.currentShown = CONFIG.itemsPerLoad; 
                    filter();
                };
                btnFilter.dataset.val = displayVal.toLowerCase();
                btnFilter.dataset.type = type;
                containerFilter.appendChild(btnFilter);
            });

            if (sortedItems.length > 15) {
                const more = document.createElement('button');
                more.innerText = "...";
                more.className = 'show-more-btn';
                more.onclick = function() { 
                    containerFilter.querySelectorAll('.filter-btn').forEach(b => b.style.display = 'inline-block'); 
                    this.style.display = 'none'; 
                };
                containerFilter.appendChild(more);
            }
        }

        // Tạo nút chọn hiển thị
        createBtns(engines, engineContainer, 'engine');
        createBtns(genres, genreContainer, 'genres');

        // Hàm tải ảnh từ PITU_DATABASE
        function loadVisibleImages() {
            filteredItems.forEach((item, index) => {
                if (index < CONFIG.currentShown) {
                    const img = item.querySelector('.grid-pitu-img');
                    if (img && img.src.startsWith('data:image')) {
                        const pituId = img.getAttribute('data-pitu');
                        if (pituId) {
                            const gameData = PITU_DATABASE.find(g => g.id.trim() === pituId.trim());
                            if (gameData && gameData.banner) {
                                img.src = gameData.banner;
                            }
                        }
                    }
                }
            });
        }

        // Hàm cập nhật trạng thái hiển thị
        function updateDisplay() {
            items.forEach(item => {
                item.style.display = 'none';
                item.classList.remove('is-visible');
            });

            const itemsToShow = filteredItems.slice(0, CONFIG.currentShown);
            itemsToShow.forEach(item => {
                item.style.display = 'flex'; 
                item.classList.add('is-visible');
            });

            if (container) {
                container.style.display = (CONFIG.currentShown >= filteredItems.length) ? 'none' : 'block';
            }
            if (btn) {
                btn.style.display = (CONFIG.currentShown >= filteredItems.length) ? 'none' : 'block';
            }

            loadVisibleImages();
        }

        // Cuộn vô hạn
        let isLoading = false;
        window.addEventListener('scroll', () => {
            if (!isLoading && CONFIG.currentShown < filteredItems.length) {
                const triggerPoint = window.innerHeight + window.scrollY;
                if (triggerPoint >= document.body.offsetHeight - 400) {
                    isLoading = true;
                    setTimeout(() => {
                        CONFIG.currentShown += CONFIG.itemsPerLoad;
                        updateDisplay();
                        isLoading = false;
                    }, 500); 
                }
            }
        });

        // Bấm nút Tải thêm thủ công
        if (btn) {
            btn.onclick = function(e) {
                e.preventDefault();
                CONFIG.currentShown += CONFIG.itemsPerLoad;
                updateDisplay();
            };
        }

        // Hàm xử lý Bộ lọc chính
        function filter() {
            if (container) container.style.display = 'none';
            if (btn) btn.style.display = 'none';
            
            if (grid) grid.classList.add('loading-grid');
            
            setTimeout(() => {
                const activeEngines = Array.from(document.querySelectorAll('.filter-btn[data-type="engine"].active')).map(b => b.dataset.val);
                const activeGenres = Array.from(document.querySelectorAll('.filter-btn[data-type="genres"].active')).map(b => b.dataset.val);
                
                filteredItems = Array.from(items).filter(item => {
                    const cardEngine = item.dataset.engine ? item.dataset.engine.toLowerCase() : '';
                    const cardGenres = item.dataset.genres ? item.dataset.genres.split(',').map(s => s.trim().toLowerCase()) : [];
                    
                    const eMatch = activeEngines.length === 0 || activeEngines.includes(cardEngine);
                    const gMatch = activeGenres.length === 0 || activeGenres.every(g => cardGenres.includes(g));
                    
                    return eMatch && gMatch;
                });

                updateDisplay();

                if (grid) grid.classList.remove('loading-grid');
            }, 200);
        }

        // Chạy filter phát đầu tiên
        filter();
    }

    // Kích hoạt khi trang tải xong hoàn toàn
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPituEngine);
    } else {
        initPituEngine();
    }
})();
