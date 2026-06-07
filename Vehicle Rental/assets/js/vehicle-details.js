
(function() {
  // Magnetic Button Effect
  function initMagneticButtons() {
    document.querySelectorAll('.magnetic-button').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.15}px, ${y * 0.3}px) scale(1.02)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }

  // Smooth reveal animations for glass cards
  function initRevealAnimations() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0');
          entry.target.classList.remove('opacity-0', 'translate-y-10');
        }
      });
    }, observerOptions);

    document.querySelectorAll('.glass-card').forEach(card => {
      card.classList.add('transition-all', 'duration-700', 'opacity-0', 'translate-y-10');
      observer.observe(card);
    });
  }

  // Fetch and populate vehicle details
  async function loadVehicleDetails() {
    const params = new URLSearchParams(window.location.search);
    const vehicleId = params.get('id');
    if (!vehicleId) {
      console.error('No vehicle ID provided');
      return;
    }

    try {
      const vehicles = await getVehicles();
      const vehicle = vehicles.find(v => String(v.id) === String(vehicleId));
      if (!vehicle) {
        console.error('Vehicle not found');
        return;
      }

      // Populate the page with vehicle data
      const formatINR = (amount) => {
        return '₹' + new Intl.NumberFormat('en-IN').format(amount);
      };

      // Update breadcrumb
      const breadcrumbVehicleName = document.getElementById('breadcrumb-vehicle-name');
      if (breadcrumbVehicleName) {
        breadcrumbVehicleName.textContent = vehicle.name;
      }

      // Update main image
      const mainImage = document.getElementById('vehicle-main-image');
      if (mainImage) {
        mainImage.src = vehicle.image;
        mainImage.alt = vehicle.name;
      }

      // Update booking card
      const titleEl = document.getElementById('vehicle-title');
      if (titleEl) {
        titleEl.textContent = vehicle.name;
      }

      const subtitleEl = document.getElementById('vehicle-subtitle');
      if (subtitleEl) {
        subtitleEl.textContent = `${vehicle.brand} • ${vehicle.type} • ${vehicle.year}`;
      }

      // Update specs in booking card
      document.getElementById('spec-brand').textContent = vehicle.brand;
      document.getElementById('spec-type').textContent = vehicle.type;
      document.getElementById('spec-fuel').textContent = vehicle.fuel;
      document.getElementById('spec-transmission').textContent = vehicle.transmission;

      // Update price
      const priceEl = document.getElementById('vehicle-price');
      if (priceEl) {
        priceEl.textContent = formatINR(vehicle.price);
      }

      // Update specifications section
      document.getElementById('spec-card-type').textContent = vehicle.type;
      document.getElementById('spec-card-fuel').textContent = vehicle.fuel;
      document.getElementById('spec-card-transmission').textContent = vehicle.transmission;
      document.getElementById('spec-card-year').textContent = vehicle.year;

      // Update description
      const descriptionEl = document.getElementById('vehicle-description');
      if (descriptionEl) {
        descriptionEl.textContent = vehicle.description;
      }

      // Update book now button to link to booking page
      const bookNowBtn = document.getElementById('book-now-btn');
      if (bookNowBtn) {
        bookNowBtn.addEventListener('click', () => {
          window.location.href = `booking.html?vehicleId=${encodeURIComponent(vehicle.id)}`;
        });
      }
    } catch (err) {
      console.error('Failed to load vehicle details:', err);
    }
  }

  // Initialize everything
  function init() {
    initMagneticButtons();
    initRevealAnimations();
    loadVehicleDetails();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

