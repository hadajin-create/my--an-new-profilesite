// =============================
// Utility: debounce / throttle
// =============================
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = function () {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// =============================
// Mobile Menu
// =============================
function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  if (!hamburger || !navMenu) return;

  hamburger.addEventListener('click', function () {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
  });

  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      hamburger.classList.remove('active');
      navMenu.classList.remove('active');
    });
  });

  window.addEventListener(
    'resize',
    debounce(function () {
      if (window.innerWidth > 768) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
      }
    }, 250)
  );
}

// =============================
// Expandable Content (accordion-like)
// =============================
function initExpandableContent() {
  const titles = document.querySelectorAll('.hobby-title');
  const buttons = document.querySelectorAll('.expand-btn');

  function toggleByTitle(titleEl) {
    if (!titleEl) return;
    const content = titleEl.nextElementSibling;
    if (!content || !content.classList.contains('expandable-content')) return;

    const btn = titleEl.querySelector('.expand-btn');
    const icon = btn ? btn.querySelector('i') : null;

    content.classList.toggle('active');
    if (btn) btn.classList.toggle('active');
    if (icon) {
      icon.style.transform =
        btn && btn.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
    }

    if (content.classList.contains('active')) {
      setTimeout(() => {
        content.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 300);
    }
  }

  titles.forEach((title) => {
    title.addEventListener('click', (e) => {
      if (e.target.closest('.expand-btn')) return;
      toggleByTitle(title);
    });
    title.setAttribute('tabindex', '0');
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleByTitle(title);
      }
    });
  });

  buttons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const title = btn.closest('.hobby-title');
      toggleByTitle(title);
    });
  });
}

// =============================
// Interest Card Flip
// =============================
function initInterestCardFlip() {
  const cards = document.querySelectorAll('.interest-card');
  cards.forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      card.classList.toggle('flipped');
      card.setAttribute('aria-pressed', String(card.classList.contains('flipped')));
    });
    if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.classList.toggle('flipped');
        card.setAttribute('aria-pressed', String(card.classList.contains('flipped')));
      }
    });
  });
}

// =============================
// Header background on scroll
// =============================
function initHeaderScrollEffect() {
  const header = document.querySelector('.header');
  if (!header) return;

  window.addEventListener(
    'scroll',
    debounce(function () {
      if (window.scrollY > 100) {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
        header.style.backdropFilter = 'blur(10px)';
      } else {
        header.style.background = '#fff';
        header.style.backdropFilter = 'none';
      }
    }, 10)
  );
}

// =============================
// Scroll Animations
// =============================
function addAnimationStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .fade-in-up{opacity:0;transform:translateY(30px);transition:opacity .6s ease,transform .6s ease;}
    .fade-in-up.animate-in{opacity:1;transform:translateY(0);}
    .fade-in-left{opacity:0;transform:translateX(-30px);transition:opacity .6s ease,transform .6s ease;}
    .fade-in-left.animate-in{opacity:1;transform:translateX(0);}
    .fade-in-right{opacity:0;transform:translateX(30px);transition:opacity .6s ease,transform .6s ease;}
    .fade-in-right.animate-in{opacity:1;transform:translateX(0);}
    .scale-in{opacity:0;transform:scale(.9);transition:opacity .6s ease,transform .6s ease;}
    .scale-in.animate-in{opacity:1;transform:scale(1);}
    .rotate-in{opacity:0;transform:rotate(-5deg) scale(.9);transition:opacity .6s ease,transform .6s ease;}
    .rotate-in.animate-in{opacity:1;transform:rotate(0) scale(1);}
  `;
  document.head.appendChild(style);
}

function observeElements(observer) {
  const cards = document.querySelectorAll(
    '.interest-card, .service-card, .strength-card, .example-card, .area-card, .info-card'
  );
  cards.forEach(function (card, index) {
    card.classList.add('fade-in-up');
    card.style.transitionDelay = index * 0.1 + 's';
    observer.observe(card);
  });

  const profileCard = document.querySelector('.profile-card');
  if (profileCard) {
    profileCard.classList.add('scale-in');
    observer.observe(profileCard);
  }

  const leftContents = document.querySelectorAll('.values-text, .motivation-text, .about-text');
  leftContents.forEach(function (content) {
    content.classList.add('fade-in-left');
    observer.observe(content);
  });

  const rightContents = document.querySelectorAll(
    '.values-image, .motivation-image, .about-image'
  );
  rightContents.forEach(function (content) {
    content.classList.add('fade-in-right');
    observer.observe(content);
  });

  const goalCard = document.querySelector('.goal-card');
  if (goalCard) {
    goalCard.classList.add('rotate-in');
    observer.observe(goalCard);
  }

  const stepItems = document.querySelectorAll('.step-item');
  stepItems.forEach(function (item, index) {
    item.classList.add('fade-in-left');
    item.style.transitionDelay = index * 0.2 + 's';
    observer.observe(item);
  });

  const commitmentItems = document.querySelectorAll('.commitment-item');
  commitmentItems.forEach(function (item, index) {
    item.classList.add('fade-in-up');
    item.style.transitionDelay = index * 0.1 + 's';
    observer.observe(item);
  });
}

function initScrollAnimations() {
  const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) entry.target.classList.add('animate-in');
    });
  }, observerOptions);

  addAnimationStyles();
  setTimeout(function () {
    observeElements(observer);
  }, 100);
}

// =============================
// Lazy Loading Images
// =============================
function initLazyLoading() {
  const images = document.querySelectorAll('img[data-src]');
  if (images.length === 0) return;

  const imageObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.remove('lazy');
        imageObserver.unobserve(img);
        img.onload = function () {
          this.style.opacity = '1';
        };
      }
    });
  });

  images.forEach(function (img) {
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.3s ease';
    imageObserver.observe(img);
  });
}

// =============================
// Smooth Scroll for anchor links
// =============================
function initSmoothAnchorScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const hash = this.getAttribute('href');
      // allow "#" with no target to do nothing
      const target = hash ? document.querySelector(hash) : null;
      if (!target) return;
      e.preventDefault();
      const header = document.querySelector('.header');
      const headerHeight = header ? header.offsetHeight : 0;
      const targetPosition = target.offsetTop - headerHeight - 20;

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    });
  });
}

// =============================
// Simple Form Helpers
// =============================
function validateForm(form) {
  const inputs = form.querySelectorAll('input[required], textarea[required]');
  let isValid = true;
  inputs.forEach(function (input) {
    if (!input.value.trim()) {
      input.classList.add('error');
      isValid = false;
    } else {
      input.classList.remove('error');
    }
  });
  return isValid;
}

function showLoading(element) {
  if (!element) return;
  element.style.opacity = '0.7';
  element.style.pointerEvents = 'none';
  element.style.cursor = 'wait';
}

function hideLoading(element) {
  if (!element) return;
  element.style.opacity = '1';
  element.style.pointerEvents = 'auto';
  element.style.cursor = 'default';
}

// =============================
// Page Specific Features (stubs OK)
// =============================
function getCurrentPage() {
  const path = window.location.pathname;
  const page = path.split('/').pop().split('.')[0];
  return page || 'index';
}

function initAboutPageFeatures() {
  const secretCard = document.querySelector('.secret-card');
  if (secretCard) {
    secretCard.addEventListener('click', function () {
      this.style.transform = 'scale(1.05)';
      setTimeout(() => {
        this.style.transform = 'scale(1)';
      }, 200);
    });
  }

  const hobbyImages = document.querySelectorAll('.hobby-image img, .country-img');
  hobbyImages.forEach(function (img) {
    img.addEventListener('mouseenter', function () {
      this.style.transform = 'scale(1.1)';
      this.style.transition = 'transform 0.3s ease';
    });
    img.addEventListener('mouseleave', function () {
      this.style.transform = 'scale(1)';
    });
  });
}

function initStrengthsPageFeatures() {
  const strengthCards = document.querySelectorAll('.strength-card');
  strengthCards.forEach(function (card) {
    card.addEventListener('mouseenter', function () {
      const icon = this.querySelector('.strength-icon');
      if (icon) icon.style.transform = 'rotate(5deg) scale(1.1)';
    });
    card.addEventListener('mouseleave', function () {
      const icon = this.querySelector('.strength-icon');
      if (icon) icon.style.transform = 'rotate(0deg) scale(1)';
    });
  });
}

function initGoalsPageFeatures() {
  // 目標ページ固有の処理があればここに
}

function initPageSpecificFeatures() {
  const currentPage = getCurrentPage();
  switch (currentPage) {
    case 'index':
      initAboutPageFeatures();
      break;
    case 'strengths':
      initStrengthsPageFeatures();
      break;
    case 'goals':
      initGoalsPageFeatures();
      break;
  }
}

// =============================
// Strengths card expand
// =============================
function initStrengthsExpand() {
  const cards = document.querySelectorAll('.strength-card');
  cards.forEach((card) => {
    const btn = card.querySelector('.strength-expand');
    const details = card.querySelector('.strength-details');
    if (!btn || !details) return;

    details.classList.remove('active');
    details.style.maxHeight = '0px';
    details.style.overflow = 'hidden';
    details.style.transition = 'max-height 0.3s ease';

    const toggle = () => {
      const isOpen = details.classList.toggle('active');
      details.style.maxHeight = isOpen ? details.scrollHeight + 'px' : '0px';
      btn.classList.toggle('active', isOpen);
    };

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggle();
    });
    if (!btn.hasAttribute('tabindex')) btn.setAttribute('tabindex', '0');
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
}

// =============================
// Global Error / Performance (optional dev helpers)
// =============================
window.addEventListener('error', function (e) {
  // 開発時の簡易ログ。不要なら削除可。
  console.error('JavaScript Error:', e.error);
});

if (typeof performance !== 'undefined' && performance.mark) {
  performance.mark('script-start');
  window.addEventListener('load', function () {
    performance.mark('script-end');
    performance.measure('script-execution', 'script-start', 'script-end');
    const measure = performance.getEntriesByName('script-execution')[0];
    console.log('Script execution time:', measure.duration + 'ms');
  });
}

// =============================
// Boot
// =============================
document.addEventListener('DOMContentLoaded', function () {
  initMobileMenu();
  initExpandableContent();
  initInterestCardFlip();
  initHeaderScrollEffect();
  initScrollAnimations();
  initLazyLoading();
  initSmoothAnchorScroll();
  initPageSpecificFeatures();
  initStrengthsExpand();

  initReactions();
});

// ==== Reactions (Favorite / Like / Share) – UIだけ復活（計測しない版） ====
function initReactions() {
  // ====== お気に入り（ページ全体のボタン） ======
  const favBtn = document.getElementById('favBtn');
  const favCountEl = document.getElementById('favCount');

  // ページごとのキー（URLパス単位）
  const pageKey = (location.pathname.replace(/\/$/, '') || '/');
  const favCountKey = `fav:${pageKey}:count`;
  const favFlagKey  = `fav:${pageKey}:fav`;

  const getCount = () => Number(localStorage.getItem(favCountKey) || 0);
  const setCount = (n) => localStorage.setItem(favCountKey, String(n));
  const getFav   = () => localStorage.getItem(favFlagKey) === '1';
  const setFav   = (v) => localStorage.setItem(favFlagKey, v ? '1' : '0');

  // 初期表示
  if (favBtn && favCountEl) {
    favCountEl.textContent = getCount();
    const f = getFav();
    favBtn.setAttribute('aria-pressed', f ? 'true' : 'false');
    favBtn.title = f ? 'お気に入り済み' : '';
  }

  // クリックでトグル
  if (favBtn && favCountEl) {
    favBtn.addEventListener('click', () => {
      let f = getFav();
      let c = getCount();
      if (f) { // 解除
        f = false; c = Math.max(0, c - 1);
        setFav(false);
      } else { // 登録
        f = true; c = c + 1;
        setFav(true);
      }
      setCount(c);
      favBtn.setAttribute('aria-pressed', f ? 'true' : 'false');
      favBtn.title = f ? 'お気に入り済み' : '';
      favCountEl.textContent = c;
    });
  }

  // ====== カード裏面の「いいね」ボタン（.btn-like[data-like-id]） ======
  document.querySelectorAll('.interest-card .card-back .btn-like[data-like-id]').forEach((btn) => {
    const likeId = btn.getAttribute('data-like-id');
    const countEl = btn.querySelector('.like-count');

    const keyLiked = (id) => `like:${pageKey}:${id}:liked`;
    const keyCount = (id) => `like:${pageKey}:${id}:count`;
    const getLiked = (id) => localStorage.getItem(keyLiked(id)) === '1';
    const setLiked = (id, v) => localStorage.setItem(keyLiked(id), v ? '1' : '0');
    const getLikeCount = (id) => Number(localStorage.getItem(keyCount(id)) || 0);
    const setLikeCount = (id, n) => localStorage.setItem(keyCount(id), String(n));

    // 初期表示
    const liked = getLiked(likeId);
    btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
    if (countEl) countEl.textContent = getLikeCount(likeId);

    // クリック（カード反転等に影響しないよう伝播停止）
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      let liked = getLiked(likeId);
      let count = getLikeCount(likeId);
      if (liked) {
        liked = false; count = Math.max(0, count - 1);
        setLiked(likeId, false);
      } else {
        liked = true; count = count + 1;
        setLiked(likeId, true);
      }
      setLikeCount(likeId, count);
      btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
      if (countEl) countEl.textContent = count;
    });

    // キーボード対応
    if (!btn.hasAttribute('tabindex')) btn.setAttribute('tabindex', '0');
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
    });
  });

  // ====== シェアボタン（#shareBtn） ======
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const shareData = { title: document.title || 'シェア', text: document.title || '', url: location.href };
      // Web Share API
      if (navigator.share) {
        try { await navigator.share(shareData); return; } catch (e) { /* キャンセル等はフォールバック */ }
      }
      // フォールバック：URLコピー
      try {
        await navigator.clipboard.writeText(location.href);
        alert('URLをコピーしました！');
      } catch (_) {
        // さらにどうしてもコピーできない場合は簡易プロンプト
        prompt('このURLをコピーしてください', location.href);
      }
    });
  }
}

const likeBtn = document.getElementById("likeBtn");
const likeCountEl = document.getElementById("likeCount");

// localStorageから取得
let liked = localStorage.getItem("liked") === "1";
let count = Number(localStorage.getItem("like_count") || 0);

// 初期表示
likeCountEl.textContent = count;
if (liked) {
  likeBtn.disabled = true; // いいね済みなら押せない
}

likeBtn.addEventListener("click", () => {
  if (liked) return; // すでにいいね済みなら無効

  count++;
  liked = true;

  // 保存
  localStorage.setItem("like_count", count);
  localStorage.setItem("liked", "1");

  // 表示更新
  likeCountEl.textContent = count;
  likeBtn.disabled = true;
});