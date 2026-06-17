(function() {
    const CONFIG = {
        // ĐÃ SỬA: Đồng bộ số lượng trùng với số game hiển thị tối đa 1 trang của Jekyll (ví dụ: 15)
        itemsPerLoad: 15,
        currentShown: 15
    };

    let filteredItems = [];

    function initPituEngine() {
        if (typeof PITU_DATABASE === "undefined") {
            setTimeout(initPituEngine, 200);
            return;
        }

        const items = document.querySelectorAll('.game-card');
        
        if (items.length === 0) {
            setTimeout(initPituEngine, 100);
            return;
        }

        const grid = document.querySelector('.game-grid'); 
        const engineContainer = document.getElementById('engine-filters');
        const genreContainer = document.getElementById('genre-filters');
        
        // Nhận diện thanh phân trang mặc định của Jekyll trên HTML của bạn
        // Hãy đảm bảo thanh phân trang (Page 1, 2, 3 hoặc nút cũ) nằm trong một div có id hoặc class này
        const paginatorContainer = document.getElementById('load-more-container') || 
                                   document.querySelector('.pagination') || 
                                   document.getElementById('btn-load-more');

        const engines = new Map();
        const genres = new Map();

        items.forEach(item => {
            if(item.dataset.engine) {
                const raw = item.dataset.engine.trim();
                if(raw) engines.set(raw.toLowerCase(), raw);
            }
            if(item.dataset.genres) {
                item.dataset.genres.split(',').forEach(g => {
                    const raw = g.trim();
                    if(raw) genres.set(raw.toLowerCase(), raw);
                });
            }
        });

        function createBtns(mapItems, containerFilter, type) {
            if (!containerFilter) return; 
            containerFilter.innerHTML = ''; 
            
            const sortedItems = Array.from(mapItems.values()).sort();
            sortedItems.forEach((displayVal, index) => {
                const btnFilter = document.createElement('button');
                btnFilter.innerText = displayVal;
                btnFilter.className = 'filter-btn';
                if (index >= 15) btnFilter.style.display = 'none'; 
                btnFilter.onclick = function() {
                    this.classList.toggle('active');
                    // Reset số hiển thị về đúng số lượng trang hiện tại
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

        function updateDisplay() {
            items.forEach(item => {
                item.style.display = 'none';
                item.classList.remove('is-visible');
            });

            const itemsToShow = filteredItems.slice(0, CONFIG.currentShown);
            itemsToShow.forEach(item => {
                item.style.display = 'block'; 
                item.classList.add('is-visible');
            });

            // LOGIC KHI GIỮ PHÂN TRANG JEKYLL:
            // Chỉ hiện thanh phân trang khi KHÔNG chọn bộ lọc nào (Danh sách lọc bằng danh sách gốc)
            if (paginatorContainer) {
                if (filteredItems.length === items.length) {
                    paginatorContainer.style.display = 'block'; 
                } else {
                    paginatorContainer.style.display = 'none'; // Ẩn hoàn toàn nếu đang lọc bớt game
                }
            }

            loadVisibleImages();
        }

        // Vẫn giữ tính năng cuộn mượt cho danh sách đã lọc (nếu số game sau lọc > CONFIG.currentShown)
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

        function filter() {
            // Ẩn ngay lập tức thanh phân trang khi bấm nút filter
            if (paginatorContainer) paginatorContainer.style.display = 'none';
            
            if (grid) grid.classList.add('loading-grid');
            
            setTimeout(() => {
                const activeEngines = Array.from(document.querySelectorAll('.filter-btn[data-type="engine"].active')).map(b => b.dataset.val);
                const activeGenres = Array.from(document.querySelectorAll('.filter-btn[data-type="genres"].active')).map(b => b.dataset.val);
                
                // Chỉ thực hiện lọc trên phạm vi các game đang hiện diện tại Trang này của Jekyll
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

        filter();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPituEngine);
    } else {
        initPituEngine();
    }
})();
