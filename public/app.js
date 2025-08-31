// Where2Go Landing Page JavaScript
// Fresh implementation with exact functionality mapping

class Where2GoApp {
    constructor() {
        this.MAX_CATEGORY_SELECTION = 3;
        this.initializeEventListeners();
        this.initializeCategoryLimits();
    }

    initializeEventListeners() {
        // Time period change handler
        const timePeriodSelect = document.getElementById('timePeriod');
        const customDateGroup = document.getElementById('customDateGroup');
        
        timePeriodSelect.addEventListener('change', () => {
            if (timePeriodSelect.value === 'benutzerdefiniert') {
                customDateGroup.style.display = 'block';
            } else {
                customDateGroup.style.display = 'none';
            }
        });

        // Category selection handlers
        const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
        categoryCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.handleCategorySelection();
            });
        });

        // Category action buttons
        document.getElementById('selectMaxBtn').addEventListener('click', () => {
            this.selectMaxCategories();
        });

        document.getElementById('unselectAllBtn').addEventListener('click', () => {
            this.unselectAllCategories();
        });

        // Form submission
        document.getElementById('searchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSearch();
        });
    }

    initializeCategoryLimits() {
        // Set initial state to match the original (first 3 categories checked)
        const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
        categoryCheckboxes.forEach((checkbox, index) => {
            if (index < 3) {
                checkbox.checked = true;
            } else {
                checkbox.checked = false;
            }
        });
        this.handleCategorySelection();
    }

    handleCategorySelection() {
        const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
        const checkedBoxes = document.querySelectorAll('input[name="category"]:checked');
        const errorElement = document.getElementById('categoryError');
        
        // Hide error message
        errorElement.style.display = 'none';
        
        // Enable/disable checkboxes based on selection limit
        categoryCheckboxes.forEach(checkbox => {
            const label = checkbox.closest('.category-checkbox');
            
            if (!checkbox.checked && checkedBoxes.length >= this.MAX_CATEGORY_SELECTION) {
                checkbox.disabled = true;
                label.classList.add('disabled');
            } else {
                checkbox.disabled = false;
                label.classList.remove('disabled');
            }
        });

        // Show error if trying to select too many
        if (checkedBoxes.length > this.MAX_CATEGORY_SELECTION) {
            errorElement.style.display = 'block';
            errorElement.textContent = `Du kannst maximal ${this.MAX_CATEGORY_SELECTION} Kategorien auswählen.`;
        }
    }

    selectMaxCategories() {
        const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
        
        // Uncheck all first
        categoryCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Check first 3
        for (let i = 0; i < Math.min(this.MAX_CATEGORY_SELECTION, categoryCheckboxes.length); i++) {
            categoryCheckboxes[i].checked = true;
        }
        
        this.handleCategorySelection();
    }

    unselectAllCategories() {
        const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
        categoryCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        this.handleCategorySelection();
    }

    getSelectedCategories() {
        const checkedBoxes = document.querySelectorAll('input[name="category"]:checked');
        return Array.from(checkedBoxes).map(checkbox => checkbox.value);
    }

    formatDateForAPI() {
        const timePeriod = document.getElementById('timePeriod').value;
        const customDate = document.getElementById('customDate').value;
        
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        if (timePeriod === 'heute') {
            return today.toISOString().split('T')[0];
        } else if (timePeriod === 'morgen') {
            return tomorrow.toISOString().split('T')[0];
        } else {
            return customDate || today.toISOString().split('T')[0];
        }
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Hide other states
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('eventsGrid').style.display = 'none';
    }

    showLoading() {
        document.getElementById('loadingState').style.display = 'block';
        
        // Hide other states
        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('eventsGrid').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loadingState').style.display = 'none';
    }

    showEmptyState() {
        document.getElementById('emptyState').style.display = 'block';
        
        // Hide other states
        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('eventsGrid').style.display = 'none';
    }

    showEvents(events) {
        const eventsGrid = document.getElementById('eventsGrid');
        eventsGrid.innerHTML = '';
        
        if (events.length === 0) {
            this.showEmptyState();
            return;
        }
        
        events.forEach(event => {
            const eventCard = this.createEventCard(event);
            eventsGrid.appendChild(eventCard);
        });
        
        eventsGrid.style.display = 'grid';
        
        // Hide other states
        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';
    }

    createEventCard(event) {
        const card = document.createElement('div');
        card.className = 'event-card';
        
        let linksHtml = '';
        if (event.website) {
            linksHtml += `<a href="${event.website}" target="_blank" rel="noopener noreferrer" class="event-link">Website →</a>`;
        }
        if (event.bookingLink) {
            linksHtml += `<a href="${event.bookingLink}" target="_blank" rel="noopener noreferrer" class="event-link event-booking-link">Tickets →</a>`;
        }
        
        let addressHtml = '';
        if (event.address) {
            addressHtml = `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}" target="_blank" rel="noopener noreferrer" class="event-address-link" title="Adresse in Google Maps öffnen"><br />📍 ${event.address}</a>`;
        } else {
            const city = document.getElementById('city').value;
            addressHtml = `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue}, ${city}`)}" target="_blank" rel="noopener noreferrer" class="event-address-link" title="Venue in Google Maps öffnen"><br />🗺️ In Maps öffnen</a>`;
        }
        
        card.innerHTML = `
            <div class="event-content">
                <h3 class="event-title">${event.title}</h3>
                
                <div class="event-date">
                    ${event.date}${event.time ? ` • ${event.time}` : ''}${event.endTime ? ` - ${event.endTime}` : ''}
                </div>
                
                <div class="event-location">
                    📍 ${event.venue}${addressHtml}
                </div>
                
                ${event.category ? `<div class="event-category">🏷️ ${event.category}</div>` : ''}
                ${event.eventType ? `<div class="event-type">🎭 ${event.eventType}</div>` : ''}
                ${(event.price || event.ticketPrice) ? `<div class="event-price">💰 ${event.ticketPrice || event.price}</div>` : ''}
                ${event.ageRestrictions ? `<div class="event-age">🔞 ${event.ageRestrictions}</div>` : ''}
                ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
                
                ${linksHtml ? `<div class="event-links">${linksHtml}</div>` : ''}
            </div>
        `;
        
        return card;
    }

    async handleSearch() {
        const city = document.getElementById('city').value.trim();
        
        if (!city) {
            this.showError('Bitte gib eine Stadt ein.');
            return;
        }
        
        const selectedCategories = this.getSelectedCategories();
        if (selectedCategories.length === 0) {
            this.showError('Bitte wähle mindestens eine Kategorie aus.');
            return;
        }
        
        this.showLoading();
        
        const searchData = {
            city: city,
            date: this.formatDateForAPI(),
            categories: selectedCategories,
            options: {
                temperature: 0.2,
                max_tokens: 10000,
                disableCache: false,
                categoryConcurrency: 5,
                categoryTimeoutMs: 90000,
                overallTimeoutMs: 240000,
                maxAttempts: 5
            }
        };
        
        try {
            // For this demo, we'll simulate the API call
            // In the real implementation, this would call the actual API
            await this.simulateAPICall(searchData);
        } catch (error) {
            this.hideLoading();
            this.showError(error.message || 'Fehler beim Starten der Eventsuche.');
        }
    }

    async simulateAPICall(searchData) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate some sample events for demonstration
        const sampleEvents = [
            {
                title: "Electronic Night @ Club Vienna",
                category: "DJ Sets/Electronic",
                date: searchData.date,
                time: "22:00",
                venue: "Club Vienna",
                price: "15€",
                website: "https://example.com",
                address: "Ringstraße 1, " + searchData.city,
                eventType: "Club Event",
                description: "Eine unvergessliche Nacht mit den besten Electronic-DJs der Stadt."
            },
            {
                title: "Live Jazz Concert",
                category: "Live-Konzerte",
                date: searchData.date,
                time: "20:00",
                venue: "Jazz Café",
                price: "25€",
                website: "https://example.com",
                address: "Hauptstraße 42, " + searchData.city,
                eventType: "Konzert",
                description: "Authentischer Jazz in gemütlicher Atmosphäre."
            }
        ];
        
        this.hideLoading();
        this.showEvents(sampleEvents);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Where2GoApp();
});