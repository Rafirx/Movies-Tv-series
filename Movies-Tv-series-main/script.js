let allData = [];
let currentFilter = 'all';
let searchQuery = '';
let heroData = null;
let carouselInterval = null;
let carouselIndex = 0;

function init() {
    fetch('Film.JSON')
        .then(res => res.json())
        .then(data => {
            allData = data;
            // Load saved items from localStorage
            const savedData = localStorage.getItem('savedMovies');
            if (savedData) {
                allData = allData.concat(JSON.parse(savedData));
            }
            setupHero();
            setupEventListeners();
            setupAdminForm();
            render();
        })
        .catch(err => console.error('Error loading data:', err));
}

function setupHero() {
    if (allData.length > 0) {
        const carouselTrack = $('#carouselTrack');
        carouselTrack.empty();
        
        allData.forEach((item, index) => {
            let img = getImageUrl(item);
            const slide = $('<div class="carousel-slide"></div>').css({
                'background-image': `url('${img}')`,
                'background-size': 'cover',
                'background-position': 'center'
            });
            
            // Add error handling - if image fails, try poster URL
            const imgElement = new Image();
            imgElement.onerror = function() {
                if (item.Poster && img !== item.Poster.replace('http://', 'https://')) {
                    const fallbackImg = item.Poster.replace('http://', 'https://');
                    slide.css('background-image', `url('${fallbackImg}')`);
                }
            };
            imgElement.src = img;
            
            carouselTrack.append(slide);
        });
        
        carouselIndex = 0;
        heroData = allData[0];
        updateHeroContent();
        
        if (carouselInterval) clearInterval(carouselInterval);
        carouselInterval = setInterval(() => {
            carouselIndex = (carouselIndex + 1) % allData.length;
            carouselTrack.css('transform', `translateX(-${carouselIndex * 100}%)`);
            heroData = allData[carouselIndex];
            updateHeroContent();
        }, 3000);
    }
}

function updateHeroContent() {
    if (!heroData) return;
    const heroContent = $('.hero-content');
    heroContent.html(`
        <h1 class="hero-title">${heroData.Title}</h1>
        <p class="hero-description">${heroData.Plot}</p>
    `);
}

function getImageUrl(item) {
    // Try Images array first (HTTPS)
    if (item.Images && item.Images.length > 0) {
        return item.Images[0];
    }
    // Fallback to Poster (convert HTTP to HTTPS)
    if (item.Poster) {
        return item.Poster.replace('http://', 'https://');
    }
    // Last resort: placeholder
    return 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect fill=%22%23221f1f%22 width=%22200%22 height=%22300%22/%3E%3C/svg%3E';
}

function setupEventListeners() {
    $('[data-filter]').on('click', (e) => {
        $('[data-filter]').removeClass('active');
        $(e.target).addClass('active');
        currentFilter = $(e.target).data('filter');
        render();
    });

    $('#searchInput').on('input', (e) => {
        searchQuery = $(e.target).val().toLowerCase().trim();
        render();
    });

    $('.logo').on('click', () => {
        searchQuery = '';
        currentFilter = 'all';
        $('#searchInput').val('');
        $('[data-filter]').removeClass('active');
        $('[data-filter="all"]').addClass('active');
        render();
    });
}

function setupAdminForm() {
    $('#adminForm').on('submit', function(e) {
        e.preventDefault();
        
        const title = $('#titleInput').val().trim();
        const year = $('#yearInput').val().trim();
        const type = $('#typeInput').val().trim();
        const runtime = $('#runtimeInput').val().trim();
        const imdbID = $('#imdbIDInput').val().trim();
        const imdbRating = $('#imdbRatingInput').val().trim();
        const poster = $('#posterInput').val().trim();
        const plot = $('#plotInput').val().trim();
        
        if (!title || !year || !type || !runtime || !imdbID || !imdbRating) {
            alert('Please fill in all required fields (marked with *)');
            return;
        }
        
        const newItem = {
            Title: title,
            Year: year,
            Type: type,
            Runtime: runtime,
            imdbID: imdbID,
            imdbRating: imdbRating,
            Poster: poster || 'https://via.placeholder.com/300x450?text=No+Image',
            Plot: plot || 'No description available',
            Genre: 'User Added',
            Director: 'N/A',
            Actors: 'N/A'
        };
        
        allData.push(newItem);
        
        // Save to localStorage
        const savedMovies = localStorage.getItem('savedMovies');
        const saved = savedMovies ? JSON.parse(savedMovies) : [];
        saved.push(newItem);
        localStorage.setItem('savedMovies', JSON.stringify(saved));
        
        $('#adminForm')[0].reset();
        render();
        alert('Content added successfully!');
    });
}

function getFilteredData() {
    return allData.filter(item => {
        const typeMatch = currentFilter === 'all' || item.Type === currentFilter;
        const searchMatch = !searchQuery || 
            item.Title.toLowerCase().includes(searchQuery) ||
            (item.Genre && item.Genre.toLowerCase().includes(searchQuery));
        return typeMatch && searchMatch;
    });
}

function render() {
    const filtered = getFilteredData();
    const movies = filtered.filter(i => i.Type === 'movie');
    const series = filtered.filter(i => i.Type === 'series');
    
    let html = '';
    
    if (currentFilter === 'all' || currentFilter === 'movie') {
        if (movies.length > 0) {
            html += `<div class="content-section"><h2 class="section-title">Movies</h2><div class="content-row">${movies.map(createCard).join('')}</div></div>`;
        }
    }
    
    if (currentFilter === 'all' || currentFilter === 'series') {
        if (series.length > 0) {
            html += `<div class="content-section"><h2 class="section-title">TV Series</h2><div class="content-row">${series.map(createCard).join('')}</div></div>`;
        }
    }
    
    if (html === '') {
        html = '<div class="no-results"><p>No content found</p></div>';
    }
    
    $('#contentContainer').html(html);
}

function createCard(item) {
    let posterUrl = item.Poster ? item.Poster.replace('http://', 'https://') : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect fill=%22%23221f1f%22 width=%22200%22 height=%22300%22/%3E%3C/svg%3E';
    const rating = item.imdbRating ? `<span class="card-overlay-rating">⭐ ${item.imdbRating}</span>` : '';
    const type = item.Type === 'series' ? 'Series' : 'Movie';
    
    return `
        <div class="card">
            <img src="${posterUrl}" alt="${item.Title}" class="card-image">
            <div class="card-overlay">
                <div class="card-overlay-title">${item.Title}</div>
                <div class="card-overlay-info">
                    <span class="card-overlay-type">${type}</span>
                    ${rating}
                </div>
                <div class="card-overlay-description">${item.Plot}</div>
            </div>
        </div>
    `;
}

$(document).ready(init);