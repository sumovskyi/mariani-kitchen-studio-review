(() => {
  'use strict';

  const dataLayer = window.dataLayer = window.dataLayer || [];
  const track = (event, details = {}) => dataLayer.push({ event, mariani_version: 'v20', ...details });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let headerFrame = 0;
  const updateHeader = () => {
    document.body.classList.toggle('header-scrolled', window.scrollY > 24);
    headerFrame = 0;
  };
  window.addEventListener('scroll', () => {
    if (!headerFrame) headerFrame = requestAnimationFrame(updateHeader);
  }, { passive: true });
  window.addEventListener('pageshow', updateHeader);
  updateHeader();

  const reviewTrack = document.querySelector('[data-review-track]');
  if (reviewTrack) {
    const cards = Array.from(reviewTrack.children);
    const controls = document.querySelector('[data-review-controls]');
    const previous = document.querySelector('[data-review-prev]');
    const next = document.querySelector('[data-review-next]');
    const position = document.querySelector('[data-review-position]');
    const syncReviews = () => {
      const end = reviewTrack.scrollWidth - reviewTrack.clientWidth;
      const step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : reviewTrack.clientWidth;
      const current = Math.min(cards.length, Math.round(reviewTrack.scrollLeft / step) + 1);
      controls.hidden = end < 2;
      previous.disabled = reviewTrack.scrollLeft < 2;
      next.disabled = reviewTrack.scrollLeft >= end - 2;
      position.textContent = `${current} / ${cards.length}`;
    };
    const moveReviews = (direction) => {
      const step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : reviewTrack.clientWidth;
      reviewTrack.scrollBy({ left: direction * step, behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    previous.addEventListener('click', () => moveReviews(-1));
    next.addEventListener('click', () => moveReviews(1));
    reviewTrack.addEventListener('scroll', syncReviews, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(syncReviews).observe(reviewTrack);
    else window.addEventListener('resize', syncReviews);
    syncReviews();
  }

  document.querySelectorAll('[data-gallery-item]').forEach((button) => {
    if (!button.hasAttribute('aria-label')) button.setAttribute('aria-label', `Open ${button.dataset.title || 'kitchen image'}`);
  });

  const currentPath = window.location.pathname.replace(/index\.html$/, '').replace(/\/$/, '');
  document.querySelectorAll('a[href]').forEach((link) => {
    const destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin || destination.hash) return;
    const destinationPath = destination.pathname.replace(/index\.html$/, '').replace(/\/$/, '');
    if (destinationPath === currentPath) link.setAttribute('aria-current', 'page');
  });

  const menuToggle = document.querySelector('.menu-toggle');
  const menuLabel = menuToggle?.querySelector('.sr-only');
  const navigation = document.querySelector('.primary-nav');
  const navGroups = Array.from(document.querySelectorAll('.nav-group'));
  const closeNavGroups = (except = null) => navGroups.forEach((group) => {
    if (group !== except) group.removeAttribute('open');
  });
  const closeMenu = ({ restoreFocus = false } = {}) => {
    const wasOpen = menuToggle?.getAttribute('aria-expanded') === 'true';
    menuToggle?.setAttribute('aria-expanded', 'false');
    if (menuLabel) menuLabel.textContent = 'Open navigation';
    navigation?.classList.remove('is-open');
    document.body.classList.remove('nav-open');
    closeNavGroups();
    if (wasOpen) track('menu_toggle', { state: 'closed' });
    if (restoreFocus && wasOpen) menuToggle?.focus();
  };

  navGroups.forEach((group) => group.addEventListener('toggle', () => {
    if (!group.open) return;
    closeNavGroups(group);
    track('navigation_open', { label: group.querySelector('summary')?.textContent?.trim() || '' });
  }));
  menuToggle?.addEventListener('click', () => {
    const shouldOpen = menuToggle.getAttribute('aria-expanded') !== 'true';
    if (!shouldOpen) return closeMenu();
    menuToggle.setAttribute('aria-expanded', 'true');
    if (menuLabel) menuLabel.textContent = 'Close navigation';
    navigation?.classList.add('is-open');
    document.body.classList.add('nav-open');
    track('menu_toggle', { state: 'open' });
  });
  navigation?.querySelectorAll('a, button[data-open-inquiry]').forEach((item) => item.addEventListener('click', () => closeMenu()));
  document.addEventListener('click', (event) => { if (!event.target.closest('.nav-group')) closeNavGroups(); });
  document.addEventListener('click', (event) => {
    if (menuToggle?.getAttribute('aria-expanded') === 'true' && !event.target.closest('.site-header')) closeMenu();
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu({ restoreFocus: true }); });
  window.addEventListener('resize', () => { if (window.innerWidth > 1180) closeMenu(); });
  document.querySelectorAll('[data-track]').forEach((item) => item.addEventListener('click', () => {
    track('cta_click', { location: item.dataset.track, destination: item.getAttribute('href') || 'dialog' });
  }));

  const revealItems = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduceMotion) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .07, rootMargin: '0px 0px -4% 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const ambientVideos = Array.from(document.querySelectorAll('[data-ambient-video]'));
  const loadAmbientVideo = (video) => {
    if (video.dataset.loaded === 'true' || reduceMotion) return;
    video.querySelectorAll('source[data-src]').forEach((source) => {
      source.src = source.dataset.src;
      source.removeAttribute('data-src');
    });
    video.dataset.loaded = 'true';
    video.load();
  };
  const syncAmbientVideos = () => ambientVideos.forEach((video) => {
    if (!reduceMotion && video.dataset.inView === 'true' && !document.hidden) {
      loadAmbientVideo(video);
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.dataset.inView = String(entry.isIntersecting);
        if (entry.isIntersecting) loadAmbientVideo(entry.target);
      });
      syncAmbientVideos();
    }, { rootMargin: '280px 0px', threshold: .05 });
    ambientVideos.forEach((video) => videoObserver.observe(video));
  }
  document.addEventListener('visibilitychange', syncAmbientVideos);

  const heroFrames = Array.from(document.querySelectorAll('[data-hero-frame]'));
  let heroFrameIndex = 0;
  let heroTimer = null;
  const scheduleHero = () => {
    window.clearTimeout(heroTimer);
    if (reduceMotion || document.hidden || heroFrames.length < 2) return;
    heroTimer = window.setTimeout(() => {
      heroFrameIndex = (heroFrameIndex + 1) % heroFrames.length;
      heroFrames.forEach((frame, index) => frame.classList.toggle('is-active', index === heroFrameIndex));
      track('hero_image_change', { image_position: heroFrameIndex + 1, source: 'autoplay' });
      scheduleHero();
    }, 4500);
  };
  document.addEventListener('visibilitychange', scheduleHero);
  scheduleHero();

  const collectionFilters = Array.from(document.querySelectorAll('[data-collection-filter]'));
  const collectionItems = Array.from(document.querySelectorAll('[data-filter-item]'));
  const collectionStatus = document.querySelector('[data-collection-status]');
  const applyCollectionFilter = (filter) => {
    let visibleCount = 0;
    collectionItems.forEach((item) => {
      const tags = (item.dataset.tags || '').split(/\s+/).filter(Boolean);
      const visible = filter === 'all' || tags.includes(filter);
      item.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    collectionFilters.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.collectionFilter === filter)));
    if (collectionStatus) collectionStatus.textContent = `${visibleCount} ${visibleCount === 1 ? 'kitchen' : 'kitchens'} shown`;
    track('collection_filter', { filter, visible_count: visibleCount });
  };
  collectionFilters.forEach((button) => button.addEventListener('click', () => applyCollectionFilter(button.dataset.collectionFilter || 'all')));

  const normalizeItem = (element) => ({
    element,
    id: element.dataset.id,
    src: element.dataset.src,
    title: element.dataset.title,
    meta: element.dataset.meta,
    note: element.dataset.note,
    alt: element.querySelector('img')?.alt || element.dataset.title || 'Kitchen reference'
  });
  const galleryItems = [...document.querySelectorAll('[data-gallery-item]')].map(normalizeItem).filter((item) => item.id && item.src);
  const visibleGalleryItems = () => galleryItems.filter((item) => !item.element.closest('[data-filter-item]')?.hidden);
  const viewer = document.querySelector('[data-image-viewer]');
  const viewerImage = document.querySelector('[data-viewer-image]');
  const viewerTitle = document.querySelector('[data-viewer-title]');
  const viewerMeta = document.querySelector('[data-viewer-meta]');
  const viewerNote = document.querySelector('[data-viewer-note]');
  const viewerCount = document.querySelector('[data-viewer-count]');
  let viewerIndex = 0;
  let viewerItems = visibleGalleryItems();
  let viewerReturnFocus = null;

  const syncDialogState = () => {
    const anyOpen = Array.from(document.querySelectorAll('dialog')).some((dialog) => dialog.open);
    document.body.classList.toggle('has-dialog', anyOpen);
  };
  const renderViewer = () => {
    const item = viewerItems[viewerIndex];
    if (!item) return;
    viewerImage.src = item.src;
    viewerImage.alt = item.alt;
    viewerTitle.textContent = item.title || 'Kitchen reference';
    viewerMeta.textContent = item.meta || '';
    viewerNote.textContent = item.note || '';
    viewerCount.textContent = `${String(viewerIndex + 1).padStart(2, '0')} / ${String(viewerItems.length).padStart(2, '0')}`;
  };
  const openViewer = (id, trigger) => {
    viewerItems = visibleGalleryItems();
    const index = viewerItems.findIndex((item) => item.id === id);
    if (index < 0 || !viewer) return;
    viewerIndex = index;
    viewerReturnFocus = trigger || document.activeElement;
    renderViewer();
    viewer.showModal();
    syncDialogState();
    track('image_view_open', { image_id: id, position: index + 1 });
  };
  document.querySelectorAll('[data-gallery-item]').forEach((button) => button.addEventListener('click', () => openViewer(button.dataset.id, button)));
  document.querySelector('[data-viewer-prev]')?.addEventListener('click', () => { viewerIndex = (viewerIndex - 1 + viewerItems.length) % viewerItems.length; renderViewer(); });
  document.querySelector('[data-viewer-next]')?.addEventListener('click', () => { viewerIndex = (viewerIndex + 1) % viewerItems.length; renderViewer(); });
  document.querySelector('[data-viewer-close]')?.addEventListener('click', () => viewer?.close());
  viewer?.addEventListener('click', (event) => { if (event.target === viewer) viewer.close(); });
  viewer?.addEventListener('close', () => { syncDialogState(); viewerReturnFocus?.focus?.(); });

  const inquiry = document.querySelector('[data-inquiry]');
  const form = document.querySelector('#kitchen-inquiry');
  const formStatus = document.querySelector('[data-form-status], #form-status');
  const referenceBox = document.querySelector('[data-inquiry-reference]');
  const referenceImage = document.querySelector('[data-inquiry-reference-image]');
  const referenceTitle = document.querySelector('[data-inquiry-reference-title]');
  const referenceMeta = document.querySelector('[data-inquiry-reference-meta]');
  let inquiryReturnFocus = null;
  let currentReference = null;
  let formStarted = false;

  const renderReference = () => {
    if (!referenceBox) return;
    referenceBox.hidden = !currentReference;
    if (!currentReference) return;
    referenceImage.src = currentReference.src;
    referenceImage.alt = '';
    referenceTitle.textContent = currentReference.title || 'Kitchen reference';
    referenceMeta.textContent = currentReference.meta || '';
  };
  const openInquiry = (trigger, { context = '', reference = null } = {}) => {
    if (!inquiry) return;
    // Reopening the inquiry is a fresh invitation; do not carry a blur error into it.
    form?.querySelectorAll('input, textarea').forEach((field) => { field.removeAttribute('aria-invalid'); delete field.dataset.touched; });
    form?.querySelectorAll('.field-error').forEach((message) => { message.textContent = ''; });
    const summary = form?.querySelector('.form-errors');
    if (summary) { summary.textContent = ''; summary.classList.remove('has-errors'); }
    if (formStatus) { formStatus.textContent = ''; formStatus.classList.remove('is-visible'); }
    inquiryReturnFocus = trigger || document.activeElement;
    currentReference = reference;
    renderReference();
    if (context && form?.elements.change && !form.elements.change.value.trim()) form.elements.change.value = `I’m interested in ${context} as a reference. `;
    if (viewer?.open) viewer.close();
    inquiry.showModal();
    syncDialogState();
    window.setTimeout(() => form?.elements.name?.focus(), 40);
    track('inquiry_open', { context, reference_id: reference?.id || '' });
  };
  document.querySelectorAll('[data-open-inquiry]').forEach((button) => button.addEventListener('click', () => openInquiry(button)));
  document.querySelectorAll('[data-project-inquiry]').forEach((button) => button.addEventListener('click', () => openInquiry(button, { context: `the ${button.dataset.project} project` })));
  document.querySelector('[data-viewer-inquiry]')?.addEventListener('click', (event) => {
    const item = viewerItems[viewerIndex];
    openInquiry(event.currentTarget, { context: item?.title || 'this kitchen', reference: item });
  });
  document.querySelector('[data-clear-reference]')?.addEventListener('click', () => {
    currentReference = null;
    renderReference();
    track('inquiry_reference_clear');
  });
  document.querySelector('[data-inquiry-close]')?.addEventListener('click', () => inquiry?.close());
  inquiry?.addEventListener('click', (event) => { if (event.target === inquiry) inquiry.close(); });
  inquiry?.addEventListener('close', () => { syncDialogState(); inquiryReturnFocus?.focus?.(); });

  const errorsBox = form?.querySelector('.form-errors');
  const syncContactRequirements = () => {
    if (!form) return;
    const preference = form.elements.contact?.value || 'Email';
    const email = form.elements.email;
    const phone = form.elements.phone;
    const needsEmail = preference === 'Email';
    const needsPhone = preference === 'Call' || preference === 'Text';
    const emailField = email?.closest('[data-contact-field]');
    const phoneField = phone?.closest('[data-contact-field]');
    if (email) {
      email.required = needsEmail;
      email.setAttribute('aria-required', String(needsEmail));
      if (!needsEmail) email.removeAttribute('aria-invalid');
    }
    if (phone) {
      phone.required = needsPhone;
      phone.setAttribute('aria-required', String(needsPhone));
      if (!needsPhone) phone.removeAttribute('aria-invalid');
    }
    if (emailField) emailField.hidden = !needsEmail;
    if (phoneField) phoneField.hidden = !needsPhone;
  };
  const setError = (field, message) => {
    const error = document.querySelector(`#${field.name}-error`);
    if (error) error.textContent = message;
    field.setAttribute('aria-invalid', String(Boolean(message)));
    return !message;
  };
  const validate = (field) => {
    const value = field.value?.trim?.() || '';
    if (field.name === 'name') return setError(field, value ? '' : 'Please enter your name.');
    if (field.name === 'city') return setError(field, '');
    if (field.name === 'email') {
      const preference = form.elements.contact?.value || 'Email';
      if (!value) return setError(field, preference === 'Email' ? 'Please enter your email.' : '');
      return setError(field, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Please enter a valid email address.');
    }
    if (field.name === 'phone') {
      const preference = form.elements.contact?.value || 'Email';
      return setError(field, (preference === 'Call' || preference === 'Text') && !value ? `Please enter a phone number for ${preference.toLowerCase()}.` : '');
    }
    if (field.name === 'change') return setError(field, value ? '' : 'Please add a short note about your kitchen.');
    if (field.name === 'consent') return setError(field, field.checked ? '' : 'Please confirm that we may contact you about this kitchen.');
    return true;
  };
  form?.addEventListener('focusin', () => {
    if (formStarted) return;
    formStarted = true;
    track('inquiry_start');
  });
  form?.querySelectorAll('input, textarea, select').forEach((field) => {
    field.addEventListener('blur', () => {
      if (field.dataset.touched === 'true' || field.getAttribute('aria-invalid') === 'true') validate(field);
    });
    field.addEventListener('input', () => { field.dataset.touched = 'true'; if (field.getAttribute('aria-invalid') === 'true') validate(field); });
    field.addEventListener('change', () => {
      if (field.name === 'contact') {
        syncContactRequirements();
        [form.elements.email, form.elements.phone].filter(Boolean).forEach((contactField) => {
          if (contactField.dataset.touched === 'true') validate(contactField);
          else setError(contactField, '');
        });
      }
      if (field.getAttribute('aria-invalid') === 'true') validate(field);
    });
  });
  syncContactRequirements();
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (formStatus) {
      formStatus.textContent = '';
      formStatus.classList.remove('is-visible');
    }
    const fields = ['name', 'city', 'email', 'phone', 'change', 'consent'].map((name) => form.elements[name]);
    const invalid = fields.filter((field) => field && !validate(field));
    errorsBox?.classList.toggle('has-errors', Boolean(invalid.length));
    if (errorsBox) errorsBox.textContent = invalid.length ? 'Please check the highlighted fields.' : '';
    if (invalid.length) {
      track('inquiry_validation_error', { fields: invalid.map((field) => field.name).join(',') });
      invalid[0].focus();
      return;
    }
    if (formStatus) {
      formStatus.textContent = 'Your inquiry preview is ready. Nothing has been sent or saved.';
      formStatus.classList.add('is-visible');
      formStatus.focus();
    }
    track('inquiry_prototype_complete', { contact_preference: form.elements.contact?.value || 'Not collected', reference_id: currentReference?.id || '' });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
    closeMenu({ restoreFocus: true });
  });
})();
