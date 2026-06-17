(function() {
    const CONFIG = {
        itemsPerLoad: 21,
        currentShown: 21
    };

    // Mảng lưu trữ danh sách các game ĐÃ QUA BỘ LỌC (filter)
    let filteredItems = [];

    function initPituEngine() {
        if (typeof PITU_DATABASE === "undefined") {
            setTimeout(initPituEngine, 200);
            return;
        }

        // Đảm bảo lấy đúng các Class/ID đang chạy tốt ở bản cũ của bạn
        const cards = document.querySelectorAll('.game-card'); 
        const engineContainer = document.getElementById('engine-filters');
        const genreContainer = document.getElementById('genre-filters');
        const grid = document.querySelector('.game-grid') || document.querySelector('.pitu-grid'); 
        
        const btn = document.getElementById('btn-load-more');
        const container = document.getElementById('load-more-container');

        if (cards.length === 0) return;

        const engines = new Map();
        const genres = new Map();

        // Thu thập dữ liệu bộ lọc từ các thẻ game (.pitu-item)
        cards.forEach(card => {
            if(card.dataset.engine) {
                const raw = card.dataset.engine.trim();
                engines.set(raw.toLowerCase(), raw);
            }
            if(card.dataset.genres) {
                card.dataset.genres.split(',').forEach(g => {
                    const raw = g.trim();
                    if(raw) genres.set(raw.toLowerCase(), raw);
                });
            }
        });

        // Tạo nút bộ lọc HTML
        function createBtns(mapItems, containerFilter, type) {
            const sortedItems = Array.from(mapItems.values()).sort();
            sortedItems.forEach((displayVal, index) => {
                const btnFilter = document.createElement('button');
                btnFilter.innerText = displayVal;
                btnFilter.className = 'filter-btn';
                if (index >= 15) btnFilter.style.display = 'none'; 
                btnFilter.onclick = function() {
                    this.classList.toggle('active');
                    // Reset số lượng hiển thị về mặc định (21) khi đổi bộ lọc
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

        createBtns(engines, engineContainer, 'engine');
        createBtns(genres, genreContainer, 'genres');

        // Hàm tải ảnh Banner từ PITU_DATABASE cho các game đang hiển thị
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

        // Hàm cập nhật hiển thị danh sách game dựa trên phân trang
        function updateDisplay() {
            // Ẩn tất cả các game trước
            cards.forEach(card => {
                card.style.display = 'none';
                card.classList.remove('is-visible');
            });

            // Chỉ hiển thị số lượng game thuộc danh sách đã filter theo giới hạn phân trang
            const itemsToShow = filteredItems.slice(0, CONFIG.currentShown);
            itemsToShow.forEach(item => {
                item.style.display = 'flex'; 
                item.classList.add('is-visible');
            });

            // Ẩn/Hiện cả container và nút Tải thêm dựa trên tổng số game sau khi filter
            if (container) {
                container.style.display = (CONFIG.currentShown >= filteredItems.length) ? 'none' : 'block';
            }
            if (btn) {
                btn.style.display = (CONFIG.currentShown >= filteredItems.length) ? 'none' : 'block';
            }

            loadVisibleImages();
        }

        // Xử lý Sự kiện cuộn vô hạn (Infinite Scroll)
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

        // Xử lý Sự kiện bấm nút Tải thêm thủ công
        if (btn) {
            btn.onclick = function(e) {
                e.preventDefault();
                CONFIG.currentShown += CONFIG.itemsPerLoad;
                updateDisplay();
            };
        }

        // Hàm xử lý Bộ lọc (Filter)
        function filter() {
            // Ẩn ngay lập tức nút tải thêm / thanh paginator khi đang xử lý filter
            if (container) container.style.display = 'none';
            if (btn) btn.style.display = 'none';
            
            if (grid) grid.classList.add('loading-grid');
            
            setTimeout(() => {
                const activeEngines = Array.from(document.querySelectorAll('.filter-btn[data-type="engine"].active')).map(b => b.dataset.val);
                const activeGenres = Array.from(document.querySelectorAll('.filter-btn[data-type="genres"].active')).map(b => b.dataset.val);
                
                // Lọc chính xác các card theo cấu trúc cũ
                filteredItems = Array.from(cards).filter(card => {
                    const cardEngine = card.dataset.engine ? card.dataset.engine.toLowerCase() : '';
                    const cardGenres = card.dataset.genres ? card.dataset.genres.split(',').map(s => s.trim().toLowerCase()) : [];
                    
                    const eMatch = activeEngines.length === 0 || activeEngines.includes(cardEngine);
                    const gMatch = activeGenres.length === 0 || activeGenres.every(g => cardGenres.includes(g));
                    
                    return eMatch && gMatch;
                });

                // Cập nhật lại giao diện hiển thị số lượng game mới sau khi lọc
                updateDisplay();

                if (grid) grid.classList.remove('loading-grid');
            }, 200);
        }

        // Chạy khởi tạo filter lần đầu để thiết lập trạng thái ban đầu
        filter();
    }

    window.addEventListener('load', initPituEngine);
})();
