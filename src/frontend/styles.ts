import type { SpindleFrontendContext } from 'lumiverse-spindle-types'

export function addShiruStoreStyles(ctx: SpindleFrontendContext): () => void {
  return ctx.dom.addStyle(`
    .ss-tab-root {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-height: 100%;
      min-height: 0;
      overflow: hidden;
    }
    .ss-tab-root > .ss-root {
      flex: 1 1 0%;
      min-height: 0;
    }
    .ss-root,
    .ss-sheet-backdrop,
    .ss-filter-backdrop {
      --ss-safe-top: env(safe-area-inset-top, 0px);
      --ss-safe-right: env(safe-area-inset-right, 0px);
      --ss-safe-bottom: env(safe-area-inset-bottom, 0px);
      --ss-safe-left: env(safe-area-inset-left, 0px);
      --ss-keyboard-bottom: var(--app-keyboard-inset-bottom, 0px);
      --ss-primary: var(--lumiverse-primary, rgba(147, 112, 219, 0.9));
      --ss-primary-hover: var(--lumiverse-primary-hover, rgba(167, 132, 239, 0.95));
      --ss-primary-contrast: var(--lumiverse-primary-contrast, #ffffff);
      --ss-primary-text: var(--lumiverse-primary-text, rgba(186, 135, 255, 0.95));
      --ss-primary-muted: var(--lumiverse-primary-muted, rgba(147, 112, 219, 0.6));
      --ss-primary-010: var(--lumiverse-primary-010, rgba(147, 112, 219, 0.1));
      --ss-primary-015: var(--lumiverse-primary-015, rgba(147, 112, 219, 0.15));
      --ss-primary-050: var(--lumiverse-primary-050, rgba(147, 112, 219, 0.5));
      --ss-bg: var(--lumiverse-bg, rgba(28, 24, 38, 0.95));
      --ss-bg-deep: var(--lumiverse-bg-deep, rgb(10, 8, 18));
      --ss-bg-elevated: var(--lumiverse-bg-elevated, rgba(35, 30, 48, 0.9));
      --ss-card-bg: var(--lumiverse-card-bg, rgb(24, 20, 34));
      --ss-card-image-bg: var(--lumiverse-card-image-bg, rgb(20, 17, 28));
      --ss-fill-subtle: var(--lumiverse-fill-subtle, rgba(0, 0, 0, 0.1));
      --ss-fill: var(--lumiverse-fill, rgba(0, 0, 0, 0.15));
      --ss-fill-hover: var(--lumiverse-fill-hover, rgba(0, 0, 0, 0.2));
      --ss-border: var(--lumiverse-border, rgba(147, 112, 219, 0.12));
      --ss-border-hover: var(--lumiverse-border-hover, rgba(147, 112, 219, 0.25));
      --ss-border-neutral: var(--lumiverse-border-neutral, rgba(128, 128, 128, 0.15));
      --ss-text: var(--lumiverse-text, rgba(255, 255, 255, 0.9));
      --ss-text-muted: var(--lumiverse-text-muted, rgba(255, 255, 255, 0.65));
      --ss-text-dim: var(--lumiverse-text-dim, rgba(255, 255, 255, 0.4));
      --ss-danger: var(--lumiverse-danger, #ef4444);
      --ss-success: var(--lumiverse-success, #22c55e);
      --ss-tier-none: #94a3b8;
      --ss-tier-top: var(--ss-success);
      --ss-tier-mid: #60a5fa;
      --ss-tier-low: var(--ss-danger);
      --ss-shadow-sm: var(--lumiverse-shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.2));
      --ss-shadow-md: var(--lumiverse-shadow-md, 0 8px 24px rgba(0, 0, 0, 0.4));
      --ss-ease: cubic-bezier(0.4, 0, 0.2, 1);
      color: var(--ss-text);
      font-family: var(--lumiverse-font-family, inherit);
      font-size: 14px;
      line-height: 1.45;
    }
    .ss-root *,
    .ss-root *::before,
    .ss-root *::after,
    .ss-sheet-backdrop *,
    .ss-sheet-backdrop *::before,
    .ss-sheet-backdrop *::after,
    .ss-filter-backdrop *,
    .ss-filter-backdrop *::before,
    .ss-filter-backdrop *::after { box-sizing: border-box; }
    .ss-root [hidden],
    .ss-sheet-backdrop [hidden],
    .ss-filter-backdrop [hidden] { display: none !important; }
    .ss-root button,
    .ss-sheet-backdrop button,
    .ss-filter-backdrop button {
      font: inherit;
      -webkit-tap-highlight-color: transparent;
    }
    .ss-icon { display: inline-flex; flex: 0 0 auto; }
    .ss-icon svg { display: block; }

    .ss-root {
      position: relative;
      height: 100%;
      max-height: 100%;
      min-height: 0;
      flex: 1 1 0%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: transparent;
      container-type: inline-size;
    }
    .ss-nav {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px calc(12px + var(--ss-safe-right)) 10px calc(12px + var(--ss-safe-left));
      border-bottom: 1px solid var(--ss-border);
    }
    .ss-tabs {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      gap: 2px;
      padding: 3px;
      border: 1px solid var(--ss-border);
      border-radius: 10px;
      background: var(--ss-fill-subtle);
      overflow-x: auto;
      scrollbar-width: none;
    }
    .ss-tabs::-webkit-scrollbar { display: none; }
    .ss-tab {
      appearance: none;
      flex: 1 1 0;
      min-width: max-content;
      height: 30px;
      padding: 0 12px;
      border: 0;
      border-radius: 7px;
      background: transparent;
      color: var(--ss-text-dim);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 150ms ease, color 150ms ease;
    }
    .ss-tab:hover { color: var(--ss-text); background: var(--ss-fill-hover); }
    .ss-tab[data-active="true"] {
      background: var(--ss-primary-015);
      color: var(--ss-primary-text);
      box-shadow: inset 0 0 0 1px var(--ss-primary-015);
    }
    .ss-content {
      flex: 1 1 0%;
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      padding: 12px calc(12px + var(--ss-safe-right)) calc(16px + var(--ss-safe-bottom)) calc(12px + var(--ss-safe-left));
    }
    .ss-panel {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ss-icon-btn {
      appearance: none;
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--lumiverse-btn-icon, 34px);
      height: var(--lumiverse-btn-icon, 34px);
      border: 1px solid var(--ss-border);
      border-radius: 8px;
      background: var(--ss-fill-subtle);
      color: var(--ss-text-muted);
      cursor: pointer;
      transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
    }
    .ss-icon-btn:hover {
      background: var(--ss-fill-hover);
      color: var(--ss-text);
      border-color: var(--ss-border-hover);
    }
    .ss-icon-btn-danger:hover {
      color: var(--ss-danger);
      border-color: color-mix(in srgb, var(--ss-danger) 45%, transparent);
    }
    .ss-btn {
      appearance: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      min-width: 0;
      height: 42px;
      padding: 0 16px;
      border: 1px solid transparent;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
    }
    .ss-btn .ss-btn-label { overflow: hidden; text-overflow: ellipsis; }
    .ss-btn-primary {
      background: var(--ss-primary);
      color: var(--ss-primary-contrast);
    }
    .ss-btn-primary:hover { background: var(--ss-primary-hover); }
    .ss-btn-secondary {
      background: var(--ss-fill-subtle);
      border-color: var(--ss-border);
      color: var(--ss-text);
    }
    .ss-btn-secondary:hover { border-color: var(--ss-border-hover); background: var(--ss-fill-hover); }
    .ss-btn-secondary[data-saved="true"] {
      background: var(--ss-primary-010);
      border-color: var(--ss-primary-050);
      color: var(--ss-primary-text);
    }
    .ss-btn-ghost {
      background: transparent;
      border: 1px dashed var(--ss-border-hover);
      color: var(--ss-text-muted);
      height: 38px;
      font-size: 13px;
    }
    .ss-btn-ghost:hover { color: var(--ss-text); }
    .ss-btn:disabled { opacity: 0.55; cursor: wait; }
    .ss-link-btn {
      appearance: none;
      border: 0;
      background: none;
      padding: 2px 0;
      color: var(--ss-primary-text);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .ss-back-link {
      appearance: none;
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border: 0;
      background: none;
      padding: 2px 0;
      color: var(--ss-text-muted);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .ss-back-link:hover { color: var(--ss-text); }

    .ss-mode-row {
      align-self: flex-start;
      display: inline-flex;
      gap: 2px;
      padding: 3px;
      border: 1px solid var(--ss-border);
      border-radius: 999px;
      background: var(--ss-fill-subtle);
    }
    .ss-mode-btn {
      appearance: none;
      border: 0;
      border-radius: 999px;
      padding: 5px 14px;
      background: transparent;
      color: var(--ss-text-dim);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .ss-mode-btn[data-active="true"] {
      background: var(--ss-primary);
      color: var(--ss-primary-contrast);
    }

    .ss-search-row {
      display: flex;
      gap: 8px;
      align-items: stretch;
    }
    .ss-search-wrap {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      height: 38px;
      padding: 0 12px;
      border: 1px solid var(--ss-border);
      border-radius: 10px;
      background: var(--lumiverse-input-bg, var(--ss-fill));
      color: var(--ss-text-dim);
      transition: border-color 150ms ease;
    }
    .ss-search-wrap:focus-within { border-color: var(--ss-primary-050); }
    .ss-search {
      width: 100%;
      height: 38px;
      padding: 0 12px;
      border: 1px solid var(--ss-border);
      border-radius: 10px;
      background: var(--lumiverse-input-bg, var(--ss-fill));
      color: var(--ss-text);
      font: inherit;
      font-size: 16px;
      outline: none;
    }
    .ss-search:focus { border-color: var(--ss-primary-050); }
    .ss-search::placeholder { color: var(--ss-text-dim); }
    .ss-search-wrap .ss-search {
      flex: 1 1 auto;
      min-width: 0;
      height: 100%;
      padding: 0;
      border: 0;
      background: transparent;
    }
    @container (min-width: 520px) {
      .ss-search { font-size: 14px; }
    }
    .ss-filter-btn {
      appearance: none;
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 38px;
      padding: 0 12px;
      border: 1px solid var(--ss-border);
      border-radius: 10px;
      background: var(--ss-fill-subtle);
      color: var(--ss-text-muted);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .ss-filter-btn:hover { color: var(--ss-text); border-color: var(--ss-border-hover); }
    .ss-filter-btn[data-active="true"] {
      color: var(--ss-primary-text);
      border-color: var(--ss-primary-050);
      background: var(--ss-primary-010);
    }
    .ss-filter-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 999px;
      background: var(--ss-primary);
      color: var(--ss-primary-contrast);
      font-size: 11px;
      font-weight: 700;
    }
    @container (max-width: 340px) {
      .ss-filter-btn > span:not(.ss-icon):not(.ss-filter-count) { display: none; }
    }
    .ss-filter-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: -4px;
      font-size: 12px;
      color: var(--ss-text-muted);
    }
    .ss-filter-summary {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ss-section { display: flex; flex-direction: column; gap: 8px; }
    .ss-section + .ss-section { margin-top: 8px; }
    .ss-section-head {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ss-section-title {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--ss-text);
      letter-spacing: -0.15px;
    }
    .ss-section-count {
      padding: 1px 7px;
      border-radius: 999px;
      background: var(--ss-fill);
      color: var(--ss-text-dim);
      font-size: 11px;
      font-weight: 600;
    }
    .ss-collapse {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .ss-collapse-toggle {
      appearance: none;
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      margin: 0;
      padding: 0;
      border: 0;
      background: none;
      color: var(--ss-text);
      text-align: left;
      cursor: pointer;
    }
    .ss-collapse-toggle .ss-section-title { color: var(--ss-text); }
    .ss-collapse-toggle:hover .ss-section-title { color: var(--ss-primary-text); }
    .ss-collapse-chevron {
      margin-left: auto;
      color: var(--ss-text-dim);
      font-size: 18px;
      line-height: 1;
      transition: transform 160ms var(--ss-ease);
    }
    .ss-collapse[data-open="true"] .ss-collapse-chevron {
      transform: rotate(90deg);
    }
    .ss-collapse-body[hidden] { display: none !important; }

    .ss-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
      gap: 10px;
    }
    @container (max-width: 400px) {
      .ss-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
    }
    .ss-card {
      appearance: none;
      position: relative;
      display: block;
      width: 100%;
      aspect-ratio: 3 / 4;
      padding: 0;
      border: 1px solid var(--ss-border-neutral);
      border-radius: 14px;
      overflow: hidden;
      background: var(--ss-card-bg);
      box-shadow: var(--ss-shadow-sm);
      color: var(--ss-text);
      text-align: left;
      cursor: pointer;
      transition: border-color 200ms var(--ss-ease), box-shadow 200ms var(--ss-ease);
      contain: layout paint;
    }
    .ss-card::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 50%;
      pointer-events: none;
      z-index: 1;
      background: linear-gradient(
        to top,
        var(--ss-bg) 0%,
        color-mix(in srgb, var(--ss-bg) 88%, transparent) 30%,
        color-mix(in srgb, var(--ss-bg) 40%, transparent) 65%,
        transparent 100%
      );
    }
    @media (hover: hover) and (pointer: fine) {
      .ss-card:hover {
        border-color: var(--ss-border-hover);
        box-shadow: var(--ss-shadow-md), 0 0 0 1px var(--ss-primary-015);
      }
    }
    .ss-card:active { transform: scale(0.985); }
    .ss-card:focus-visible {
      outline: 2px solid var(--ss-primary);
      outline-offset: -2px;
    }
    .ss-card-art-wrap {
      position: absolute;
      inset: 0;
      background: var(--ss-card-image-bg);
      overflow: hidden;
    }
    .ss-card-art {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
    }
    .ss-card-art-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ss-primary-muted);
      font-size: 40px;
      font-weight: 300;
      background: var(--ss-card-image-bg);
    }
    .ss-card > .ss-score {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 2;
    }
    .ss-card-meta {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2;
      padding: 10px 11px 11px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .ss-card-name {
      font-size: 13px;
      font-weight: 600;
      line-height: 1.3;
      letter-spacing: -0.15px;
      color: var(--ss-text);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      overflow-wrap: anywhere;
    }
    .ss-card-creator {
      font-size: 11px;
      color: var(--ss-text-dim);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ss-skeleton {
      cursor: default;
      box-shadow: none;
      background: linear-gradient(
        100deg,
        var(--ss-fill-subtle) 20%,
        var(--ss-fill-hover) 40%,
        var(--ss-fill-subtle) 60%
      );
      background-size: 300% 100%;
      animation: ss-shimmer 1.4s ease-in-out infinite;
    }
    .ss-skeleton::after { display: none; }
    @keyframes ss-shimmer {
      0% { background-position: 100% 0; }
      100% { background-position: 0 0; }
    }
    .ss-discover-affinity {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-bottom: 14px;
      margin-bottom: 10px;
      border-bottom: 1px solid var(--ss-border);
    }
    .ss-discover-affinity[hidden] { display: none !important; }
    .ss-discover-affinity .ss-section { gap: 10px; }
    .ss-rail-wrap {
      position: relative;
      margin: 0 -12px;
    }
    .ss-rail {
      display: flex;
      gap: 10px;
      padding: 2px 12px 6px;
      overflow-x: auto;
      overflow-y: hidden;
      scroll-snap-type: x proximity;
      scroll-padding: 0 12px;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }
    .ss-rail::-webkit-scrollbar { display: none; }
    .ss-rail .ss-card {
      flex: 0 0 132px;
      width: 132px;
      scroll-snap-align: start;
    }
    .ss-rail-nav {
      appearance: none;
      position: absolute;
      top: 50%;
      z-index: 2;
      display: none;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      margin-top: -16px;
      padding: 0;
      border: 1px solid var(--ss-border);
      border-radius: 999px;
      background: color-mix(in srgb, var(--ss-bg) 88%, transparent);
      color: var(--ss-text);
      cursor: pointer;
      -webkit-backdrop-filter: blur(8px);
      backdrop-filter: blur(8px);
      box-shadow: var(--ss-shadow-sm);
    }
    .ss-rail-nav--prev { left: 4px; }
    .ss-rail-nav--next { right: 4px; }
    .ss-rail-nav--next .ss-icon { transform: rotate(180deg); }
    .ss-rail-nav:hover {
      background: var(--ss-fill-hover);
      border-color: var(--ss-border-hover);
    }
    @media (hover: hover) and (pointer: fine) {
      .ss-rail-nav:not([hidden]) { display: inline-flex; }
      .ss-rail {
        scrollbar-width: thin;
        scrollbar-color: color-mix(in srgb, var(--ss-text) 35%, transparent) transparent;
      }
      .ss-rail::-webkit-scrollbar {
        display: block;
        height: 6px;
      }
      .ss-rail::-webkit-scrollbar-thumb {
        background: color-mix(in srgb, var(--ss-text) 35%, transparent);
        border-radius: 999px;
      }
      .ss-rail::-webkit-scrollbar-track { background: transparent; }
    }

    .ss-score {
      --ss-tier: var(--ss-tier-none);
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px 3px 7px;
      border: 1px solid color-mix(in srgb, var(--ss-text) 12%, transparent);
      border-radius: 999px;
      background: color-mix(in srgb, var(--ss-bg-deep) 60%, transparent);
      -webkit-backdrop-filter: blur(6px);
      backdrop-filter: blur(6px);
      color: var(--ss-primary-contrast);
      font-size: 11px;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
      pointer-events: none;
    }
    .ss-score::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--ss-tier);
      box-shadow: 0 0 6px var(--ss-tier);
    }
    .ss-score[data-tier="top"] { --ss-tier: var(--ss-tier-top); }
    .ss-score[data-tier="mid"] { --ss-tier: var(--ss-tier-mid); }
    .ss-score[data-tier="low"] { --ss-tier: var(--ss-tier-low); }
    .ss-score[data-tier="none"] { color: var(--ss-text-muted); }
    .ss-score[data-tier="none"]::before { box-shadow: none; }
    .ss-score-lg { font-size: 13px; padding: 5px 11px 5px 9px; gap: 6px; }
    .ss-score-lg::before { width: 7px; height: 7px; }

    .ss-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 6px;
      padding: 40px 16px;
    }
    .ss-empty-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      margin-bottom: 6px;
      border-radius: 50%;
      background: var(--ss-primary-010);
      color: var(--ss-primary-text);
    }
    .ss-empty-title { font-size: 15px; font-weight: 600; }
    .ss-empty-body {
      max-width: 300px;
      font-size: 13px;
      color: var(--ss-text-dim);
    }
    .ss-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 6px;
      padding: 32px 16px;
      color: var(--ss-text-dim);
      font-size: 13px;
    }
    .ss-error {
      padding: 12px 14px;
      border: 1px solid color-mix(in srgb, var(--ss-danger) 35%, transparent);
      border-radius: 10px;
      background: color-mix(in srgb, var(--ss-danger) 10%, transparent);
      color: var(--ss-danger);
      font-size: 13px;
    }
    .ss-load-more {
      padding: 12px 8px 4px;
      text-align: center;
      color: var(--ss-text-dim);
      font-size: 12px;
    }
    .ss-sentinel { width: 100%; height: 1px; }
    .ss-toast {
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: calc(12px + var(--ss-safe-bottom));
      z-index: 5;
      padding: 10px 14px;
      border: 1px solid var(--ss-border-hover);
      border-radius: 10px;
      background-color: var(--ss-bg-deep);
      background-image: linear-gradient(var(--ss-bg-elevated), var(--ss-bg-elevated));
      box-shadow: var(--ss-shadow-md);
      font-size: 13px;
      animation: ss-rise 200ms var(--ss-ease);
    }
    .ss-toast[data-tone="error"] {
      border-color: color-mix(in srgb, var(--ss-danger) 50%, transparent);
      color: var(--ss-danger);
    }
    .ss-toast[data-tone="ok"] {
      border-color: color-mix(in srgb, var(--ss-success) 45%, transparent);
    }
    @keyframes ss-rise {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: none; }
    }
    .ss-version {
      padding: 20px 0 4px;
      text-align: center;
      font-size: 11px;
      color: var(--ss-text-dim);
    }

    .ss-list { display: flex; flex-direction: column; gap: 6px; }
    .ss-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px 6px 6px;
      border: 1px solid var(--ss-border-neutral);
      border-radius: 12px;
      background: var(--ss-fill-subtle);
      transition: border-color 150ms ease, background 150ms ease;
    }
    .ss-row:hover { border-color: var(--ss-border-hover); background: var(--ss-fill); }
    .ss-row-open {
      appearance: none;
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      text-align: left;
      cursor: pointer;
    }
    .ss-row-thumb {
      flex: 0 0 auto;
      width: 42px;
      height: 56px;
      border-radius: 8px;
      object-fit: cover;
      object-position: center top;
      background: var(--ss-card-image-bg);
      font-size: 18px;
    }
    .ss-row-meta { flex: 1; min-width: 0; }
    .ss-row-title {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: -0.15px;
      color: var(--ss-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ss-row-sub {
      margin-top: 2px;
      font-size: 12px;
      color: var(--ss-text-dim);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ss-detail-head {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ss-detail-head-text { flex: 1; min-width: 0; }
    .ss-detail-head-title {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.15px;
      color: var(--ss-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ss-creator-banner {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 16px;
    }
    .ss-creator-banner .ss-btn {
      flex: 0 0 auto;
      width: auto;
      min-width: 96px;
      height: 36px;
      padding: 0 14px;
      font-size: 13px;
    }
    .ss-creator-avatar {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--ss-primary-015);
      color: var(--ss-primary-text);
      font-size: 18px;
      font-weight: 700;
    }

    .ss-collection-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 10px;
    }
    @container (max-width: 400px) {
      .ss-collection-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    }
    .ss-collection {
      appearance: none;
      display: flex;
      flex-direction: column;
      min-width: 0;
      padding: 0;
      border: 1px solid var(--ss-border-neutral);
      border-radius: 14px;
      overflow: hidden;
      background: var(--ss-fill-subtle);
      color: var(--ss-text);
      text-align: left;
      cursor: pointer;
      transition: border-color 150ms ease, transform 200ms var(--ss-ease);
    }
    .ss-collection:hover { border-color: var(--ss-border-hover); }
    .ss-collection:active { transform: scale(0.985); }
    .ss-collection-add { border-style: dashed; background: transparent; }
    .ss-collection-mosaic {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 2px;
      aspect-ratio: 4 / 3;
      background: var(--ss-card-image-bg);
      overflow: hidden;
    }
    .ss-collection-mosaic img {
      width: 100%;
      height: 100%;
      min-height: 0;
      object-fit: cover;
      object-position: center top;
      display: block;
    }
    .ss-collection-mosaic[data-count="1"] img { grid-column: 1 / -1; grid-row: 1 / -1; }
    .ss-collection-mosaic[data-count="2"] img { grid-row: 1 / -1; }
    .ss-collection-mosaic[data-count="3"] img:first-child { grid-row: 1 / -1; }
    .ss-collection-empty {
      grid-column: 1 / -1;
      grid-row: 1 / -1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ss-primary-muted);
    }
    .ss-collection-meta { padding: 9px 11px 11px; min-width: 0; }

    .ss-hunt {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 0;
    }
    .ss-hunt-stage {
      position: relative;
      display: flex;
      height: min(64dvh, 64vh, 560px);
      min-height: min(42dvh, 280px);
    }
    .ss-content:has(> .ss-panel:not([hidden]) .ss-hunt) {
      display: flex;
      flex-direction: column;
    }
    .ss-panel:has(.ss-hunt) { flex: 1 1 auto; min-height: 0; }
    .ss-browse-body:has(> .ss-hunt) { flex: 1 1 auto; min-height: 0; display: flex; }
    .ss-browse-body > .ss-hunt { flex: 1 1 auto; min-height: 0; }
    .ss-browse-body > .ss-hunt .ss-hunt-stage {
      flex: 1 1 auto;
      height: auto;
    }
    .ss-hunt-card {
      position: relative;
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--ss-border-neutral);
      border-radius: 18px;
      overflow: hidden;
      background: var(--ss-card-bg);
      box-shadow: var(--ss-shadow-md);
      touch-action: pan-y;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
      transform-origin: 50% 85%;
      will-change: transform;
      transition: transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 220ms ease;
      animation: ss-hunt-in 200ms ease-out;
    }
    .ss-hunt-card[data-dragging="true"] { transition: none; cursor: grabbing; }
    .ss-hunt-card[data-leaving="true"] {
      pointer-events: none;
      transition: transform 220ms ease-in, opacity 220ms ease-in;
    }
    .ss-hunt-card img { -webkit-user-drag: none; pointer-events: none; }
    @keyframes ss-hunt-in {
      from { scale: 0.96; opacity: 0.4; }
      to { scale: 1; opacity: 1; }
    }
    .ss-hunt-art-wrap {
      position: relative;
      flex: 0 0 58%;
      min-height: 0;
      background: var(--ss-card-image-bg);
    }
    .ss-hunt-art-wrap::after {
      content: '';
      position: absolute;
      inset: 40% 0 0 0;
      pointer-events: none;
      background: linear-gradient(to top, var(--ss-bg) 5%, transparent);
    }
    .ss-hunt-art {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
      font-size: 56px;
    }
    .ss-hunt-score {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 2;
    }
    .ss-hunt-title {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2;
      padding: 0 16px 10px;
    }
    .ss-hunt-name {
      font-size: 20px;
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.3px;
      overflow-wrap: anywhere;
    }
    .ss-hunt-creator { margin-top: 2px; font-size: 13px; color: var(--ss-text-muted); }
    .ss-hunt-stamp {
      position: absolute;
      top: 18px;
      z-index: 3;
      padding: 6px 12px;
      border: 2px solid currentColor;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.4);
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 0.08em;
      pointer-events: none;
    }
    .ss-hunt-stamp-skip { left: 16px; color: var(--ss-danger); transform: rotate(-12deg); }
    .ss-hunt-stamp-save { right: 16px; color: var(--ss-success); transform: rotate(12deg); }
    .ss-hunt-body {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 4px 16px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .ss-hunt-copy {
      margin: 0;
      font-size: 14px;
      line-height: 1.55;
      color: var(--ss-text-muted);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .ss-hunt-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
    }
    .ss-hunt-btn {
      appearance: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border: 1px solid var(--ss-border);
      border-radius: 50%;
      background-color: var(--ss-bg-deep);
      background-image: linear-gradient(var(--ss-bg-elevated), var(--ss-bg-elevated));
      color: var(--ss-text-muted);
      box-shadow: var(--ss-shadow-sm);
      cursor: pointer;
      transition: transform 150ms var(--ss-ease), border-color 150ms ease, color 150ms ease;
    }
    .ss-hunt-btn:active { transform: scale(0.92); }
    .ss-hunt-btn:disabled { opacity: 0.4; cursor: default; }
    .ss-hunt-btn-skip { color: var(--ss-danger); }
    .ss-hunt-btn-skip:hover { border-color: color-mix(in srgb, var(--ss-danger) 50%, transparent); }
    .ss-hunt-btn-save { color: var(--ss-success); }
    .ss-hunt-btn-save:hover { border-color: color-mix(in srgb, var(--ss-success) 50%, transparent); }
    .ss-hunt-btn-open { width: 44px; height: 44px; }
    .ss-hunt-btn-open:hover { color: var(--ss-text); border-color: var(--ss-border-hover); }
    .ss-hunt-counter {
      text-align: center;
      font-size: 12px;
      color: var(--ss-text-dim);
    }

    .ss-chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .ss-chip {
      padding: 3px 10px;
      border: 1px solid var(--ss-border);
      border-radius: 999px;
      background: var(--ss-fill-subtle);
      color: var(--ss-text-muted);
      font-size: 12px;
      white-space: nowrap;
    }

    .ss-root.ss-root--sheet-open .ss-content { overflow: hidden; pointer-events: none; }
    .ss-sheet-backdrop {
      position: absolute;
      inset: 0;
      z-index: 40;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      isolation: isolate;
      background-color: var(--ss-bg-deep);
      background-image: linear-gradient(var(--ss-bg), var(--ss-bg));
      animation: ss-sheet-in 220ms var(--ss-ease);
    }
    @keyframes ss-sheet-in {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: none; }
    }
    .ss-sheet {
      position: relative;
      display: flex;
      flex-direction: column;
      flex: 1 1 0%;
      min-height: 0;
      width: 100%;
      container: ss-sheet / inline-size;
    }
    .ss-sheet-header {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px calc(12px + var(--ss-safe-right)) 8px calc(12px + var(--ss-safe-left));
      border-bottom: 1px solid var(--ss-border);
    }
    .ss-detail-loading {
      position: absolute;
      inset: 0;
      z-index: 45;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 14px;
      background: color-mix(in srgb, var(--ss-bg-deep) 88%, transparent);
      -webkit-backdrop-filter: blur(6px);
      backdrop-filter: blur(6px);
      color: var(--ss-text-muted);
      font-size: 13px;
      font-weight: 600;
    }
    .ss-detail-loading-pulse {
      width: 36px;
      height: 36px;
      border-radius: 999px;
      border: 2px solid var(--ss-border);
      border-top-color: var(--ss-primary);
      animation: ss-spin 0.8s linear infinite;
    }
    @keyframes ss-spin {
      to { transform: rotate(360deg); }
    }
    .ss-sheet-header-title {
      flex: 1 1 auto;
      min-width: 0;
      font-size: 15px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ss-sheet-scroll {
      flex: 1 1 auto;
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
    }
    .ss-sheet-body {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: min(100%, 760px);
      margin: 0 auto;
      padding: 0 16px 24px;
      box-sizing: border-box;
    }
    .ss-hero {
      position: relative;
      width: 100%;
      margin: 0;
      padding: 22px 0 6px;
      overflow: visible;
    }
    .ss-hero-glow {
      position: absolute;
      top: -72px;
      bottom: -40px;
      left: -48px;
      right: -48px;
      background-size: cover;
      background-position: center;
      filter: blur(48px) saturate(1.3);
      opacity: 0.4;
      -webkit-mask-image: linear-gradient(to bottom, #000 30%, transparent 85%);
      mask-image: linear-gradient(to bottom, #000 30%, transparent 85%);
      pointer-events: none;
    }
    .ss-hero-inner {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      width: 100%;
      text-align: center;
    }
    .ss-hero-art {
      display: block;
      width: min(190px, 52%);
      aspect-ratio: 3 / 4;
      height: auto;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      object-fit: cover;
      object-position: center top;
      box-shadow: var(--ss-shadow-md);
      background: var(--ss-card-image-bg);
      font-size: 56px;
    }
    .ss-hero-text {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .ss-hero-title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.15px;
      color: var(--ss-text);
      overflow-wrap: anywhere;
    }
    .ss-hero-creator { font-size: 14px; color: var(--ss-text-muted); }
    .ss-creator-link {
      appearance: none;
      border: 0;
      background: none;
      padding: 0;
      color: var(--ss-primary-text);
      font-weight: 600;
      cursor: pointer;
    }
    .ss-creator-link:hover { text-decoration: underline; }
    .ss-hero-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 4px;
    }
    .ss-hero-stats { display: inline-flex; gap: 12px; }
    .ss-stat {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-weight: 600;
      color: var(--ss-text-muted);
    }
    .ss-sheet-body > .ss-chip-row {
      justify-content: flex-start;
      width: 100%;
    }
    @container ss-sheet (min-width: 540px) {
      .ss-hero { padding-top: 28px; }
      .ss-hero-glow { left: -64px; right: -64px; }
      .ss-hero-inner {
        flex-direction: row;
        align-items: flex-start;
        text-align: left;
        gap: 20px;
      }
      .ss-hero-art { width: 170px; flex: 0 0 auto; }
      .ss-hero-text {
        align-items: flex-start;
        justify-content: flex-start;
        flex: 1 1 auto;
        padding-top: 2px;
      }
      .ss-hero-title { font-size: 26px; }
      .ss-hero-meta { justify-content: flex-start; }
      .ss-sheet-copy { font-size: 14.5px; }
    }
    .ss-sheet-section {
      width: 100%;
      padding: 14px 16px;
      border: 1px solid var(--ss-border-neutral);
      border-radius: 12px;
      background: var(--ss-fill-subtle);
      box-sizing: border-box;
    }
    .ss-sheet-section-title {
      margin: 0 0 8px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ss-text-dim);
    }
    .ss-sheet-copy {
      margin: 0;
      font-size: 16px;
      line-height: 1.6;
      color: var(--ss-text);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .ss-sheet-quote {
      padding-left: 12px;
      border-left: 2px solid var(--ss-primary-050);
      color: var(--ss-text-muted);
    }
    .ss-sheet-actions {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      padding: 10px 0 calc(10px + var(--ss-safe-bottom) + var(--ss-keyboard-bottom));
      border-top: 1px solid var(--ss-border);
    }
    .ss-sheet-action-row,
    .ss-sheet-error {
      width: min(100%, 760px);
      margin-left: auto;
      margin-right: auto;
      padding-left: 16px;
      padding-right: 16px;
      box-sizing: border-box;
    }
    .ss-sheet-action-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr);
      gap: 8px;
    }
    .ss-sheet-action-row > [hidden] { display: none !important; }
    .ss-sheet-error {
      font-size: 13px;
      color: var(--ss-danger);
      overflow-wrap: anywhere;
    }

    .ss-pick-backdrop {
      position: absolute;
      inset: 0;
      z-index: 20;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: 12px;
      padding-bottom: calc(12px + var(--ss-safe-bottom));
      background: var(--lumiverse-modal-backdrop, rgba(0, 0, 0, 0.6));
    }
    .ss-pick-sheet {
      width: 100%;
      max-width: 420px;
      max-height: min(70%, 460px);
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 12px;
      border: 1px solid var(--ss-border);
      border-radius: 14px;
      background-color: var(--ss-bg-deep);
      background-image: linear-gradient(var(--ss-bg-elevated), var(--ss-bg-elevated));
      box-shadow: var(--ss-shadow-md);
      animation: ss-rise 200ms var(--ss-ease);
    }
    .ss-pick-title { margin: 2px 4px 6px; font-size: 14px; font-weight: 600; }
    .ss-pick-option {
      appearance: none;
      width: 100%;
      padding: 11px 12px;
      border: 1px solid var(--ss-border-neutral);
      border-radius: 10px;
      background: var(--ss-fill-subtle);
      color: var(--ss-text);
      font-size: 14px;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
    }
    .ss-pick-actions {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 8px;
      margin-top: 4px;
    }
    .ss-pick-option:last-child { text-align: center; color: var(--ss-text-muted); }
    @media (hover: hover) and (pointer: fine) {
      .ss-pick-option:hover { border-color: var(--ss-border-hover); }
    }

    .ss-filter-backdrop {
      position: absolute;
      inset: 0;
      z-index: 50;
      display: flex;
      align-items: flex-end;
      overflow: hidden;
      isolation: isolate;
      background: var(--lumiverse-modal-backdrop, rgba(0, 0, 0, 0.6));
      container-type: inline-size;
    }
    .ss-filter-sheet {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-height: min(88%, 720px);
      min-width: 0;
      overflow: hidden;
      border: 1px solid var(--ss-border);
      border-bottom: 0;
      border-radius: 16px 16px 0 0;
      background-color: var(--ss-bg-deep);
      background-image: linear-gradient(var(--ss-bg), var(--ss-bg));
      box-shadow: var(--ss-shadow-md);
      animation: ss-rise 220ms var(--ss-ease);
    }
    @container (min-width: 600px) {
      .ss-filter-sheet {
        margin: auto;
        width: min(460px, calc(100% - 48px));
        max-height: min(84%, 700px);
        border-bottom: 1px solid var(--ss-border);
        border-radius: 16px;
      }
    }
    .ss-filter-header {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 12px 12px 12px 16px;
      border-bottom: 1px solid var(--ss-border);
    }
    .ss-filter-title { font-size: 16px; font-weight: 700; }
    .ss-filter-body {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .ss-filter-section { min-width: 0; display: flex; flex-direction: column; gap: 8px; }
    .ss-filter-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ss-text-dim);
    }
    .ss-filter-label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .ss-filter-score {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .ss-filter-score-label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .ss-filter-score-value {
      font-size: 12px;
      font-weight: 600;
      color: var(--ss-primary-text);
    }
    .ss-filter-slider {
      width: 100%;
      accent-color: var(--ss-primary);
      cursor: pointer;
    }
    .ss-filter-choice-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
      gap: 6px;
    }
    .ss-filter-choice {
      appearance: none;
      min-width: 0;
      height: 36px;
      padding: 0 8px;
      border: 1px solid var(--ss-border);
      border-radius: 9px;
      background: var(--ss-fill-subtle);
      color: var(--ss-text-muted);
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
    }
    .ss-filter-choice:hover { color: var(--ss-text); border-color: var(--ss-border-hover); }
    .ss-filter-choice-block {
      width: 100%;
      justify-self: stretch;
      white-space: normal;
    }
    .ss-filter-choice[data-active="true"],
    .ss-filter-chip[data-active="true"] {
      background: var(--ss-primary-015);
      border-color: var(--ss-primary-050);
      color: var(--ss-primary-text);
    }
    .ss-filter-tag-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      max-height: 200px;
      overflow-y: auto;
    }
    .ss-selected-tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .ss-filter-chip {
      appearance: none;
      max-width: 100%;
      padding: 5px 11px;
      border: 1px solid var(--ss-border);
      border-radius: 999px;
      background: var(--ss-fill-subtle);
      color: var(--ss-text-muted);
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
    }
    .ss-filter-chip:hover { color: var(--ss-text); border-color: var(--ss-border-hover); }
    .ss-filter-chip[data-state="include"] {
      background: var(--ss-primary-015);
      border-color: var(--ss-primary-050);
      color: var(--ss-primary-text);
    }
    .ss-filter-chip[data-state="exclude"] {
      background: color-mix(in srgb, var(--ss-danger) 14%, transparent);
      border-color: color-mix(in srgb, var(--ss-danger) 45%, transparent);
      color: var(--ss-danger);
      text-decoration: line-through;
      text-decoration-thickness: 1px;
    }
    .ss-filter-hint { margin: -2px 0 2px; font-size: 12px; color: var(--ss-text-dim); }
    .ss-filter-chip-danger { flex: 0 0 auto; }
    .ss-filter-chip-danger:hover { color: var(--ss-danger); }
    .ss-filter-chip-block { width: 100%; }
    .ss-filter-preset { display: inline-flex; gap: 2px; max-width: 100%; }
    .ss-filter-label .ss-filter-chip {
      padding: 2px 8px;
      text-transform: none;
      letter-spacing: 0;
    }
    .ss-filter-actions {
      flex: 0 0 auto;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr);
      gap: 8px;
      padding: 10px calc(16px + var(--ss-safe-right)) calc(10px + var(--ss-safe-bottom) + var(--ss-keyboard-bottom)) calc(16px + var(--ss-safe-left));
      border-top: 1px solid var(--ss-border);
    }
    .ss-copy { margin: 0; font-size: 13px; color: var(--ss-text-dim); }

    .ss-sidebar-btn {
      box-sizing: border-box;
      width: 100%;
      height: 48px;
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 0;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--lumiverse-text-muted, var(--ss-text-muted));
      cursor: pointer;
      transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, border-radius 0.2s ease;
    }
    .ss-sidebar-btn:hover {
      background: var(--lumiverse-primary-015, var(--ss-primary-015));
      color: var(--lumiverse-text, var(--ss-text));
    }
    .ss-sidebar-btn[data-active="true"] {
      background: var(--lumiverse-primary-020, rgba(147, 112, 219, 0.2));
      color: var(--lumiverse-primary, var(--ss-primary-text));
      box-shadow: inset 3px 0 0 var(--lumiverse-primary, rgba(147, 112, 219, 0.9));
      border-radius: 0 8px 8px 0;
    }
    .ss-sidebar-btn svg {
      width: 20px;
      height: 20px;
      stroke-width: 1.5;
      display: block;
    }
    @media (max-width: 600px) {
      .ss-sidebar-btn {
        width: 44px;
        height: 44px;
        margin: 0;
        padding: 0;
      }
      .ss-sidebar-btn[data-active="true"] {
        box-shadow: inset 0 -3px 0 var(--lumiverse-primary, rgba(147, 112, 219, 0.9)) !important;
        border-radius: 8px 8px 0 0 !important;
      }
    }

    @media (pointer: coarse) {
      .ss-icon-btn { width: 44px; height: 44px; }
      .ss-tab { height: 36px; }
      .ss-mode-btn { padding: 8px 14px; }
      .ss-filter-chip { padding: 8px 12px; }
      .ss-back-link { min-height: 40px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .ss-root *,
      .ss-sheet-backdrop,
      .ss-sheet-backdrop *,
      .ss-filter-backdrop * {
        animation: none !important;
        transition: none !important;
      }
    }
  `)
}
