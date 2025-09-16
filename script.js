// DOM読み込み完了後に実行
document.addEventListener('DOMContentLoaded', function() {
    // モバイルメニューの制御
    initMobileMenu();
    
    // 展開表示機能の初期化
    initExpandableContent();
    
    // スクロール時のヘッダー背景変更
    initHeaderScrollEffect();
    
    // スクロールアニメーション
    initScrollAnimations();
    
    // 画像の遅延読み込み
    initLazyLoading();
});

// =============================
// Analytics: common dataLayer + GTM diagnostics
// =============================
// 小さなデバッグスイッチ：?dl_debug=1 で localStorage に保存
(function latchDlDebugParamOnce() {
  try {
    if (!window.__DL_DEBUG_LATCHED__) {
      const params = new URLSearchParams(location.search);
      if (params.get('dl_debug') === '1') localStorage.setItem('dl_debug', '1');
      window.__DL_DEBUG_LATCHED__ = true;
    }
  } catch (_) {}
})();

// dataLayer.push() wrapper to ensure common fields
const GTM_EXPECTED_CONTAINER_ID = 'GTM-TB5ZLHH5';

function gtmDiagLog(message, details) {
  try {
    if (localStorage.getItem('dl_debug') === '1') {
      const prefix = '[GTM_DIAG]';
      if (details !== undefined) {
        console.log(prefix + ' ' + message, details);
      } else {
        console.log(prefix + ' ' + message);
      }
    }
  } catch (_) {}
}

function pushDL(payload) {
  try {
    window.dataLayer = window.dataLayer || [];
    const base = {
      page_path: location.pathname,
      page_title: document.title,
      source: 'datalayer'
    };
    const merged = Object.assign({}, base, payload);

    // Diagnostics: check GTM availability & container id
    const gtm = window.google_tag_manager;
    if (!gtm) {
      gtmDiagLog('CAUSE:NO_GTM google_tag_manager not present. gtm.js not loaded or blocked (ad blocker, CSP, network).');
    } else {
      const ids = Object.keys(gtm);
      gtmDiagLog('google_tag_manager present. containers:', ids);
      if (GTM_EXPECTED_CONTAINER_ID && !gtm[GTM_EXPECTED_CONTAINER_ID]) {
        gtmDiagLog('CAUSE:ID_MISMATCH expected container not present. Check snippet ID or workspace publish status.', { expected: GTM_EXPECTED_CONTAINER_ID, detected: ids });
      }
    }

    // lightweight debug switch: add ?dl_debug=1 or set localStorage.dl_debug='1'
    // URL param is latched into localStorage once per load
    if (!window.__DL_DEBUG_INITED__) {
      try {
        const params = new URLSearchParams(location.search);
        if (params.get('dl_debug') === '1') localStorage.setItem('dl_debug', '1');
      } catch (_) {}
      window.__DL_DEBUG_INITED__ = true;
    }
    const debugOn = (localStorage.getItem('dl_debug') === '1');
    if (debugOn) {
      const before = Array.isArray(window.dataLayer) ? window.dataLayer.length : NaN;
      // eslint-disable-next-line no-console
      console.log('DL push:', merged);
      setTimeout(() => {
        const after = Array.isArray(window.dataLayer) ? window.dataLayer.length : NaN;
        gtmDiagLog('DL length delta', { before, after, diff: (isFinite(before) && isFinite(after)) ? (after - before) : null });
      }, 0);
    }

    // Do not override explicit payload fields (incl. event)
    window.dataLayer.push(merged);
  } catch (e) {
    // Fail-safe: never throw from analytics
    console.warn('pushDL failed', e);
  }
}

// =============================
// GTM Diagnostics (opt-in via ?dl_debug=1 or localStorage.dl_debug=1)
// =============================
(function initGtmDiagnostics() {
  const debugOn = (() => { try { return localStorage.getItem('dl_debug') === '1'; } catch (_) { return false; } })();
  if (!debugOn) return;

  // helper
  const now = () => (performance && performance.now ? performance.now() : Date.now());

  // 1) 既存の dataLayer 初期値確認（gtm.js イベントがあるか）
  try {
    const dl = window.dataLayer;
    if (Array.isArray(dl)) {
      const hasGtmJs = dl.some(e => e && e.event === 'gtm.js');
      gtmDiagLog('BOOT dataLayer present', { length: dl.length, has_gtm_js_event: !!hasGtmJs });
    } else {
      gtmDiagLog('BOOT dataLayer not array or missing', { type: typeof dl });
    }
  } catch (_) {}

  // 2) dataLayer.push をスパイ（他ソースの push 可視化）
  try {
    const dl = window.dataLayer = window.dataLayer || [];
    if (!dl.__gtmPushWrapped__) {
      const origPush = dl.push.bind(dl);
      dl.push = function () {
        try {
          const args = Array.from(arguments || []);
          const evt = (args && args[0] && args[0].event) ? String(args[0].event) : undefined;
          gtmDiagLog('DL.push intercepted', { event: evt, payload: args[0] });
        } catch (_) {}
        return origPush.apply(null, arguments);
      };
      Object.defineProperty(dl, '__gtmPushWrapped__', { value: true });
      gtmDiagLog('DL.push wrapped for diagnostics');
    }
  } catch (_) {}

  // 3) GTM スクリプト要素の検知とエラー監視
  try {
    const tagSelector = 'script[src*="googletagmanager.com/gtm.js"]';
    const tag = document.querySelector(tagSelector);
    if (tag) {
      gtmDiagLog('GTM script tag present', { src: tag.src, async: tag.async, defer: tag.defer });
    } else {
      gtmDiagLog('GTM script tag NOT found in DOM');
    }

    // 以後に追加される場合も監視
    const mo = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        m.addedNodes && Array.from(m.addedNodes).forEach(n => {
          if (n && n.tagName === 'SCRIPT') {
            const s = n;
            if (s.src && s.src.includes('googletagmanager.com/gtm.js')) {
              gtmDiagLog('GTM script inserted', { src: s.src });
              s.addEventListener('load', () => gtmDiagLog('GTM script load event fired'));
              s.addEventListener('error', () => gtmDiagLog('CAUSE:SCRIPT_LOAD_ERROR gtm.js load failed (network/adblock/CSP)'));
            }
          }
        });
      });
    });
    try { mo.observe(document.documentElement || document.body, { childList: true, subtree: true }); } catch (_) {}
  } catch (_) {}

  // 4) google_tag_manager の検知をポーリング（最大5秒）
  try {
    const t0 = now();
    let hit = false;
    const idsAtStart = Object.keys(window.google_tag_manager || {});
    gtmDiagLog('Initial google_tag_manager ids', idsAtStart);
    const iv = setInterval(() => {
      const gtm = window.google_tag_manager;
      if (gtm && Object.keys(gtm).length) {
        hit = true;
        clearInterval(iv);
        const ids = Object.keys(gtm);
        gtmDiagLog('google_tag_manager detected', { ids, detected_ms: Math.round(now() - t0) });
        if (GTM_EXPECTED_CONTAINER_ID && !gtm[GTM_EXPECTED_CONTAINER_ID]) {
          gtmDiagLog('CAUSE:ID_MISMATCH expected container not present after detection', { expected: GTM_EXPECTED_CONTAINER_ID, detected: ids });
        }
      }
    }, 100);
    setTimeout(() => {
      if (!hit) {
        clearInterval(iv);
        gtmDiagLog('CAUSE:TIMEOUT google_tag_manager not detected within 5000ms');
      }
    }, 5000);
  } catch (_) {}

  // 5) リソースロードエラー（スクリプト/リンク）の検知
  try {
    window.addEventListener('error', function (e) {
      try {
        const t = e && e.target;
        if (t && (t.tagName === 'SCRIPT' || t.tagName === 'LINK' || t.tagName === 'IMG')) {
          const src = t.tagName === 'LINK' ? t.href : t.src;
          gtmDiagLog('RESOURCE_ERROR', { tag: t.tagName, src });
          if (src && src.includes('googletagmanager.com/gtm.js')) {
            gtmDiagLog('CAUSE:SCRIPT_LOAD_ERROR gtm.js resource error captured');
          }
        }
      } catch (_) {}
    }, true);
  } catch (_) {}
})();

// モバイルメニューの制御
function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (!hamburger || !navMenu) return;

    // ハンバーガーメニューのクリックイベント
    hamburger.addEventListener('click', function() {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // ナビゲーションリンクのクリックでメニューを閉じる
    navLinks.forEach(function(link) {
        link.addEventListener('click', function() {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // ウィンドウリサイズ時の処理
    window.addEventListener('resize', debounce(function() {
        if (window.innerWidth > 768) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        }
    }, 250));
}

// 展開表示機能の初期化  ← これに差し替え
function initExpandableContent() {
  const titles = document.querySelectorAll('.hobby-title');
  const buttons = document.querySelectorAll('.expand-btn');

  // 共通トグル関数：タイトル要素を基準に開閉を揃える
  function toggleByTitle(titleEl) {
    if (!titleEl) return;
    const content = titleEl.nextElementSibling;                        // タイトル直後の .expandable-content
    if (!content || !content.classList.contains('expandable-content')) return;

    const btn  = titleEl.querySelector('.expand-btn');                 // 矢印ボタン（あれば同期）
    const icon = btn ? btn.querySelector('i') : null;

    // 開閉トグル
    content.classList.toggle('active');
    if (btn) btn.classList.toggle('active');

    // アイコン回転を同期
    if (icon) {
      icon.style.transform = (btn && btn.classList.contains('active'))
        ? 'rotate(180deg)'
        : 'rotate(0deg)';
    }

    // 開いたらスクロール（任意）
    if (content.classList.contains('active')) {
      setTimeout(() => {
        content.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 300);
    }
  }

  // ① タイトル全体クリックで開閉  ←★追加
  titles.forEach((title) => {
    title.addEventListener('click', (e) => {
      // タイトル内のボタンをクリックしたときは、ボタンの処理に委ねる
      if (e.target.closest('.expand-btn')) return;
      toggleByTitle(title);
    });

    // キーボードでも開閉（Enter / Space）
    title.setAttribute('tabindex', '0');
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleByTitle(title);
      }
    });
  });

  // ② 既存のボタンクリックはタイトル基準に統一  ←★修正
  buttons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();                 // タイトルクリックと二重発火を防ぐ
      const title = btn.closest('.hobby-title');
      toggleByTitle(title);
    });
  });
}
// 反転カードの初期化
function initInterestCardFlip() {
  const cards = document.querySelectorAll('.interest-card');

  cards.forEach((card) => {
    // クリックで反転
    card.addEventListener('click', (e) => {
      // カード内にリンク/ボタンがある場合はそれを優先
      if (e.target.closest('a, button')) return;

      card.classList.toggle('flipped');
      card.setAttribute('aria-pressed', String(card.classList.contains('flipped')));
    });

    // キーボード操作（Enter / Space）でも反転
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

// DOM読み込み後に起動
document.addEventListener('DOMContentLoaded', () => {
  initInterestCardFlip();
  // （アコーディオンを使うなら）initExpandableContent(); もここで
});

// GTM presence diagnostics (debug only)
window.addEventListener('load', () => {
  try {
    const debugOn = (localStorage.getItem('dl_debug') === '1');
    if (!debugOn) return;
    const ids = Object.keys(window.google_tag_manager || {});
    gtmDiagLog('BOOT check google_tag_manager containers', ids);
    if (!window.google_tag_manager) {
      gtmDiagLog('CAUSE:NO_GTM at load. Likely blocked or snippet missing.');
    } else if (GTM_EXPECTED_CONTAINER_ID && !window.google_tag_manager[GTM_EXPECTED_CONTAINER_ID]) {
      gtmDiagLog('CAUSE:ID_MISMATCH at load. Expected container not detected.', { expected: GTM_EXPECTED_CONTAINER_ID, detected: ids });
    }
  } catch (_) {}
});

// スクロール時のヘッダー背景変更
function initHeaderScrollEffect() {
    const header = document.querySelector('.header');
    if (!header) return;
    
    window.addEventListener('scroll', debounce(function() {
        if (window.scrollY > 100) {
            header.style.background = 'rgba(255, 255, 255, 0.95)';
            header.style.backdropFilter = 'blur(10px)';
        } else {
            header.style.background = '#fff';
            header.style.backdropFilter = 'none';
        }
    }, 10));
}

// スクロールアニメーションの実装
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // アニメーション用CSSクラスを追加
    addAnimationStyles();

    // アニメーション対象要素の監視開始
    setTimeout(function() {
        observeElements(observer);
    }, 100);
}

// アニメーション用CSSスタイルを動的に追加
function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .fade-in-up {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .fade-in-up.animate-in {
            opacity: 1;
            transform: translateY(0);
        }
        
        .fade-in-left {
            opacity: 0;
            transform: translateX(-30px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .fade-in-left.animate-in {
            opacity: 1;
            transform: translateX(0);
        }
        
        .fade-in-right {
            opacity: 0;
            transform: translateX(30px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .fade-in-right.animate-in {
            opacity: 1;
            transform: translateX(0);
        }
        
        .scale-in {
            opacity: 0;
            transform: scale(0.9);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .scale-in.animate-in {
            opacity: 1;
            transform: scale(1);
        }
        
        .rotate-in {
            opacity: 0;
            transform: rotate(-5deg) scale(0.9);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .rotate-in.animate-in {
            opacity: 1;
            transform: rotate(0deg) scale(1);
        }
    `;
    document.head.appendChild(style);
}

// アニメーション対象要素の監視設定
function observeElements(observer) {
    // カード系要素
    const cards = document.querySelectorAll('.interest-card, .service-card, .strength-card, .example-card, .area-card, .info-card');
    cards.forEach(function(card, index) {
        card.classList.add('fade-in-up');
        card.style.transitionDelay = (index * 0.1) + 's';
        observer.observe(card);
    });

    // プロフィール要素
    const profileCard = document.querySelector('.profile-card');
    if (profileCard) {
        profileCard.classList.add('scale-in');
        observer.observe(profileCard);
    }

    // 左右のコンテンツ
    const leftContents = document.querySelectorAll('.values-text, .motivation-text, .about-text');
    leftContents.forEach(function(content) {
        content.classList.add('fade-in-left');
        observer.observe(content);
    });

    const rightContents = document.querySelectorAll('.values-image, .motivation-image, .about-image');
    rightContents.forEach(function(content) {
        content.classList.add('fade-in-right');
        observer.observe(content);
    });

    // 目標カード
    const goalCard = document.querySelector('.goal-card');
    if (goalCard) {
        goalCard.classList.add('rotate-in');
        observer.observe(goalCard);
    }

    // ステップ要素
    const stepItems = document.querySelectorAll('.step-item');
    stepItems.forEach(function(item, index) {
        item.classList.add('fade-in-left');
        item.style.transitionDelay = (index * 0.2) + 's';
        observer.observe(item);
    });

    // コミット要素
    const commitmentItems = document.querySelectorAll('.commitment-item');
    commitmentItems.forEach(function(item, index) {
        item.classList.add('fade-in-up');
        item.style.transitionDelay = (index * 0.1) + 's';
        observer.observe(item);
    });
}

// 画像の遅延読み込み
function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    if (images.length === 0) return;
    
    const imageObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
                
                // 読み込み完了後のフェードイン効果
                img.onload = function() {
                    this.style.opacity = '1';
                };
            }
        });
    });

    images.forEach(function(img) {
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.3s ease';
        imageObserver.observe(img);
    });
}

// スムーススクロールの実装（ページ内リンク用）
document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerHeight = document.querySelector('.header') ? 
                document.querySelector('.header').offsetHeight : 0;
            const targetPosition = target.offsetTop - headerHeight - 20;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// フォームの簡単なバリデーション（将来的な拡張用）
function validateForm(form) {
    const inputs = form.querySelectorAll('input[required], textarea[required]');
    let isValid = true;

    inputs.forEach(function(input) {
        if (!input.value.trim()) {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.remove('error');
        }
    });

    return isValid;
}

// ローディング状態の管理
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

// デバウンス関数（パフォーマンス最適化）
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = function() {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// スロットル関数（パフォーマンス最適化）
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ページ固有の機能
function initPageSpecificFeatures() {
    const currentPage = getCurrentPage();
    
    switch(currentPage) {
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

// 現在のページを取得
function getCurrentPage() {
    const path = window.location.pathname;
    const page = path.split('/').pop().split('.')[0];
    return page || 'index';
}

// 私についてページの機能
function initAboutPageFeatures() {
    // 秘密カードのクリック効果
    const secretCard = document.querySelector('.secret-card');
    if (secretCard) {
        secretCard.addEventListener('click', function() {
            this.style.transform = 'scale(1.05)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 200);
        });
    }

    // 趣味画像のホバー効果
    const hobbyImages = document.querySelectorAll('.hobby-image img, .country-img');
    hobbyImages.forEach(function(img) {
        img.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        img.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
}

// 強みページの機能
function initStrengthsPageFeatures() {
    // 強みカードのホバー効果強化
    const strengthCards = document.querySelectorAll('.strength-card');
    strengthCards.forEach(function(card) {
        card.addEventListener('mouseenter', function() {
            const icon = this.querySelector('.strength-icon');
            if (icon) {
                icon.style.transform = 'rotate(5deg) scale(1.1)';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            const icon = this.querySelector('.strength-icon');
            if (icon) {
                icon.style.transform = 'rotate(0deg) scale(1)';
            }
        });
    });
}



// エラーハンドリング
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
});

// ページ固有の機能を初期化
document.addEventListener('DOMContentLoaded', function() {
    initPageSpecificFeatures();
});

// パフォーマンス監視（開発時のみ）
if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark('script-start');
    
    window.addEventListener('load', function() {
        performance.mark('script-end');
        performance.measure('script-execution', 'script-start', 'script-end');
        
        const measure = performance.getEntriesByName('script-execution')[0];
        console.log('Script execution time:', measure.duration + 'ms');
    });
}

function initStrengthsExpand() {
  const cards = document.querySelectorAll('.strength-card');

  cards.forEach((card) => {
    const btn = card.querySelector('.strength-expand');              // 展開ボタン
    const details = card.querySelector('.strength-details');          // 展開対象

    if (!btn || !details) return;

    // 初期状態（閉じる）
    details.classList.remove('active');
    details.style.maxHeight = '0px';
    details.style.overflow = 'hidden';
    details.style.transition = 'max-height 0.3s ease';

    const toggle = () => {
      const isOpen = details.classList.toggle('active');
      if (isOpen) {
        // いったんautoで高さ取得→px指定でスムーズ開閉
        details.style.maxHeight = details.scrollHeight + 'px';
        btn.classList.add('active');
      } else {
        details.style.maxHeight = '0px';
        btn.classList.remove('active');
      }
    };

    // クリック/Enter/Spaceで開閉
    btn.addEventListener('click', (e) => { e.preventDefault(); toggle(); });
    if (!btn.hasAttribute('tabindex')) btn.setAttribute('tabindex', '0');
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
}

// DOM読み込み後に起動のどこか（既存のDOMContentLoaded内）で呼ぶ
document.addEventListener('DOMContentLoaded', () => {
  initStrengthsExpand();
});

// ==== Reactions (Favorite & Share) ====
(function () {
  // 要素参照
  const favBtn = document.getElementById('favBtn');
  const favCountEl = document.getElementById('favCount');
  const shareBtn = document.getElementById('shareBtn');
  if (!favBtn && !shareBtn) return;

  // ページキー（URLパスごとに分ける）
  const pageKeyBase = (location.pathname.replace(/\/$/, '') || '/');
  const favCountKey = `fav:${pageKeyBase}:count`;
  const favFlagKey  = `fav:${pageKeyBase}:fav`;

  // 旧likeキーからの移行（任意：前の「いいね」数を引き継ぎたい場合）
  (function migrateFromLike(){
    const oldCountKey = `like:${pageKeyBase}:count`;
    const oldFlagKey  = `like:${pageKeyBase}:liked`;
    if (!localStorage.getItem(favCountKey) && localStorage.getItem(oldCountKey)){
      localStorage.setItem(favCountKey, localStorage.getItem(oldCountKey));
    }
    if (!localStorage.getItem(favFlagKey) && localStorage.getItem(oldFlagKey)){
      localStorage.setItem(favFlagKey, localStorage.getItem(oldFlagKey)==='1' ? '1':'0');
    }
  })();

  // localStorage helpers
  const getCount = () => Number(localStorage.getItem(favCountKey) || 0);
  const setCount = (n) => localStorage.setItem(favCountKey, String(n));
  const getFav   = () => localStorage.getItem(favFlagKey) === '1';
  const setFav   = (v) => localStorage.setItem(favFlagKey, v ? '1' : '0');

  // dataLayer push はグローバル pushDL を使用（event 名は呼び出し側で指定）

  // 初期表示
  const init = () => {
    if (favBtn && favCountEl) {
      favCountEl.textContent = getCount();
      const f = getFav();
      favBtn.setAttribute('aria-pressed', f ? 'true' : 'false');
      if (f) favBtn.title = 'お気に入り済み';
    }
  };
  init();

  // お気に入りトグル
  if (favBtn) favBtn.addEventListener('click', () => {
    let f = getFav();
    let c = getCount();

    if (f) {
      // 解除
      f = false;
      c = Math.max(0, c - 1);
      setFav(false);
      pushDL({
        event: 'click_favorite',
        button_id: 'favBtn',
        button_text: 'お気に入り',
        button_category: 'reaction',
        action: 'unfavorite'
      });
    } else {
      // 登録
      f = true;
      c = c + 1;
      setFav(true);
      pushDL({
        event: 'click_favorite',
        button_id: 'favBtn',
        button_text: 'お気に入り',
        button_category: 'reaction',
        action: 'favorite'
      });
    }
    setCount(c);
    favBtn.setAttribute('aria-pressed', f ? 'true' : 'false');
    favBtn.title = f ? 'お気に入り済み' : '';
    favCountEl.textContent = c;
  });

  // シェア押下（既存仕様を踏襲）
  if (shareBtn) shareBtn.addEventListener('click', async () => {
    const shareData = {
      title: document.title || 'シェア',
      text: 'このページをシェアします',
      url: location.href
    };

    // Web Share API
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        pushDL({
          event: 'click_share',
          button_id: 'shareBtn',
          button_text: 'シェア',
          button_category: 'share',
          action: 'web_share_api'
        });
        return;
      } catch (e) {
        // キャンセル等はフォールバックへ
      }
    }

    // フォールバック：URLコピー
    try {
      await navigator.clipboard.writeText(location.href);
      alert('URLをコピーしました！');
      pushDL({
        event: 'click_share',
        button_id: 'shareBtn',
        button_text: 'シェア',
        button_category: 'share',
        action: 'clipboard'
      });
    } catch (_) {
      // さらにSNSフォールバック
      const url = encodeURIComponent(location.href);
      const text = encodeURIComponent(document.title);
      const options = [
        { name: 'x', href: `https://twitter.com/intent/tweet?url=${url}&text=${text}` },
        { name: 'line', href: `https://social-plugins.line.me/lineit/share?url=${url}` },
        { name: 'facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${url}` },
      ];
      const msg = 'シェア方法を選んでください：\n' + options.map((o, i) => `${i+1}. ${o.name}`).join('\n');
      const choice = prompt(msg, '1');
      const idx = Number(choice) - 1;
      if (options[idx]) {
        window.open(options[idx].href, '_blank', 'noopener,noreferrer');
        pushDL({
          event: 'click_share',
          button_id: 'shareBtn',
          button_text: 'シェア',
          button_category: 'share',
          action: options[idx].name
        });
      }
    }
  });
})();

// ===== Card-wise Like (Back-only) =====
(function(){
  const pageKeyBase = (location.pathname.replace(/\/$/, '') || '/');

  // localStorage helpers
  const keyLiked  = (id)=> `like:${pageKeyBase}:${id}:liked`;
  const keyCount  = (id)=> `like:${pageKeyBase}:${id}:count`;
  const getLiked  = (id)=> localStorage.getItem(keyLiked(id)) === '1';
  const setLiked  = (id,v)=> localStorage.setItem(keyLiked(id), v ? '1' : '0');
  const getCount  = (id)=> Number(localStorage.getItem(keyCount(id)) || 0);
  const setCount  = (id,n)=> localStorage.setItem(keyCount(id), String(n));

  // dataLayer push はグローバル pushDL を使用

  // ★ 裏面にあるボタンのみを対象にするセレクタ
  document.querySelectorAll('.interest-card .card-back .btn-like[data-like-id]').forEach((btn)=>{
    const likeId = btn.getAttribute('data-like-id');
    const countEl = btn.querySelector('.like-count');

    // 初期表示
    const liked = getLiked(likeId);
    btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
    if (countEl) countEl.textContent = getCount(likeId);

    // クリック（トグル）
    btn.addEventListener('click', (e)=>{
      e.stopPropagation(); // ← フリップや親要素のクリック伝播を防止
      let liked = getLiked(likeId);
      let count = getCount(likeId);

      if (liked){
        liked = false; count = Math.max(0, count - 1);
        setLiked(likeId,false); setCount(likeId,count);
        btn.setAttribute('aria-pressed','false');
        if (countEl) countEl.textContent = count;
        pushDL({ event: 'click_like', button_id: likeId, button_text: 'カードいいね', button_category: 'reaction', action: 'unlike' });
      } else {
        liked = true; count = count + 1;
        setLiked(likeId,true); setCount(likeId,count);
        btn.setAttribute('aria-pressed','true');
        if (countEl) countEl.textContent = count;
        pushDL({ event: 'click_like', button_id: likeId, button_text: 'カードいいね', button_category: 'reaction', action: 'like' });
      }
    });

    // キーボード対応
    btn.addEventListener('keydown',(e)=>{
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  });
})();

// =============================
// Analytics: Scroll depth & Engagement
// =============================
function initScrollDepth() {
  const thresholds = [25, 50, 75, 100];
  const fired = new Set();

  const calcPercent = () => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollY = typeof window.pageYOffset === 'number' ? window.pageYOffset : Math.max(doc.scrollTop, body.scrollTop);
    const viewportH = window.innerHeight || doc.clientHeight;
    const fullH = Math.max(
      body.scrollHeight, doc.scrollHeight,
      body.offsetHeight, doc.offsetHeight,
      body.clientHeight, doc.clientHeight
    );
    let pct = Math.round(((scrollY + viewportH) / Math.max(1, fullH)) * 100);
    return Math.max(0, Math.min(100, pct));
  };

  const check = () => {
    const pct = calcPercent();
    for (const t of thresholds) {
      if (!fired.has(t) && pct >= t) {
        fired.add(t);
        pushDL({ event: 'scroll_depth', scroll_percent: t });
        gtmDiagLog('SCROLL_DEPTH fired', { percent: t, calc: pct });
      }
    }
  };

  // Throttle the scroll/resize handler; passive for performance
  const onScroll = throttle(check, 200);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  window.addEventListener('load', check, { once: true });
  // Initial check in case user lands mid-page or short pages
  setTimeout(check, 0);

  // Bottom sentinel to guarantee 100%
  try {
    const sentinel = document.createElement('div');
    sentinel.setAttribute('data-scroll-sentinel', '');
    sentinel.style.cssText = 'position:relative;height:1px;width:100%;';
    document.body.appendChild(sentinel);
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (e.isIntersecting && !fired.has(100)) {
          fired.add(100);
          pushDL({ event: 'scroll_depth', scroll_percent: 100 });
          gtmDiagLog('SCROLL_DEPTH sentinel 100% fired', {});
          obs.disconnect();
        }
      });
    }, { root: null, threshold: 0, rootMargin: '0px 0px 0px 0px' });
    io.observe(sentinel);
  } catch (_) {
    // noop: IO not supported
  }
}

function initEngagementPing() {
  let elapsedSec = 0;
  setInterval(() => {
    elapsedSec += 30;
    pushDL({ event: 'engagement_ping', elapsed_sec: elapsedSec });
  }, 30000);
}

// Initialize analytics timers and scroll tracking
document.addEventListener('DOMContentLoaded', () => {
  initScrollDepth();
  initEngagementPing();
});

// （analytics: duplicative handlers removed）
