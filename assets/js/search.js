function showLinks() {
    const realLinks = document.getElementById("real-links");
    const btnShow = document.getElementById("btn-show");
    if (realLinks) realLinks.style.display = "block";
    if (btnShow) btnShow.style.display = "none";}

window.addEventListener('scroll', function() {
    const header = document.querySelector(".header-section");
    if (header) {if (window.pageYOffset > 50) {header.classList.add("scrolled");} 
    else {header.classList.remove("scrolled");}}
    
    const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {if (window.pageYOffset > 300) {backToTopBtn.classList.add('show');} 
    else {backToTopBtn.classList.remove('show');}}});

document.addEventListener('DOMContentLoaded', () => {const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {backToTopBtn.addEventListener('click', () => {window.scrollTo({ top: 0, behavior: 'smooth' });});}});

let posts = [];
const searchUrl = typeof Jekyll !== 'undefined' ? "{{ '/search.json' | relative_url }}" : '/search.json';

fetch(searchUrl)
    .then(res => res.json())
    .then(data => {
        posts = data;
        console.log("Loaded posts:", posts.length);})
    .catch(err => console.error("Search JSON lỗi:", err));

document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('search-toggle');
    const box = document.getElementById('search-box');
    const input = document.getElementById('search-input');
    const results = document.getElementById('search-results');

    if (toggle && box && input) {toggle.addEventListener('click', () => {box.classList.toggle('active'); input.focus();});

        input.addEventListener('input', 
            function() {const query = 
            this.value.toLowerCase().trim(); 
            if (!results) 
            return; results.innerHTML = '';
            if (!query) { results.style.display = 'none'; return; }
            const filtered = posts.filter(post => post.title.toLowerCase().includes(query));
            filtered.slice(0, 10).forEach(post => {const a = document.createElement('a');
                a.href = post.url;
                a.classList.add("search-item");
                const game = (typeof PITU_DATABASE !== 'undefined') ? PITU_DATABASE.find(item => item.id === post.pitu_id) : null;
                const banner = game ? game.banner : "https://via.placeholder.com/70x40?text=No+Img";

                a.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px; padding:8px;">
                      <img src="${banner}" style="width:70px; height:40px; object-fit:cover; border-radius:4px;">
                      <span style="color:#eee; font-size:13px;">${post.title}</span>
                    </div>`;
                results.appendChild(a);});
            results.style.display = filtered.length ? 'block' : 'none';});}});

function toggleMenu() {
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('overlay');
    if (sideMenu) sideMenu.classList.toggle('active');
    if (overlay) {
        overlay.style.display = (overlay.style.display === 'block') ? 'none' : 'block';}}
