/**
 * Ponnusamy Savings - Core Application Logic
 * Offline-first Chit Fund Management Engine
 */

// Prevent pinch-to-zoom (two finger zoom) and double-tap zoom on tablets/mobiles for perfect fit
document.addEventListener('touchstart', function (event) {
    if (event.touches.length > 1) {
        event.preventDefault();
    }
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', function (event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, { passive: false });

// --- Global Input Comma Formatting Monkeypatches & Helpers ---
const originalParseFloat = window.parseFloat;
window.parseFloat = function(val) {
    if (typeof val === 'string') {
        val = val.replace(/,/g, '');
    }
    return originalParseFloat(val);
};

const originalParseInt = window.parseInt;
window.parseInt = function(val, radix) {
    if (typeof val === 'string') {
        val = val.replace(/,/g, '');
    }
    return originalParseInt(val, radix);
};

function formatNumberIndian(val) {
    if (val === undefined || val === null || val === '') return '';
    const valStr = val.toString().trim();
    const isNegative = valStr.startsWith('-');
    const num = parseInt(valStr.replace(/[^\d]/g, ''), 10);
    if (isNaN(num)) return '';
    return isNegative ? '-' + num.toLocaleString('en-IN') : num.toLocaleString('en-IN');
}

function formatInputAsYouType(input) {
    let value = input.value;
    let cleanValue = value.replace(/[^\d]/g, '');
    if (cleanValue === '') {
        input.value = '';
        return;
    }
    let num = parseInt(cleanValue, 10);
    let formatted = num.toLocaleString('en-IN');
    let cursorPosition = input.selectionStart;
    let digitsBeforeCursor = value.substring(0, cursorPosition).replace(/[^\d]/g, '').length;
    input.value = formatted;
    let newCursorPosition = 0;
    let digitsSeen = 0;
    for (let i = 0; i < formatted.length; i++) {
        if (/[0-9]/.test(formatted[i])) {
            digitsSeen++;
        }
        newCursorPosition = i + 1;
        if (digitsSeen === digitsBeforeCursor) {
            break;
        }
    }
    input.setSelectionRange(newCursorPosition, newCursorPosition);
}

document.addEventListener('input', (e) => {
    if (e.target && (e.target.classList.contains('amount-input') || e.target.id === 'group-amount' || e.target.id === 'edit-group-amount' || e.target.id === 'template-amount')) {
        formatInputAsYouType(e.target);
    }
});

// Sync the trigger button text for custom Date Wise filter dropdown
function syncDateDropdownTrigger() {
    const textEl = document.querySelector('#date-dropdown-btn #date-dropdown-selected-number');
    if (textEl) {
        if (State.dashboardFilterDate) {
            textEl.textContent = State.dashboardFilterDate;
            textEl.style.fontSize = '10px';
        } else {
            textEl.textContent = 'ALL';
            textEl.style.fontSize = '8px';
        }
    }
}

