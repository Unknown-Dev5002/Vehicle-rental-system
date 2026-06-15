(function () {
  const API_BASE = "http://localhost:5000/api";

  function showNotice(el, message, isError) {
    if (!el) return;
    el.textContent = message;
    el.className = `contact-notice is-visible ${isError ? "error" : "success"}`;
  }

  function initContactForm() {
    const form = document.getElementById("contactForm");
    if (!form) return;

    const notice = document.getElementById("contactNotice");
    const submitBtn = document.getElementById("contactSubmitBtn");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const topic = form.topic.value.trim();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const message = form.message.value.trim();

      if (!name || !email || !message) {
        showNotice(notice, "Please fill in all required fields.", true);
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showNotice(notice, "Please enter a valid email address.", true);
        return;
      }

      const originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";
      notice.className = "contact-notice";

      try {
        const response = await fetch(`${API_BASE}/contact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, name, email, message })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Failed to send message. Please try again.");
        }

        showNotice(
          notice,
          data.message || "Thank you! Your message has been sent. We'll reply to your email shortly.",
          false
        );
        form.reset();
      } catch (err) {
        const isNetwork =
          err.message === "Failed to fetch" ||
          err.name === "TypeError";

        showNotice(
          notice,
          isNetwork
            ? "Could not reach the server. Make sure the backend is running on port 5000, then try again."
            : err.message || "Something went wrong. Please try again.",
          true
        );
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initContactForm);
  } else {
    initContactForm();
  }
})();