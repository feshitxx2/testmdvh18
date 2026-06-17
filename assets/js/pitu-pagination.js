(function() {
    const CONFIG = {
        itemsPerPage: 15, // Hiển thị tối đa 15 game trên một trang khi chọn bộ lọc
        currentPage: 1    // Mặc định luôn ở trang 1 khi bắt đầu hoặc đổi bộ lọc
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
        
        // Định vị chính xác hai thanh phân trang từ cấu trúc HTML
        const jekyllPaginator = document.getElementById('load-more-container');
        const jsPaginator = document.getElementById('js-paginator-container');

        const engines = new Map();
        const genres = new Map();

        // Thu thập dữ liệu từ các thẻ game hiện diện trên màn hình
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

        // Hàm tạo các nút bấm lọc Engine và Tags bên Sidebar
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

        // Hàm gán ảnh banner thực tế từ file PITU_DATABASE cho các thẻ game được hiển thị
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

        // Hàm tự động vẽ các nút số Trang (1, 2, 3...) khi kết quả lọc vượt quá giới hạn hiển thị
        function renderJSPaginator() {
    if (!jsPaginator) return;
    jsPaginator.innerHTML = '';

    const totalPages = Math.ceil(filteredItems.length / CONFIG.itemsPerPage);
    if (totalPages <= 1) return; // Nếu chỉ có 1 trang thì không cần vẽ nút

    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        
        // ĐÃ SỬA: Ép kiểu button cụ thể để trình duyệt không hiểu nhầm là nút Submit gây reload trang
        pageBtn.type = 'button'; 
        
        pageBtn.innerText = i;
        pageBtn.className = 'js-page-btn';
        
        // Style cơ bản cho nút chuyển trang
        pageBtn.style.cssText = 'padding: 8px 14px; border: 1px solid #ddd; background: #fff; cursor: pointer; font-weight: bold; border-radius: 4px; color: #333; transition: all 0.2s;';
        
        if (i === CONFIG.currentPage) {
            pageBtn.style.background = '#007bff'; 
            pageBtn.style.color = '#fff';
            pageBtn.style.borderColor = '#007bff';
        }

        // ĐÃ SỬA: Thêm tham số sự kiện 'e' và lệnh e.preventDefault() để chặn tuyệt đối việc nhảy trang bậy bạ
        pageBtn.onclick = function(e) {
            if (e) e.preventDefault(); // Chặn hành vi tải lại trang của trình duyệt
            
            CONFIG.currentPage = i;
            updateDisplay();
            
            if (grid) {
                window.scrollTo({ top: grid.offsetTop - 20, behavior: 'smooth' }); // Cuộn nhẹ lên đầu lưới game
            }
        };
        jsPaginator.appendChild(pageBtn);
    }
}

        // Hàm điều khiển ẩn/hiện và phân chia giao diện
        function updateDisplay() {
            // Ẩn toàn bộ danh sách card gốc để xử lý
            items.forEach(item => {
                item.style.display = 'none';
                item.classList.remove('is-visible');
            });

            // Kiểm tra xem người dùng có đang kích hoạt nút lọc nào không
            const hasActiveFilter = document.querySelectorAll('.filter-btn.active').length > 0;

            if (!hasActiveFilter) {
                // TRẠNG THÁI MẶC ĐỊNH: Hiện phân trang Jekyll, Ẩn phân trang JS số
                if (jekyllPaginator) jekyllPaginator.style.display = 'block';
                if (jsPaginator) jsPaginator.style.display = 'none';

                items.forEach(item => {
                    item.style.display = 'block';
                    item.classList.add('is-visible');
                });
                
                filteredItems = Array.from(items);
                loadVisibleImages();
            } else {
                // TRẠNG THÁI ĐANG BẤM FILTER: Ẩn phân trang Jekyll, Hiện phân trang JS số
                if (jekyllPaginator) jekyllPaginator.style.display = 'none';
                if (jsPaginator) jsPaginator.style.display = 'flex';

                // Cắt mảng dữ liệu để phân chia trang chính xác theo CONFIG
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

        // Logic xử lý so khớp bộ lọc dữ liệu chính
        function filter() {
            if (jekyllPaginator) jekyllPaginator.style.display = 'none';
            if (jsPaginator) jsPaginator.style.display = 'none';
            
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

        // Chạy khởi tạo kiểm tra dữ liệu lần đầu tiên khi trang load xong
        filter();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPituEngine);
    } else {
        initPituEngine();
    }
})();
