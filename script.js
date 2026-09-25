// Tressform — minimal site interactivity

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Mobile nav toggle
const toggle = document.querySelector('.nav-toggle');
const links  = document.querySelector('.nav-links');
if (toggle && links) {
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  // Close menu when a link is tapped (mobile)
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Booking form — client-side validation + friendly confirmation
const form   = document.getElementById('bookingForm');
const status = document.getElementById('formStatus');

if (form && status) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    status.classList.remove('error');
    status.textContent = '';

    const data = Object.fromEntries(new FormData(form).entries());
    const missing = [];
    if (!data.name || data.name.trim().length < 2) missing.push('name');
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) missing.push('valid email');
    if (!data.service) missing.push('service');

    if (missing.length) {
      status.classList.add('error');
      status.textContent = `Please provide your ${missing.join(', ')}.`;
      return;
    }

    // No backend wired up — show a confirmation locally.
    status.textContent = `Thanks, ${data.name.split(' ')[0]}! We'll email ${data.email} within one business day to confirm your ${data.service}.`;
    form.reset();
  });
}
