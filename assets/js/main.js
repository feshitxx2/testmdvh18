function pituRender() {
    const path = window.location.pathname;
   
    const segments = path.split("/").filter(Boolean);
    let lastSegment = segments.pop() || "index";

    const currentPageId = lastSegment.replace(".html", "");

    console.log("ID Game thực tế bốc được là:", currentPageId);

    const game = PITU_DATABASE.find(item => item.id === currentPageId);

    if (!game) {
        console.error("Không tìm thấy data cho ID:", currentPageId);
        console.log("Danh sách ID hiện có:", PITU_DATABASE.map(g => g.id));
        return;}

    const bannerWrapper = document.querySelector('.game-banner');

    if (bannerWrapper) {
        const actualImg = bannerWrapper.querySelector('img');

        if (actualImg) {
            actualImg.src = game.banner;
            actualImg.alt = game.name + " Banner";
            actualImg.setAttribute('fetchpriority', 'high');
            actualImg.width = 1093;
            actualImg.height = 468;
            actualImg.style.width = "100%";
            actualImg.style.height = "100%";
            actualImg.style.display = "block";}}

    const previews = document.querySelectorAll('.image-grid img');

    previews.forEach((img, i) => {
        if (game.previews[i]) {
            img.src = game.previews[i];
            img.alt = game.name + " Việt Hóa Screenshot " + (i + 1);
            img.setAttribute('loading', 'lazy');
            img.width = 533;
            img.height = 300;
            img.style.width = "100%";
            img.style.height = "auto";
            img.style.objectFit = "cover";
        }
    });
}

document.addEventListener("DOMContentLoaded", pituRender);

function renderGridImages() {
    if (typeof PITU_DATABASE === "undefined") {
        console.error("LỖI CỰC NẶNG: PITU_DATABASE chưa được nạp vào trang này!");
        return; 
    }

    const gridImages = document.querySelectorAll('.grid-pitu-img');
    console.log("Tìm thấy " + gridImages.length + " ảnh cần load banner.");

    gridImages.forEach(img => {
      const pituId = img.getAttribute('data-pitu');
   
        const game = PITU_DATABASE.find(item => item.id === pituId);
        
        if (game && game.banner) {
            img.src = game.banner;
            img.style.objectFit = "cover";
            img.classList.add('loaded'); 
        } else {
            console.warn("Hụt ID: [" + pituId + "]. Check lại database xem có ID này không?");
            img.src = "https://via.placeholder.com/350x200?text=Check+ID+" + pituId;
        }
    });
}
if (document.readyState === 'complete') {
    renderGridImages();
} else {
    window.addEventListener('load', renderGridImages);
}
const observer = new MutationObserver((mutations) => {
    renderGridImages();
});
let activeFilters = [];

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Toggle class active
    btn.classList.toggle('active');
    
    const genre = btn.dataset.genre;
    
    // Cập nhật danh sách activeFilters
    if(activeFilters.includes(genre)) {
      activeFilters = activeFilters.filter(f => f !== genre);
    } else {
      activeFilters.push(genre);
    }

    // Lọc game
    document.querySelectorAll('.game-card').forEach(card => {
      // Lấy danh sách genre của game, cắt bỏ khoảng trắng thừa
      const cardGenres = card.getAttribute('data-genres')
                             .split(',')
                             .map(g => g.trim());
      
      // Logic AND: Mọi filter trong activeFilters đều phải có trong cardGenres
      const isMatch = activeFilters.length === 0 || 
                      activeFilters.every(f => cardGenres.includes(f));
      
      card.style.display = isMatch ? 'block' : 'none';
    });
  });
});
// Thêm 1 nút "Xem thêm" trong HTML của bạn
const toggleBtn = document.getElementById('toggle-btn');
toggleBtn.addEventListener('click', () => {
    document.getElementById('genre-sidebar').classList.toggle('show-all');
    toggleBtn.innerText = document.getElementById('genre-sidebar').classList.contains('show-all') ? "Thu gọn" : "...";
});
