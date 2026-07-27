// --- Status Bar Clock Utility & Date display ---
function updateStatusBarClock() {
    const timeEl = document.getElementById('live-status-time');
    if (timeEl) {
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0'+minutes : minutes;
        
        timeEl.textContent = `${hours}:${minutes} ${ampm}`;
    }

    // Render Current Calendar Date (Date, Month, Year) in header below title
    const dateEl = document.getElementById('dashboard-current-date');
    if (dateEl) {
        const now = new Date();
        const daysList = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        const dayName = daysList[now.getDay()];
        const dateDay = now.getDate();
        const monthName = monthNames[now.getMonth()];
        const yearVal = now.getFullYear();
        
        dateEl.textContent = `${dayName}, ${dateDay} ${monthName} ${yearVal}`;
    }
    
    // Live clock replacing tagline
    const clockEl = document.getElementById('live-clock');
    if (clockEl && !window.liveClockInterval) {
        const updateClock = () => {
            const now = new Date();
            let h = now.getHours();
            let m = now.getMinutes();
            let s = now.getSeconds();
            const ampm = h >= 12 ? 'PM' : 'AM';
            
            h = h % 12;
            h = h ? h : 12; // 0 should be 12
            
            m = m < 10 ? '0' + m : m;
            
            clockEl.textContent = `${h}:${m} ${ampm}`;
        };
        updateClock();
        window.liveClockInterval = setInterval(updateClock, 1000);
    }
}

// --- Theme Utility ---
function setupTheme() {
    const savedTheme = localStorage.getItem('ponnusamy_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Set icons correctly
    const themeIconDropdown = document.getElementById('dropdown-theme-icon');
    const themeTextDropdown = document.getElementById('dropdown-theme-text');
    
    const setIcons = (theme) => {
        const isLight = theme === 'light';
        const iconName = isLight ? 'moon' : 'sun';
        
        if (themeIconDropdown) themeIconDropdown.setAttribute('data-lucide', iconName);
        if (themeTextDropdown) themeTextDropdown.textContent = isLight ? 'Dark Mode' : 'Light Mode';
        
        // Update logo image
        document.querySelectorAll('.app-logo').forEach(img => {
            img.src = isLight ? 'logo-light.jpg' : 'logo-dark.jpg';
        });
        
        lucide.createIcons();
    };
    
    setIcons(savedTheme);
    
    const toggleTheme = () => {
        document.documentElement.classList.add('theme-switching');
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('ponnusamy_theme', newTheme);
        setIcons(newTheme);
        
        // Force reflow and remove class
        setTimeout(() => {
            document.documentElement.classList.remove('theme-switching');
        }, 50);
        
        showNotification(`Switched to ${newTheme} mode!`, 'info');
    };
    
    const btnDropdown = document.getElementById('btn-dropdown-theme');
    const btnDesktop = document.getElementById('btn-toggle-theme-desktop');
    
    const triggerSpin = (btn) => {
        if (!btn) return;
        btn.classList.remove('theme-spin');
        void btn.offsetWidth; // trigger reflow
        btn.classList.add('theme-spin');
    };
    
    if (btnDropdown) btnDropdown.addEventListener('click', () => { triggerSpin(btnDropdown); toggleTheme(); });
    if (btnDesktop) btnDesktop.addEventListener('click', () => { triggerSpin(btnDesktop); toggleTheme(); });
}

// --- Custom Toast Notifications ---
function showNotification(message, type = 'success') {
    // Remove existing notification if any
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `
        <span class="toast-message">${message}</span>
    `;
    
    // Style toast dynamically
    Object.assign(toast.style, {
        position: 'absolute',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%) translateY(20px)',
        padding: '10px 20px',
        borderRadius: '30px',
        backgroundColor: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6',
        color: '#ffffff',
        fontSize: '0.8rem',
        fontWeight: '600',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: '9999',
        opacity: '0',
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap'
    });
    
    document.querySelector('.app-device-shell').appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 50);
    
    // Dismiss after 3s
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Routing & Navigation ---
function setupRouting() {
    // Handle elements with navigation targets
    document.querySelectorAll('[data-target]').forEach(elem => {
        elem.addEventListener('click', (e) => {
            const targetView = elem.getAttribute('data-target');
            switchView(targetView);
        });
    });
    
    // Global back button actions
    document.querySelectorAll('.btn-back').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target') || 'screen-dashboard';
            switchView(target);
        });
    });
}

function switchView(viewId) {
    const activeScreen = document.querySelector('.app-screen.active');
    const targetScreen = document.getElementById(viewId);
    
    // Screens where the global top navbar should be hidden
    const NO_HEADER_SCREENS = ['screen-landing', 'screen-login', 'screen-register'];
    const appContainer = document.querySelector('.app-container');
    
    if (appContainer) {
        // Force show header on PnL and Notes
        if (NO_HEADER_SCREENS.includes(viewId)) {
            appContainer.classList.add('hide-global-header');
            document.body.classList.add('hide-navigation');
        } else {
            appContainer.classList.remove('hide-global-header');
            document.body.classList.remove('hide-navigation');
        }
    }
    
    if (targetScreen) {
        if (activeScreen && activeScreen.id !== viewId) {
            // Slide out active
            activeScreen.style.transform = '';
            activeScreen.style.opacity = '0';
            activeScreen.classList.remove('active');
            activeScreen.style.pointerEvents = 'none';
        }
        
        // Slide in target
        targetScreen.classList.add('active');
        targetScreen.style.pointerEvents = 'auto';
        // Force reflow
        targetScreen.offsetHeight;
        targetScreen.style.transform = '';
        targetScreen.style.opacity = '1';
        
        State.currentView = viewId;
        
        // Highlight active navigation links (Sidebar & Bottom Nav)
        const allNavLinks = document.querySelectorAll('.sidebar-link, .bottom-nav-item, .sidebar-nav-item');
        allNavLinks.forEach(link => {
            if (link.dataset.target === viewId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        
        // Contextual trigger on screen load
        if (viewId === 'screen-dashboard') {
            renderDashboard();
        } else if (viewId === 'screen-group-details') {
            renderGroupDetails(State.selectedGroupId);
        } else if (viewId === 'screen-pnl') {
            renderPnLDashboard();
        }
    }
}

// --- Custom Confirmation Dialog Utility ---
function showCustomConfirm(title, message) {
    return new Promise((resolve) => {
        const backdrop = document.getElementById('confirm-modal-backdrop');
        const titleEl = document.getElementById('confirm-modal-title');
        const msgEl = document.getElementById('confirm-modal-message');
        const okBtn = document.getElementById('btn-confirm-ok');
        const cancelBtn = document.getElementById('btn-confirm-cancel');
        const closeBtn = document.getElementById('btn-close-confirm-modal');
        
        titleEl.textContent = title;
        msgEl.textContent = message;
        
        backdrop.classList.add('active');
        
        function cleanup(result) {
            backdrop.classList.remove('active');
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            closeBtn.onclick = null;
            resolve(result);
        }
        
        okBtn.onclick = () => cleanup(true);
        cancelBtn.onclick = () => cleanup(false);
        closeBtn.onclick = () => cleanup(false);
    });
}

// Payout Claim Modal Logic
let pendingPayoutMemberId = null;
let pendingPayoutMonthNum = null;

document.querySelectorAll('input[name="payout-method"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'gpay') {
            document.getElementById('payout-gpay-note-wrapper').classList.remove('hidden');
        } else {
            document.getElementById('payout-gpay-note-wrapper').classList.add('hidden');
        }
    });
});

document.getElementById('btn-close-payout-modal').addEventListener('click', () => {
    document.getElementById('payout-method-modal-backdrop').classList.remove('active');
});

document.getElementById('btn-cancel-payout').addEventListener('click', () => {
    document.getElementById('payout-method-modal-backdrop').classList.remove('active');
});

document.getElementById('btn-confirm-payout').addEventListener('click', () => {
    if (pendingPayoutMemberId && pendingPayoutMonthNum) {
        const member = State.members.find(m => m.id === pendingPayoutMemberId);
        if (member) {
            member.payments[pendingPayoutMonthNum].payoutClaimed = true;
            member.payments[pendingPayoutMonthNum].payoutMethod = document.querySelector('input[name="payout-method"]:checked').value;
            member.payments[pendingPayoutMonthNum].payoutDate = document.getElementById('payout-date-input').value;
            if (member.payments[pendingPayoutMonthNum].payoutMethod === 'gpay') {
                member.payments[pendingPayoutMonthNum].payoutNote = document.getElementById('payout-note-input').value.trim();
            } else {
                member.payments[pendingPayoutMonthNum].payoutNote = null;
            }
            saveState();
            const group = State.groups.find(g => g.id === member.groupId);
            renderChecklist(member, group);
        }
    }
    document.getElementById('payout-method-modal-backdrop').classList.remove('active');
});



document.addEventListener('DOMContentLoaded', () => {
});
