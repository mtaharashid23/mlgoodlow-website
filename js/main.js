import * as THREE from 'three';

// Custom Cursor
const cursorDot = document.querySelector('.cursor-dot');
const cursorOutline = document.querySelector('.cursor-outline');
window.addEventListener('mousemove', (e) => {
  cursorDot.style.left = e.clientX + 'px';
  cursorDot.style.top = e.clientY + 'px';
  cursorOutline.style.left = e.clientX + 'px';
  cursorOutline.style.top = e.clientY + 'px';
});
document.querySelectorAll('a, button, .book-card, .blog-card').forEach(el => {
  el.addEventListener('mouseenter', () => cursorOutline.classList.add('hover'));
  el.addEventListener('mouseleave', () => cursorOutline.classList.remove('hover'));
});

// Lenis Smooth Scroll
let lenis;
try {
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    smoothTouch: false
  });
  lenis.on('scroll', () => {
    if (window.ScrollTrigger) ScrollTrigger.update();
  });
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);
} catch (e) {
  console.warn('Lenis init skipped:', e);
}

// Navigation
const nav = document.getElementById('nav');
const navMenu = document.getElementById('navMenu');
const menuToggle = document.getElementById('menuToggle');
const pageTransition = document.getElementById('pageTransition');
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('[data-page]');
let currentPage = 'home';
let isTransitioning = false;

menuToggle.addEventListener('click', () => {
  menuToggle.classList.toggle('open');
  navMenu.classList.toggle('open');
});
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
});

function navigateToPage(pageId) {
  if (pageId === currentPage || isTransitioning) return;
  isTransitioning = true;
  menuToggle.classList.remove('open');
  navMenu.classList.remove('open');
  const tl = gsap.timeline({
    onComplete: () => {
      isTransitioning = false;
    }
  });
  tl.to(pageTransition, {
      y: '0%',
      duration: 0.5,
      ease: 'power3.inOut'
    })
    .call(() => {
      pages.forEach(p => p.classList.remove('active'));
      const newPage = document.getElementById(`page-${pageId}`);
      if (newPage) newPage.classList.add('active');
      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageId);
      });
      currentPage = pageId;
      if (lenis) lenis.scrollTo(0, {
        immediate: true
      });
      else window.scrollTo(0, 0);
      setTimeout(() => {
        if (window.ScrollTrigger) ScrollTrigger.refresh();
        animatePageIn(newPage);
      }, 50);
    })
    .to(pageTransition, {
      y: '-100%',
      duration: 0.5,
      ease: 'power3.inOut',
      delay: 0.05
    });
}

function animatePageIn(page) {
  if (!page) return;
  const elements = page.querySelectorAll('.section-header, .hero-text > *, .hero-visual, .about-intro, .duality-card, .about-quote, .about-gallery .gallery-item, .featured-book, .book-card, .blog-card, .product-card, .press-kit, .headshot-item, .contact-form, .contact-sidebar, .newsletter-block, .store-hero-text, .store-featured-product, .manifesto-text, .stats-grid, .testimonials-featured, .testimonial-card');
  gsap.fromTo(elements, {
    y: 40,
    opacity: 0
  }, {
    y: 0,
    opacity: 1,
    duration: 0.8,
    stagger: 0.06,
    ease: 'power3.out',
    overwrite: true
  });
}

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const pageId = link.dataset.page;
    if (pageId) navigateToPage(pageId);
  });
});

// Three.js Background
let scene, camera, renderer, petals, iceCrystals;
let mouseX = 0,
  mouseY = 0;

function initThree() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  try {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 8;
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const particleTexture = createParticleTexture();

    const petalCount = 150;
    const petalGeometry = new THREE.BufferGeometry();
    const petalPositions = new Float32Array(petalCount * 3);
    const petalData = [];
    for (let i = 0; i < petalCount; i++) {
      petalPositions[i * 3] = (Math.random() - 0.5) * 30;
      petalPositions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      petalPositions[i * 3 + 2] = (Math.random() - 0.5) * 15;
      petalData.push({
        speedX: (Math.random() - 0.5) * 0.008,
        speedY: -Math.random() * 0.012 - 0.003,
        speedZ: (Math.random() - 0.5) * 0.005
      });
    }
    petalGeometry.setAttribute('position', new THREE.BufferAttribute(petalPositions, 3));
    const petalMaterial = new THREE.PointsMaterial({
      color: 0x3f8fd6,
      size: 0.18,
      map: particleTexture,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    petals = new THREE.Points(petalGeometry, petalMaterial);
    petals.userData.data = petalData;
    scene.add(petals);

    const iceCount = 250;
    const iceGeometry = new THREE.BufferGeometry();
    const icePositions = new Float32Array(iceCount * 3);
    const iceData = [];
    for (let i = 0; i < iceCount; i++) {
      icePositions[i * 3] = (Math.random() - 0.5) * 40;
      icePositions[i * 3 + 1] = (Math.random() - 0.5) * 25;
      icePositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      iceData.push({
        speedX: (Math.random() - 0.5) * 0.004,
        speedY: -Math.random() * 0.005 - 0.001,
        speedZ: (Math.random() - 0.5) * 0.003
      });
    }
    iceGeometry.setAttribute('position', new THREE.BufferAttribute(icePositions, 3));
    const iceMaterial = new THREE.PointsMaterial({
      color: 0xa9c4de,
      size: 0.08,
      map: particleTexture,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    iceCrystals = new THREE.Points(iceGeometry, iceMaterial);
    iceCrystals.userData.data = iceData;
    scene.add(iceCrystals);

    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });
    window.addEventListener('resize', () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    animate();
  } catch (e) {
    console.warn('Three.js init error:', e);
  }
}

function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.15, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function animate() {
  requestAnimationFrame(animate);
  try {
    if (petals) {
      const positions = petals.geometry.attributes.position.array;
      const data = petals.userData.data;
      for (let i = 0; i < data.length; i++) {
        positions[i * 3] += data[i].speedX + Math.sin(Date.now() * 0.0005 + i) * 0.002;
        positions[i * 3 + 1] += data[i].speedY;
        positions[i * 3 + 2] += data[i].speedZ;
        if (positions[i * 3 + 1] < -12) {
          positions[i * 3 + 1] = 12;
          positions[i * 3] = (Math.random() - 0.5) * 30;
        }
        if (positions[i * 3] > 15) positions[i * 3] = -15;
        if (positions[i * 3] < -15) positions[i * 3] = 15;
      }
      petals.geometry.attributes.position.needsUpdate = true;
      petals.rotation.y += 0.0008;
    }
    if (iceCrystals) {
      const positions = iceCrystals.geometry.attributes.position.array;
      const data = iceCrystals.userData.data;
      for (let i = 0; i < data.length; i++) {
        positions[i * 3] += data[i].speedX;
        positions[i * 3 + 1] += data[i].speedY;
        positions[i * 3 + 2] += data[i].speedZ;
        if (positions[i * 3 + 1] < -12) {
          positions[i * 3 + 1] = 12;
          positions[i * 3] = (Math.random() - 0.5) * 40;
        }
      }
      iceCrystals.geometry.attributes.position.needsUpdate = true;
      iceCrystals.rotation.y -= 0.0004;
    }
    if (camera) {
      camera.position.x += (mouseX * 0.8 - camera.position.x) * 0.04;
      camera.position.y += (-mouseY * 0.5 - camera.position.y) * 0.04;
      camera.lookAt(scene.position);
    }
    if (renderer && scene && camera) renderer.render(scene, camera);
  } catch (e) {
    console.warn('Three.js animate error:', e);
  }
}

initThree();

// ScrollTrigger Animations
if (window.ScrollTrigger) {
  const batchConfig = (extra = {}) => Object.assign({
    onEnter: (elements) => {
      gsap.fromTo(elements, {
        y: 50,
        opacity: 0
      }, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        overwrite: true
      });
    },
    start: 'top 85%'
  }, extra);
  ScrollTrigger.batch('.book-card', batchConfig());
  ScrollTrigger.batch('.blog-card', batchConfig());
  ScrollTrigger.batch('.product-card', batchConfig());
  ScrollTrigger.batch('.gallery-item', batchConfig({
    onEnter: (elements) => {
      gsap.fromTo(elements, {
        y: 40,
        opacity: 0,
        scale: 0.95
      }, {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.9,
        stagger: 0.08,
        ease: 'power3.out',
        overwrite: true
      });
    }
  }));
  ScrollTrigger.batch('.headshot-item', batchConfig());
  ScrollTrigger.batch('.stat-item', batchConfig());
  ScrollTrigger.batch('.section-header', batchConfig({
    onEnter: (elements) => {
      gsap.fromTo(elements, {
        y: 30,
        opacity: 0
      }, {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: 'power3.out',
        overwrite: true
      });
    }
  }));
  ScrollTrigger.batch('.about-quote, .media-header-quote, .testimonials-featured, .manifesto-section', batchConfig({
    onEnter: (elements) => {
      gsap.fromTo(elements, {
        y: 40,
        opacity: 0
      }, {
        y: 0,
        opacity: 1,
        duration: 1.2,
        ease: 'power3.out',
        overwrite: true
      });
    },
    start: 'top 80%'
  }));
  ScrollTrigger.batch('.dual-card, .duality-card, .testimonial-card', batchConfig());
  ScrollTrigger.batch('#page-home .about-intro, #page-home .featured-book', batchConfig({
    start: 'top 85%'
  }));

  // Parallax (scoped per-instance since .about-intro now appears on both home and about page)
  document.querySelectorAll('.about-intro').forEach(container => {
    const img1 = container.querySelector('.about-img-1');
    const img2 = container.querySelector('.about-img-2');
    if (img1) {
      gsap.to(img1, {
        yPercent: -15,
        ease: "none",
        scrollTrigger: {
          trigger: container,
          start: "top bottom",
          end: "bottom top",
          scrub: 1
        }
      });
    }
    if (img2) {
      gsap.to(img2, {
        yPercent: 15,
        ease: "none",
        scrollTrigger: {
          trigger: container,
          start: "top bottom",
          end: "bottom top",
          scrub: 1
        }
      });
    }
  });
}

// Form Handling
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let isValid = true;
    const fields = contactForm.querySelectorAll('[required]');
    fields.forEach(field => {
      const wrapper = field.closest('.form-field');
      if (!wrapper) return;
      if (!field.value.trim()) {
        wrapper.classList.add('error');
        isValid = false;
      } else if (field.type === 'email') {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!re.test(field.value)) {
          wrapper.classList.add('error');
          isValid = false;
        } else wrapper.classList.remove('error');
      } else wrapper.classList.remove('error');
    });
    if (isValid) {
      const success = document.getElementById('formSuccess');
      success.classList.add('show');
      contactForm.reset();
      setTimeout(() => success.classList.remove('show'), 5000);
    }
  });
  contactForm.querySelectorAll('input, textarea').forEach(field => {
    field.addEventListener('input', () => {
      const w = field.closest('.form-field');
      if (w) w.classList.remove('error');
    });
  });
}

function setupNewsletter(formId, successId) {
  const form = document.getElementById(formId);
  const success = document.getElementById(successId);
  if (!form || !success) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]');
    if (email && email.value.trim()) {
      success.classList.add('show');
      form.reset();
      setTimeout(() => success.classList.remove('show'), 4000);
    }
  });
}
setupNewsletter('newsletterForm', 'newsletterSuccess');
setupNewsletter('newsletterFormInline', 'newsletterSuccessInline');

// Toast
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');

function showToast(msg) {
  if (toastMsg) toastMsg.textContent = msg;
  if (toast) {
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }
}
document.querySelectorAll('.add-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const card = btn.closest('.product-card');
    const name = card ? card.querySelector('h4').textContent : 'this edition';
    showToast(`We'll notify you when ${name} is available.`);
  });
});

// Magnetic Buttons
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(btn, {
      x: x * 0.2,
      y: y * 0.3,
      duration: 0.4,
      ease: 'power2.out'
    });
  });
  btn.addEventListener('mouseleave', () => {
    gsap.to(btn, {
      x: 0,
      y: 0,
      duration: 0.4,
      ease: 'power2.out'
    });
  });
});

// 3D Tilt
const heroMain = document.querySelector('.hero-image-main');
if (heroMain) {
  heroMain.addEventListener('mousemove', (e) => {
    const rect = heroMain.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(heroMain, {
      rotationY: x * 10,
      rotationX: -y * 10,
      transformPerspective: 800,
      duration: 0.6,
      ease: 'power2.out'
    });
  });
  heroMain.addEventListener('mouseleave', () => {
    gsap.to(heroMain, {
      rotationY: -3,
      rotationX: 0,
      duration: 0.8,
      ease: 'power3.out'
    });
  });
}
document.querySelectorAll('.book-card-cover').forEach(cover => {
  cover.addEventListener('mousemove', (e) => {
    const rect = cover.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(cover, {
      rotationY: x * 8,
      rotationX: -y * 8,
      transformPerspective: 1000,
      duration: 0.5,
      ease: 'power2.out'
    });
  });
  cover.addEventListener('mouseleave', () => {
    gsap.to(cover, {
      rotationY: 0,
      rotationX: 0,
      duration: 0.8,
      ease: 'power3.out'
    });
  });
});

// Initial Preloader + Hero Load Animation
function runHeroLoadAnimation() {
  const heroTitleLines = document.querySelectorAll('#page-home .hero-title .ln span');
  const heroText = document.querySelectorAll('#page-home .hero-text > *:not(.hero-title)');
  const heroVisual = document.querySelector('#page-home .hero-visual');
  gsap.fromTo(heroTitleLines, {
    y: '110%',
    opacity: 0
  }, {
    y: '0%',
    opacity: 1,
    duration: 1.1,
    stagger: 0.1,
    ease: 'power4.out',
    delay: 0.1
  });
  gsap.fromTo(heroText, {
    y: 60,
    opacity: 0
  }, {
    y: 0,
    opacity: 1,
    duration: 1.2,
    stagger: 0.12,
    ease: 'power3.out',
    delay: 0.45
  });
  gsap.fromTo(heroVisual, {
    x: 60,
    opacity: 0,
    scale: 0.95
  }, {
    x: 0,
    opacity: 1,
    scale: 1,
    duration: 1.4,
    ease: 'power3.out',
    delay: 0.55
  });
  setTimeout(() => {
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }, 200);
}

function runPreloaderExit() {
  if (!pageTransition) {
    runHeroLoadAnimation();
    return;
  }
  // Hand control from the CSS fallback animation over to GSAP
  pageTransition.style.animation = 'none';
  const mark = pageTransition.querySelector('.page-transition-mark');
  if (mark) gsap.to(mark, { opacity: 0, duration: 0.3, delay: 0.15 });
  gsap.to(pageTransition, {
    y: '-100%',
    duration: 0.9,
    ease: 'power3.inOut',
    delay: 0.35,
    onComplete: runHeroLoadAnimation
  });
}

if (document.readyState === 'complete') {
  runPreloaderExit();
} else {
  window.addEventListener('load', runPreloaderExit);
}


// Stat Count-Up Animation
if (window.ScrollTrigger) {
  document.querySelectorAll('.stat-num').forEach(el => {
    const raw = el.textContent.trim();
    const num = parseInt(raw, 10);
    if (isNaN(num)) return;
    const suffix = raw.replace(/^[0-9]+/, '');
    const counter = {
      val: 0
    };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.to(counter, {
          val: num,
          duration: 1.6,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = Math.round(counter.val) + suffix;
          },
          onComplete: () => {
            el.textContent = raw;
          }
        });
      }
    });
  });
}