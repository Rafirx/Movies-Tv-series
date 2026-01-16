let allData = [];
let currentFilter = 'all';
let searchQuery = '';
let heroData = null;
let carouselInterval = null;
let carouselIndex = 0;

function generateFallbackImage(title) {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 600;
    
    const ctx = canvas.getContext('2d');
    const colors = ['#E50914', '#221f1f', '#141414'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    ctx.fillStyle = randomColor;
    ctx.fillRect(0, 0, 400, 600);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const words = title.split(' ');
    const lines = [];
    let currentLine = '';
    
    words.forEach(word => {
        if ((currentLine + ' ' + word).length > 15) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine += (currentLine ? ' ' : '') + word;
        }
    });
    lines.push(currentLine);
    
    const lineHeight = 40;
    const startY = (600 - lines.length * lineHeight) / 2;
    
    lines.forEach((line, index) => {
        ctx.fillText(line, 200, startY + index * lineHeight);
    });
    
    return canvas.toDataURL();
}

async function init() {
    try {
        const response = await fetch('Film.JSON');
        if (!response.ok) {
            throw new Error(`Failed to load data: ${response.status}`);
        }
        allData = await response.json();
        
        if (!Array.isArray(allData)) {
            throw new Error('Invalid data format');
        }

        setupHero();
        render();
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing app:', error);
        displayError('Failed to load data. Please refresh the page.');
    }
}

// Setup hero section with featured content
function setupHero() {
    const featuredItems = allData.filter(item => !item.ComingSoon);
    if (featuredItems.length > 0) {
        initializeCarousel(featuredItems);
        heroData = featuredItems[0];
        updateHero();
    }
}

// Initialize carousel with auto-rotation
function initializeCarousel(items) {
    const carouselTrack = document.getElementById('carouselTrack');
    carouselTrack.innerHTML = '';
    
    const allSlides = [];
    const slideData = [];
    
    items.forEach((item) => {
        let imageUrl = null;
        if (item.Images && item.Images.length > 0) {
            imageUrl = item.Images[0];
        } else if (item.Poster) {
            imageUrl = item.Poster;
            if (imageUrl.startsWith('http://')) {
                imageUrl = imageUrl.replace('http://', 'https://');
            }
        }
        if (imageUrl) {
            allSlides.push(imageUrl);
            slideData.push({ title: item.Title, item: item });
        }
    });
    
    // Create slide elements - NO transforms on individual slides
    allSlides.forEach((imageUrl) => {
        const slide = document.createElement('div');
        slide.className = 'carousel-slide';
        
        if (imageUrl) {
            slide.style.backgroundImage = `url('${imageUrl}')`;
            const img = new Image();
            img.onload = function() {
                slide.style.backgroundImage = `url('${imageUrl}')`;
            };
            img.onerror = function() {
                slide.style.backgroundImage = `linear-gradient(135deg, #E50914 0%, #221f1f 100%)`;
            };
            img.src = imageUrl;
        } else {
            slide.style.backgroundImage = `linear-gradient(135deg, #E50914 0%, #221f1f 100%)`;
        }
        
        carouselTrack.appendChild(slide);
    });
    
    if (carouselInterval) {
        clearInterval(carouselInterval);
    }
    
    carouselIndex = 0;
    window.allSlides = allSlides;
    window.slideData = slideData;
    
    // Update hero on first slide
    if (slideData[0]) {
        heroData = slideData[0].item;
        updateHero();
    }
    
    // Auto-rotate carousel every 3 seconds through all images
    carouselInterval = setInterval(() => {
        carouselIndex = (carouselIndex + 1) % allSlides.length;
        carouselTrack.style.transform = `translateX(-${carouselIndex * 100}%)`;
        if (slideData[carouselIndex]) {
            heroData = slideData[carouselIndex].item;
            updateHero();
        }
    }, 3000);
}

// Update hero section
function updateHero() {
    if (!heroData) return;
    
    const isSeries = heroData.Type === 'series';
    
    document.querySelector('.hero-content').innerHTML = `
        <h1 class="hero-title">${escapeHtml(heroData.Title)}</h1>
        <p class="hero-description">${escapeHtml(heroData.Plot)}</p>
        <div class="hero-buttons">
            <button class="hero-btn play">
                ▶ Play
            </button>
            <button class="hero-btn info">
                ℹ More Info
            </button>
        </div>
    `;
}

// Setup all event listeners
function setupEventListeners() {
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            render();
        });
    });

    // Search input
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        render();
    });

    // Logo click to reset
    document.querySelector('.logo').addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        currentFilter = 'all';
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-filter="all"]').classList.add('active');
        setupHero();
        render();
        window.scrollTo(0, 0);
    });
    
    // Image error handling - use fallback if image fails to load
    document.addEventListener('error', (e) => {
        if (e.target.tagName === 'IMG' && e.target.classList.contains('card-image')) {
            const fallbackUrl = e.target.dataset.fallback;
            if (fallbackUrl && e.target.src !== fallbackUrl) {
                e.target.src = fallbackUrl;
            }
        }
    }, true);

    // Card click to open player
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.card');
        if (card) {
            const imdbId = card.getAttribute('data-imdb-id');
            if (imdbId) {
                const item = allData.find(i => i.imdbID === imdbId);
                if (item) {
                    openPlayerModal(item);
                }
            }
        }
    });

    // Close modal with X button
    const closeBtn = document.querySelector('.close-player-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closePlayerModal);
    }

    // Close modal when clicking outside the content
    const playerModal = document.getElementById('playerModal');
    if (playerModal) {
        playerModal.addEventListener('click', (e) => {
            if (e.target === playerModal) {
                closePlayerModal();
            }
        });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closePlayerModal();
        }
    });
}

// Filter data based on current filter and search query
function getFilteredData() {
    return allData.filter(item => {
        if (currentFilter !== 'all' && item.Type !== currentFilter) {
            return false;
        }
        if (searchQuery) {
            const searchableFields = [
                item.Title || '',
                item.Genre || '',
                item.Director || '',
                item.Actors || ''
            ].join(' ').toLowerCase();

            if (!searchableFields.includes(searchQuery)) {
                return false;
            }
        }

        return true;
    });
}

// Render content
function render() {
    const filteredData = getFilteredData();
    const movies = filteredData.filter(item => item.Type === 'movie');
    const series = filteredData.filter(item => item.Type === 'series');
    
    const container = document.getElementById('contentContainer');
    let html = '';
    
    if (searchQuery) {
        if (filteredData.length === 0) {
            html = `
                <div style="padding: 40px 50px;">
                    <div class="no-results">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                        <p>No results found for "${escapeHtml(searchQuery)}"</p>
                    </div>
                </div>
            `;
        } else {
            html = `
                <div class="content-section">
                    <h2 class="section-title">Search Results (${filteredData.length})</h2>
                    <div class="content-row">
                        ${filteredData.map(item => createCard(item)).join('')}
                    </div>
                </div>
            `;
        }
    } else {
        // Show all sections based on filter
        if (currentFilter === 'all' || currentFilter === 'movie') {
            if (movies.length > 0) {
                html += `
                    <div class="content-section">
                        <h2 class="section-title">Movies</h2>
                        <div class="content-row">
                            ${movies.map(item => createCard(item)).join('')}
                        </div>
                    </div>
                `;
            }
        }
        
        if (currentFilter === 'all' || currentFilter === 'series') {
            if (series.length > 0) {
                html += `
                    <div class="content-section">
                        <h2 class="section-title">TV Series</h2>
                        <div class="content-row">
                            ${series.map(item => createCard(item)).join('')}
                        </div>
                    </div>
                `;
            }
        }
        
        if (movies.length === 0 && series.length === 0) {
            html = `
                <div style="padding: 40px 50px;">
                    <div class="no-results">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                        <p>No content available</p>
                    </div>
                    </div>
            `;
        }
    }
    
    container.innerHTML = html;
}

// Create a card HTML element
function createCard(item) {
    const isSeries = item.Type === 'series';
    const isComingSoon = item.ComingSoon === true;
    let posterUrl = item.Poster;
    if (posterUrl && posterUrl.startsWith('http://')) {
        posterUrl = posterUrl.replace('http://', 'https://');
    }
    if (!posterUrl && item.Images && item.Images.length > 0) {
        posterUrl = item.Images[0];
    }
    let fallbackUrl = generateFallbackImage(item.Title);
    if (!posterUrl) {
        posterUrl = fallbackUrl;
    }
    
    const ratingHtml = item.imdbRating && item.imdbRating !== 'N/A' 
        ? `<span class="card-overlay-rating">⭐ ${item.imdbRating}</span>`
        : '';

    const typeLabel = isSeries ? 'Series' : 'Movie';
    
    const seasonsInfo = isSeries && item.totalSeasons 
        ? `<div class="card-overlay-meta">Seasons: ${item.totalSeasons}</div>`
        : '';

    const runtimeInfo = !isSeries && item.Runtime && item.Runtime !== 'N/A'
        ? `<div class="card-overlay-meta">⏱ ${item.Runtime}</div>`
        : '';

    const comingSoonBadge = isComingSoon 
        ? '<div class="coming-soon-label">Coming Soon</div>'
        : '';

    return `
        <div class="card" data-imdb-id="${item.imdbID}">
            <img 
                src="${posterUrl}" 
                alt="${escapeHtml(item.Title)}"
                class="card-image"
                data-fallback="${fallbackUrl}"
                loading="lazy"
            >
            ${comingSoonBadge}
            <div class="card-overlay">
                <div class="card-overlay-title">${escapeHtml(item.Title)}</div>
                <div class="card-overlay-info">
                    <span class="card-overlay-type">${typeLabel}</span>
                    ${ratingHtml}
                </div>
                <div class="card-overlay-description">${escapeHtml(item.Plot)}</div>
                ${runtimeInfo}
                ${seasonsInfo}
            </div>
        </div>
    `;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Open player modal with movie/series data
function openPlayerModal(item) {
    const playerModal = document.getElementById('playerModal');
    const playerIframe = document.getElementById('playerIframe');
    const playerTitle = document.getElementById('playerTitle');
    const playerPlot = document.getElementById('playerPlot');

    if (!item.imdbID) {
        alert('This content does not have an IMDb ID available for streaming.');
        return;
    }

    // Build the embed URL - use imdbID as-is
    const embedUrl = `https://www.vidking.net/embed/movie/${item.imdbID}?color=ff0000`;

    console.log('Opening:', item.Title, 'with ID:', item.imdbID, 'URL:', embedUrl);

    // Update modal content
    playerTitle.textContent = escapeHtml(item.Title);
    playerPlot.textContent = escapeHtml(item.Plot || 'No description available');
    playerIframe.src = embedUrl;

    // Show modal
    playerModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Close player modal
function closePlayerModal() {
    const playerModal = document.getElementById('playerModal');
    const playerIframe = document.getElementById('playerIframe');
    
    playerModal.style.display = 'none';
    playerIframe.src = '';
    document.body.style.overflow = 'auto';
}

// Display error message
function displayError(message) {
    const container = document.getElementById('contentContainer');
    container.innerHTML = `
        <div style="padding: 40px 50px;">
            <div class="no-results">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p>${escapeHtml(message)}</p>
            </div>
        </div>
    `;
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
