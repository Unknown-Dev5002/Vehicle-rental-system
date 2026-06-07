(function () {
    function formatCounterValue(target) {
        if (target === 98) return '98%';
        if (target >= 10000) return '10K+';
        return `${target}+`;
    }

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    function observeReveals(root = document) {
        root.querySelectorAll('.reveal:not([data-reveal-observed])').forEach((el) => {
            el.dataset.revealObserved = 'true';
            revealObserver.observe(el);
        });
    }

    function initScrollReveal() {
        observeReveals();
    }

    function initMagneticButtons() {
        document.querySelectorAll('.magnetic-button').forEach((btn) => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translate(0px, 0px)';
            });
        });
    }

    function initCounters() {
        const statsSection = document.getElementById('live-stats');
        if (!statsSection) return;

        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                entry.target.querySelectorAll('.counter').forEach((counter) => {
                    if (counter.dataset.animated === 'true') return;
                    counter.dataset.animated = 'true';

                    const target = Number(counter.getAttribute('data-target')) || 0;
                    const speed = 200;
                    const increment = Math.max(target / speed, 1);

                    const updateCount = () => {
                        const count = Number(counter.textContent) || 0;
                        if (count < target) {
                            counter.textContent = String(Math.ceil(count + increment));
                            window.setTimeout(updateCount, 1);
                        } else {
                            counter.textContent = formatCounterValue(target);
                        }
                    };
                    updateCount();
                });
            });
        }, { threshold: 0.5 });

        statsObserver.observe(statsSection);
    }

    function initFaqAccordion() {
        document.querySelectorAll('.faq-trigger').forEach((trigger) => {
            trigger.addEventListener('click', () => {
                const content = trigger.nextElementSibling;
                const icon = trigger.querySelector('.material-symbols-outlined');
                if (!content || !icon) return;

                const isClosed = !content.style.maxHeight || content.style.maxHeight === '0px';

                document.querySelectorAll('.faq-trigger').forEach((otherTrigger) => {
                    if (otherTrigger === trigger) return;
                    const otherContent = otherTrigger.nextElementSibling;
                    const otherIcon = otherTrigger.querySelector('.material-symbols-outlined');
                    if (otherContent) otherContent.style.maxHeight = '0px';
                    if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
                });

                if (isClosed) {
                    content.style.maxHeight = `${content.scrollHeight}px`;
                    icon.style.transform = 'rotate(180deg)';
                } else {
                    content.style.maxHeight = '0px';
                    icon.style.transform = 'rotate(0deg)';
                }
            });
        });
    }

    function initTestimonialCarousel() {
        const carousel = document.querySelector('.testimonial-carousel');
        if (!carousel) return;

        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;

        carousel.addEventListener('mousedown', (e) => {
            isDown = true;
            carousel.classList.add('is-dragging');
            startX = e.pageX - carousel.offsetLeft;
            scrollLeft = carousel.scrollLeft;
        });

        carousel.addEventListener('mouseleave', () => {
            isDown = false;
            carousel.classList.remove('is-dragging');
        });

        carousel.addEventListener('mouseup', () => {
            isDown = false;
            carousel.classList.remove('is-dragging');
        });

        carousel.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - carousel.offsetLeft;
            const walk = (x - startX) * 2;
            carousel.scrollLeft = scrollLeft - walk;
        });
    }

    function initFeaturedVehicles() {
        const grid = document.getElementById('featured-vehicle-grid');
        if (!grid) return;

        const fallbackVehicles = [
            {
                id: '1',
                name: 'Mountain Cruiser SUV',
                brand: 'Toyota',
                type: 'SUV',
                fuel: 'Diesel',
                location: 'Manali',
                price: 2499,
                available: true,
                image: 'assets/images/vehicle-1.jpg'
            },
            {
                id: '2',
                name: 'City Sport Sedan',
                brand: 'Honda',
                type: 'Sedan',
                fuel: 'Petrol',
                location: 'Delhi',
                price: 1899,
                available: true,
                image: 'assets/images/vehicle-2.jpg'
            },
            {
                id: '3',
                name: 'Adventure Tourer',
                brand: 'Royal Enfield',
                type: 'Bike',
                fuel: 'Petrol',
                location: 'Shimla',
                price: 899,
                available: false,
                image: 'assets/images/vehicle-3.jpg'
            }
        ];

        function renderCard(vehicle, delayMs) {
            const statusClass = vehicle.available ? 'bg-green-500' : 'bg-red-500';
            const statusText = vehicle.available ? 'Available' : 'Unavailable';
            const delayStyle = delayMs ? ` style="transition-delay: ${delayMs}ms;"` : '';

            return `
<div class="glass-card rounded-2xl overflow-hidden group reveal active bg-surface/5 backdrop-blur-xl border border-white/10 transition-all duration-300 hover:-translate-y-2"${delayStyle}>
    <div class="h-[180px] overflow-hidden relative bg-surface-container-low flex items-center justify-center">
        <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="${vehicle.image}" alt="${vehicle.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="hidden flex-col items-center gap-2 text-on-surface-variant">
            <span class="material-symbols-outlined text-[40px]">directions_car</span>
            <span class="text-label-sm font-medium">Image Unavailable</span>
        </div>
    </div>
    <div class="p-6">
        <div class="mb-4">
            <h3 class="font-bold text-[20px] text-primary leading-tight mb-1">${vehicle.name}</h3>
            <p class="text-on-surface-variant text-label-sm font-medium mb-3">${vehicle.brand} • ${vehicle.type}</p>
            <div class="flex items-center justify-between border-t border-white/5 pt-3">
                <div class="flex flex-col">
                    <span class="text-primary font-bold text-lg">₹${vehicle.price.toLocaleString('en-IN')}</span>
                    <span class="text-on-surface-variant text-[10px] uppercase tracking-wider">Per Day</span>
                </div>
                <div class="text-right space-y-1">
                    <div class="flex items-center gap-1 text-on-surface-variant text-label-sm">
                        <span class="material-symbols-outlined text-[14px]">local_gas_station</span> ${vehicle.fuel} • ${vehicle.location}
                    </div>
                    <div class="flex items-center justify-end gap-1 text-label-sm font-semibold">
                        <span class="w-2 h-2 rounded-full ${statusClass}"></span> ${statusText}
                    </div>
                </div>
            </div>
        </div>
        <a class="w-full py-2.5 rounded-xl bg-surface-container-high font-semibold text-primary group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors flex justify-center items-center gap-2 text-body-md" href="vehicle-details.html?id=${vehicle.id}">
            View Details <span class="material-symbols-outlined text-[18px]">visibility</span>
        </a>
    </div>
</div>`;
        }

        async function loadVehicles() {
            try {
                const response = await fetch('http://localhost:5000/api/vehicles');
                if (!response.ok) throw new Error('Failed to fetch vehicles');
                const rows = await response.json();
                if (!Array.isArray(rows) || !rows.length) throw new Error('No vehicles');

                const vehicles = rows.slice(0, 3).map((row, index) => ({
                    id: row.id || String(index + 1),
                    name: row.name || 'Rental Vehicle',
                    brand: row.brand || 'DriveHive',
                    type: row.type || 'Car',
                    fuel: row.fuelType || 'Petrol',
                    location: row.location || 'India',
                    price: Number(row.pricePerDay || 0),
                    available: row.available !== false,
                    image: row.imageUrl
                        ? (/^https?:\/\//i.test(row.imageUrl) ? row.imageUrl : `http://localhost:5000/${String(row.imageUrl).replace(/^\//, '')}`)
                        : fallbackVehicles[index % fallbackVehicles.length].image
                }));

                grid.innerHTML = vehicles.map((vehicle, index) => renderCard(vehicle, index * 100)).join('');
                observeReveals(grid);
            } catch (_err) {
                grid.innerHTML = fallbackVehicles.map((vehicle, index) => renderCard(vehicle, index * 100)).join('');
            }
        }

        loadVehicles();
    }

    function init() {
        initScrollReveal();
        initMagneticButtons();
        initCounters();
        initFaqAccordion();
        initTestimonialCarousel();
        initFeaturedVehicles();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
