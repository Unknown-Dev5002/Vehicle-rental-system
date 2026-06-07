(function () {
    const FILTER_SELECTS = ['filterType', 'filterFuel', 'filterTransmission'];

    function debounce(fn, delay) {
        let timer;
        return (...args) => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => fn(...args), delay);
        };
    }

    function updatePriceLabel(value) {
        const priceDisplay = document.getElementById('priceRangeLabel');
        if (!priceDisplay) return;
        const amount = Number(value) || 0;
        priceDisplay.textContent = `${amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}/day`;
    }

    function configurePriceSlider(vehicles) {
        const slider = document.getElementById('filterPrice');
        if (!slider || !vehicles.length) return;

        const prices = vehicles.map((vehicle) => Number(vehicle.price || 0)).filter((price) => price > 0);
        if (!prices.length) return;

        const minPrice = Math.max(500, Math.floor(Math.min(...prices) / 500) * 500);
        const maxPrice = Math.ceil(Math.max(...prices) / 500) * 500;

        slider.min = String(minPrice);
        slider.max = String(maxPrice);
        slider.step = '500';
        slider.value = String(maxPrice);
        slider.dataset.initialized = 'true';
        updatePriceLabel(maxPrice);
    }

    function populateSelect(selectId, values, allLabel) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const currentValue = select.value || 'all';
        const sortedValues = [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

        select.replaceChildren();
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = allLabel;
        select.appendChild(allOption);

        sortedValues.forEach((value) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });

        if (currentValue !== 'all' && sortedValues.includes(currentValue)) {
            select.value = currentValue;
        }
    }

    function populateListingsFilters(vehicles) {
        if (!Array.isArray(vehicles) || document.body.dataset.filtersPopulated === 'true') return;
        document.body.dataset.filtersPopulated = 'true';

        populateSelect('filterType', vehicles.map((vehicle) => vehicle.type), 'All Types');
        populateSelect('filterFuel', vehicles.map((vehicle) => vehicle.fuel), 'Any');
        populateSelect('filterTransmission', vehicles.map((vehicle) => vehicle.transmission), 'Any');
        configurePriceSlider(vehicles);
    }

    function initMagneticButtons() {
        document.querySelectorAll('[data-magnetic]').forEach((btn) => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                btn.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px) scale(1.02)`;
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translate(0, 0) scale(1)';
            });
        });
    }

    function initFilterListeners() {
        const rerender = () => {
            if (typeof window.renderListings === 'function') {
                window.renderListings();
            }
        };
        const debouncedRerender = debounce(rerender, 250);

        FILTER_SELECTS.forEach((id) => {
            const element = document.getElementById(id);
            if (element) element.addEventListener('change', rerender);
        });

        const brandInput = document.getElementById('filterBrand');
        if (brandInput) brandInput.addEventListener('input', debouncedRerender);

        const priceSlider = document.getElementById('filterPrice');
        if (priceSlider) {
            priceSlider.addEventListener('input', (event) => {
                updatePriceLabel(event.target.value);
                debouncedRerender();
            });
        }
    }

    function init() {
        if (document.body.dataset.listingsLayout !== 'redesign') return;
        initMagneticButtons();
        initFilterListeners();
    }

    window.populateListingsFilters = populateListingsFilters;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
