(function() {
    const CONFIG = {
        itemsPerPage: 15, // Số lượng game hiển thị trên 1 trang khi chọn filter
        currentPage: 1    // Trang hiện tại khi chọn filter
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
        
        // Tìm thanh phân trang gốc của Jekyll
        const jekyllPaginator = document.getElementById('load-more-container') || 
                                document.querySelector('.pagination') || 
                                document.getElementById('btn-load-more');

        // Tạo sẵn một vùng chứa mới dành riêng cho các nút phân trang của JavaScript
        let jsPaginator = document.getElementById('js-paginator-container');
        if (!jsPaginator && jekyllPaginator) {
            jsPaginator = document.createElement('div');
            jsPaginator.id = 'js-paginator-container';
            jsPaginator.style.cssText = 'text-align: center; margin-top: 20px; display: flex; justify-content: center; gap: 5px; width: 100%;';
            jekyllPaginator.parentNode.insertBefore(jsPaginator, jekyllPaginator.nextSibling);
        }

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

        function createFilterBtns(mapItems, containerFilter, type) {
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
                    CONFIG.currentPage = 1; // Reset về trang 1 khi đổi bộ lọc
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

        createFilterBtns(engines, engineContainer, 'engine');
        createFilterBtns(genres, genreContainer, 'genres');

        // Hàm tải ảnh từ dữ liệu PITU_DATABASE cho các game hiển thị ở trang hiện tại
        function loadVisibleImages() {
            const start = (CONFIG.currentPage - 1) * CONFIG.itemsPerPage;
            const end = start + CONFIG.itemsPerPage;
            const activePageItems = filteredItems.slice(start, end);

            activePageItems.forEach(item => {
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
            });
        }

        // Hàm vẽ các nút số Trang (1, 2, 3...) động bằng JS dựa trên kết quả filter
        function renderJSPaginator() {
            if (!jsPaginator) return;
            jsPaginator.innerHTML = '';

            const totalPages = Math.ceil(filteredItems.length / CONFIG.itemsPerPage);
            if (totalPages <= 1) return; // Nếu chỉ có 1 trang thì không cần vẽ nút làm gì

            for (let i = 1; i <= totalPages; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.innerText = i;
                pageBtn.className = 'js-page-btn';
                pageBtn.style.cssText = 'padding: 8px 12px; border: 1px solid #ccc; background: #fff; cursor: pointer; font-weight: bold; border-radius: 4px;';
                
                if (i === CONFIG.currentPage) {
                    pageBtn.style.background = '#007bff'; // Màu nút trang hiện tại (Có thể đổi theo CSS của bạn)
                    pageBtn.style.color = '#fff';
                    pageBtn.style.borderColor = '#007bff';
                }

                pageBtn.onclick = function() {
                    CONFIG.currentPage = i;
                    updateDisplay();
                    window.scrollTo({ top: grid.offsetTop - 20, behavior: 'smooth' }); // Cuộn nhẹ lên đầu lưới game
                };
                jsPaginator.appendChild(pageBtn);
            }
        }

        // Hàm cập nhật trạng thái hiển thị logic chia trang
        function updateDisplay() {
            // Ẩn toàn bộ danh sách gốc
            items.forEach(item => {
                item.style.display = 'none';
                item.classList.remove('is-visible');
            });

            // Kiểm tra xem người dùng có đang dùng bộ lọc nào không
            const hasActiveFilter = document.querySelectorAll('.filter-btn.active').length > 0;

            if (!hasActiveFilter) {
                // TRẠNG THÁI MẶC ĐỊNH: Hiện lại paginator của Jekyll, ẩn paginator của JS
                if (jekyllPaginator) jekyllPaginator.style.display = 'block';
                if (jsPaginator) jsPaginator.style.display = 'none';

                // Trang chủ hiện bao nhiêu bài của Jekyll thì trả lại nguyên vẹn bấy nhiêu
                items.forEach(item => {
                    item.style.display = 'block';
                    item.classList.add('is-visible');
                });
                
                // Kích hoạt tải ảnh cho toàn bộ bài đang có ở trang này
                filteredItems = Array.from(items);
                loadVisibleImages();
            } else {
                // TRẠNG THÁI ĐANG BẤM FILTER: Ẩn paginator Jekyll, Hiện paginator của JS
                if (jekyllPaginator) jekyllPaginator.style.display = 'none';
                if (jsPaginator) jsPaginator.style.display = 'flex';

                // Tính toán vị trí cắt mảng dữ liệu để phân trang bằng số
                const start = (CONFIG.currentPage - 1) * CONFIG.itemsPerPage;
                const end = start + CONFIG.itemsPerPage;
                
                const itemsToShow = filteredItems.slice(start, end);
                itemsToShow.forEach(item => {
                    item.style.display = 'block';
                    item.classList.add('is-visible');
                });

                renderJSPaginator();
                loadVisibleImages();
            }
        }

        function filter() {
            if (jekyllPaginator) jekyllPaginator.style.display = 'none';
            if (jsPaginator) jsPaginator.style.display = 'none';
            
            if (grid) grid.classList.add('loading-grid');
            
            setTimeout(() => {
                const activeEngines = Array.from(document.querySelectorAll('.filter-btn[data-type="engine"].active')).map(b => b.dataset.val);
                const activeGenres = Array.from(document.querySelectorAll('.filter-btn[data-type="genres"].active')).map(b => b.dataset.val);
                
                // Thực hiện lọc trên danh sách game hiện có tại trang này
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

        // Chạy khởi tạo thiết lập ban đầu
        filter();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPituEngine);
    } else {
        initPituEngine();
    }
})();
