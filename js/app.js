(() => {
  'use strict';

  const BUSINESS_EMAIL = 'benjamin.linton10@gmail.com';
  const BUSINESS_SMS = '+19053755172';
  const SPEC_BANNER_STORAGE_KEY = 'bens_spec_banner_dismissed';

  const CUT_FIT_MAP = {
    12: 'Compact & Tiny-Home Wood Stoves (12" max firebox)',
    13: 'Compact Fireplace Inserts (13" custom fit)',
    14: 'Small Wood Stoves & Compact Inserts (14" fit)',
    15: 'Mid-Compact Fireplaces & Cast Stoves (15" custom fit)',
    16: 'Standard Wood Stoves & Fireplaces (16" classic fit)',
    17: 'Medium-Deep Hearths & Country Stoves (17" custom fit)',
    18: 'Deep Wood Stoves & Medium Fireplaces (18" fit)',
    19: 'Wide Fireplaces & Heavy Stoves (19" custom fit)',
    20: 'Large Hearths & Deep Fireboxes (20" long burn)',
    21: 'Extra-Deep Hearths & Commercial Stoves (21" custom fit)',
    22: 'Outdoor Wood Boilers & Oversized Hearths (22" max)'
  };

  function getCutSpec(rawCut) {
    const parsed = Number.parseInt(rawCut, 10);
    const inches = Number.isFinite(parsed) ? Math.min(22, Math.max(12, parsed)) : 16;
    const pct = Number((((inches - 12) / 10) * 45.5 + 54.5).toFixed(1));
    return {
      inches,
      value: String(inches),
      pct,
      label: `${inches}" Custom Cut`,
      fit: CUT_FIT_MAP[inches] || `${inches}" Custom Processor Cut`
    };
  }

  const VOLUME_SPECS = {
    bundle: {
      label: 'Campfire Bundle',
      getMetrics: () => '~10–14 cu. ft. · ~45–60 splits (4–6 fires)'
    },
    quarter: {
      label: 'Quarter Bush Cord',
      getMetrics: () => '32 cu. ft. stacked · ~130–160 splits (15+ fires)'
    },
    face: {
      label: 'Face Cord',
      getMetrics: (cutInches) => {
        const cuft = ((4 * 8 * cutInches) / 12).toFixed(1);
        return `~${cuft} cu. ft. (4'×8' @ ${cutInches}") · ~175–200 splits`;
      }
    },
    half: {
      label: 'Half Bush Cord',
      getMetrics: () => '64 cu. ft. stacked · ~270–330 splits (35+ fires)'
    },
    full: {
      label: 'Full Bush Cord',
      getMetrics: () => '128 cu. ft. stacked · ~540–600 splits (75+ fires)'
    },
    multi: {
      label: '2+ Full Cords',
      getMetrics: () => '256+ cu. ft. stacked · 1,100+ splits (Full winter)'
    }
  };

  const WOOD_SPECS = {
    'mixed-hardwood': 'Seasoned Mixed Hardwood',
    'dense-heating': 'Dense Heating Blend (Maple / Oak / Ash)',
    'campfire-pit': 'Campfire & Cottage Blend',
    'need-advice': 'Ask Ben to Match My Stove'
  };

  const DELIVERY_SPECS = {
    'driveway-dump': 'Driveway Dump',
    'shed-drop': 'Garage / Shed Drop',
    'yard-pickup': 'Yard Pickup (4500 Linton Rd)'
  };

  const ZONE_SPECS = {
    'zone-1': {
      shortLabel: 'Zone 1',
      fullLabel: 'Zone 1 — Gores Landing & Rice Lake',
      timeframe: 'Same / Next Day Core Route'
    },
    'zone-2': {
      shortLabel: 'Zone 2',
      fullLabel: 'Zone 2 — Cobourg & Hamilton Twp',
      timeframe: '1–2 Day Local Route'
    },
    'zone-3': {
      shortLabel: 'Zone 3',
      fullLabel: 'Zone 3 — Port Hope, Grafton & Roseneath',
      timeframe: '1–3 Day Route'
    },
    'zone-4': {
      shortLabel: 'Zone 4',
      fullLabel: 'Zone 4 — Eastern Northumberland',
      timeframe: '2–4 Day Scheduled Route'
    }
  };

  function safeSessionGet(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeSessionSet(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch (_) {
      // Ignore storage failures in restricted browsing contexts.
    }
  }

  function getLocalTodayISO() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function isElementVisible(el) {
    if (!el || !el.isConnected) return false;
    return el.getClientRects().length > 0;
  }

  function setDateInputMinimums(root = document) {
    const today = getLocalTodayISO();
    root.querySelectorAll('input[type="date"]').forEach((input) => {
      input.min = today;
    });
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(text).catch(() => fallbackCopyText(text));
    }
    return fallbackCopyText(text);
  }

  function fallbackCopyText(text) {
    return new Promise((resolve, reject) => {
      const helper = document.createElement('textarea');
      helper.value = text;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.left = '-9999px';
      document.body.append(helper);
      helper.select();
      try {
        const copied = document.execCommand('copy');
        helper.remove();
        if (copied) resolve();
        else reject(new Error('Clipboard copy failed'));
      } catch (err) {
        helper.remove();
        reject(err);
      }
    });
  }

  function announcePolite(liveRegionEl, message) {
    if (!liveRegionEl) return;
    liveRegionEl.textContent = '';
    window.requestAnimationFrame(() => {
      liveRegionEl.textContent = message;
    });
  }

  // ---------------------------------------------------------------------------
  // 1. Spec Banner & Mobile Navigation
  // ---------------------------------------------------------------------------
  function initSpecBanner() {
    const banner = document.getElementById('spec-banner');
    const dismissBtn = document.getElementById('dismiss-spec-banner');
    if (!banner || !dismissBtn) return;

    const hideBanner = () => {
      banner.classList.add('is-dismissed');
      banner.hidden = true;
    };

    if (safeSessionGet(SPEC_BANNER_STORAGE_KEY) === '1') {
      hideBanner();
      return;
    }

    dismissBtn.addEventListener('click', () => {
      hideBanner();
      safeSessionSet(SPEC_BANNER_STORAGE_KEY, '1');
      const nextFocusTarget = document.querySelector('.site-brand') || document.getElementById('main-heading');
      if (nextFocusTarget && typeof nextFocusTarget.focus === 'function') {
        nextFocusTarget.focus();
      }
    });
  }

  function initMobileNav(bookingModal) {
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const nav = document.getElementById('primary-nav');
    if (!toggleBtn || !nav) {
      return { close: () => {} };
    }

    const setNavOpen = (isOpen) => {
      nav.classList.toggle('is-open', isOpen);
      toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    };

    toggleBtn.addEventListener('click', () => {
      const nextState = !nav.classList.contains('is-open');
      setNavOpen(nextState);
    });

    nav.addEventListener('click', (event) => {
      const clickedNavAction = event.target.closest('a, [data-open-booking]');
      if (clickedNavAction) {
        setNavOpen(false);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (bookingModal && bookingModal.open) return;
      if (!nav.classList.contains('is-open')) return;
      setNavOpen(false);
      toggleBtn.focus();
    });

    document.addEventListener('click', (event) => {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(event.target) || toggleBtn.contains(event.target)) return;
      setNavOpen(false);
    });

    return {
      close: () => setNavOpen(false),
      isOpen: () => nav.classList.contains('is-open'),
      toggleBtn
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Custom Cut & Cord Builder Engine
  // ---------------------------------------------------------------------------
  function initCutBuilder() {
    const form = document.getElementById('cut-calculator-form');
    const zoneSelect = document.getElementById('delivery-zone');
    const kindlingCheckbox = document.getElementById('kindling-addon');
    const logVisualizer = document.querySelector('.log-visualizer');
    const cutSlider = document.getElementById('cut-length-slider');
    const cutSliderReadout = document.getElementById('cut-slider-readout');
    const cutStepDownBtn = document.getElementById('cut-step-down');
    const cutStepUpBtn = document.getElementById('cut-step-up');
    const cutMiniStepBtns = Array.from(document.querySelectorAll('[data-cut-step]'));
    const cutScaleBtns = Array.from(document.querySelectorAll('[data-cut-inch]'));

    const cutLengthDisplay = document.getElementById('cut-length-display');
    const cutFitLabel = document.getElementById('cut-fit-label');
    const summaryVolume = document.getElementById('summary-volume-label');
    const summaryCuft = document.getElementById('summary-cuft');
    const summaryCut = document.getElementById('summary-cut-label');
    const summaryWood = document.getElementById('summary-wood-label');
    const summaryDelivery = document.getElementById('summary-delivery-label');
    const summaryZone = document.getElementById('summary-zone-label');
    const summaryTimeframe = document.getElementById('summary-timeframe');
    const leadOrderPreview = document.getElementById('lead-order-preview');
    const modalOrderPreview = document.getElementById('modal-order-preview');
    const zoneButtons = Array.from(document.querySelectorAll('[data-zone-btn]'));

    let selectedTown = '';
    let currentOrder = null;
    let currentCutInches = 16;

    const getCheckedValue = (name, fallback) => {
      if (!form) return fallback;
      const checked = form.querySelector(`input[name="${name}"]:checked`);
      return checked ? checked.value : fallback;
    };

    const setRadioValue = (name, value) => {
      if (!form) return;
      const radios = form.querySelectorAll(`input[name="${name}"]`);
      radios.forEach((radio) => {
        radio.checked = radio.value === String(value);
      });
    };

    const setCutInches = (rawInches) => {
      const spec = getCutSpec(rawInches);
      currentCutInches = spec.inches;
      setRadioValue('cutLength', spec.value);
      if (cutSlider) cutSlider.value = spec.value;
    };

    const initialCheckedCut = getCheckedValue('cutLength', '16');
    currentCutInches = getCutSpec(initialCheckedCut).inches;
    if (cutSlider) cutSlider.value = String(currentCutInches);

    const computeOrder = () => {
      const volume = getCheckedValue('volume', 'face');
      const woodType = getCheckedValue('woodType', 'mixed-hardwood');
      const cutSpec = getCutSpec(currentCutInches);
      const cutLength = cutSpec.value;
      const deliveryOption = getCheckedValue('deliveryOption', 'driveway-dump');
      const deliveryZone = zoneSelect ? zoneSelect.value : 'zone-1';
      const kindlingAddon = Boolean(kindlingCheckbox && kindlingCheckbox.checked);

      const volumeSpec = VOLUME_SPECS[volume] || VOLUME_SPECS.face;
      const woodLabel = WOOD_SPECS[woodType] || WOOD_SPECS['mixed-hardwood'];
      const deliveryLabel = DELIVERY_SPECS[deliveryOption] || DELIVERY_SPECS['driveway-dump'];
      const zoneSpec = ZONE_SPECS[deliveryZone] || ZONE_SPECS['zone-1'];

      const cutInches = cutSpec.inches;
      const cuftText = volumeSpec.getMetrics(cutInches);
      const woodSummaryLabel = kindlingAddon ? `${woodLabel} + Dry Kindling` : woodLabel;
      const zoneDisplayLabel = selectedTown
        ? `${zoneSpec.shortLabel} — ${selectedTown}`
        : zoneSpec.fullLabel;
      const timeframe = deliveryOption === 'yard-pickup'
        ? 'Same-Day Yard Loading (Mon–Sat 7–7)'
        : zoneSpec.timeframe;

      const previewParts = [
        volumeSpec.label,
        cutSpec.label,
        woodLabel,
        deliveryLabel,
        selectedTown ? `${zoneSpec.shortLabel} (${selectedTown})` : zoneSpec.shortLabel
      ];
      if (kindlingAddon) {
        previewParts.push('+ Dry Kindling');
      }
      const previewLine = previewParts.join(' · ');

      return {
        volume,
        volumeLabel: volumeSpec.label,
        cuftText,
        woodType,
        woodLabel,
        woodSummaryLabel,
        cutLength,
        cutPct: cutSpec.pct,
        cutLabel: cutSpec.label,
        fitLabel: cutSpec.fit,
        deliveryOption,
        deliveryLabel,
        deliveryZone,
        zoneShortLabel: zoneSpec.shortLabel,
        zoneFullLabel: zoneSpec.fullLabel,
        zoneDisplayLabel,
        townName: selectedTown,
        timeframe,
        kindlingAddon,
        previewLine,
        signature: `${volume}|${woodType}|${cutLength}|${deliveryOption}|${deliveryZone}|${kindlingAddon}|${selectedTown}`
      };
    };

    const syncOrderState = () => {
      currentOrder = computeOrder();

      if (logVisualizer) {
        logVisualizer.style.setProperty('--log-pct', `${currentOrder.cutPct}%`);
      }
      if (cutLengthDisplay) cutLengthDisplay.textContent = `${currentOrder.cutLength}"`;
      if (cutSliderReadout) cutSliderReadout.textContent = currentOrder.cutLabel;
      if (cutSlider && cutSlider.value !== currentOrder.cutLength) {
        cutSlider.value = currentOrder.cutLength;
      }
      if (cutStepDownBtn) cutStepDownBtn.disabled = currentCutInches <= 12;
      if (cutStepUpBtn) cutStepUpBtn.disabled = currentCutInches >= 22;

      cutMiniStepBtns.forEach((btn) => {
        const delta = Number.parseInt(btn.dataset.cutStep, 10) || 0;
        btn.disabled = (delta < 0 && currentCutInches <= 12) || (delta > 0 && currentCutInches >= 22);
      });

      cutScaleBtns.forEach((btn) => {
        const isActive = Number.parseInt(btn.dataset.cutInch, 10) === currentCutInches;
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      if (cutFitLabel) cutFitLabel.textContent = currentOrder.fitLabel;

      if (summaryVolume) summaryVolume.textContent = currentOrder.volumeLabel;
      if (summaryCuft) summaryCuft.textContent = currentOrder.cuftText;
      if (summaryCut) summaryCut.textContent = currentOrder.cutLabel;
      if (summaryWood) summaryWood.textContent = currentOrder.woodSummaryLabel;
      if (summaryDelivery) summaryDelivery.textContent = currentOrder.deliveryLabel;
      if (summaryZone) summaryZone.textContent = currentOrder.zoneDisplayLabel;
      if (summaryTimeframe) summaryTimeframe.textContent = currentOrder.timeframe;

      if (leadOrderPreview) leadOrderPreview.textContent = currentOrder.previewLine;
      if (modalOrderPreview) modalOrderPreview.textContent = currentOrder.previewLine;

      zoneButtons.forEach((btn) => {
        const isActive = btn.dataset.zoneBtn === currentOrder.deliveryZone;
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      return currentOrder;
    };

    const applyPresetFromElement = (el) => {
      if (!el) return false;
      const { presetVolume, presetWood, presetCut } = el.dataset;
      if (!presetVolume && !presetWood && !presetCut) return false;

      if (presetVolume) setRadioValue('volume', presetVolume);
      if (presetWood) setRadioValue('woodType', presetWood);
      if (presetCut) setCutInches(presetCut);

      syncOrderState();
      return true;
    };

    if (form) {
      form.addEventListener('change', (event) => {
        if (event.target === zoneSelect) {
          selectedTown = '';
        }
        if (event.target && event.target.name === 'cutLength') {
          setCutInches(event.target.value);
        }
        syncOrderState();
      });
    }

    if (cutSlider) {
      cutSlider.addEventListener('input', () => {
        setCutInches(cutSlider.value);
        syncOrderState();
      });
    }

    if (cutStepDownBtn) {
      cutStepDownBtn.addEventListener('click', () => {
        setCutInches(currentCutInches - 1);
        syncOrderState();
      });
    }

    if (cutStepUpBtn) {
      cutStepUpBtn.addEventListener('click', () => {
        setCutInches(currentCutInches + 1);
        syncOrderState();
      });
    }

    cutMiniStepBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const delta = Number.parseInt(btn.dataset.cutStep, 10) || 0;
        setCutInches(currentCutInches + delta);
        syncOrderState();
      });
    });

    cutScaleBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        setCutInches(btn.dataset.cutInch);
        syncOrderState();
      });
    });

    zoneButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const zone = btn.dataset.zoneBtn;
        if (!zone) return;
        selectedTown = btn.textContent.trim();
        if (zoneSelect) {
          zoneSelect.value = zone;
        }
        syncOrderState();
      });
    });

    syncOrderState();

    return {
      getOrder: () => currentOrder || syncOrderState(),
      syncOrderState,
      applyPresetFromElement
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Accessible Form Validation & Dispatch Engine
  // ---------------------------------------------------------------------------
  function applyWhitespaceConstraint(control) {
    if (typeof control.setCustomValidity !== 'function') return;
    control.setCustomValidity('');
    if (control.required && control.value.length > 0 && control.value.trim() === '') {
      control.setCustomValidity(control.dataset.error || 'Please fill out this field.');
    }
  }

  const UserInvalidFallback = (() => {
    const dirtyState = new WeakMap();

    const updateState = (input) => {
      applyWhitespaceConstraint(input);
      const isValid = input.validity.valid;
      input.classList.toggle('user-invalid-fallback', !isValid);
      input.classList.toggle('user-valid-fallback', isValid);
    };

    const handleEvent = (event) => {
      const target = event.target;

      if (event.type === 'reset') {
        const controls = target.elements || [];
        for (const control of controls) {
          dirtyState.delete(control);
          control.classList.remove('user-invalid-fallback', 'user-valid-fallback');
        }
        return;
      }

      if (!target || typeof target.checkValidity !== 'function') return;

      if (event.type === 'invalid') {
        dirtyState.set(target, { hasInteracted: true, hasBlurred: true });
        updateState(target);
        return;
      }

      if (event.type === 'input' || event.type === 'change') {
        const state = dirtyState.get(target) || { hasInteracted: false, hasBlurred: false };
        state.hasInteracted = true;
        dirtyState.set(target, state);
        if (state.hasBlurred) {
          updateState(target);
        }
        return;
      }

      if (event.type === 'blur') {
        const state = dirtyState.get(target) || { hasInteracted: false, hasBlurred: false };
        state.hasBlurred = true;
        dirtyState.set(target, state);
        if (state.hasInteracted || target.required) {
          updateState(target);
        }
      }
    };

    const init = (root) => {
      if (!root || CSS.supports('selector(:user-invalid)')) return;
      root.addEventListener('blur', handleEvent, true);
      root.addEventListener('input', handleEvent);
      root.addEventListener('change', handleEvent);
      root.addEventListener('invalid', handleEvent, true);
      root.addEventListener('reset', handleEvent, true);
    };

    return { init };
  })();

  function linkErrorToDescribedBy(control, errorId, shown) {
    if (!errorId) return;
    const existing = (control.getAttribute('aria-describedby') || '')
      .split(/\s+/)
      .filter((id) => id && id !== errorId);

    if (shown) {
      existing.push(errorId);
    }

    if (existing.length > 0) {
      control.setAttribute('aria-describedby', existing.join(' '));
    } else {
      control.removeAttribute('aria-describedby');
    }
  }

  function validateControlWithConstraintAPI(control) {
    applyWhitespaceConstraint(control);

    const isValid = control.checkValidity();
    if (isValid) return '';

    if (control.dataset.error) {
      return control.dataset.error;
    }
    if (control.validity.valueMissing) {
      return 'This field is required.';
    }
    if (control.validity.typeMismatch) {
      return 'Please enter a value in the expected format.';
    }
    return control.validationMessage || 'Please check this field.';
  }

  function renderErrorMessage(errorEl, message) {
    errorEl.textContent = '';
    const icon = document.createElement('span');
    icon.setAttribute('role', 'img');
    icon.setAttribute('aria-label', 'Error');
    icon.textContent = '⚠';

    const text = document.createTextNode(` ${message}`);
    errorEl.append(icon, text);
  }

  function getFieldLabelText(control) {
    const label = control.labels && control.labels[0];
    if (!label) return control.name || 'this field';
    const clone = label.cloneNode(true);
    clone.querySelectorAll('[aria-hidden="true"]').forEach((node) => node.remove());
    return clone.textContent.replace(/\s+/g, ' ').trim();
  }

  function buildTicketSummaryText(customer, order) {
    const lines = [
      "Ben's Quality Firewood — Custom Order Request",
      '--------------------------------------------------',
      `Customer: ${customer.name}`,
      `Phone: ${customer.phone}`,
      `Email: ${customer.email || 'Not provided'}`,
      `Address / Drop Location: ${customer.address}`,
      `Preferred Date: ${customer.preferredDate || 'Next available route'}`,
      '',
      'Order Specifications:',
      `- Load Volume: ${order.volumeLabel} (${order.cuftText})`,
      `- Cut Length: ${order.cutLabel} (${order.fitLabel})`,
      `- Wood Mix: ${order.woodSummaryLabel}`,
      `- Placement: ${order.deliveryLabel}`,
      `- Delivery Zone: ${order.zoneDisplayLabel}`,
      `- Estimated Route Window: ${order.timeframe}`
    ];

    if (customer.notes) {
      lines.push(`- Drop & Stove Notes: ${customer.notes}`);
    }

    lines.push('', 'Quote Policy: Free custom quote confirmed within 1 hour — Pay only on delivery.');
    return lines.join('\n');
  }

  function buildSmsBodyText(customer, order) {
    const parts = [
      `Hi Ben, firewood order request from ${customer.name} (${customer.phone}):`,
      `${order.volumeLabel}, ${order.cutLabel}, ${order.woodSummaryLabel}, ${order.deliveryLabel}, ${order.zoneDisplayLabel}.`,
      `Address: ${customer.address}.`
    ];
    if (customer.preferredDate) {
      parts.push(`Preferred date: ${customer.preferredDate}.`);
    }
    if (customer.notes) {
      parts.push(`Notes: ${customer.notes}`);
    }
    return parts.join(' ');
  }

  function renderConfirmationTicket(confirmationEl, form, customer, order, liveRegionEl) {
    confirmationEl.textContent = '';
    confirmationEl.tabIndex = -1;
    confirmationEl.dataset.orderSignature = order.signature;

    const header = document.createElement('div');
    header.className = 'confirmation-ticket__header';

    const badge = document.createElement('span');
    badge.className = 'confirmation-ticket__badge';
    badge.textContent = 'Dispatch Ticket Ready';

    const title = document.createElement('h3');
    title.className = 'confirmation-ticket__title';
    title.textContent = `Order Ticket Prepared for ${customer.name}`;

    const subtitle = document.createElement('p');
    subtitle.className = 'confirmation-ticket__subtitle';
    subtitle.textContent = 'Send your specs straight to Ben via text or email below. Free custom quote confirmed within 1 hour — pay only on delivery.';

    header.append(badge, title, subtitle);

    const specRows = [
      ['Customer', `${customer.name} · ${customer.phone}`],
      ['Email', customer.email || 'Not provided'],
      ['Drop Address', customer.address],
      ['Preferred Date', customer.preferredDate || 'Next available route'],
      ['Load Volume', `${order.volumeLabel} (${order.cuftText})`],
      ['Custom Cut Length', `${order.cutLabel} — ${order.fitLabel}`],
      ['Wood Mix', order.woodSummaryLabel],
      ['Delivery / Placement', order.deliveryLabel],
      ['Delivery Zone', `${order.zoneDisplayLabel} (${order.timeframe})`]
    ];

    if (customer.notes) {
      specRows.push(['Drop & Stove Notes', customer.notes]);
    }

    const specsList = document.createElement('dl');
    specsList.className = 'confirmation-ticket__specs';

    specRows.forEach(([term, value]) => {
      const row = document.createElement('div');
      row.className = 'confirmation-ticket__row';

      const dt = document.createElement('dt');
      dt.textContent = term;

      const dd = document.createElement('dd');
      dd.textContent = value;

      row.append(dt, dd);
      specsList.append(row);
    });

    const fullSummaryText = buildTicketSummaryText(customer, order);
    const smsText = buildSmsBodyText(customer, order);
    const emailSubject = `Firewood Order Request — ${order.volumeLabel} (${order.cutLabel}) — ${customer.name}`;

    const actions = document.createElement('div');
    actions.className = 'confirmation-ticket__actions';

    const smsLink = document.createElement('a');
    smsLink.className = 'btn btn--primary';
    smsLink.href = `sms:${BUSINESS_SMS}?body=${encodeURIComponent(smsText)}`;
    smsLink.textContent = 'Text Order to Ben (905) 375-5172';

    const emailLink = document.createElement('a');
    emailLink.className = 'btn btn--secondary';
    emailLink.href = `mailto:${BUSINESS_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(fullSummaryText)}`;
    emailLink.textContent = 'Email Order to Ben';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn confirmation-ticket__copy-btn';
    copyBtn.textContent = 'Copy Order Summary';

    actions.append(smsLink, emailLink, copyBtn);

    const feedback = document.createElement('p');
    feedback.className = 'confirmation-ticket__feedback';
    feedback.setAttribute('role', 'status');
    feedback.hidden = true;

    let feedbackTimer = null;
    copyBtn.addEventListener('click', () => {
      copyTextToClipboard(fullSummaryText)
        .then(() => {
          feedback.textContent = 'Copied order summary to clipboard!';
          feedback.hidden = false;
          announcePolite(liveRegionEl, 'Order summary copied to clipboard.');
          window.clearTimeout(feedbackTimer);
          feedbackTimer = window.setTimeout(() => {
            feedback.hidden = true;
          }, 4000);
        })
        .catch(() => {
          feedback.textContent = 'Select and copy the summary details above, or use Text/Email.';
          feedback.hidden = false;
          announcePolite(liveRegionEl, 'Unable to access clipboard automatically.');
        });
    });

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn confirmation-ticket__reset';
    resetBtn.textContent = 'Edit Details or Start Another Request';
    resetBtn.addEventListener('click', () => {
      confirmationEl.hidden = true;
      form.hidden = false;
      const firstControl = form.querySelector('input, textarea, select');
      if (firstControl) firstControl.focus();
    });

    confirmationEl.append(header, specsList, actions, feedback, resetBtn);
    form.hidden = true;
    confirmationEl.hidden = false;
  }

  function initAccessibleForm(form, liveRegionEl, confirmationEl, orderGetter) {
    if (!form) return null;

    UserInvalidFallback.init(form);
    setDateInputMinimums(form);

    let interactedFields = new WeakSet();
    let announceTimer = null;
    let pendingAnnouncedField = null;

    const getValidatableControls = () => (
      Array.from(form.elements).filter((el) => (
        el.matches('input, select, textarea') &&
        el.type !== 'hidden' &&
        el.type !== 'submit' &&
        el.type !== 'button'
      ))
    );

    const syncFieldValidation = (control, { show = false, announce = false } = {}) => {
      if (!control || !control.id) return true;
      const errorEl = document.getElementById(`${control.id}-error`);
      const errorMessage = validateControlWithConstraintAPI(control);
      const isValid = errorMessage === '';

      if (!show) {
        return isValid;
      }

      if (!isValid) {
        if (errorEl) {
          renderErrorMessage(errorEl, errorMessage);
          errorEl.hidden = false;
          linkErrorToDescribedBy(control, errorEl.id, true);
        }
        control.setAttribute('aria-invalid', 'true');

        if (announce && liveRegionEl) {
          const labelText = getFieldLabelText(control);
          window.clearTimeout(announceTimer);
          pendingAnnouncedField = control;
          announceTimer = window.setTimeout(() => {
            announcePolite(liveRegionEl, `${labelText}: ${errorMessage}`);
          }, 450);
        }
      } else {
        if (errorEl) {
          errorEl.hidden = true;
          errorEl.textContent = '';
          linkErrorToDescribedBy(control, errorEl.id, false);
        }
        control.setAttribute('aria-invalid', 'false');

        if (pendingAnnouncedField === control) {
          window.clearTimeout(announceTimer);
          pendingAnnouncedField = null;
        }
      }

      return isValid;
    };

    form.addEventListener('blur', (event) => {
      const target = event.target;
      if (!target.matches || !target.matches('input, select, textarea')) return;
      if (target.type === 'hidden' || target.type === 'submit' || target.type === 'button') return;

      interactedFields.add(target);
      syncFieldValidation(target, { show: true, announce: true });
    }, true);

    form.addEventListener('input', (event) => {
      const target = event.target;
      if (!target.matches || !target.matches('input, select, textarea')) return;
      if (!interactedFields.has(target)) return;

      syncFieldValidation(target, { show: true, announce: false });
    });

    form.addEventListener('change', (event) => {
      const target = event.target;
      if (!target.matches || !target.matches('input, select, textarea')) return;
      if (target.type === 'date' || interactedFields.has(target)) {
        interactedFields.add(target);
        syncFieldValidation(target, { show: true, announce: true });
      }
    });

    form.addEventListener('reset', () => {
      interactedFields = new WeakSet();
      window.clearTimeout(announceTimer);
      getValidatableControls().forEach((control) => {
        const errorEl = control.id ? document.getElementById(`${control.id}-error`) : null;
        if (errorEl) {
          errorEl.hidden = true;
          errorEl.textContent = '';
          linkErrorToDescribedBy(control, errorEl.id, false);
        }
        if (typeof control.setCustomValidity === 'function') {
          control.setCustomValidity('');
        }
        control.setAttribute('aria-invalid', 'false');
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      setDateInputMinimums(form);
      window.clearTimeout(announceTimer);

      const controls = getValidatableControls();
      const invalidControls = [];

      controls.forEach((control) => {
        interactedFields.add(control);
        const valid = syncFieldValidation(control, { show: true, announce: false });
        if (!valid) {
          invalidControls.push(control);
        }
      });

      if (invalidControls.length > 0) {
        const firstInvalid = invalidControls[0];
        const firstLabel = getFieldLabelText(firstInvalid);
        const countLabel = invalidControls.length === 1 ? '1 field needs' : `${invalidControls.length} fields need`;
        announcePolite(liveRegionEl, `${countLabel} attention before submitting. Focus moved to ${firstLabel}.`);
        firstInvalid.focus();
        return;
      }

      const formData = new FormData(form);
      const customer = {
        name: String(formData.get('name') || '').trim(),
        phone: String(formData.get('phone') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        address: String(formData.get('address') || '').trim(),
        preferredDate: String(formData.get('preferredDate') || '').trim(),
        notes: String(formData.get('notes') || '').trim()
      };

      const order = orderGetter();

      if (confirmationEl) {
        renderConfirmationTicket(confirmationEl, form, customer, order, liveRegionEl);
        announcePolite(
          liveRegionEl,
          `Order dispatch ticket ready for ${customer.name}. Use Text Order, Email Order, or Copy Order Summary.`
        );
        confirmationEl.focus();
      }
    });

    return {
      resetView: () => {
        if (confirmationEl) confirmationEl.hidden = true;
        form.hidden = false;
      }
    };
  }

  // ---------------------------------------------------------------------------
  // 4. Accessible Light-Dismiss <dialog> Controller
  // ---------------------------------------------------------------------------
  function initBookingModal(cutBuilder, navController, modalFormController, chatController) {
    const dialog = document.getElementById('booking-modal');
    const modalForm = document.getElementById('modal-order-form');
    const modalConfirmation = document.getElementById('modal-confirmation');
    const modalNameInput = document.getElementById('modal-name');
    if (!dialog) return;

    let lastTrigger = null;

    // Mandatory modern-web-guidance closedBy fallback for browsers without native light-dismiss.
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;

        const rect = dialog.getBoundingClientRect();
        const isOutside = (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        );

        if (isOutside) {
          dialog.close('backdrop');
        }
      });
    }

    dialog.addEventListener('close', () => {
      if (lastTrigger && isElementVisible(lastTrigger)) {
        lastTrigger.focus();
      } else if (navController && navController.toggleBtn && isElementVisible(navController.toggleBtn)) {
        navController.toggleBtn.focus();
      }
    });

    const openModal = (triggerEl, wasPresetApplied) => {
      lastTrigger = triggerEl || document.activeElement;
      if (navController) navController.close();
      if (chatController) chatController.close();

      setDateInputMinimums(dialog);
      const latestOrder = cutBuilder.syncOrderState();

      if (modalConfirmation && !modalConfirmation.hidden) {
        const orderChanged = modalConfirmation.dataset.orderSignature !== latestOrder.signature;
        if (wasPresetApplied || orderChanged) {
          modalFormController?.resetView();
        }
      }

      if (!dialog.open) {
        dialog.showModal();
      }

      if (modalConfirmation && !modalConfirmation.hidden) {
        modalConfirmation.focus();
      } else if (modalNameInput) {
        modalNameInput.focus();
      } else if (modalForm) {
        modalForm.querySelector('input, textarea, select, button')?.focus();
      }
    };

    document.addEventListener('click', (event) => {
      const presetTrigger = event.target.closest('[data-preset-volume], [data-preset-wood], [data-preset-cut]');
      const bookingTrigger = event.target.closest('[data-open-booking]');

      if (!presetTrigger && !bookingTrigger) return;

      let appliedPreset = false;
      if (presetTrigger) {
        appliedPreset = cutBuilder.applyPresetFromElement(presetTrigger);
      }

      if (bookingTrigger) {
        openModal(bookingTrigger, appliedPreset);
      } else if (appliedPreset) {
        const builderSection = document.getElementById('custom-cut-builder');
        if (builderSection) {
          const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          builderSection.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' });
        }
      }
    });
  }

  function initActiveNavObserver() {
    if (!('IntersectionObserver' in window)) return;
    const links = Array.from(document.querySelectorAll('.primary-nav__link[href^="#"]'));
    if (!links.length) return;

    const sectionPairs = links
      .map((link) => {
        const id = link.getAttribute('href').slice(1);
        const section = id ? document.getElementById(id) : null;
        return section ? { link, section } : null;
      })
      .filter(Boolean);

    if (!sectionPairs.length) return;

    const setActive = (activeLink) => {
      links.forEach((link) => {
        if (link === activeLink) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const match = sectionPairs.find((pair) => pair.section === visible.target);
        if (match) setActive(match.link);
      },
      { rootMargin: '-25% 0px -60% 0px', threshold: [0.05, 0.25, 0.5] }
    );

    sectionPairs.forEach(({ section }) => observer.observe(section));
  }

  // ---------------------------------------------------------------------------
  // 5. Simple Direct-to-Mobile SMS Chat Card (Frontend Demo)
  // ---------------------------------------------------------------------------
  function initDemoChatWidget(bookingModal) {
    const launcher = document.getElementById('chat-launcher');
    const panel = document.getElementById('chat-panel');
    const closeBtn = document.getElementById('chat-close-btn');
    const form = document.getElementById('chat-form');
    const nameInput = document.getElementById('chat-name');
    const phoneInput = document.getElementById('chat-phone');
    const messageInput = document.getElementById('chat-input');
    const successEl = document.getElementById('chat-success');
    const resetBtn = document.getElementById('chat-reset-btn');

    if (!launcher || !panel || !form || !nameInput || !phoneInput || !messageInput) {
      return { close: () => {} };
    }

    const setChatOpen = (isOpen, restoreFocus = false) => {
      panel.hidden = !isOpen;
      launcher.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

      if (isOpen) {
        if (!form.hidden) nameInput.focus();
      } else if (restoreFocus) {
        launcher.focus();
      }
    };

    launcher.addEventListener('click', () => {
      setChatOpen(panel.hidden);
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        setChatOpen(false, true);
      });
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const firstEmpty = [nameInput, phoneInput, messageInput].find((el) => !el.value.trim());
      if (firstEmpty) {
        firstEmpty.focus();
        return;
      }
      form.hidden = true;
      if (successEl) {
        successEl.hidden = false;
      }
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        form.reset();
        if (successEl) successEl.hidden = true;
        form.hidden = false;
        nameInput.focus();
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (bookingModal && bookingModal.open) return;
      if (panel.hidden) return;
      setChatOpen(false, true);
    });

    return {
      close: () => setChatOpen(false)
    };
  }

  // ---------------------------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    const bookingModal = document.getElementById('booking-modal');

    initSpecBanner();
    const navController = initMobileNav(bookingModal);
    const chatController = initDemoChatWidget(bookingModal);
    initActiveNavObserver();
    const cutBuilder = initCutBuilder();

    initAccessibleForm(
      document.getElementById('lead-booking-form'),
      document.getElementById('form-live-region'),
      document.getElementById('lead-confirmation'),
      cutBuilder.getOrder
    );

    const modalFormController = initAccessibleForm(
      document.getElementById('modal-order-form'),
      document.getElementById('modal-live-region'),
      document.getElementById('modal-confirmation'),
      cutBuilder.getOrder
    );

    initBookingModal(cutBuilder, navController, modalFormController, chatController);
  });
})();
