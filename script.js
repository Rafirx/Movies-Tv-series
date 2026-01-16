// Global state
let allData = [];
let currentFilter = 'all';
let searchQuery = '';
let heroData = null;
let carouselInterval = null;
let carouselIndex = 0;

// Image fallback function - generates a placeholder with text
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
    
    // Wrap text
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

// Initialize the application
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
        // Initialize carousel with featured items
        initializeCarousel(featuredItems);
        // Set initial hero data
        heroData = featuredItems[0];
        updateHero();
    }
}

// Initialize carousel with auto-rotation
function initializeCarousel(items) {
    const carouselTrack = document.getElementById('carouselTrack');
    carouselTrack.innerHTML = '';
    
    // Create array of slides - ONLY first image from each item
    const allSlides = [];
    const slideData = [];
    
    items.forEach((item) => {
        let imageUrl = null;
        
        // Get first image from Images array, or fallback to Poster
        if (item.Images && item.Images.length > 0) {
            imageUrl = item.Images[0];
        } else if (item.Poster) {
            imageUrl = item.Poster;
            if (imageUrl.startsWith('http://')) {
                imageUrl = imageUrl.replace('http://', 'https://');
            }
        }
        
        // Only add if we have an image
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
            // Set background image with fallback
            slide.style.backgroundImage = `url('${imageUrl}')`;
            
            // Add error handling for image loading
            const img = new Image();
            img.onload = function() {
                // Image loaded successfully
                slide.style.backgroundImage = `url('${imageUrl}')`;
            };
            img.onerror = function() {
                // If image fails to load, use gradient fallback
                slide.style.backgroundImage = `linear-gradient(135deg, #E50914 0%, #221f1f 100%)`;
            };
            img.src = imageUrl;
        } else {
            slide.style.backgroundImage = `linear-gradient(135deg, #E50914 0%, #221f1f 100%)`;
        }
        
        carouselTrack.appendChild(slide);
    });
    
    // Clear existing interval
    if (carouselInterval) {
        clearInterval(carouselInterval);
    }
    
    carouselIndex = 0;
    
    // Store slide data globally
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
        
        // Move the carousel track by translating it
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
    // Filter buttons
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
    
    // Separate into movies and series
    const movies = filteredData.filter(item => item.Type === 'movie');
    const series = filteredData.filter(item => item.Type === 'series');
    
    const container = document.getElementById('contentContainer');
    let html = '';
    
    if (searchQuery) {
        // Show search results
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
    
    // Use Poster field - convert http to https if needed
    let posterUrl = item.Poster;
    
    // Convert HTTP to HTTPS for security
    if (posterUrl && posterUrl.startsWith('http://')) {
        posterUrl = posterUrl.replace('http://', 'https://');
    }
    
    // Fallback to first image if poster doesn't exist
    if (!posterUrl && item.Images && item.Images.length > 0) {
        posterUrl = item.Images[0];
    }
    
    // Generate fallback if no image URL
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
        <div class="card">
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
