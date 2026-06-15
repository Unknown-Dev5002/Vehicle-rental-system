/* Blog page — text-first layout with minimal images */
(function () {
  const REGION_LABELS = {
    north: "North India",
    south: "South India",
    east: "East India",
    west: "West India",
    central: "Central India"
  };

  let activeCategory = "all";

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function stripInlineImages(html) {
    return String(html || "").replace(/<img[^>]*>/gi, "");
  }

  function renderFeaturedArticle(articles) {
    const featured = document.getElementById("featuredArticle");
    if (!featured || !articles.length) return;

    const article = articles[0];

    featured.innerHTML = `
      <article class="featured-card featured-card--text" onclick="showArticle(${article.id})" role="button" tabindex="0" onkeydown="if(event.key==='Enter')showArticle(${article.id})">
        <div class="featured-card-body">
          <span class="featured-label">Featured Guide</span>
          <h3>${escapeHtml(article.title)}</h3>
          <p>${escapeHtml(article.excerpt)}</p>
          <div class="featured-meta">
            <span>${escapeHtml(article.category)}</span>
            <span>${escapeHtml(article.readTime)}</span>
          </div>
          <span class="blog-card-link">Read full article</span>
        </div>
      </article>
    `;
  }

  function renderBlogCards(articles) {
    const container = document.getElementById("blogList");
    if (!container) return;

    const list = articles.length > 1 ? articles.slice(1) : [];

    if (!list.length) {
      container.innerHTML = articles.length === 1
        ? `<p class="section-sub section-sub--center">More articles coming soon.</p>`
        : "";
      return;
    }

    container.innerHTML = list.map((article) => `
      <article class="blog-card blog-card--text" onclick="showArticle(${article.id})" role="button" tabindex="0" onkeydown="if(event.key==='Enter')showArticle(${article.id})">
        <div class="blog-card-body">
          <span class="blog-card-category">${escapeHtml(article.category)}</span>
          <h4>${escapeHtml(article.title)}</h4>
          <p class="blog-card-excerpt">${escapeHtml(article.excerpt)}</p>
          <div class="blog-card-footer">
            <span class="blog-card-read">${escapeHtml(article.readTime)}</span>
            <span class="blog-card-link">Read more</span>
          </div>
        </div>
      </article>
    `).join("");
  }

  function filterArticles(articles) {
    if (activeCategory === "all") return articles;
    return articles.filter((a) => a.category === activeCategory);
  }

  function renderBlogContent() {
    if (!window.blogArticles) return;
    const filtered = filterArticles(window.blogArticles);
    const featured = document.getElementById("featuredArticle");

    if (!filtered.length) {
      if (featured) featured.innerHTML = `<p class="section-sub section-sub--center">No articles in this category yet.</p>`;
      const container = document.getElementById("blogList");
      if (container) container.innerHTML = "";
      return;
    }

    renderFeaturedArticle(filtered);
    renderBlogCards(filtered);
  }

  function renderDestinationsModern() {
    const grid = document.getElementById("destinationsGrid");
    if (!grid || !window.indianDestinations) return;

    const regionFilter = document.getElementById("regionFilter")?.value || "all";
    const sortBy = document.getElementById("sortBy")?.value || "popularity";
    const userLocation = window.blogUserLocation || null;

    let list = window.indianDestinations.filter(
      (dest) => regionFilter === "all" || dest.region === regionFilter
    );

    if (userLocation && window.calculateDistance) {
      list = list.map((dest) => {
        const distance = window.calculateDistance(
          userLocation.lat, userLocation.lng,
          dest.coordinates.lat, dest.coordinates.lng
        );
        return { ...dest, distance, travelTime: window.calculateTravelTime(distance) };
      });

      if (sortBy === "distance" || sortBy === "time") {
        list.sort((a, b) => a.distance - b.distance);
      }
    } else if (sortBy === "popularity") {
      list.sort((a, b) => b.popularity - a.popularity);
    }

    grid.innerHTML = list.map((dest) => {
      const regionLabel = REGION_LABELS[dest.region] || dest.region;

      const travelBlock = userLocation
        ? `<div class="travel-info">
            <div class="travel-stat"><div class="value">${dest.distance.toFixed(0)} km</div><div class="label">Distance</div></div>
            <div class="travel-stat"><div class="value">${dest.travelTime}</div><div class="label">Travel Time</div></div>
          </div>`
        : `<div class="travel-info">
            <div class="travel-stat"><div class="value">Set location</div><div class="label">Distance</div></div>
            <div class="travel-stat"><div class="value">--</div><div class="label">Travel Time</div></div>
          </div>`;

      return `
        <article class="destination-card destination-card--text">
          <div class="destination-content">
            <div class="destination-card-top">
              <h3 class="destination-title">${escapeHtml(dest.name)}</h3>
              <span class="destination-popularity">${dest.popularity}%</span>
            </div>
            <p class="destination-region">${regionLabel} &middot; ${dest.attractions.length} attractions</p>
            <p class="destination-description">${escapeHtml(dest.description)}</p>
            ${travelBlock}
            <div class="destination-attractions">
              <strong>Top attractions</strong>
              <div class="attractions-list">
                ${dest.attractions.slice(0, 3).map((a) => `<span class="attraction-tag">${escapeHtml(a)}</span>`).join("")}
              </div>
            </div>
            <div class="destination-actions">
              <button type="button" class="btn" onclick="viewDestinationDetails(${dest.id})">View Details</button>
              <a href="listings.html" class="btn secondary">Plan Trip</a>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function openDestinationModal(destinationId) {
    const dest = window.indianDestinations?.find((d) => d.id === destinationId);
    if (!dest) return;

    const modal = document.getElementById("destinationModal");
    if (!modal) return;

    const userLocation = window.blogUserLocation;

    document.getElementById("modalDestName").textContent = dest.name;
    document.getElementById("modalDestRegion").textContent = REGION_LABELS[dest.region] || dest.region;
    document.getElementById("modalDestDescription").textContent = dest.description;

    let statsHtml = `
      <div class="travel-stat"><div class="value">${dest.popularity}%</div><div class="label">Popularity</div></div>
      <div class="travel-stat"><div class="value">${dest.attractions.length}</div><div class="label">Attractions</div></div>
    `;

    if (userLocation && window.calculateDistance) {
      const distance = window.calculateDistance(
        userLocation.lat, userLocation.lng,
        dest.coordinates.lat, dest.coordinates.lng
      );
      const travelTime = window.calculateTravelTime(distance);
      statsHtml = `
        <div class="travel-stat"><div class="value">${distance.toFixed(0)} km</div><div class="label">Distance</div></div>
        <div class="travel-stat"><div class="value">${travelTime}</div><div class="label">Travel Time</div></div>
        ${statsHtml}
      `;
    }

    document.getElementById("modalDestStats").innerHTML = statsHtml;
    document.getElementById("modalDestAttractions").innerHTML = `
      <strong>All attractions</strong>
      <div class="attractions-list">
        ${dest.attractions.map((a) => `<span class="attraction-tag">${escapeHtml(a)}</span>`).join("")}
      </div>
    `;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeDestinationModal() {
    const modal = document.getElementById("destinationModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function showArticleModern(articleId) {
    const article = window.blogArticles?.find((a) => a.id === articleId);
    if (!article) return;

    const mainView = document.getElementById("blogMainView");
    const articleDetail = document.getElementById("articleDetail");

    if (mainView) mainView.style.display = "none";
    if (articleDetail) {
      articleDetail.style.display = "block";

      document.getElementById("articleTitle").textContent = article.title;
      document.getElementById("articleCategory").textContent = article.category;
      document.getElementById("articleReadTime").textContent = article.readTime;
      document.getElementById("articleDate").textContent = new Date().toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });

      document.getElementById("articleContent").innerHTML = stripInlineImages(article.content);
      document.getElementById("articleTags").innerHTML = article.tags
        .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
        .join("");

      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function hideArticleModern() {
    const mainView = document.getElementById("blogMainView");
    const articleDetail = document.getElementById("articleDetail");

    if (mainView) mainView.style.display = "block";
    if (articleDetail) articleDetail.style.display = "none";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setupLocationDetection() {
    const detectBtn = document.getElementById("detectLocation");
    const setLocationBtn = document.getElementById("setLocation");
    const manualInput = document.getElementById("manualLocation");
    const currentLocationDiv = document.getElementById("currentLocation");
    const locationNameSpan = document.getElementById("locationName");

    function updateDisplay() {
      if (window.blogUserLocation && currentLocationDiv && locationNameSpan) {
        locationNameSpan.textContent = window.blogUserLocation.name;
        currentLocationDiv.style.display = "flex";
      }
    }

    if (detectBtn) {
      detectBtn.addEventListener("click", () => {
        if (!navigator.geolocation) {
          alert("Geolocation is not supported. Please enter your city manually.");
          return;
        }
        detectBtn.textContent = "Detecting...";
        detectBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
          (position) => {
            window.blogUserLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              name: "Your Location"
            };
            updateDisplay();
            renderDestinationsModern();
            detectBtn.textContent = "Detect My Location";
            detectBtn.disabled = false;
          },
          () => {
            alert("Unable to detect location. Please enter your city manually.");
            detectBtn.textContent = "Detect My Location";
            detectBtn.disabled = false;
          }
        );
      });
    }

    if (setLocationBtn && manualInput && window.indianCities) {
      setLocationBtn.addEventListener("click", () => {
        const cityName = manualInput.value.trim().toLowerCase();
        const city = window.indianCities[cityName];
        if (city) {
          window.blogUserLocation = { ...city, name: city.name };
          updateDisplay();
          renderDestinationsModern();
          manualInput.value = "";
        } else {
          alert("City not found. Try: Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad, Jaipur, or Lucknow");
        }
      });

      manualInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") setLocationBtn.click();
      });
    }
  }

  function setupFilters() {
    const regionFilter = document.getElementById("regionFilter");
    const sortBy = document.getElementById("sortBy");

    if (regionFilter) regionFilter.addEventListener("change", renderDestinationsModern);
    if (sortBy) sortBy.addEventListener("change", renderDestinationsModern);

    const categoryFilters = document.getElementById("blogCategoryFilters");
    if (categoryFilters) {
      categoryFilters.addEventListener("click", (e) => {
        const btn = e.target.closest(".blog-filter-btn");
        if (!btn) return;
        activeCategory = btn.dataset.category || "all";
        categoryFilters.querySelectorAll(".blog-filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderBlogContent();
      });
    }
  }

  function setupModal() {
    document.getElementById("closeDestinationModal")?.addEventListener("click", closeDestinationModal);
    document.getElementById("destinationModalBackdrop")?.addEventListener("click", closeDestinationModal);
    document.getElementById("backToBlog")?.addEventListener("click", hideArticleModern);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDestinationModal();
    });
  }

  function initBlogPage() {
    if (!document.querySelector(".blog-page")) return;

    setupLocationDetection();
    setupFilters();
    setupModal();
    renderDestinationsModern();
    renderBlogContent();

    window.showArticle = showArticleModern;
    window.viewDestinationDetails = openDestinationModal;
    window.hideArticle = hideArticleModern;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBlogPage);
  } else {
    initBlogPage();
  }
})();