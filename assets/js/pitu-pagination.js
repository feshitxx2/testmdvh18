(function() {
    const CONFIG = {
        itemsPerLoad: 21,
        currentShown: 21
    };

    // Mảng lưu trữ danh sách các game đã thỏa mãn bộ lọc (filter)
    let filteredItems = [];

    function initPituEngine() {
        if (typeof PITU_DATABASE === "undefined") {
            setTimeout(initPituEngine, 200);
            return;
        }

        // CHUẨN HÓA CLASS: Tìm chính xác các phần tử pitu trong HTML của bạn
        const items = document.querySelectorAll('.pitu-item');
        const grid = document.querySelector('.pitu-grid') || document.querySelector('.game-grid') || document.querySelector('.grid'); 
        const engineContainer = document.getElementById('engine-filters');
        const genreContainer = document.getElementById('genre-filters');
        
        const btn = document.getElementById('btn-load-more');
        const container = document.getElementById('load-more-container');

        if (items.length === 0) return;

        const engines = new Map();
        const genres = new Map();

        // Thu thập dữ liệu từ thuộc tính data- của các thẻ .pitu-item để làm bộ lọc
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

        // Hàm tạo các nút bấm bộ lọc (Engine / Thể loại)
        function createBtns(mapItems, containerFilter, type) {
            const sortedItems = Array.from(mapItems.values()).sort();
            sortedItems.forEach((displayVal, index) => {
                const btnFilter = document.createElement('button');
                btnFilter.innerText = displayVal;
                btnFilter.className = 'filter-btn';
                if (index >= 15) btnFilter.style.display = 'none'; 
                btnFilter.onclick = function() {
                    this.classList.toggle('active');
                    // Reset số lượng hiển thị về 21 khi người dùng đổi bộ lọc
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

        // Khởi tạo các nút chọn trên giao diện
        createBtns(engines, engineContainer, 'engine');
        createBtns(genres, genreContainer, 'genres');

        // Hàm tải ảnh từ PITU_DATABASE cho những game được hiển thị công khai
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

        // Hàm cập nhật trạng thái hiển thị (Ẩn/Hiện game và Thanh phân trang)
        function updateDisplay() {
            // Ẩn toàn bộ danh sách gốc trước
            items.forEach(item => {
                item.style.display = 'none';
                item.classList.remove('is-visible');
            });

            // Chỉ hiển thị các game thuộc danh sách đã lọc, giới hạn theo CONFIG.currentShown
            const itemsToShow = filteredItems.slice(0, CONFIG.currentShown);
            itemsToShow.forEach(item => {
                item.style.display = 'flex'; // Trả về dạng flex hiển thị ban đầu của bạn
                item.classList.add('is-visible');
            });

            // Ẩn thanh phân trang (paginator) nếu số lượng hiển thị đã bao trọn danh sách game sau lọc
            if (container) {
                container.style.display = (CONFIG.currentShown >= filteredItems.length) ? 'none' : 'block';
            }
            if (btn) {
                btn.style.display = (CONFIG.currentShown >= filteredItems.length) ? 'none' : 'block';
            }

            loadVisibleImages();
        }

        // Xử lý sự kiện Cuộn vô hạn (Infinite Scroll)
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

        // Xử lý sự kiện bấm nút "Tải thêm" thủ công (nếu có)
        if (btn) {
            btn.onclick = function(e) {
                e.preventDefault();
                CONFIG.currentShown += CONFIG.itemsPerLoad;
                updateDisplay();
            };
        }

        // Hàm xử lý Bộ lọc logic chính
        function filter() {
            // YÊU CẦU: Ẩn ngay thanh phân trang / paginator khi vừa kích hoạt filter
            if (container) container.style.display = 'none';
            if (btn) btn.style.display = 'none';
            
            if (grid) grid.classList.add('loading-grid');
            
            setTimeout(() => {
                const activeEngines = Array.from(document.querySelectorAll('.filter-btn[data-type="engine"].active')).map(b => b.dataset.val);
                const activeGenres = Array.from(document.querySelectorAll('.filter-btn[data-type="genres"].active')).map(b => b.dataset.val);
                
                // Thực hiện lọc dữ liệu dựa trên mảng items (.pitu-item)
                filteredItems = Array.from(items).filter(item => {
                    const cardEngine = item.dataset.engine ? item.dataset.engine.toLowerCase() : '';
                    const cardGenres = item.dataset.genres ? item.dataset.genres.split(',').map(s => s.trim().toLowerCase()) : [];
                    
                    const eMatch = activeEngines.length === 0 || activeEngines.includes(cardEngine);
                    const gMatch = activeGenres.length === 0 || activeGenres.every(g => cardGenres.includes(g));
                    
                    return eMatch && gMatch;
                });

                // Cập nhật hiển thị danh sách game mới và tính toán ẩn hiện lại paginator
                updateDisplay();

                if (grid) grid.classList.remove('loading-grid');
            }, 200);
        }

        // Chạy kiểm tra bộ lọc lần đầu tiên để phân trang trang chủ ngay khi tải xong
        filter();
    }

    // Đợi trang tải hoàn chỉnh để đảm bảo PITU_DATABASE chuẩn bị xong dữ liệu banner
    window.addEventListener('load', initPituEngine);
})();
