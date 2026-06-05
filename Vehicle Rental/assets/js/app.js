const API_BASE = "http://localhost:5000/api";
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

const offers = [
  { code: "MOUNTAIN20", title: "Mountain Explorer Discount", discount: "20% off on mountain vehicle rentals" },
  { code: "PEAK10", title: "Peak Adventure Bonus", discount: "10% off for first-time mountain explorers" }
];

let vehiclesCache = [];
const VEHICLES_KEY = "vehicles";
const DEFAULT_VEHICLE_IMAGE = "https://images.pexels.com/photos/1366938/pexels-photo-1366938.jpeg?auto=compress&cs=tinysrgb&w=1200";
const INR = new Intl.NumberFormat("en-IN");

function formatINR(amount) {
  return `\u20B9${INR.format(amount)}`;
}

function resolveVehicleImageUrl(imageUrl) {
  if (!imageUrl) {
    return DEFAULT_VEHICLE_IMAGE;
  }
  const url = String(imageUrl).trim();
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (url.startsWith("/")) {
    return `${API_ORIGIN}${url}`;
  }
  return `${API_ORIGIN}/${url}`;
}

function getAuthToken() {
  return localStorage.getItem("token") || "";
}

function isLoggedIn() {
  return Boolean(getAuthToken());
}

function toUiVehicle(row) {
  const type = row.type || "Car";
  const category = String(type).toLowerCase().includes("bike") ? "Bike" : "Car";
  return {
    id: row.id,
    name: row.name,
    category,
    type: row.type,
    fuel: row.fuelType || "Petrol",
    transmission: row.transmission || "Manual",
    seats: category === "Bike" ? 2 : 5,
    price: Number(row.pricePerDay || 0),
    rating: 4.5,
    available: true,
    image: resolveVehicleImageUrl(row.imageUrl),
    brand: row.brand,
    model: row.model,
    year: row.year,
    description: row.description,
    ownerEmail: row.ownerEmail || ""
  };
}

async function fetchVehicles() {
  try {
    const response = await fetch(`${API_BASE}/vehicles`);
    if (!response.ok) throw new Error("Failed to fetch vehicles");
    const rows = await response.json();
    vehiclesCache = Array.isArray(rows) ? rows.map(toUiVehicle) : [];
    return vehiclesCache;
  } catch (_err) {
    vehiclesCache = [];
    return vehiclesCache;
  }
}

async function getVehicles() {
  return fetchVehicles();
}

function setActiveNav() {
  const page = document.body.dataset.page;
  document.querySelectorAll(".nav-links a").forEach((link) => {
    if (link.dataset.page === page) link.classList.add("active");
  });
}

function updateAuthNav() {
  const loginLink = document.querySelector(".nav-links a[data-page='login']");
  if (!loginLink) return;
  if (isLoggedIn()) {
    loginLink.textContent = "Logout";
    loginLink.setAttribute("href", "#");
    loginLink.onclick = (e) => {
      e.preventDefault();
      localStorage.removeItem("vr_session");
      localStorage.removeItem("vr_role");
      localStorage.removeItem("vr_user_email");
      localStorage.removeItem("token");
      window.location.href = "index.html";
    };
    return;
  }
  loginLink.textContent = "Login";
  loginLink.setAttribute("href", "login.html");
  loginLink.onclick = null;
}

async function renderListings() {
  const container = document.getElementById("vehicleGrid");
  if (!container) return;
  const page = document.body.dataset.page;

  function parsePriceToNumber(price) {
    if (typeof price === "number" && Number.isFinite(price)) return price;
    if (typeof price === "string") {
      const n = Number(price.replace(/[^\d.]/g, ""));
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  }

  function normalizeVehicle(v) {
    const type = v.type || (String(v.category || "").toLowerCase().includes("bike") ? "Bike" : "Sedan");
    const category = v.category || (String(type).toLowerCase().includes("bike") ? "Bike" : "Car");
    const fuel = v.fuel || "Petrol";
    const transmission = v.transmission || "Automatic";
    const seats = Number(v.seats ?? (category === "Bike" ? 2 : 5));
    const priceNum = parsePriceToNumber(v.price);

    return {
      ...v,
      id: v.id,
      type,
      category,
      fuel,
      transmission,
      seats,
      price: priceNum,
      rating: Number(v.rating ?? 4.5),
      available: v.available ?? true,
      description: v.description || (v.location ? `Located in ${v.location}.` : "Well-maintained rental vehicle ready for your next trip."),
      brand: v.brand || "",
      model: v.model || "",
      year: v.year || "",
      image: v.image || "assets/images/sample.jpg"
    };
  }

  const allVehicles = (await getVehicles()).map(normalizeVehicle);

  const type = document.getElementById("filterType")?.value || "all";
  const fuel = document.getElementById("filterFuel")?.value || "all";
  const transmission = document.getElementById("filterTransmission")?.value || "all";
  const max = Number(document.getElementById("filterPrice")?.value || 999999);
  const sort = document.getElementById("filterSort")?.value || "priceAsc";

  const scoped = page === "home" ? allVehicles.filter((v) => v.category === "Car") : allVehicles;
  let list = scoped.filter((v) =>
    (type === "all" || v.type === type || v.category === type) &&
    (fuel === "all" || v.fuel === fuel) &&
    (transmission === "all" || v.transmission === transmission) &&
    v.price <= max
  );

  if (sort === "priceAsc") list.sort((a, b) => a.price - b.price);
  if (sort === "priceDesc") list.sort((a, b) => b.price - a.price);
  if (sort === "rating") list.sort((a, b) => b.rating - a.rating);

  if (!list.length) {
    container.innerHTML = `<div class="card"><p>No vehicles match these filters right now.</p></div>`;
    return;
  }

  container.innerHTML = list.map((v) => `
    <article class="card vehicle-card">
      <img class="vehicle-image" src="${v.image}" alt="${v.name}" loading="lazy" />
      <p class="small vehicle-tag">${v.category}</p>
      <h3>${v.name}</h3>
      <p class="small">${v.brand || ""} ${v.model || ""} ${v.year || ""}</p>
      <p class="small">${v.type} | ${v.transmission} | ${v.fuel} | ${v.seats} seats</p>
      <p class="small">${v.description || "Well-maintained rental vehicle ready for your next trip."}</p>
      <p>Rating: ${v.rating} ${v.available ? "| Available" : "| Not available"}</p>
      <p class="price">${formatINR(v.price)}/day</p>
      <a class="btn" href="vehicle-details.html?id=${v.id}">View Details</a>
    </article>
  `).join("");
}

function renderOffers(targetId = "offerGrid") {
  const container = document.getElementById(targetId);
  if (!container) return;
  container.innerHTML = offers.map((o) => `<div class="card"><h4>${o.title}</h4><p>${o.discount}</p><p class="small">Code: ${o.code}</p></div>`).join("");
}

function handleAuthForms() {
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");
  const forgotForm = document.getElementById("forgotForm");
  const resetForm = document.getElementById("resetForm");

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(registerForm).entries());
      if (!data.email || !String(data.password).match(/^(?=.*\d).{8,}$/)) {
        return notify("authNotice", "Password must be 8+ chars and include a number.", true);
      }

      const submitButton = registerForm.querySelector("button[type='submit']");
      if (submitButton) submitButton.disabled = true;

      try {
        const response = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          return notify("authNotice", result.message || "Registration failed.", true);
        }

        notify("authNotice", result.message || "Registration successful. You can now login.");
        registerForm.reset();
      } catch (_err) {
        notify("authNotice", "Unable to reach the registration server.", true);
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(loginForm).entries());

      const submitButton = loginForm.querySelector("button[type='submit']");
      if (submitButton) submitButton.disabled = true;

      try {
        const response = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: data.email,
            password: data.password
          })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          return notify("loginNotice", result.message || "Invalid credentials.", true);
        }

        const user = result.user || {};
        localStorage.setItem("token", result.token);
        localStorage.setItem("vr_session", "active");
        localStorage.setItem("vr_user_email", user.email);
        localStorage.setItem("vr_role", user.role);
        notify("loginNotice", "Login successful. Redirecting to dashboard...");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 700);
      } catch (_err) {
        notify("loginNotice", "Unable to reach the login server.", true);
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }

  if (forgotForm) {
    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = Object.fromEntries(new FormData(forgotForm).entries());
      const email = String(data.email || "").trim();

      if (!email) return notify("forgotNotice", "Please enter your email.", true);

      const submitButton = forgotForm.querySelector("button[type='submit']");
      if (submitButton) submitButton.disabled = true;

      try {
        const response = await fetch(`${API_BASE}/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          return notify("forgotNotice", result.message || "Request failed.", true);
        }

        notify("forgotNotice", result.message || "Check your email for reset instructions.");
        forgotForm.reset();

        if (result.resetLink) {
          setTimeout(() => {
            window.location.href = result.resetLink.startsWith("http")
              ? result.resetLink
              : `${result.resetLink}`;
          }, 1500);
        }
      } catch (_err) {
        notify("forgotNotice", "Unable to reach the server.", true);
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }

  if (resetForm) {
    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const params = new URLSearchParams(window.location.search);
      const token = String(params.get("token") || "").trim();
      const data = Object.fromEntries(new FormData(resetForm).entries());
      const newPassword = String(data.newPassword || "");

      if (!token) {
        return notify("resetNotice", "Invalid or missing reset token.", true);
      }
      if (!newPassword.match(/^(?=.*\d).{8,}$/)) {
        return notify("resetNotice", "Password must be 8+ chars and include a number.", true);
      }

      const submitButton = resetForm.querySelector("button[type='submit']");
      if (submitButton) submitButton.disabled = true;

      try {
        const response = await fetch(`${API_BASE}/auth/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          return notify("resetNotice", result.message || "Reset failed.", true);
        }

        notify("resetNotice", result.message || "Password updated. Redirecting to login...");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 700);
      } catch (_err) {
        notify("resetNotice", "Unable to reach the server.", true);
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }
}

function handleDashboard() {
  const panel = document.getElementById("dashboardPanel");
  if (!panel) return;
  // Show dashboard without requiring login
  const email = localStorage.getItem("vr_user_email") || "Guest User";
  panel.innerHTML = `<p class="small">Welcome: ${email}</p>`;
}

async function populateVehicleSelect() {
  const select = document.querySelector("select[name='vehicle']");
  const vehicles = await getVehicles();
  if (select) {
    select.innerHTML = vehicles.filter((v) => v.available).map((v) => `<option value="${v.id}">${v.name} (${v.category}) - ${formatINR(v.price)}/day</option>`).join("");
    return;
  }

  const selectedVehicleBox = document.getElementById("selectedVehicle");
  const selectedVehicleInput = document.getElementById("selectedVehicleId");
  if (!selectedVehicleBox || !selectedVehicleInput) return;

  const params = new URLSearchParams(window.location.search);
  const vehicleId = params.get("vehicleId");
  const vehicle = vehicles.find((v) => String(v.id) === String(vehicleId));
  if (!vehicle) {
    selectedVehicleBox.textContent = "Selected vehicle not found. Please return to listings.";
    selectedVehicleInput.value = "";
    return;
  }

  selectedVehicleInput.value = vehicle.id;
  selectedVehicleBox.textContent = `${vehicle.name} (${vehicle.category}) - ${formatINR(vehicle.price)}/day`;
}

function handleBookingFlow() {
  const bookingForm = document.getElementById("bookingForm");
  const paymentForm = document.getElementById("paymentForm");
  let paymentBooking = null;

  function toISTDateTimeLocal(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(date);
    const value = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`;
  }

  if (bookingForm) {
    const pickupInput = document.getElementById("pickupDateTime");
    const dropoffInput = document.getElementById("dropoffDateTime");
    const confirmBookingBtn = document.getElementById("confirmBookingBtn");
    let pendingBooking = null;
    let selectedPickup = null;
    let selectedDropoff = null;

    function setupAutocomplete(inputId, suggestionsId) {
      const input = document.getElementById(inputId);
      const suggestionsContainer = document.getElementById(suggestionsId);
      if (!input || !suggestionsContainer) return;

      let debounceTimer;

      input.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        const query = input.value.trim();

        if (inputId === "pickupLocation") {
          selectedPickup = null;
        } else {
            selectedDropoff = null;
        }

        if (query.length < 3) {
          suggestionsContainer.innerHTML = "";
          return;
        }

        debounceTimer = setTimeout(async () => {
          try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
            const response = await fetch(url, {
              headers: {
                "User-Agent": "DriveHiveRentalApp/1.0"
              }
            });
            if (!response.ok) throw new Error("API error");
            const results = await response.json();

            suggestionsContainer.innerHTML = "";

            if (results && results.length > 0) {
              results.slice(0, 5).forEach((item) => {
                const div = document.createElement("div");
                div.className = "autocomplete-suggestion";
                div.textContent = item.display_name;
                div.addEventListener("click", () => {
                  input.value = item.display_name;

                  const locationData = {
                    address: item.display_name,
                    lat: item.lat,
                    lon: item.lon
                  };

                if (inputId === "pickupLocation") {
                    selectedPickup = locationData;
                } else {
                    selectedDropoff = locationData;
                }

suggestionsContainer.innerHTML = "";
                });
                suggestionsContainer.appendChild(div);
              });
            }
          } catch (err) {
            console.error("Autocomplete fetch error:", err);
          }
        }, 300);
      });

      document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !suggestionsContainer.contains(e.target)) {
          suggestionsContainer.innerHTML = "";
        }
      });
    }

    setupAutocomplete("pickupLocation", "pickupSuggestions");
    setupAutocomplete("dropoffLocation", "dropoffSuggestions");

    if (pickupInput && pickupInput.type !== "datetime-local") pickupInput.type = "datetime-local";
    if (dropoffInput && dropoffInput.type !== "datetime-local") dropoffInput.type = "datetime-local";
    const now = toISTDateTimeLocal();
    if (pickupInput) pickupInput.min = now;
    if (pickupInput && dropoffInput) {
      pickupInput.addEventListener("change", (e) => {
        dropoffInput.min = e.target.value;
        if (confirmBookingBtn) confirmBookingBtn.disabled = true;
        pendingBooking = null;
      });
    }

    bookingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!selectedPickup) {
        alert("Please select a pickup location from the suggestions.");
        return;
      }

      if (!selectedDropoff) {
        alert("Please select a dropoff location from the suggestions.");
        return;
      }
      const dlInput = document.getElementById("license")?.value || "";
      const cleanDL = dlInput.replace(/[\s-]/g, "").toUpperCase();
      const dlRegex = /^[A-Z]{2}\d{2}\d{4}\d{7}$/;
      if (!dlRegex.test(cleanDL)) {
        alert("Enter a valid Driving License number");
        return;
      }
      const pickup = document.getElementById("pickupDateTime")?.value || "";
      const dropoff = document.getElementById("dropoffDateTime")?.value || "";
      if (dropoff <= pickup) {
        alert("Drop-off must be after pickup");
        return;
      }
      const data = Object.fromEntries(new FormData(bookingForm).entries());
      const vehicles = await getVehicles();
      const vehicleId = String(data.vehicle || "");
      const selected = vehicles.find((v) => String(v.id) === vehicleId);
      if (!selected) {
        notify("bookingNotice", "Selected vehicle not found. Please return to listings.", true);
        return;
      }
      const availabilityResponse = await fetch(`${API_BASE}/bookings/availability?vehicleId=${encodeURIComponent(vehicleId)}&start=${encodeURIComponent(pickup)}&end=${encodeURIComponent(dropoff)}`);
      const availability = await availabilityResponse.json().catch(() => ({}));
      const isBooked = !availabilityResponse.ok || availability.available === false;

      if (isBooked) {
        pendingBooking = null;
        if (confirmBookingBtn) confirmBookingBtn.disabled = true;
        notify("bookingNotice", "Vehicle not available", true);
        return;
      }

      const hours = (new Date(dropoff) - new Date(pickup)) / (1000 * 60 * 60);
      const days = Math.ceil(hours / 24);
      const ratePerDay = Number(selected?.pricePerDay ?? selected?.price ?? 0);
      const total = days * ratePerDay;

      pendingBooking = {
        ...data,
        pickupLocation: {
          address: selectedPickup.address,
          latitude: Number(selectedPickup.lat),
          longitude: Number(selectedPickup.lon)
        },
        dropoffLocation: {
          address: selectedDropoff.address,
          latitude: Number(selectedDropoff.lat),
          longitude: Number(selectedDropoff.lon)
        },
        vehicleId,
        pickup,
        dropoff,
        user: localStorage.getItem("vr_user_email") || "guest",
        total,
        days,
        status: "pending_payment",
        bookingId: `BK-${Date.now()}`
      };
      if (confirmBookingBtn) confirmBookingBtn.disabled = false;
      notify("bookingNotice", `Available. Estimated total: ${formatINR(total)} for ${days} day(s).`);
    });

    if (confirmBookingBtn) {
      confirmBookingBtn.addEventListener("click", async () => {
        if (!pendingBooking) {
          notify("bookingNotice", "Please check availability first.", true);
          return;
        }
        const vehicleId = pendingBooking.vehicleId;
        const pickup = pendingBooking.pickup;
        const dropoff = pendingBooking.dropoff;
        const availabilityResponse = await fetch(`${API_BASE}/bookings/availability?vehicleId=${encodeURIComponent(vehicleId)}&start=${encodeURIComponent(pickup)}&end=${encodeURIComponent(dropoff)}`);
        const availability = await availabilityResponse.json().catch(() => ({}));
        if (!availabilityResponse.ok || availability.available === false) {
          alert("Vehicle just got booked for this time. Please select another slot.");
          return;
        }
        const bookingRecord = {
          id: `BK-${Date.now()}`,
          vehicleId: pendingBooking.vehicleId,
          pickup: pendingBooking.pickup,
          dropoff: pendingBooking.dropoff,
          user: pendingBooking.user,
          total: pendingBooking.total,
          status: "pending"
        };
        const response = await fetch(`${API_BASE}/bookings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...pendingBooking, ...bookingRecord })
        });
        const saved = await response.json().catch(() => ({}));
        if (!response.ok) {
          notify("bookingNotice", saved.message || "Failed to create booking", true);
          return;
        }
        window.location.href = `payment.html?bookingId=${saved.id || bookingRecord.id}`;
      });
    }
  }

  if (paymentForm) {
    const summary = document.getElementById("paymentSummary");
    const payButton = paymentForm.querySelector("button[type='submit']");
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get("bookingId");

    function redirectToConfirmation(id, reason) {
      const targetId = String(id || "").trim();
      console.log("[payment] redirect", { reason, bookingId: targetId });
      if (!targetId) {
        console.error("[payment] redirect blocked: missing bookingId");
        return false;
      }
      window.location.href = `confirmation.html?bookingId=${encodeURIComponent(targetId)}`;
      return true;
    }

    fetch(`${API_BASE}/bookings/${encodeURIComponent(bookingId || "")}`, { cache: "no-store" })
      .then((response) => {
        console.log("[payment] load booking response", { ok: response.ok, status: response.status, bookingId });
        return response.ok ? response.json() : null;
      })
      .then((booking) => {
        paymentBooking = booking;
        console.log("[payment] loaded booking", {
          bookingId: booking?.id || booking?.bookingId,
          paymentStatus: booking?.paymentStatus
        });
        if (booking?.paymentStatus === "paid") {
          redirectToConfirmation(booking.id || booking.bookingId || bookingId, "already-paid-on-load");
          return;
        }
        const totalAmount = Number(booking?.total || 0);
        if (summary && booking) {
          const status = booking.paymentStatus === "paid" ? "Paid" : booking.status === "confirmed" ? "Confirmed" : "Pending payment";
          summary.innerHTML = `<p>Booking ID: <b>${booking.id}</b></p><p>Total: <b>${formatINR(totalAmount)}</b></p><p>Status: ${status}</p>`;
        }
      })
      .catch((err) => {
        console.error("[payment] load booking failed", err);
      });

    paymentForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const cardName = paymentForm.querySelector("#cardName")?.value || "";
      const cardNumber = (paymentForm.querySelector("#cardNumber")?.value || "").replace(/\s+/g, "");

      if (!cardName || cardName.trim() === "") {
        alert("Enter cardholder name");
        return;
      }
      if (!cardNumber || cardNumber.length < 9 || cardNumber.length > 18) {
        alert("Card number must be between 9 and 18 digits");
        return;
      }
      if (!bookingId) {
        console.error("[payment] submit blocked: no bookingId in URL");
        alert("No booking found.");
        return;
      }

      if (paymentBooking?.paymentStatus === "paid") {
        console.log("[payment] already paid before submit", paymentBooking);
        redirectToConfirmation(paymentBooking.id || paymentBooking.bookingId || bookingId, "already-paid-on-submit");
        return;
      }

      if (payButton) {
        payButton.disabled = true;
        payButton.textContent = "Processing payment...";
      }

      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        if (Math.random() < 0.1) {
          throw new Error("Payment failed. Try again.");
        }

        console.log("[payment] PUT start", { bookingId });
        const updateResponse = await fetch(`${API_BASE}/bookings/${encodeURIComponent(bookingId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "confirmed",
            paymentStatus: "paid",
            paidAt: new Date().toISOString()
          })
        });

        const updatedBooking = await updateResponse.json().catch(() => ({}));
        console.log("[payment] PUT response", {
          ok: updateResponse.ok,
          status: updateResponse.status,
          body: updatedBooking
        });

        if (!updateResponse.ok) {
          throw new Error(updatedBooking.message || "Payment update failed.");
        }

        paymentBooking = updatedBooking;
        const successId = updatedBooking.id || updatedBooking.bookingId || bookingId;
        const isPaid = String(updatedBooking.paymentStatus || "").toLowerCase() === "paid";
        console.log("[payment] success check", { successId, paymentStatus: updatedBooking.paymentStatus, isPaid });

        if (!isPaid) {
          throw new Error("Payment was not confirmed by the server.");
        }

        redirectToConfirmation(successId, "payment-success");
      } catch (err) {
        console.error("[payment] failed", err);
        alert(err.message || "Payment failed. Try again.");
        if (payButton) {
          payButton.disabled = false;
          payButton.textContent = "Pay Securely";
        }
      }
    });
  }
}

async function renderVehicleDetails() {
  const panel = document.getElementById("vehicleDetailsPanel");
  if (!panel) return;
  const params = new URLSearchParams(window.location.search);
  const id = String(params.get("id") || "");

  function parsePriceToNumber(price) {
    if (typeof price === "number" && Number.isFinite(price)) return price;
    if (typeof price === "string") {
      const n = Number(price.replace(/[^\d.]/g, ""));
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  }

  const vehicles = (await getVehicles()).map((item) => {
    const type = item.type || (String(item.category || "").toLowerCase().includes("bike") ? "Bike" : "Sedan");
    const category = item.category || (String(type).toLowerCase().includes("bike") ? "Bike" : "Car");
    return {
      ...item,
      id: item.id,
      type,
      category,
      fuel: item.fuel || "Petrol",
      transmission: item.transmission || "Automatic",
      price: parsePriceToNumber(item.price),
      image: item.image || "assets/images/sample.jpg",
      description: item.description || (item.location ? `Located in ${item.location}.` : "Representative image. Exact brand/trim may vary by branch.")
    };
  });

  const v = vehicles.find((item) => String(item.id) === id) || vehicles[0];
  if (!v) return;

  panel.innerHTML = `
    <img class="vehicle-image" src="${v.image}" alt="${v.name}" />
    <p class="small vehicle-tag">${v.category}</p>
    <h2>${v.name}</h2>
    <p>${v.type} | ${v.transmission} | ${v.fuel}</p>
    <p class="small">${v.description || "Representative image. Exact brand/trim may vary by branch."}</p>
    <p class="price">${formatINR(v.price)}/day</p>
    <p>Cancellation: Free up to 24h before pickup. Insurance options available.</p>
    <a class="btn" href="booking.html?vehicleId=${encodeURIComponent(v.id)}">Book This Vehicle</a>
  `;

  const reviewList = document.getElementById("reviewList");
  if (reviewList) {
    const reviews = JSON.parse(localStorage.getItem("vr_reviews") || "[]");
    const seeded = reviews.length ? reviews : [
      { author: "Aisha", rating: 5, text: "Vehicle was spotless and pickup was smooth." },
      { author: "Rahul", rating: 4, text: "Great value and responsive support team." }
    ];
    reviewList.innerHTML = seeded.map((r) => `<li><strong>${r.author}</strong> (${r.rating}/5) - ${r.text}</li>`).join("");
  }

  const reviewForm = document.getElementById("reviewForm");
  if (reviewForm) {
    reviewForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(reviewForm).entries());
      const current = JSON.parse(localStorage.getItem("vr_reviews") || "[]");
      current.push(data);
      localStorage.setItem("vr_reviews", JSON.stringify(current));
      notify("reviewNotice", "Review submitted and queued for moderation.");
      reviewForm.reset();
      renderVehicleDetails();
    });
  }
}

function handleSupport() {
  const supportForm = document.getElementById("supportForm");
  if (!supportForm) return;
  const list = document.getElementById("ticketList");
  const tickets = JSON.parse(localStorage.getItem("vr_tickets") || "[]");
  if (list) {
    list.innerHTML = tickets.map((t) => `<li>#${t.id} - ${t.subject} (${t.priority}) [${t.status}]</li>`).join("") || "<li>No tickets yet.</li>";
  }
  supportForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(supportForm).entries());
    const ticket = { id: Date.now(), subject: data.subject, priority: data.priority, status: "open" };
    tickets.push(ticket);
    localStorage.setItem("vr_tickets", JSON.stringify(tickets));
    notify("supportNotice", `Ticket #${ticket.id} created. Live chat agent will follow up.`);
    supportForm.reset();
    handleSupport();
  });
}

// Indian travel destinations data
const indianDestinations = [
  {
    id: 1,
    name: "Himalayan Peak, Manali",
    region: "north",
    coordinates: { lat: 32.2432, lng: 77.1892 },
    description: "Majestic mountain peak offering breathtaking views and adventure sports in the heart of the Himalayas.",
    attractions: ["Snow Peak", "Mountain Pass", "Alpine Lakes", "Adventure Sports"],
    popularity: 95
  },
  {
    id: 2,
    name: "Mountain Beaches, Goa",
    region: "west",
    coordinates: { lat: 15.4973, lng: 73.8278 },
    description: "Mountain-meets-sea destination with stunning cliffs and pristine beaches in the Western Ghats.",
    attractions: ["Mountain Beaches", "Cliff Views", "Waterfalls", "Sunset Points"],
    popularity: 90
  },
  {
    id: 3,
    name: "Mountain Backwaters, Munnar",
    region: "south",
    coordinates: { lat: 10.0889, lng: 77.0595 },
    description: "Serene mountain backwaters surrounded by tea plantations and misty peaks in the Western Ghats.",
    attractions: ["Tea Gardens", "Mountain Lakes", "Misty Peaks", "Eco Tourism"],
    popularity: 88
  },
  {
    id: 4,
    name: "Mountain Forts, Rajasthan",
    region: "north",
    coordinates: { lat: 26.9124, lng: 75.7873 },
    description: "Ancient mountain forts with stunning architecture and panoramic views of the Aravalli range.",
    attractions: ["Mountain Forts", "Desert Peaks", "Sunset Views", "Heritage Sites"],
    popularity: 92
  },
  {
    id: 5,
    name: "Mountain Ghats, Varanasi",
    region: "north",
    coordinates: { lat: 25.3176, lng: 82.9739 },
    description: "Sacred mountain ghats along the Ganges with spiritual significance and stunning river views.",
    attractions: ["Mountain Ghats", "River Views", "Temples", "Spiritual Sites"],
    popularity: 85
  },
  {
    id: 6,
    name: "Snow Mountains, Gulmarg",
    region: "north",
    coordinates: { lat: 34.0837, lng: 74.3832 },
    description: "Snow-covered mountain paradise offering skiing, cable cars, and breathtaking alpine scenery.",
    attractions: ["Snow Peaks", "Ski Resort", "Cable Cars", "Alpine Meadows"],
    popularity: 87
  },
  {
    id: 7,
    name: "Mountain Palace, Mysore",
    region: "south",
    coordinates: { lat: 12.3058, lng: 76.6550 },
    description: "Royal palace nestled in mountain foothills with stunning architecture and panoramic views.",
    attractions: ["Mountain Palace", "Royal Gardens", "Peak Views", "Cultural Sites"],
    popularity: 78
  },
  {
    id: 8,
    name: "Mountain Heritage, Darjeeling",
    region: "east",
    coordinates: { lat: 27.0360, lng: 88.2627 },
    description: "Mountain town with colonial heritage, tea gardens, and stunning Himalayan views.",
    attractions: ["Mountain Tea", "Heritage Sites", "Peak Views", "Toy Train"],
    popularity: 82
  },
  {
    id: 9,
    name: "Mountain City, Shimla",
    region: "north",
    coordinates: { lat: 31.1048, lng: 77.1734 },
    description: "Queen of Hills - mountain city with colonial architecture and breathtaking valley views.",
    attractions: ["Mountain Mall", "Valley Views", "Colonial Sites", "Mountain Rides"],
    popularity: 89
  },
  {
    id: 10,
    name: "Mountain Monuments, Leh",
    region: "north",
    coordinates: { lat: 34.1526, lng: 77.5771 },
    description: "High-altitude desert mountain region with ancient monasteries and stunning lunar landscapes.",
    attractions: ["Mountain Monasteries", "Desert Peaks", "Lunar Landscapes", "Adventure Sports"],
    popularity: 91
  },
  {
    id: 11,
    name: "Mountain Ruins, Hampi",
    region: "south",
    coordinates: { lat: 15.3350, lng: 76.4620 },
    description: "Ancient mountain ruins with stunning boulder landscapes and panoramic hilltop views.",
    attractions: ["Mountain Ruins", "Boulder Peaks", "Sunset Points", "Historic Sites"],
    popularity: 75
  },
  {
    id: 12,
    name: "Mountain Temples, Rishikesh",
    region: "north",
    coordinates: { lat: 30.0869, lng: 78.2676 },
    description: "Spiritual mountain town with ancient temples, yoga centers, and Ganges mountain views.",
    attractions: ["Mountain Temples", "Yoga Centers", "River Views", "Meditation Sites"],
    popularity: 72
  }
];

// Major Indian cities with coordinates
const indianCities = {
  "mumbai": { lat: 19.0760, lng: 72.8777, name: "Mumbai" },
  "delhi": { lat: 28.6139, lng: 77.2090, name: "Delhi" },
  "bangalore": { lat: 12.9716, lng: 77.5946, name: "Bangalore" },
  "hyderabad": { lat: 17.3850, lng: 78.4867, name: "Hyderabad" },
  "chennai": { lat: 13.0827, lng: 80.2707, name: "Chennai" },
  "kolkata": { lat: 22.5726, lng: 88.3639, name: "Kolkata" },
  "pune": { lat: 18.5204, lng: 73.8567, name: "Pune" },
  "ahmedabad": { lat: 23.0225, lng: 72.5714, name: "Ahmedabad" },
  "jaipur": { lat: 26.9124, lng: 75.7873, name: "Jaipur" },
  "lucknow": { lat: 26.8467, lng: 80.9462, name: "Lucknow" }
};

let userLocation = null;

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Calculate estimated travel time by car
function calculateTravelTime(distance) {
  const averageSpeed = 60; // km/h average speed in India
  const hours = distance / averageSpeed;
  if (hours < 1) {
    return `${Math.round(hours * 60)} min`;
  } else if (hours < 24) {
    return `${hours.toFixed(1)} hours`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours.toFixed(1)}h`;
  }
}

// Handle location detection
function handleLocationDetection() {
  const detectBtn = document.getElementById("detectLocation");
  const setLocationBtn = document.getElementById("setLocation");
  const manualLocationInput = document.getElementById("manualLocation");
  const currentLocationDiv = document.getElementById("currentLocation");
  const locationNameSpan = document.getElementById("locationName");

  if (detectBtn) {
    detectBtn.addEventListener("click", () => {
      if (navigator.geolocation) {
        detectBtn.textContent = "Detecting...";
        detectBtn.disabled = true;
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              name: "Your Location"
            };
            updateLocationDisplay();
            renderDestinations();
            detectBtn.textContent = "Detect My Location";
            detectBtn.disabled = false;
          },
          (error) => {
            alert("Unable to detect your location. Please enter your city manually.");
            detectBtn.textContent = "Detect My Location";
            detectBtn.disabled = false;
          }
        );
      } else {
        alert("Geolocation is not supported by your browser. Please enter your city manually.");
      }
    });
  }

  if (setLocationBtn && manualLocationInput) {
    setLocationBtn.addEventListener("click", () => {
      const cityName = manualLocationInput.value.trim().toLowerCase();
      if (indianCities[cityName]) {
        userLocation = {
          ...indianCities[cityName],
          name: indianCities[cityName].name
        };
        updateLocationDisplay();
        renderDestinations();
        manualLocationInput.value = "";
      } else {
        alert("City not found. Try: Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad, Jaipur, or Lucknow");
      }
    });
  }

  function updateLocationDisplay() {
    if (userLocation && currentLocationDiv && locationNameSpan) {
      locationNameSpan.textContent = userLocation.name;
      currentLocationDiv.style.display = "block";
    }
  }
}

// Render destinations with distance and time information
function renderDestinations() {
  const grid = document.getElementById("destinationsGrid");
  const regionFilter = document.getElementById("regionFilter")?.value || "all";
  const sortBy = document.getElementById("sortBy")?.value || "popularity";
  
  if (!grid) return;

  let filteredDestinations = indianDestinations.filter(dest => 
    regionFilter === "all" || dest.region === regionFilter
  );

  // Calculate distances and times if user location is available
  if (userLocation) {
    filteredDestinations = filteredDestinations.map(dest => {
      const distance = calculateDistance(
        userLocation.lat, userLocation.lng,
        dest.coordinates.lat, dest.coordinates.lng
      );
      return {
        ...dest,
        distance: distance,
        travelTime: calculateTravelTime(distance)
      };
    });

    // Sort by distance or time if user location is available
    if (sortBy === "distance") {
      filteredDestinations.sort((a, b) => a.distance - b.distance);
    } else if (sortBy === "time") {
      filteredDestinations.sort((a, b) => a.distance - b.distance);
    }
  } else {
    // Sort by popularity if no user location
    if (sortBy === "popularity") {
      filteredDestinations.sort((a, b) => b.popularity - a.popularity);
    }
  }

  grid.innerHTML = filteredDestinations.map(dest => `
    <div class="destination-card">
      <div class="destination-image-container">
        <img src="${dest.image}" alt="${dest.name}" class="destination-image" />
        <div class="destination-overlay">
          <div class="destination-popularity">⭐ ${dest.popularity}%</div>
        </div>
        ${dest.gallery && dest.gallery.length > 0 ? `
          <div class="destination-gallery">
            ${dest.gallery.map((img, index) => `
              <img src="${img}" alt="${dest.name} - Gallery ${index + 1}" class="gallery-thumbnail" onclick="openGallery('${dest.name}', ${index})" />
            `).join("")}
          </div>
        ` : ''}
      </div>
      <div class="destination-content">
        <h3 class="destination-title">${dest.name}</h3>
        <p class="destination-region">📍 ${dest.region.toUpperCase()} • 🏛️ ${dest.attractions.length} Attractions</p>
        <p class="destination-description">${dest.description}</p>
        
        ${userLocation ? `
          <div class="travel-info">
            <div class="travel-stat">
              <div class="value">📍 ${dest.distance.toFixed(0)} km</div>
              <div class="label">Distance</div>
            </div>
            <div class="travel-stat">
              <div class="value">🚗 ${dest.travelTime}</div>
              <div class="label">Travel Time</div>
            </div>
          </div>
        ` : `
          <div class="travel-info">
            <div class="travel-stat">
              <div class="value">📍 Set Location</div>
              <div class="label">To see distance</div>
            </div>
            <div class="travel-stat">
              <div class="value">🚗 --</div>
              <div class="label">Travel Time</div>
            </div>
          </div>
        `}
        
        <div class="destination-attractions">
          <strong>Top Attractions:</strong>
          <div class="attractions-list">
            ${dest.attractions.map(attr => `<span class="attraction-tag">🏛️ ${attr}</span>`).join("")}
          </div>
        </div>
        
        <div class="destination-actions">
          <button class="btn primary" onclick="viewDestinationDetails(${dest.id})">📋 View Details</button>
          <button class="btn secondary" onclick="planTrip(${dest.id})">🗺️ Plan Trip</button>
        </div>
      </div>
    </div>
  `).join("");
}

// Destination detail view functions
function viewDestinationDetails(destinationId) {
  const destination = indianDestinations.find(d => d.id === destinationId);
  if (!destination) return;
  
  // Create a modal or navigate to detail view
  alert(`Viewing details for: ${destination.name}\n\nDescription: ${destination.description}\n\nTop Attractions: ${destination.attractions.join(', ')}\n\nPopularity: ${destination.popularity}%`);
}

function planTrip(destinationId) {
  const destination = indianDestinations.find(d => d.id === destinationId);
  if (!destination) return;
  
  // Navigate to trip planning or booking
  alert(`Planning trip to: ${destination.name}\n\nThis would open the trip planning interface where you can:\n- Select travel dates\n- Choose transportation\n- Book accommodations\n- Create itinerary`);
}

// Gallery viewer function
function openGallery(destinationName, imageIndex) {
  const destination = indianDestinations.find(d => d.name === destinationName);
  if (!destination || !destination.gallery) return;
  
  alert(`Gallery for ${destinationName}\n\nThis would open a full-screen gallery viewer showing all ${destination.gallery.length + 1} images (main image + ${destination.gallery.length} gallery images).\n\nCurrently showing image ${imageIndex + 1} of ${destination.gallery.length}`);
}

const blogArticles = [
  {
    id: 1,
    title: "Ultimate Mountain Road Trip Guide: Himalayan Adventures",
    category: "Travel Guide",
    excerpt: "Discover the best mountain routes from Manali to Leh-Ladakh, Shimla, and the Himalayas. Perfect itineraries, road conditions, and must-visit mountain destinations.",
    readTime: "8 min read",
    tags: ["Mountain Road Trip", "Himalayas", "Leh-Ladakh", "Adventure"],
    content: `
      <h2>Introduction</h2>
      <p>The Himalayas offer some of the most spectacular mountain road trip experiences in the world. From snow-capped peaks to winding mountain passes, every journey is an adventure waiting to unfold.</p>
      
      <img src="assets/images/mountain-landscape-1.jpg" alt="Himalayan Mountain Landscape" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0;">
      
      <h2>Manali to Leh-Ladakh: The Ultimate Mountain Adventure</h2>
      <p>The Manali-Leh highway is one of the most challenging yet rewarding mountain road trips in the world. Spanning 475 kilometers, this route takes you through some of the highest motorable mountain passes.</p>
      
      <img src="assets/images/mountain-pass.jpg" alt="Mountain Pass Road" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0;">
      
      <div class="hack-tip">
        <h3>Pro Tip: Best Time to Travel</h3>
        <p>Plan your Leh-Ladakh mountain trip between June to September when the snow has melted and the mountain roads are clear. Avoid the monsoon season (July-August) as mountain landslides are common.</p>
      </div>
      
      <h3>Mountain Route Breakdown:</h3>
      <ol>
        <li><strong>Day 1:</strong> Manali to Keylong (220 km, 8-10 hours)</li>
        <li><strong>Day 2:</strong> Keylong to Sarchu (222 km, 8-10 hours)</li>
        <li><strong>Day 3:</strong> Sarchu to Leh (250 km, 8-10 hours)</li>
        <li><strong>Day 4-7:</strong> Explore Leh and surrounding mountain areas</li>
      </ol>
      
      <h2>Mountain Adventure Circuit</h2>
      <p>Experience the best of mountain driving through stunning landscapes and challenging terrain.</p>
      
      <img src="assets/images/mountain-valley.jpg" alt="Mountain Valley Landscape" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0;">
      
      <div class="hack-tip">
        <h3>Mountain Driving Tip</h3>
        <p>Always carry extra fuel when traveling in mountain areas as petrol stations can be 200-300 km apart. Mountain driving requires more fuel due to steep climbs.</p>
      </div>
    `
  },
  {
    id: 2,
    title: "Mountain Vehicle Hacks: Conquer Any Peak",
    category: "Rental Tips",
    excerpt: "Essential tips for renting and driving vehicles in mountain terrain. These hacks will help you conquer any mountain safely and confidently.",
    readTime: "6 min read",
    tags: ["Mountain Driving", "Vehicle Hacks", "Safety", "Adventure"],
    content: `
      <h2>Introduction</h2>
      <p>Mountain driving requires special skills and vehicle preparation. These essential hacks will help you conquer any mountain terrain safely.</p>
      
      <img src="assets/images/mountain-vehicle.jpg" alt="4x4 Mountain Vehicle" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0;">
      
      <h2>The Ultimate Mountain Vehicle Collection</h2>
      
      <div class="hack-tip">
        <h3>Hack #1: Choose the Right Mountain Vehicle</h3>
        <p>Always select 4x4 vehicles for mountain terrain. Mountain driving requires high ground clearance and robust suspension systems.</p>
      </div>
      
      <img src="assets/images/mountain-pass.jpg" alt="SUV on Mountain Road" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0;">
      
      <div class="hack-tip">
        <h3>Hack #2: Mountain Tire Pressure Secret</h3>
        <p>Reduce tire pressure by 2-3 PSI when driving on mountain roads for better traction and comfort on rough terrain.</p>
      </div>
      
      <h2>Mountain Driving Essentials</h2>
      <ul>
        <li><strong>Best Vehicle:</strong> 4x4 SUV with high ground clearance</li>
        <li><strong>Essential Gear:</strong> Snow chains, recovery kit, first aid</li>
        <li><strong>Fuel Strategy:</strong> Always fill up before mountain routes</li>
      </ul>
      
      <img src="assets/images/mountain-terrain.jpg" alt="Mountain Terrain Landscape" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0;">
    `
  },
  {
    id: 3,
    title: "Mountain Driving Mastery: Navigate Peaks Like a Pro",
    category: "Driving Tips",
    excerpt: "Master the art of mountain driving with these insider tips. From handling hairpin bends to altitude sickness, become a confident mountain driver.",
    readTime: "7 min read",
    tags: ["Mountain Driving", "Altitude", "Safety", "Technique"],
    content: `
      <h2>Introduction</h2>
      <p>Mountain driving is an art that requires skill and preparation. These hacks will help you navigate mountain roads like a seasoned pro.</p>
      
      <img src="assets/images/mountain-pass.jpg" alt="Mountain Switchback Road" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0;">
      
      <h2>The Unwritten Rules of Mountain Roads</h2>
      
      <div class="hack-tip">
        <h3>Mountain Gear Mastery</h3>
        <p>Use lower gears when descending mountain roads. Engine braking is your best friend on steep mountain descents.</p>
      </div>
      
      <img src="assets/images/mountain-valley.jpg" alt="Winding Mountain Road" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0;">
      
      <h2>Mountain Navigation Hacks</h2>
      <ol>
        <li><strong>Hairpin Bend Technique:</strong> Slow down before the bend, not during</li>
        <li><strong>Altitude Awareness:</strong> Watch for altitude sickness above 8,000 feet</li>
        <li><strong>Weather Wisdom:</strong> Mountain weather changes quickly</li>
        <li><strong>Night Mountain Driving:</strong> Avoid when possible, use high beams carefully</li>
      </ol>
      
      <img src="assets/images/mountain-terrain.jpg" alt="Mountain Valley View" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0;">
    `
  },
  {
    id: 4,
    title: "Budget Mountain Travel: Live Like a King in the Peaks",
    category: "Budget Travel",
    excerpt: "Travel mountain destinations like royalty while spending like a backpacker. These insider hacks will help you experience luxury mountain stays without the luxury price tag.",
    readTime: "9 min read",
    tags: ["Budget Travel", "Mountains", "Luxury Hacks", "Accommodation"],
    content: `
      <h2>Introduction</h2>
      <p>Mountain destinations offer incredible luxury experiences at budget prices. These hacks will transform your mountain travel without breaking the bank.</p>
      
      <img src="assets/images/mountain-resort.jpg" alt="Mountain Resort Architecture" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0;">
      
      <h2>Mountain Accommodation Hacks: 5-Star for 2-Star Prices</h2>
      
      <div class="hack-tip">
        <h3>The Mountain Resort Secret</h3>
        <p>Many mountain resorts offer off-season discounts of 40-60%. Visit during shoulder seasons for luxury mountain stays at budget prices.</p>
      </div>
      
      <img src="assets/images/mountain-landscape-1.jpg" alt="Mountain Hotel Building" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0;">
      
      <h2>Mountain Transportation Magic</h2>
      <ul>
        <li><strong>Shared Mountain Taxis:</strong> Split costs with other travelers</li>
        <li><strong>Mountain Buses:</strong> Government mountain buses are cheap and reliable</li>
        <li><strong>Hitchhiking:</strong> Safe and common in mountain regions</li>
      </ul>
      
      <img src="assets/images/mountain-valley.jpg" alt="Mountain Village Architecture" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0;">
    `
  },
  {
    id: 5,
    title: "Electric Mountain Vehicle Adventures: Complete Guide",
    category: "EV Travel",
    excerpt: "Everything you need to know about EV mountain travel across mountain ranges. Charging stations, range planning, and best electric vehicles for mountain journeys.",
    readTime: "10 min read",
    tags: ["Electric Vehicle", "Mountains", "Charging", "Adventure"],
    content: `
      <h2>Introduction</h2>
      <p>Electric vehicle mountain travel is becoming increasingly popular. Here's your complete guide to conquering mountains with EVs.</p>
      
      <img src="assets/images/mountain-vehicle.jpg" alt="Electric SUV in Mountains" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0;">
      
      <h2>Mountain Charging Infrastructure</h2>
      
      <div class="hack-tip">
        <h3>Mountain Charging Hack</h3>
        <p>Plan your mountain route around charging stations at major mountain towns. Always carry a portable charger for remote mountain areas.</p>
      </div>
      
      <img src="assets/images/mountain-resort.jpg" alt="EV Charging Station" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0;">
      
      <h2>Best EV Vehicles for Mountain Roads</h2>
      <ul>
        <li><strong>Tesla Model Y:</strong> Excellent mountain mode and range</li>
        <li><strong>Hyundai Kona Electric:</strong> Reliable for high-altitude mountain driving</li>
        <li><strong>MG ZS EV:</strong> Great ground clearance for mountain terrain</li>
      </ul>
      
      <img src="assets/images/mountain-pass.jpg" alt="Mountain Road Landscape" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0;">
    `
  },
  {
    id: 6,
    title: "Hidden Mountain Gems: Offbeat Peak Adventures",
    category: "Travel Guide",
    excerpt: "Beyond the usual mountain tourist spots. Discover lesser-known mountain destinations that offer authentic peak experiences and solitude.",
    readTime: "7 min read",
    tags: ["Hidden Mountains", "Offbeat Travel", "Peaks", "Solitude"],
    content: `
      <h2>Introduction</h2>
      <p>India has countless hidden mountain treasures that most tourists never discover. These offbeat mountain destinations offer authentic peak experiences away from the crowds.</p>
      
      <img src="assets/images/mountain-valley.jpg" alt="Hidden Mountain Valley" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0;">
      
      <h2>Undiscovered Mountain Paradises</h2>
      
      <div class="hack-tip">
        <h3>Secret Mountain Access</h3>
        <p>Many hidden mountain gems require local guides and special permits. The journey is part of the mountain adventure.</p>
      </div>
      
      <img src="assets/images/mountain-terrain.jpg" alt="Remote Mountain Landscape" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0;">
      
      <h2>Mountain Solitude Destinations</h2>
      <ul>
        <li><strong>Hidden Valley:</strong> Secret mountain meadow with pristine views</li>
        <li><strong>Forgotten Peak:</strong> Uncrowded mountain summit with 360° views</li>
        <li><strong>Mystic Mountain:</strong> Spiritual mountain retreat with ancient temples</li>
      </ul>
      
      <img src="assets/images/mountain-resort.jpg" alt="Mountain Temple Architecture" style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0;">
    `
  }
];

// Enhanced blog function with Read More functionality
function renderBlog() {
  handleLocationDetection();
  renderDestinations();
  
  const container = document.getElementById("blogList");
  if (!container) return;
  
  container.innerHTML = blogArticles.map((article) => `
    <li class="card">
      <h4>${article.title}</h4>
      <p class="small">Category: ${article.category} | ${article.readTime}</p>
      <p>${article.excerpt}</p>
      <a href="#" class="btn secondary" onclick="showArticle(${article.id}); return false;">Read More</a>
    </li>
  `).join("");

  // Add event listeners for filters
  const regionFilter = document.getElementById("regionFilter");
  const sortBy = document.getElementById("sortBy");
  
  if (regionFilter) {
    regionFilter.addEventListener("change", renderDestinations);
  }
  if (sortBy) {
    sortBy.addEventListener("change", renderDestinations);
  }

  // Add back button functionality
  const backBtn = document.getElementById("backToBlog");
  if (backBtn) {
    backBtn.addEventListener("click", hideArticle);
  }
}

// Show full article
function showArticle(articleId) {
  const article = blogArticles.find(a => a.id === articleId);
  if (!article) return;

  const blogSection = document.querySelector('.blog-section');
  const articleDetail = document.getElementById("articleDetail");
  
  if (blogSection) blogSection.style.display = "none";
  if (articleDetail) {
    articleDetail.style.display = "block";
    
    // Populate article content
    document.getElementById("articleTitle").textContent = article.title;
    document.getElementById("articleCategory").textContent = article.category;
    document.getElementById("articleReadTime").textContent = article.readTime;
    document.getElementById("articleDate").textContent = new Date().toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    document.getElementById("articleImage").innerHTML = `<img src="${article.image}" alt="${article.title}" />`;
    document.getElementById("articleContent").innerHTML = article.content;
    
    document.getElementById("articleTags").innerHTML = article.tags.map(tag => 
      `<span class="tag">${tag}</span>`
    ).join("");
    
    // Scroll to top
    window.scrollTo(0, 0);
  }
}

// Hide article and show blog list
function hideArticle() {
  const blogSection = document.querySelector('.blog-section');
  const articleDetail = document.getElementById("articleDetail");
  
  if (blogSection) blogSection.style.display = "block";
  if (articleDetail) articleDetail.style.display = "none";
}

async function renderAdminVehicles() {
  const grid = document.getElementById("adminVehicleGrid");
  if (!grid) return;
  const email = localStorage.getItem("vr_user_email") || "";
  const ownerHint = document.getElementById("ownerPortalHint");
  if (ownerHint && email) ownerHint.textContent = `Logged in as owner: ${email}`;
  const vehicles = (await fetchVehicles()).filter((v) => (v.ownerEmail || v.owner || "") === email);
  if (!vehicles.length) {
    grid.innerHTML = `<div class="card"><p>You have not listed any vehicles yet.</p></div>`;
    return;
  }
  grid.innerHTML = vehicles.map((v) => `
    <article class="card vehicle-card">
      <img class="vehicle-image-small" src="${v.image}" alt="${v.name}" />
      <h3>${v.name}</h3>
      <p class="small">${v.brand || ""} ${v.model || ""} | ${v.type} | ${v.year || ""}</p>
      <p class="small">${v.fuel} | ${v.transmission}</p>
      <p>${v.description || ""}</p>
      <p class="price">${formatINR(v.price)}/day</p>
      <div class="admin-actions">
        <button type="button" class="btn secondary" onclick='editVehicle(${JSON.stringify(v.id)})'>Edit</button>
        <button type="button" class="btn" onclick='deleteVehicle(${JSON.stringify(v.id)})'>Delete</button>
      </div>
    </article>
  `).join("");
}

function fillVehicleForm(vehicle) {
  document.getElementById("vehicleId").value = vehicle.id;
  document.getElementById("name").value = vehicle.name || "";
  document.getElementById("type").value = vehicle.type || "";
  document.getElementById("brand").value = vehicle.brand || "";
  document.getElementById("model").value = vehicle.model || "";
  document.getElementById("year").value = vehicle.year || "";
  document.getElementById("pricePerDay").value = vehicle.price || "";
  document.getElementById("fuelType").value = vehicle.fuel || "";
  document.getElementById("transmission").value = vehicle.transmission || "";
  document.getElementById("description").value = vehicle.description || "";
  document.getElementById("adminSubmitBtn").textContent = "Update Vehicle";
  document.getElementById("cancelEditBtn").style.display = "inline-flex";
  
  // Show existing image in preview
  const imagePreview = document.getElementById("imagePreview");
  if (imagePreview && vehicle.image) {
    imagePreview.innerHTML = `<img src="${vehicle.image}" alt="Vehicle preview" />`;
  }
}

function resetVehicleForm() {
  const form = document.getElementById("adminVehicleForm");
  if (!form) return;
  form.reset();
  document.getElementById("vehicleId").value = "";
  document.getElementById("adminSubmitBtn").textContent = "Add Vehicle";
  document.getElementById("cancelEditBtn").style.display = "none";
  
  // Clear image preview
  const imagePreview = document.getElementById("imagePreview");
  if (imagePreview) {
    imagePreview.innerHTML = '<div class="placeholder">Click to upload image</div>';
  }
}

async function editVehicle(id) {
  try {
    console.log('Editing vehicle with ID:', id);
    const vehicles = await getVehicles();
    console.log('Available vehicles:', vehicles);
    const vehicle = vehicles.find((v) => String(v.id) === String(id));
    if (vehicle) {
      console.log('Found vehicle:', vehicle);
      fillVehicleForm(vehicle);
      // Scroll to form for better UX
      document.getElementById('adminVehicleForm').scrollIntoView({ behavior: 'smooth' });
    } else {
      console.log('Vehicle not found');
      notify('adminNotice', 'Vehicle not found', true);
    }
  } catch (error) {
    console.error('Error editing vehicle:', error);
    notify('adminNotice', 'Error loading vehicle data', true);
  }
}

async function deleteVehicle(id) {
  if (!confirm("Delete this vehicle?")) return;
  const response = await fetch(`${API_BASE}/vehicles/${id}`, { method: "DELETE" });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    notify("adminNotice", data.message || "Failed to delete vehicle", true);
    return;
  }
  await fetchVehicles();
  notify("adminNotice", "Vehicle deleted successfully.");
  await renderAdminVehicles();
  await renderListings();
}

function handleAdminPanel() {
  const form = document.getElementById("adminVehicleForm");
  if (!form) return;
  if (!isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }
  const cancelBtn = document.getElementById("cancelEditBtn");
  cancelBtn.addEventListener("click", resetVehicleForm);

  // Image preview functionality
  const imageInput = document.getElementById("image");
  const imagePreview = document.getElementById("imagePreview");
  
  if (imageInput && imagePreview) {
    imageInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          imagePreview.innerHTML = `<img src="${e.target.result}" alt="Vehicle preview" />`;
        };
        reader.readAsDataURL(file);
      }
    });
  }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    try {
      const idRaw = document.getElementById("vehicleId").value;
      const existingId = idRaw ? String(idRaw).trim() : null;
      const owner = localStorage.getItem("vr_user_email") || "";
      formData.set("ownerEmail", owner);

      const url = existingId ? `${API_BASE}/vehicles/${existingId}` : `${API_BASE}/vehicles`;
      const response = await fetch(url, {
        method: existingId ? "PUT" : "POST",
        body: formData
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Request failed");

      await fetchVehicles();

      notify("adminNotice", existingId ? "Vehicle updated successfully." : "Vehicle added successfully.");
      resetVehicleForm();
      await renderAdminVehicles();
      await populateVehicleSelect();
      await renderListings();
    } catch (err) {
      notify("adminNotice", err?.message || "Request failed", true);
    }
  });
  renderAdminVehicles();
}

function notify(targetId, message, isError = false) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.className = `notice ${isError ? "error" : "success"}`;
  el.textContent = message;
}

async function init() {
  setActiveNav();
  updateAuthNav();
  handleDashboard();
  handleAuthForms();
  handleBookingFlow();
  handleSupport();
  renderOffers();
  renderBlog();
  handleAdminPanel();
  await fetchVehicles();
  await populateVehicleSelect();
  await renderListings();
  await renderVehicleDetails();
}

// AI Chatbot functionality
function handleChatbot() {
  const openBtn = document.getElementById("openChatbot");
  const closeBtn = document.getElementById("closeChatbot");
  const container = document.getElementById("chatbotContainer");
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendMessage");
  const messagesContainer = document.getElementById("chatbotMessages");

  if (!openBtn || !container) return;

  openBtn.addEventListener("click", () => {
    container.style.display = "block";
    chatInput.focus();
    // Scroll to bottom when opening
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
  });

  closeBtn.addEventListener("click", () => {
    container.style.display = "none";
  });

  const sendMessage = () => {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message
    addMessage(message, "user");
    chatInput.value = "";

    // Show typing indicator
    addMessage("Typing...", "bot");
    
    // Generate bot response
    setTimeout(() => {
      // Remove typing indicator
      const typingMessage = messagesContainer.querySelector('.bot-message:last-child');
      if (typingMessage && typingMessage.textContent.includes("Typing...")) {
        typingMessage.remove();
      }
      
      const response = generateBotResponse(message);
      addMessage(response, "bot");
    }, 800);
  };

  sendBtn.addEventListener("click", sendMessage);
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  function addMessage(text, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `${sender}-message`;
    messageDiv.innerHTML = `<p>${text}</p>`;
    messagesContainer.appendChild(messageDiv);
    
    // Force scroll to bottom with a small delay to ensure content is rendered
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
  }

  function generateBotResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Booking related queries
    if (lowerMessage.includes("booking") || lowerMessage.includes("book")) {
      return "I can help you with booking! You can book vehicles from our listings page. Make sure you have your driving license ready. What type of vehicle are you looking for?";
    }
    
    // Vehicle related queries
    if (lowerMessage.includes("vehicle") || lowerMessage.includes("car") || lowerMessage.includes("bike")) {
      return "We have a variety of vehicles including cars, SUVs, sedans, bikes, and electric vehicles. You can browse all available vehicles on our listings page. Prices start from \u20B9699/day for bikes and \u20B91599/day for cars.";
    }
    
    // Pricing queries
    if (lowerMessage.includes("price") || lowerMessage.includes("cost") || lowerMessage.includes("rate")) {
      return "Our pricing varies by vehicle type. Bikes start at \u20B9699/day, cars at \u20B91599/day, SUVs at \u20B92399/day, and premium vehicles up to \u20B93199/day. All prices include basic insurance and 14% tax.";
    }
    
    // License queries
    if (lowerMessage.includes("license") || lowerMessage.includes("driving")) {
      return "You'll need a valid driving license to book any vehicle. During the booking process, you'll be asked to enter your driving license number. Make sure it's valid and not expired.";
    }
    
    // Support queries
    if (lowerMessage.includes("help") || lowerMessage.includes("support")) {
      return "I'm here to help! I can assist with booking questions, vehicle information, pricing, and common issues. For complex problems, you can also submit a support ticket through the form below.";
    }
    
    // Contact queries
    if (lowerMessage.includes("contact") || lowerMessage.includes("phone") || lowerMessage.includes("email")) {
      return "You can reach our support team through the contact page, submit a ticket here, or use our live chat. We typically respond within 24 hours for tickets and instantly for chat.";
    }
    
    // Cancellation queries
    if (lowerMessage.includes("cancel") || lowerMessage.includes("refund")) {
      return "For cancellations, please check your booking confirmation email for the cancellation policy. You can also contact support directly for assistance with cancellations and refunds.";
    }
    
    // Default response
    return "I understand you're asking about: " + message + ". I can help with booking, vehicle information, pricing, driving license requirements, and support issues. Could you be more specific about what you need?";
  }
}

function handleSupport() {
  handleChatbot();
  
  const supportForm = document.getElementById("supportForm");
  if (supportForm) {
    supportForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(supportForm).entries());
      const ticket = {
        id: `TK-${Date.now()}`,
        ...data,
        status: "open",
        created: new Date().toLocaleString()
      };
      
      // Save ticket to localStorage
      const tickets = JSON.parse(localStorage.getItem("vr_tickets") || "[]");
      tickets.push(ticket);
      localStorage.setItem("vr_tickets", JSON.stringify(tickets));
      
      // Display ticket
      displayTicket(ticket);
      
      notify("supportNotice", `Ticket ${ticket.id} created successfully!`);
      supportForm.reset();
    });
  }
  
  // Load existing tickets
  const tickets = JSON.parse(localStorage.getItem("vr_tickets") || "[]");
  tickets.forEach(displayTicket);
}

function displayTicket(ticket) {
  const list = document.getElementById("ticketList");
  if (!list) return;
  
  const li = document.createElement("li");
  li.className = "card";
  li.innerHTML = `
    <strong>${ticket.id}</strong> - ${ticket.subject} 
    <span class="status ${ticket.status}">${ticket.status}</span>
    <br><small>${ticket.created}</small>
  `;
  list.appendChild(li);
}

document.addEventListener("DOMContentLoaded", init);

window.renderListings = renderListings;
window.editVehicle = editVehicle;
window.deleteVehicle = deleteVehicle;
