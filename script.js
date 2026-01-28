let allData = [];
let currentFilter = 'all';
let searchQuery = '';
let heroData = null;
let carouselInterval = null;
let carouselIndex = 0;

// I asked Claude to rewrite the data loading part, Initially not working as intended.
function init() {
    try {
        // Load data from JSON file using XMLHttpRequest
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'Film.JSON', false);
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    // Parse JSON
                    const jsonData = JSON.parse(xhr.responseText);
                    
                    // Convert JSON to XML then parse
                    const xmlString = jsonToXml(jsonData);
                    const xmlDoc = new DOMParser().parseFromString(xmlString, 'text/xml');
                    
                    // Check for XML parsing errors
                    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                        throw new Error('XML parsing error');
                    }
                    
                    // Convert XML to array
                    allData = parseXmlToArray(xmlDoc);
                    
                    // Load from localStorage if exists (for admin additions)
                    const savedData = localStorage.getItem("dataList");
                    if (savedData) {
                        try {
                            const localData = JSON.parse(savedData);
                            if (Array.isArray(localData)) {
                                allData = localData;
                            }
                        } catch (e) {
                            console.error('Error parsing localStorage data:', e);
                        }
                    }
                    
                    if (!Array.isArray(allData)) {
                        throw new Error('Invalid data format');
                    }

                    setupHero();
                    render();
                    setupEventListeners();
                    setupAdminForm();
                } catch (error) {
                    console.error('Error processing data:', error);
                    displayError('Failed to process data. Please refresh the page.');
                }
            } else {
                displayError(`Failed to load data: ${xhr.status}`);
            }
        };
        xhr.onerror = function() {
            console.error('XHR Error loading Film.JSON');
            displayError('Failed to load data. Please refresh the page.');
        };
        xhr.send();
    } catch (error) {
        console.error('Error initializing app:', error);
        displayError('Failed to load data. Please refresh the page.');
    }
}

function jsonToXml(jsonData) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<films>\n';
    
    for (let i = 0; i < jsonData.length; i++) {
        const film = jsonData[i];
        xml += '  <film>\n';
        
        for (const key in film) {
            const value = film[key];
            
            if (key === 'Images' && Array.isArray(value)) {
                xml += '    <Images>\n';
                for (let j = 0; j < value.length; j++) {
                    xml += `      <Image>${escapeXmlText(value[j])}</Image>\n`;
                }
                xml += '    </Images>\n';
            } else if (typeof value === 'boolean') {
                xml += `    <${key}>${value}</${key}>\n`;
            } else if (value !== null && value !== undefined) {
                xml += `    <${key}>${escapeXmlText(String(value))}</${key}>\n`;
            }
        }
        
        xml += '  </film>\n';
    }
    
    xml += '</films>';
    return xml;
}

function escapeXmlText(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function parseXmlToArray(xmlDoc) {
    const films = [];
    const filmNodes = xmlDoc.getElementsByTagName('film');
    
    for (let i = 0; i < filmNodes.length; i++) {
        const filmElement = filmNodes[i];
        const film = {};
        
        // Parse all child elements
        for (let j = 0; j < filmElement.children.length; j++) {
            const child = filmElement.children[j];
            
            if (child.tagName === 'Images') {
                const images = [];
                const imageNodes = child.getElementsByTagName('Image');
                for (let k = 0; k < imageNodes.length; k++) {
                    images.push(imageNodes[k].textContent);
                }
                film.Images = images;
            } else {
                const text = child.textContent.trim();
                if (text === 'true') {
                    film[child.tagName] = true;
                } else if (text === 'false') {
                    film[child.tagName] = false;
                } else {
                    film[child.tagName] = text;
                }
            }
        }
        
        films.push(film);
    }
    
    return films;
}

function setupHero() {
    const featuredItems = allData.filter(item => !item.ComingSoon);
    if (featuredItems.length > 0) {
        initializeCarousel(featuredItems);
        heroData = featuredItems[0];
        updateHero();
    }
}

function initializeCarousel(items) {
    const carouselTrack = document.getElementById('carouselTrack');
    carouselTrack.innerHTML = '';
    
    const slides = [];
    const slideData = [];
    
    // Collect images from items
    items.forEach((item) => {
        let imageUrl = getItemImage(item);
        if (imageUrl) {
            slides.push(imageUrl);
            slideData.push({ title: item.Title, item: item });
        }
    });
    
    // Create slide elements
    slides.forEach((imageUrl) => {
        const slide = document.createElement('div');
        slide.className = 'carousel-slide';
        loadImageWithFallback(slide, imageUrl);
        carouselTrack.appendChild(slide);
    });
    
    // Clear existing interval
    if (carouselInterval) {
        clearInterval(carouselInterval);
    }
    
    carouselIndex = 0;
    window.slideData = slideData;
    
    // Update hero for first slide
    if (slideData[0]) {
        heroData = slideData[0].item;
        updateHero();
    }
    
    // Auto-rotate carousel every 3 seconds
    carouselInterval = setInterval(() => {
        carouselIndex = (carouselIndex + 1) % slides.length;
        carouselTrack.style.transform = `translateX(-${carouselIndex * 100}%)`;
        if (slideData[carouselIndex]) {
            heroData = slideData[carouselIndex].item;
            updateHero();
        }
    }, 3000);
}

function updateHero() {
    if (!heroData) return;
    
    document.querySelector('.hero-content').innerHTML = `
        <h1 class="hero-title">${escapeHtml(heroData.Title)}</h1>
        <p class="hero-description">${escapeHtml(heroData.Plot)}</p>
        <div class="hero-buttons">
            <button class="hero-btn play">▶ Play</button>
            <button class="hero-btn info">ℹ More Info</button>
        </div>
    `;
}

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
    
    // Image error handling
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

    // Modal close handlers
    setupModalHandlers();
}

function setupModalHandlers() {
    const closeBtn = document.querySelector('.close-player-btn');
    const playerModal = document.getElementById('playerModal');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closePlayerModal);
    }

    if (playerModal) {
        playerModal.addEventListener('click', (e) => {
            if (e.target === playerModal) {
                closePlayerModal();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closePlayerModal();
        }
    });
}

function setupAdminForm() {
    const form = document.getElementById('adminForm');
    if (!form) return; // Form not present in this page
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const title = document.getElementById('titleInput').value.trim();
        const year = document.getElementById('yearInput').value.trim();
        const type = document.getElementById('typeInput').value.trim();
        const runtime = document.getElementById('runtimeInput').value.trim();
        const imdbID = document.getElementById('imdbIDInput').value.trim();
        const imdbRating = document.getElementById('imdbRatingInput').value.trim();
        const poster = document.getElementById('posterInput').value.trim();
        const plot = document.getElementById('plotInput').value.trim();
        
        // Validate required fields
        if (!title || !year || !type || !runtime || !imdbID || !imdbRating) {
            alert('Please fill in all required fields (marked with *)');
            return;
        }
        
        // Create new item object
        const newItem = {
            "Title": title,
            "Year": year,
            "Type": type,
            "Runtime": runtime,
            "imdbID": imdbID,
            "imdbRating": imdbRating,
            "Poster": poster || "https://via.placeholder.com/300x450?text=No+Image",
            "Plot": plot || "No description available",
            "Genre": "User Added",
            "Director": "N/A",
            "Actors": "N/A",
            "Language": "N/A",
            "Country": "N/A",
            "Response": "True"
        };
        
        // Add to data array
        allData.push(newItem);
        
        // Save to localStorage
        localStorage.setItem("dataList", JSON.stringify(allData));
        
        // Reset form and refresh display
        form.reset();
        render();
        setupHero();
        
        alert('Content added successfully!');
    });
}


function getNextId() {
    const maxId = allData.reduce((max, item) => {
        const id = parseInt(item.id) || 0;
        return id > max ? id : max;
    }, 0);
    return maxId + 1;
}

function generateImdbId() {
    // Generate a simple unique ID
    return 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getFilteredData() {
    return allData.filter(item => {
        // Filter by type
        if (currentFilter !== 'all' && item.Type !== currentFilter) {
            return false;
        }
        
        // Filter by search query
        if (searchQuery) {
            const searchableFields = [
                item.Title || '',
                item.Genre || '',
                item.Director || '',
                item.Actors || '',
                item.Publisher || ''
            ].join(' ').toLowerCase();

            if (!searchableFields.includes(searchQuery)) {
                return false;
            }
        }

        return true;
    });
}

function render() {
    const filteredData = getFilteredData();
    const movies = filteredData.filter(item => item.Type === 'movie');
    const series = filteredData.filter(item => item.Type === 'series');
    
    const container = document.getElementById('contentContainer');
    let html = '';
    
    if (searchQuery) {
        // Search results view
        if (filteredData.length === 0) {
            html = createNoResultsHTML(`No results found for "${escapeHtml(searchQuery)}"`);
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
        // Normal categorized view
        if (currentFilter === 'all' || currentFilter === 'movie') {
            if (movies.length > 0) {
                html += createSection('Movies', movies);
            }
        }
        
        if (currentFilter === 'all' || currentFilter === 'series') {
            if (series.length > 0) {
                html += createSection('TV Series', series);
            }
        }
        
        if (movies.length === 0 && series.length === 0) {
            html = createNoResultsHTML('No content available');
        }
    }
    
    container.innerHTML = html;
}

function createSection(title, items) {
    return `
        <div class="content-section">
            <h2 class="section-title">${title}</h2>
            <div class="content-row">
                ${items.map(item => createCard(item)).join('')}
            </div>
        </div>
    `;
}

function createCard(item) {
    const isSeries = item.Type === 'series';
    const isComingSoon = item.ComingSoon === true;
    
    // Get poster URL
    let posterUrl = item.Poster;
    if (posterUrl && posterUrl.startsWith('http://')) {
        posterUrl = posterUrl.replace('http://', 'https://');
    }
    if (!posterUrl && item.Images && item.Images.length > 0) {
        posterUrl = item.Images[0];
    }
    
    const fallbackUrl = generateFallbackImage(item.Title);
    if (!posterUrl) {
        posterUrl = fallbackUrl;
    }
    
    // Build card elements
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

function openPlayerModal(item) {
    const playerModal = document.getElementById('playerModal');
    const playerIframe = document.getElementById('playerIframe');
    const playerTitle = document.getElementById('playerTitle');
    const playerPlot = document.getElementById('playerPlot');

    if (!item.imdbID) {
        alert('This content does not have an IMDb ID available for streaming.');
        return;
    }

    // Build embed URL
    const embedUrl = `https://www.vidking.net/embed/movie/${item.imdbID}?color=ff0000`;

    // Update modal content
    playerTitle.textContent = item.Title;
    playerPlot.textContent = item.Plot || 'No description available';
    playerIframe.src = embedUrl;

    // Show modal
    playerModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closePlayerModal() {
    const playerModal = document.getElementById('playerModal');
    const playerIframe = document.getElementById('playerIframe');
    
    playerModal.style.display = 'none';
    playerIframe.src = '';
    document.body.style.overflow = 'auto';
}

function getItemImage(item) {
    if (item.Images && item.Images.length > 0) {
        return item.Images[0];
    } else if (item.Poster) {
        let imageUrl = item.Poster;
        if (imageUrl.startsWith('http://')) {
            imageUrl = imageUrl.replace('http://', 'https://');
        }
        return imageUrl;
    }
    return null;
}

function loadImageWithFallback(element, imageUrl) {
    if (imageUrl) {
        element.style.backgroundImage = `url('${imageUrl}')`;
        const img = new Image();
        img.onload = () => {
            element.style.backgroundImage = `url('${imageUrl}')`;
        };
        img.onerror = () => {
            element.style.backgroundImage = `linear-gradient(135deg, #E50914 0%, #221f1f 100%)`;
        };
        img.src = imageUrl;
    } else {
        element.style.backgroundImage = `linear-gradient(135deg, #E50914 0%, #221f1f 100%)`;
    }
}

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

function createNoResultsHTML(message) {
    return `
        <div style="padding: 40px 50px;">
            <div class="no-results">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <p>${escapeHtml(message)}</p>
            </div>
        </div>
    `;
}

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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}