/**
 * AKUH – Tracking Module
 * Handles: Google Tag Manager, Meta (Facebook) Pixel, TikTok Pixel
 * Client-side events + server-side CAPI bridge via /api/track
 *
 * Usage: include tracking.js AFTER the <head> tags
 * Configure IDs in .env → injected by server, or set via window.AKUH_CONFIG
 */

(function (window) {
  'use strict';

  // ──────────────────────────────────────────────────────────
  // CONFIG – fallback ke window.AKUH_CONFIG atau placeholder
  // ──────────────────────────────────────────────────────────
  const cfg = window.AKUH_CONFIG || {};
  const GTM_ID     = cfg.gtmId     || 'GTM-XXXXXXX';
  const META_PX    = cfg.metaPixel  || null;
  const TIKTOK_PX  = cfg.tiktokPixel || null;
  const API_BASE   = cfg.apiBase    || '';

  // ──────────────────────────────────────────────────────────
  // 1. GOOGLE TAG MANAGER
  // ──────────────────────────────────────────────────────────
  function initGTM(id) {
    if (!id || id === 'GTM-XXXXXXX') return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtm.js?id=${id}`;
    document.head.appendChild(s);
    // GTM noscript iframe
    const ns = document.createElement('noscript');
    ns.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
    document.body.prepend(ns);
    console.log('[AKUH Tracking] GTM loaded:', id);
  }

  // ──────────────────────────────────────────────────────────
  // 2. META (FACEBOOK) PIXEL
  // ──────────────────────────────────────────────────────────
  function initMetaPixel(id) {
    if (!id) return;
    !function(f,b,e,v,n,t,s){
      if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)
    }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', id);
    window.fbq('track', 'PageView');
    console.log('[AKUH Tracking] Meta Pixel loaded:', id);
  }

  // ──────────────────────────────────────────────────────────
  // 3. TIKTOK PIXEL
  // ──────────────────────────────────────────────────────────
  function initTikTokPixel(id) {
    if (!id) return;
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;
      var ttq=w[t]=w[t]||[];
      ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
      ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
      for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
      ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
      ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._e=ttq._e||[];ttq._e.push([e,n]);var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load(id);
      ttq.page();
    }(window, document, 'ttq');
    console.log('[AKUH Tracking] TikTok Pixel loaded:', id);
  }

  // ──────────────────────────────────────────────────────────
  // 4. UNIFIED EVENT TRACKING API
  // ──────────────────────────────────────────────────────────
  const AKUHTrack = {
    /**
     * Track event across all platforms (client + server-side)
     * @param {string} event – event name (e.g. 'Lead', 'ViewContent', 'InitiateCheckout')
     * @param {object} params – { value, currency, content_name, ...custom }
     * @param {object} userData – { phone, firstName, lastName } for CAPI
     */
    event(event, params = {}, userData = {}) {
      const payload = {
        currency: 'IDR',
        ...params
      };

      // GTM dataLayer push
      if (window.dataLayer) {
        window.dataLayer.push({ event, ...payload });
      }

      // Meta Pixel
      if (window.fbq) {
        window.fbq('track', event, payload);
      }

      // TikTok Pixel
      if (window.ttq) {
        const ttqMap = {
          'Lead': 'SubmitForm',
          'ViewContent': 'ViewContent',
          'InitiateCheckout': 'InitiateCheckout',
          'Contact': 'Contact',
          'PageView': 'Browse',
        };
        window.ttq.track(ttqMap[event] || event, payload);
      }

      // Server-side CAPI bridge
      if (Object.keys(userData).length) {
        fetch(`${API_BASE}/api/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event, userData, customData: payload, pageUrl: window.location.href })
        }).catch(() => {});
      }
    },

    // Convenience methods
    lead(userData, params)     { this.event('Lead', params, userData); },
    viewContent(params)        { this.event('ViewContent', params); },
    initiateCheckout(params)   { this.event('InitiateCheckout', params); },
    contact(userData)          { this.event('Contact', {}, userData); },
    pageView()                 { this.event('PageView', {}); },
  };

  // ──────────────────────────────────────────────────────────
  // 5. AUTO TRACK – WA button clicks & package views
  // ──────────────────────────────────────────────────────────
  function autoTrackClicks() {
    // WA button clicks → Contact event
    document.querySelectorAll('a[href*="wa.me"]').forEach(el => {
      el.addEventListener('click', () => {
        AKUHTrack.contact({});
        AKUHTrack.event('Contact', { content_name: el.textContent.trim() });
      });
    });

    // Package buttons → InitiateCheckout
    document.querySelectorAll('.pkg-btn').forEach(el => {
      el.addEventListener('click', () => {
        const card = el.closest('.pkg-card');
        const pkgName = card?.querySelector('.pkg-name')?.textContent || '';
        const price = card?.querySelector('.pkg-price')?.textContent || '';
        AKUHTrack.initiateCheckout({ content_name: pkgName, value: price });
      });
    });

    // Scroll 50% → ViewContent
    let scrollFired = false;
    window.addEventListener('scroll', () => {
      if (scrollFired) return;
      const scrollPct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      if (scrollPct >= 50) {
        scrollFired = true;
        AKUHTrack.viewContent({ content_name: 'Landing Page AKUH' });
      }
    }, { passive: true });
  }

  // ──────────────────────────────────────────────────────────
  // INIT
  // ──────────────────────────────────────────────────────────
  function init() {
    initGTM(GTM_ID);
    initMetaPixel(META_PX);
    initTikTokPixel(TIKTOK_PX);
    AKUHTrack.pageView();
    autoTrackClicks();
  }

  // Expose globally
  window.AKUHTrack = AKUHTrack;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
