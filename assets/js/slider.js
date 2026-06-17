document.addEventListener("DOMContentLoaded", function () {
    const slides = document.querySelector(".slides");
    const slideItems = document.querySelectorAll(".slide");
    const next = document.querySelector(".next");
    const prev = document.querySelector(".prev");
    let index = 0;
    const total = slideItems.length;

    function loadSliderImages() {if (typeof PITU_DATABASE === "undefined") {setTimeout(loadSliderImages, 100); return;}

        document.querySelectorAll(".slide-img").forEach(img => {const id = img.dataset.pitu; 
                                                                const game = PITU_DATABASE.find(item => item.id === id);
                                                                if (game && game.banner) {img.src = game.banner;} 
                                                                else {img.src = "https://via.placeholder.com/800x400?text=No+Image";}});}

    function showSlide(i) {slides.style.transform = `translateX(-${i * 100}%)`;}
    function nextSlide() {index = (index + 1) % total; showSlide(index);}
    function prevSlide() {index = (index - 1 + total) % total; showSlide(index);}

    loadSliderImages();

    if (next && prev) {next.addEventListener("click", nextSlide); prev.addEventListener("click", prevSlide);}

    setInterval(nextSlide, 5000);});

document.addEventListener("DOMContentLoaded", function () {function syncSliderImages() {if (typeof PITU_DATABASE === "undefined") {console.log("Đang đợi Database từ assets/js..."); 
                                                                                                                                   setTimeout(syncSliderImages, 100); return;}
    document.querySelectorAll(".slide-img").forEach(img => {const id = img.dataset.pitu;
                                                            const game = PITU_DATABASE.find(item => item.id === id);
                                                            if (game && game.banner) {img.src = game.banner;}});
    console.log("Slider đã khớp ảnh xong!");}
    syncSliderImages();});
