/**
 * ui-shell.js — Page shell interactions
 *
 * ดูแล popup, toolbar triggers, focus trap และปุ่ม shortcut ของหน้า
 * โดยแยกออกจาก app.js เพื่อไม่ให้ปะปนกับ pricing/data logic
 */

(() => {
  "use strict";

  function initUiShell() {
    const popupOverlay = document.getElementById("popup-overlay");
    const allTriggers = Array.from(document.querySelectorAll(".toolbar-trigger"));
    const allPopups = Array.from(document.querySelectorAll(".popup"));
    if (!popupOverlay || allTriggers.length === 0 || allPopups.length === 0) return;

    let activePopupId = null;

    function getPopup(popupId) {
      return document.getElementById(`popup-${popupId}`);
    }

    function getFocusableElements(container) {
      return Array.from(container.querySelectorAll(
        'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
    }

    function syncTriggerState(activeId) {
      allTriggers.forEach((trigger) => {
        const isActive = trigger.dataset.popup === activeId;
        trigger.classList.toggle("toolbar-trigger--active", isActive);
        trigger.setAttribute("aria-expanded", String(isActive));
      });
    }

    function closePopup({ restoreFocus = true } = {}) {
      if (!activePopupId) return;
      const triggerBtn = document.querySelector(`.toolbar-trigger[data-popup="${activePopupId}"]`);
      const popup = getPopup(activePopupId);

      if (popup) {
        popup.classList.remove("popup--visible");
        popup.setAttribute("aria-hidden", "true");
      }

      popupOverlay.classList.remove("popup-overlay--visible");
      popupOverlay.setAttribute("aria-hidden", "true");
      syncTriggerState(null);

      activePopupId = null;
      document.body.style.overflow = "";

      if (restoreFocus && triggerBtn) {
        triggerBtn.focus();
      }
    }

    function openPopup(popupId) {
      if (activePopupId === popupId) {
        closePopup();
        return;
      }

      if (activePopupId) {
        closePopup({ restoreFocus: false });
      }

      const popup = getPopup(popupId);
      if (!popup) return;

      popupOverlay.classList.add("popup-overlay--visible");
      popupOverlay.setAttribute("aria-hidden", "false");
      popup.classList.add("popup--visible");
      popup.setAttribute("aria-hidden", "false");
      syncTriggerState(popupId);

      activePopupId = popupId;
      document.body.style.overflow = "hidden";

      requestAnimationFrame(() => {
        const focusable = getFocusableElements(popup);
        const target = focusable[0] || popup.querySelector(".popup__close");
        if (target) target.focus();
      });
    }

    function handleFocusTrap(event) {
      if (event.key !== "Tab" || !activePopupId) return;

      const popup = getPopup(activePopupId);
      if (!popup) return;

      const focusable = getFocusableElements(popup);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    allTriggers.forEach((trigger) => {
      trigger.setAttribute("aria-expanded", "false");
      trigger.addEventListener("click", () => openPopup(trigger.dataset.popup));
    });

    document.querySelectorAll(".popup__close").forEach((button) => {
      button.addEventListener("click", () => closePopup());
    });

    popupOverlay.addEventListener("click", () => closePopup());

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && activePopupId) {
        closePopup();
      }
    });

    document.addEventListener("keydown", handleFocusTrap);

    const btnExportPreview = document.getElementById("btn-export-preview");
    const btnExportAllPreview = document.getElementById("btn-export-all-preview");
    const btnExport = document.getElementById("btn-export");
    const btnExportAll = document.getElementById("btn-export-all");

    if (btnExportPreview && btnExport) {
      btnExportPreview.addEventListener("click", () => btnExport.click());
    }
    if (btnExportAllPreview && btnExportAll) {
      btnExportAllPreview.addEventListener("click", () => btnExportAll.click());
    }
  }

  document.addEventListener("DOMContentLoaded", initUiShell);
})();
