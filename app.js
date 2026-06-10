/**
 * Ponnusamy Savings - Core Application Logic
 * Offline-first Chit Fund Management Engine
 */

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
    const num = parseInt(val.toString().replace(/[^\d]/g, ''), 10);
    return isNaN(num) ? '' : num.toLocaleString('en-IN');
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

// --- Global Application State ---
const State = {
    groups: [],
    members: [],
    currentView: 'screen-dashboard',
    selectedGroupId: null,
    selectedMemberId: null,
    tempMemberList: [], // Used during group creation
    dashboardSelectedMonth: 'current',
    dashboardFilter: 'all',
    backupEmail: localStorage.getItem('ponnusamy_backup_email') || '',
    templateFilterDuration: '12'
};

// --- Initializing App ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Theme
    setupTheme();

    // Load data from localStorage
    loadState();
    
    // Setup Navigation & Routing
    setupRouting();
    
    // Setup Action Listeners
    setupEventListeners();
    
    // Initial Render
    renderDashboard();
    
    // Update live clock in status bar
    updateStatusBarClock();
    setInterval(updateStatusBarClock, 60000);
    
    // Initialize Lucide Icons
    lucide.createIcons();
});

// --- State Management & Storage ---
function getStorageKey(key) {
    if (typeof AuthState !== 'undefined' && AuthState.currentUser && AuthState.currentUser.email) {
        return `ponnusamy_${AuthState.currentUser.email}_${key}`;
    }
    return `ponnusamy_${key}`;
}

function ensureDefaultTemplates() {
    if (!State.templates) State.templates = [];
    
    const userId = window.AuthState?.currentUser?.id || 'guest';
    const initKey = 'ponnusamy_master_templates_initialized_' + userId;
    
    if (!localStorage.getItem(initKey)) {
        const masterTemplates = [
    {
        "id":  "id_tswajg815_1780734351230",
        "amount":  25000,
        "payouts":  {
                        "1":  20000,
                        "2":  20250,
                        "3":  20500,
                        "4":  21000,
                        "5":  21500,
                        "6":  22000,
                        "7":  22500,
                        "8":  23250,
                        "9":  23750,
                        "10":  24250,
                        "11":  24750,
                        "12":  25000
                    },
        "duration":  12,
        "installments":  {
                             "1":  2000,
                             "2":  2000,
                             "3":  2000,
                             "4":  2000,
                             "5":  2000,
                             "6":  2000,
                             "7":  2000,
                             "8":  2000,
                             "9":  2000,
                             "10":  2000,
                             "11":  2000,
                             "12":  1300
                         }
    },
    {
        "id":  "id_zzinuis8o_1780810316173",
        "amount":  500000,
        "payouts":  {
                        "1":  400000,
                        "2":  405000,
                        "3":  410000,
                        "4":  420000,
                        "5":  430000,
                        "6":  440000,
                        "7":  450000,
                        "8":  465000,
                        "9":  475000,
                        "10":  485000,
                        "11":  495000,
                        "12":  500000
                    },
        "duration":  12,
        "installments":  {
                             "1":  34000,
                             "2":  36000,
                             "3":  38000,
                             "4":  39000,
                             "5":  40000,
                             "6":  40000,
                             "7":  40000,
                             "8":  40000,
                             "9":  40000,
                             "10":  40000,
                             "11":  40000,
                             "12":  40000
                         }
    },
    {
        "id":  "id_dybr0fmcb_1780810742840",
        "amount":  400000,
        "payouts":  {
                        "1":  320000,
                        "2":  324000,
                        "3":  328000,
                        "4":  336000,
                        "5":  344000,
                        "6":  352000,
                        "7":  360000,
                        "8":  372000,
                        "9":  380000,
                        "10":  388000,
                        "11":  396000,
                        "12":  400000
                    },
        "duration":  12,
        "installments":  {
                             "1":  27200,
                             "2":  28800,
                             "3":  30400,
                             "4":  31200,
                             "5":  32000,
                             "6":  32000,
                             "7":  32000,
                             "8":  32000,
                             "9":  32000,
                             "10":  32000,
                             "11":  32000,
                             "12":  32000
                         }
    },
    {
        "id":  "id_y6tewul51_1780815134157",
        "amount":  100000,
        "payouts":  {
                        "1":  80000,
                        "2":  81000,
                        "3":  82000,
                        "4":  84000,
                        "5":  86000,
                        "6":  88000,
                        "7":  90000,
                        "8":  93000,
                        "9":  95000,
                        "10":  97000,
                        "11":  99000,
                        "12":  100000
                    },
        "duration":  12,
        "installments":  {
                             "1":  6800,
                             "2":  7200,
                             "3":  7600,
                             "4":  7800,
                             "5":  8000,
                             "6":  8000,
                             "7":  8000,
                             "8":  8000,
                             "9":  8000,
                             "10":  8000,
                             "11":  8000,
                             "12":  8000
                         }
    },
    {
        "id":  "id_21psrv2ua_1780834864408",
        "amount":  100000,
        "payouts":  {
                        "1":  73000,
                        "2":  74000,
                        "3":  76000,
                        "4":  78000,
                        "5":  79000,
                        "6":  80000,
                        "7":  81500,
                        "8":  83000,
                        "9":  84000,
                        "10":  85000,
                        "11":  86500,
                        "12":  87500,
                        "13":  89000,
                        "14":  90000,
                        "15":  91500,
                        "16":  93000,
                        "17":  95000,
                        "18":  96000,
                        "19":  98000,
                        "20":  100000
                    },
        "duration":  20,
        "installments":  {
                             "1":  5000,
                             "2":  4900,
                             "3":  4900,
                             "4":  4800,
                             "5":  4800,
                             "6":  4700,
                             "7":  4700,
                             "8":  4600,
                             "9":  4600,
                             "10":  4500,
                             "11":  4500,
                             "12":  4400,
                             "13":  4400,
                             "14":  4300,
                             "15":  4300,
                             "16":  4200,
                             "17":  4200,
                             "18":  4100,
                             "19":  4100,
                             "20":  4000
                         }
    },
    {
        "id":  "id_1f6cerdnn_1780835262755",
        "amount":  200000,
        "payouts":  {
                        "1":  160000,
                        "2":  162000,
                        "3":  164000,
                        "4":  168000,
                        "5":  172000,
                        "6":  176000,
                        "7":  180000,
                        "8":  186000,
                        "9":  190000,
                        "10":  194000,
                        "11":  198000,
                        "12":  200000
                    },
        "duration":  12,
        "installments":  {
                             "1":  13600,
                             "2":  14400,
                             "3":  15200,
                             "4":  16000,
                             "5":  16000,
                             "6":  16000,
                             "7":  16000,
                             "8":  16000,
                             "9":  16000,
                             "10":  16000,
                             "11":  16000,
                             "12":  16000
                         }
    },
    {
        "id":  "id_8dismq9y6_1780835367114",
        "amount":  50000,
        "payouts":  {
                        "1":  50000,
                        "2":  50000,
                        "3":  50000,
                        "4":  50000,
                        "5":  50000,
                        "6":  50000,
                        "7":  50000,
                        "8":  50000,
                        "9":  50000,
                        "10":  50000,
                        "11":  50000,
                        "12":  50000
                    },
        "duration":  12,
        "installments":  {
                             "1":  3400,
                             "2":  3600,
                             "3":  3800,
                             "4":  3900,
                             "5":  4000,
                             "6":  4000,
                             "7":  4000,
                             "8":  4000,
                             "9":  4000,
                             "10":  4000,
                             "11":  4000,
                             "12":  4000
                         }
    },
    {
        "id":  "id_v00b9nbtn_1780835670955",
        "amount":  200000,
        "payouts":  {
                        "1":  146000,
                        "2":  148000,
                        "3":  152000,
                        "4":  156000,
                        "5":  158000,
                        "6":  160000,
                        "7":  163000,
                        "8":  166000,
                        "9":  168000,
                        "10":  170000,
                        "11":  173000,
                        "12":  175000,
                        "13":  178000,
                        "14":  180000,
                        "15":  183000,
                        "16":  186000,
                        "17":  190000,
                        "18":  192000,
                        "19":  196000,
                        "20":  200000
                    },
        "duration":  20,
        "installments":  {
                             "1":  10000,
                             "2":  9800,
                             "3":  9800,
                             "4":  9600,
                             "5":  9600,
                             "6":  9400,
                             "7":  9400,
                             "8":  9200,
                             "9":  9200,
                             "10":  9000,
                             "11":  9000,
                             "12":  8800,
                             "13":  8800,
                             "14":  8600,
                             "15":  8600,
                             "16":  8400,
                             "17":  8400,
                             "18":  8200,
                             "19":  8200,
                             "20":  8000
                         }
    },
    {
        "id":  "id_38eb1jrxf_1780836085280",
        "amount":  300000,
        "payouts":  {
                        "1":  219000,
                        "2":  222000,
                        "3":  228000,
                        "4":  234000,
                        "5":  237000,
                        "6":  240000,
                        "7":  244000,
                        "8":  249000,
                        "9":  252000,
                        "10":  255000,
                        "11":  259000,
                        "12":  262000,
                        "13":  267000,
                        "14":  270000,
                        "15":  274000,
                        "16":  279000,
                        "17":  285000,
                        "18":  288000,
                        "19":  294000,
                        "20":  300000
                    },
        "duration":  20,
        "installments":  {
                             "1":  15000,
                             "2":  14700,
                             "3":  14700,
                             "4":  14400,
                             "5":  14400,
                             "6":  14100,
                             "7":  14100,
                             "8":  13800,
                             "9":  13800,
                             "10":  13500,
                             "11":  13500,
                             "12":  13200,
                             "13":  13200,
                             "14":  12900,
                             "15":  12900,
                             "16":  12600,
                             "17":  12600,
                             "18":  12300,
                             "19":  12300,
                             "20":  12000
                         }
    },
    {
        "id":  "id_iw5s2i2hr_1780836364112",
        "amount":  400000,
        "payouts":  {
                        "1":  292000,
                        "2":  296000,
                        "3":  304000,
                        "4":  312000,
                        "5":  316000,
                        "6":  320000,
                        "7":  326000,
                        "8":  332000,
                        "9":  336000,
                        "10":  340000,
                        "11":  346000,
                        "12":  350000,
                        "13":  356000,
                        "14":  360000,
                        "15":  366000,
                        "16":  372000,
                        "17":  380000,
                        "18":  384000,
                        "19":  392000,
                        "20":  400000
                    },
        "duration":  20,
        "installments":  {
                             "1":  20000,
                             "2":  19600,
                             "3":  19600,
                             "4":  19200,
                             "5":  19200,
                             "6":  18800,
                             "7":  18800,
                             "8":  18400,
                             "9":  18400,
                             "10":  18000,
                             "11":  18000,
                             "12":  17600,
                             "13":  17600,
                             "14":  17200,
                             "15":  17200,
                             "16":  16800,
                             "17":  16800,
                             "18":  16400,
                             "19":  16400,
                             "20":  16000
                         }
    },
    {
        "id":  "id_tk69nqvrx_1780836723407",
        "amount":  500000,
        "payouts":  {
                        "1":  365000,
                        "2":  370000,
                        "3":  380000,
                        "4":  390000,
                        "5":  395000,
                        "6":  400000,
                        "7":  407000,
                        "8":  415000,
                        "9":  420000,
                        "10":  425000,
                        "11":  432000,
                        "12":  437000,
                        "13":  445000,
                        "14":  450000,
                        "15":  457000,
                        "16":  465000,
                        "17":  475000,
                        "18":  480000,
                        "19":  490000,
                        "20":  500000
                    },
        "duration":  20,
        "installments":  {
                             "1":  25000,
                             "2":  24500,
                             "3":  24500,
                             "4":  24000,
                             "5":  24000,
                             "6":  23500,
                             "7":  23500,
                             "8":  23000,
                             "9":  23000,
                             "10":  22500,
                             "11":  22500,
                             "12":  22000,
                             "13":  22000,
                             "14":  21500,
                             "15":  21500,
                             "16":  21000,
                             "17":  21000,
                             "18":  20500,
                             "19":  20500,
                             "20":  20000
                         }
    }
];
        
        // Push all master templates that don't already exist (by amount and duration) to avoid duplicates
        masterTemplates.forEach(mt => {
            const exists = State.templates.some(st => st.amount === mt.amount && st.duration === mt.duration);
            if (!exists) {
                // Ensure unique ID for the new user's copy
                mt.id = generateUUID();
                State.templates.push(mt);
            }
        });
        
        localStorage.setItem(initKey, 'true');
        return true;
    }
    return false;
}
async function loadState() {
    try {
        // Fallback Local Storage load first
        const storedGroups = localStorage.getItem(getStorageKey('groups'));
        const storedMembers = localStorage.getItem(getStorageKey('members'));
        const storedTemplates = localStorage.getItem('ponnusamy_templates');
        
        State.groups = storedGroups ? JSON.parse(storedGroups) : [];
        State.members = storedMembers ? JSON.parse(storedMembers) : [];
        State.templates = storedTemplates ? JSON.parse(storedTemplates) : [];

        // If authenticated with Supabase, pull cloud data
        if (window.supabaseClient && window.AuthState?.isAuthenticated) {
            // Force network fetch of user_metadata silently in the background
            try {
                const { data: { user } } = await window.supabaseClient.auth.getUser();
                if (user) {
                    window.AuthState.currentUser.user_metadata = user.user_metadata || {};
                }
            } catch (e) {}
            const { data, error } = await window.supabaseClient
                .from('user_data')
                .select('*')
                .eq('user_id', window.AuthState.currentUser.id)
                .single();
                
            if (data) {
                // We have cloud data! Override local state
                State.groups = data.groups_data || [];
                State.members = data.members_data || [];
                State.templates = data.templates_data || [];
                
                // Sync backup email from user metadata
                if (window.AuthState?.currentUser?.user_metadata?.backupEmail !== undefined) {
                    State.backupEmail = window.AuthState.currentUser.user_metadata.backupEmail;
                    localStorage.setItem('ponnusamy_backup_email', State.backupEmail);
                }
                
                // Save to local storage for offline use
                localStorage.setItem(getStorageKey('groups'), JSON.stringify(State.groups));
                localStorage.setItem(getStorageKey('members'), JSON.stringify(State.members));
                localStorage.setItem('ponnusamy_templates', JSON.stringify(State.templates));
            } else if (error && error.code === 'PGRST116') {
                // No cloud data yet (row not found). Let's push our local data!
                await saveState(); 
            } else if (error) {
                console.error("Supabase load error:", error);
            }
        }
        
        if (ensureDefaultTemplates()) {
            await saveState();
        }
        
    } catch (e) {
        console.error('Error loading state:', e);
    }
}

async function saveState() {
    try {
        // Always save locally first for speed and offline fallback
        localStorage.setItem(getStorageKey('groups'), JSON.stringify(State.groups));
        localStorage.setItem(getStorageKey('members'), JSON.stringify(State.members));
        localStorage.setItem('ponnusamy_templates', JSON.stringify(State.templates || []));
        
        // If authenticated with Supabase, sync to cloud
        if (window.supabaseClient && window.AuthState?.isAuthenticated && window.AuthState.currentUser?.id) {
            const { error } = await window.supabaseClient
                .from('user_data')
                .upsert({
                    user_id: window.AuthState.currentUser.id,
                    groups_data: State.groups,
                    members_data: State.members,
                    templates_data: State.templates,
                    updated_at: new Date().toISOString()
                });
                
            if (error) {
                console.error("Supabase save error:", error);
            }
        }
    } catch (e) {
        console.error('Error saving state:', e);
    }
}

// Helper to generate Unique IDs
function generateUUID() {
    return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// Helper to calculate calendar month label based on group scheme start date
function getMonthLabel(group, monthNum) {
    const startMonth = group.startMonth !== undefined ? parseInt(group.startMonth) : new Date(group.createdAt).getMonth();
    const startYear = group.startYear !== undefined ? parseInt(group.startYear) : new Date(group.createdAt).getFullYear();
    
    const date = new Date(startYear, startMonth + monthNum - 1, 1);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

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
        const daysList = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        const dayName = daysList[now.getDay()];
        const dateDay = now.getDate();
        const monthName = monthNames[now.getMonth()];
        const yearVal = now.getFullYear();
        
        dateEl.textContent = `${dayName}, ${dateDay} ${monthName} ${yearVal}`;
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
    
    if (activeScreen && targetScreen && activeScreen.id !== viewId) {
        // Slide out active
        activeScreen.style.transform = 'translateX(-30px)';
        activeScreen.style.opacity = '0';
        activeScreen.classList.remove('active');
        activeScreen.style.pointerEvents = 'none';
        
        // Slide in target
        targetScreen.classList.add('active');
        targetScreen.style.pointerEvents = 'auto';
        // Force reflow
        targetScreen.offsetHeight;
        targetScreen.style.transform = 'translateX(0)';
        targetScreen.style.opacity = '1';
        
        State.currentView = viewId;
        
        // Contextual trigger on screen load
        if (viewId === 'screen-dashboard') {
            renderDashboard();
        } else if (viewId === 'screen-group-details') {
            renderGroupDetails(State.selectedGroupId);
        }
    }
}

// --- Event Listeners Setup ---
let isGroupNameDirty = false;

function autoPrefillGroupName() {
    if (isGroupNameDirty) return;
    
    const groupNameInput = document.getElementById('group-name');
    if (!groupNameInput) return;
    
    // Calculate duration
    let duration = 12;
    const selectedRadio = document.querySelector('input[name="group-duration"]:checked');
    if (selectedRadio) {
        if (selectedRadio.value === 'custom') {
            const customDurationInput = document.getElementById('group-duration-custom');
            duration = parseInt(customDurationInput.value) || 0;
        } else {
            duration = parseInt(selectedRadio.value);
        }
    }
    
    const startMonth = parseInt(document.getElementById('group-start-month').value);
    const startYear = parseInt(document.getElementById('group-start-year').value);
    
    if (duration > 0 && !isNaN(startMonth) && !isNaN(startYear)) {
        const startDate = new Date(startYear, startMonth, 1);
        const endDate = new Date(startYear, startMonth + duration - 1, 1);
        
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const startStr = `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;
        const endStr = `${monthNames[endDate.getMonth()]} ${endDate.getFullYear()}`;
        
        groupNameInput.value = `${startStr} - ${endStr}`;
    }
}

function formatTemplateAmountShort(amount) {
    amount = parseFloat(amount);
    if (isNaN(amount)) return '';
    if (amount >= 100000) {
        const lakhs = amount / 100000;
        return lakhs % 1 === 0 ? `${lakhs}L` : `${lakhs.toFixed(1)}L`;
    } else if (amount >= 1000) {
        const k = amount / 1000;
        return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
    }
    return amount.toString();
}

function renderQuickSelectAmounts() {
    const container = document.getElementById('group-amount-quick-select');
    if (!container) return;
    container.innerHTML = '';
    
    // Determine currently selected duration
    let selectedDuration = 12;
    const selectedRadio = document.querySelector('input[name="group-duration"]:checked');
    if (selectedRadio) {
        if (selectedRadio.value === 'custom') {
            const customInput = document.getElementById('group-duration-custom');
            selectedDuration = parseInt(customInput.value) || 0;
        } else {
            selectedDuration = parseInt(selectedRadio.value);
        }
    }
    
    // Fetch unique template amounts filtered by the selected duration
    const uniqueAmounts = [];
    (State.templates || []).forEach(t => {
        const amt = parseFloat(t.amount);
        const durationMatch = parseInt(t.duration) === selectedDuration;
        if (durationMatch && !isNaN(amt) && !uniqueAmounts.includes(amt)) {
            uniqueAmounts.push(amt);
        }
    });
    
    // Sort unique amounts ascending
    uniqueAmounts.sort((a, b) => a - b);
    
    if (uniqueAmounts.length === 0) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'flex';
    
    uniqueAmounts.forEach(amt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'amount-chip-btn';
        btn.textContent = formatTemplateAmountShort(amt);
        btn.setAttribute('data-amount', amt);
        
        btn.addEventListener('click', () => {
            container.querySelectorAll('.amount-chip-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const amtInput = document.getElementById('group-amount');
            if (amtInput) {
                amtInput.value = amt;
                amtInput.dispatchEvent(new Event('input'));
            }
        });
        
        container.appendChild(btn);
    });
}

function initCreateGroupForm() {
    const form = document.getElementById('create-group-form');
    if (!form) return;
    
    form.reset();
    document.getElementById('custom-duration-wrapper').classList.add('hidden');
    document.getElementById('duration-summary-text').textContent = 'Installment: Choose a duration to calculate.';
    
    // Set default month & year dropdowns to current month & year
    const today = new Date();
    const monthSelect = document.getElementById('group-start-month');
    const yearSelect = document.getElementById('group-start-year');
    
    if (monthSelect) monthSelect.value = today.getMonth();
    if (yearSelect) yearSelect.value = today.getFullYear();
    
    isGroupNameDirty = false;
    autoPrefillGroupName();
    
    // Render Quick select template amount chips
    renderQuickSelectAmounts();
}

function setupEventListeners() {
    // --- Home / Dashboard Screen ---
    const addGroupFab = document.getElementById('btn-add-group-fab');
    if (addGroupFab) {
        addGroupFab.addEventListener('click', () => {
            initCreateGroupForm();
            switchView('screen-create-group');
        });
    }
    
    const createFirstBtn = document.getElementById('btn-create-first-group');
    if (createFirstBtn) {
        createFirstBtn.addEventListener('click', () => {
            initCreateGroupForm();
            switchView('screen-create-group');
        });
    }
    
    // --- Settings Drawer ---
    const openSettingsBtn = document.getElementById('btn-open-settings');
    const closeSettingsBtn = document.getElementById('btn-close-settings');
    const settingsBackdrop = document.getElementById('settings-backdrop');
    
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', () => {
            // Reset email input state upon opening settings
            const emailInput = document.getElementById('settings-backup-email');
            const editEmailBtn = document.getElementById('btn-edit-backup-email');
            if (emailInput && editEmailBtn) {
                emailInput.value = State.backupEmail || '';
                emailInput.disabled = true;
                editEmailBtn.innerHTML = `<i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>`;
                editEmailBtn.title = "Edit email";
                editEmailBtn.classList.remove('text-green');
                editEmailBtn.classList.add('text-amber');
                lucide.createIcons();
            }
            
            settingsBackdrop.classList.add('active');
        });
    }
    
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsBackdrop.classList.remove('active');
        });
    }
    
    if (settingsBackdrop) {
        settingsBackdrop.addEventListener('click', (e) => {
            if (e.target === settingsBackdrop) {
                settingsBackdrop.classList.remove('active');
            }
        });
    }
    
    // Export Backup
    const exportBtn = document.getElementById('btn-export-backup');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportBackup);
    }
    
    // Email Backup
    const emailBackupBtn = document.getElementById('btn-email-backup');
    if (emailBackupBtn) {
        emailBackupBtn.addEventListener('click', emailBackupDraft);
    }
    
    // Backup Email Input & Edit Toggle
    const emailInput = document.getElementById('settings-backup-email');
    const editEmailBtn = document.getElementById('btn-edit-backup-email');
    if (emailInput && editEmailBtn) {
        emailInput.value = State.backupEmail || '';
        editEmailBtn.addEventListener('click', async () => {
            const isEditing = !emailInput.disabled;
            if (isEditing) {
                // Save Mode
                const val = emailInput.value.trim();
                State.backupEmail = val;
                localStorage.setItem('ponnusamy_backup_email', val);
                saveState();
                
                // Sync backup email securely to Supabase User Profile
                if (window.supabaseClient && window.AuthState?.isAuthenticated) {
            // Force network fetch of user_metadata silently in the background
            try {
                const { data: { user } } = await window.supabaseClient.auth.getUser();
                if (user) {
                    window.AuthState.currentUser.user_metadata = user.user_metadata || {};
                }
            } catch (e) {}
                    window.supabaseClient.auth.updateUser({
                        data: { backupEmail: val }
                    });
                }
                
                emailInput.disabled = true;
                editEmailBtn.innerHTML = `<i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>`;
                editEmailBtn.title = "Edit email";
                editEmailBtn.classList.remove('text-green');
                editEmailBtn.classList.add('text-amber');
                lucide.createIcons();
                
                showNotification('Backup email saved successfully!', 'success');
            } else {
                // Edit Mode
                emailInput.disabled = false;
                emailInput.focus();
                editEmailBtn.innerHTML = `<i data-lucide="check" style="width: 16px; height: 16px;"></i>`;
                editEmailBtn.title = "Save email";
                editEmailBtn.classList.remove('text-amber');
                editEmailBtn.classList.add('text-green');
                lucide.createIcons();
            }
        });
    }
    
    // Import Backup
    const fileInput = document.getElementById('import-backup-file');
    if (fileInput) {
        fileInput.addEventListener('change', importBackup);
    }
    
    // Reset App Data
    const resetBtn = document.getElementById('btn-reset-app');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetAllData);
    }

    // Template List Duration Filter Pills
    const tplFilterPills = document.querySelectorAll('.template-filter-pills .filter-pill');
    tplFilterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            tplFilterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const duration = pill.getAttribute('data-duration');
            State.templateFilterDuration = duration;
            renderTemplatesList();
            
            // Open Modal
            const modalTitle = document.getElementById('templates-modal-title');
            if (modalTitle) {
                if (duration === 'other') modalTitle.textContent = 'Other Schemes';
                else modalTitle.textContent = duration + ' Months Schemes';
            }
            const modal = document.getElementById('templates-list-modal-backdrop');
            if (modal) modal.classList.add('active');
        });
    });
    
    // --- Create Group Form Screen ---
    const durationRadios = document.querySelectorAll('input[name="group-duration"]');
    const customDurationWrapper = document.getElementById('custom-duration-wrapper');
    const customDurationInput = document.getElementById('group-duration-custom');
    const groupAmountInput = document.getElementById('group-amount');
    const summaryText = document.getElementById('duration-summary-text');
    const groupNameInput = document.getElementById('group-name');
    const groupStartMonth = document.getElementById('group-start-month');
    const groupStartYear = document.getElementById('group-start-year');
    
    function updateDurationCalculations() {
        const totalSchemeAmount = parseFloat(groupAmountInput.value) || 0;
        let duration = 12;
        
        const selectedRadio = document.querySelector('input[name="group-duration"]:checked');
        if (selectedRadio) {
            if (selectedRadio.value === 'custom') {
                customDurationWrapper.classList.remove('hidden');
                duration = parseInt(customDurationInput.value) || 0;
            } else {
                customDurationWrapper.classList.add('hidden');
                duration = parseInt(selectedRadio.value);
            }
        }
        
        if (totalSchemeAmount > 0 && duration > 0) {
            const monthlyInstallment = totalSchemeAmount / duration;
            const formattedMonthly = monthlyInstallment.toLocaleString('en-IN', { maximumFractionDigits: 2 });
            const formattedTotal = totalSchemeAmount.toLocaleString('en-IN');
            summaryText.innerHTML = `Total Scheme Value = <strong>₹${formattedTotal}</strong>. Each member pays <strong>₹${formattedMonthly} / month</strong> over ${duration} months.`;
        } else {
            summaryText.textContent = 'Please enter a valid amount and duration to calculate the installment.';
        }
        
        // Re-render quick select chips for the new duration
        renderQuickSelectAmounts();
        
        // Highlight active chip if it matches the current value
        const quickSelectContainer = document.getElementById('group-amount-quick-select');
        if (quickSelectContainer) {
            quickSelectContainer.querySelectorAll('.amount-chip-btn').forEach(btn => {
                if (parseFloat(btn.getAttribute('data-amount')) === totalSchemeAmount) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        autoPrefillGroupName();
        regenerateCreateScheduleTable();
    }

    function regenerateCreateScheduleTable() {
        const container = document.getElementById('create-schedule-rows-container');
        if (!container) return;
        
        const totalAmount = parseFloat(groupAmountInput.value) || 0;
        let duration = 12;
        const selectedRadio = document.querySelector('input[name="group-duration"]:checked');
        if (selectedRadio) {
            if (selectedRadio.value === 'custom') {
                duration = parseInt(customDurationInput.value) || 0;
            } else {
                duration = parseInt(selectedRadio.value);
            }
        }
        
        container.innerHTML = '';
        if (duration <= 0) return;
        
        const template = (State.templates || []).find(t => parseFloat(t.amount) === totalAmount && parseInt(t.duration) === duration);
        
        for (let m = 1; m <= duration; m++) {
            const defaultInstallment = template && template.installments && template.installments[m] !== undefined
                ? template.installments[m]
                : Math.round(totalAmount / duration);
                
            const defaultPayout = template && template.payouts && template.payouts[m] !== undefined
                ? template.payouts[m]
                : totalAmount;
                
            const row = document.createElement('div');
            row.className = 'schedule-month-card';
            
            row.innerHTML = `
                <div class="month-card-header">Month ${m}</div>
                <div class="month-card-inputs">
                    <div class="month-input-group">
                        <label>Installment (₹)</label>
                        <input type="text" inputmode="numeric" class="schedule-inst-input amount-input" data-month="${m}" value="${formatNumberIndian(defaultInstallment)}" required>
                    </div>
                    <div class="month-input-group">
                        <label>Payout (₹)</label>
                        <input type="text" inputmode="numeric" class="schedule-payout-input amount-input" data-month="${m}" value="${formatNumberIndian(defaultPayout)}" required>
                    </div>
                </div>
            `;
            container.appendChild(row);
        }
    }
    
    durationRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'custom') {
                customDurationWrapper.classList.remove('hidden');
                customDurationInput.required = true;
            } else {
                customDurationWrapper.classList.add('hidden');
                customDurationInput.required = false;
            }
            updateDurationCalculations();
        });
    });
    
    customDurationInput.addEventListener('input', updateDurationCalculations);
    groupAmountInput.addEventListener('input', updateDurationCalculations);
    
    // Listeners for auto-prefill group name
    if (groupStartMonth) groupStartMonth.addEventListener('change', autoPrefillGroupName);
    if (groupStartYear) groupStartYear.addEventListener('change', autoPrefillGroupName);
    
    if (groupNameInput) {
        groupNameInput.addEventListener('input', () => {
            isGroupNameDirty = groupNameInput.value.trim().length > 0;
        });
    }
    
    // Form Submit (Submit goes to screen 3: Add Members)
    const createForm = document.getElementById('create-group-form');
    createForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = groupNameInput.value.trim();
        const amount = parseFloat(groupAmountInput.value);
        
        // Duration selection
        let duration = 12;
        const selectedRadio = document.querySelector('input[name="group-duration"]:checked').value;
        if (selectedRadio === 'custom') {
            duration = parseInt(customDurationInput.value);
        } else {
            duration = parseInt(selectedRadio);
        }
        
        const startMonth = parseInt(groupStartMonth.value);
        const startYear = parseInt(groupStartYear.value);
        
        // Validations
        if (!name) {
            showNotification('Group name is required.', 'error');
            return;
        }
        
        // amount is the total scheme amount
        if (isNaN(amount) || amount <= 0) {
            showNotification('Total scheme amount must be greater than 0.', 'error');
            return;
        }
        
        if (isNaN(duration) || duration < 2 || duration > 120) {
            showNotification('Duration must be between 2 and 120 months.', 'error');
            return;
        }
        
        const totalChitAmount = amount;
        
        // Retrieve customized installments and payouts
        const installments = {};
        const payouts = {};
        document.querySelectorAll('.schedule-inst-input').forEach(input => {
            const m = parseInt(input.getAttribute('data-month'));
            installments[m] = parseFloat(input.value) || 0;
        });
        document.querySelectorAll('.schedule-payout-input').forEach(input => {
            const m = parseInt(input.getAttribute('data-month'));
            payouts[m] = parseFloat(input.value) || 0;
        });
        
        const firstMonthInstallment = installments[1] !== undefined ? installments[1] : (amount / duration);
        
        // Prepare Group Object (Transient state until finalized in Screen 3)
        State.tempGroup = {
            name: name,
            chitAmount: totalChitAmount,        // total pool (informational)
            monthlyInstallment: firstMonthInstallment,
            duration: duration,
            startMonth: startMonth,
            startYear: startYear,
            installments: installments,
            payouts: payouts
        };
        
        // Reset temporary member list
        State.tempMemberList = [];
        
        // Render Group details preview on Screen 3
        document.getElementById('preview-group-name').textContent = State.tempGroup.name;
        document.getElementById('preview-group-pool').textContent = '₹' + State.tempGroup.chitAmount.toLocaleString('en-IN') + ' (total)';
        
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const startDate = new Date(startYear, startMonth, 1);
        const endDate = new Date(startYear, startMonth + duration - 1, 1);
        const startStr = `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;
        const endStr = `${monthNames[endDate.getMonth()]} ${endDate.getFullYear()}`;
        
        document.getElementById('preview-group-months').textContent = `${State.tempGroup.duration} Months (${startStr} - ${endStr})`;
        document.getElementById('preview-group-installment').textContent = '₹' + State.tempGroup.monthlyInstallment.toLocaleString('en-IN', { maximumFractionDigits: 2 }) + '/mo';
        
        renderTempMembersList();
        switchView('screen-add-members');
    });
    
    // --- Add Members Screen ---
    const addMemberInput = document.getElementById('member-name-input');
    const addMemberBtn = document.getElementById('btn-add-member-list');
    
    if (addMemberInput) {
        addMemberInput.addEventListener('input', () => {
            const val = addMemberInput.value.trim().toLowerCase();
            let match = null;
            if (val.length >= 2) {
                // Cascading search: 1. Exact match, 2. Starts with, 3. Includes
                match = State.members.find(m => m.name.trim().toLowerCase() === val);
                if (!match) {
                    match = State.members.find(m => m.name.trim().toLowerCase().startsWith(val));
                }
                if (!match) {
                    match = State.members.find(m => m.name.trim().toLowerCase().includes(val));
                }
            }
            
            if (match) {
                document.getElementById('member-mobile-input').value = match.mobileNo || '';
                document.getElementById('member-work-input').value = match.placeOfWork || '';
                document.getElementById('member-occupation-input').value = match.occupation || '';
                document.getElementById('member-place-input').value = match.place || '';
                document.getElementById('member-address-input').value = match.address || '';
                const typeInput = document.querySelector(`input[name="member-customer-type"][value="${match.customerType || 'New'}"]`);
                if (typeInput) typeInput.checked = true;
                document.getElementById('member-referred-input').value = match.referredBy || '';
            } else {
                document.getElementById('member-mobile-input').value = '';
                document.getElementById('member-work-input').value = '';
                document.getElementById('member-occupation-input').value = '';
                document.getElementById('member-place-input').value = '';
                document.getElementById('member-address-input').value = '';
                const defTypeC = document.querySelector('input[name="member-customer-type"][value="New"]');
                if (defTypeC) defTypeC.checked = true;
                document.getElementById('member-referred-input').value = '';
            }
        });
    }
    
    function handleAddMember() {
        const mName = addMemberInput.value.trim();
        const mMobile = document.getElementById('member-mobile-input').value.trim();
        const mWork = document.getElementById('member-work-input').value.trim();
        const mOccupation = document.getElementById('member-occupation-input').value.trim();
        const mPlace = document.getElementById('member-place-input').value.trim();
        const mAddress = document.getElementById('member-address-input').value.trim();
        const typeEl = document.querySelector('input[name="member-customer-type"]:checked');
        const mCustomerType = typeEl ? typeEl.value : 'New';
        const mReferredBy = document.getElementById('member-referred-input').value.trim();

        if (!mName) {
            showNotification('Member name is required.', 'error');
            return;
        }
        
        if (State.tempMemberList.some(m => m.name.toLowerCase() === mName.toLowerCase())) {
            showNotification('Member name already added to this list.', 'error');
            return;
        }
        
        State.tempMemberList.push({
            name: mName,
            mobileNo: mMobile,
            placeOfWork: mWork,
            occupation: mOccupation,
            place: mPlace,
            address: mAddress,
            customerType: mCustomerType,
            referredBy: mReferredBy
        });

        // Clear all fields
        addMemberInput.value = '';
        document.getElementById('member-mobile-input').value = '';
        document.getElementById('member-work-input').value = '';
        document.getElementById('member-occupation-input').value = '';
        document.getElementById('member-place-input').value = '';
        document.getElementById('member-address-input').value = '';
        const defTypeC2 = document.querySelector('input[name="member-customer-type"][value="New"]');
        if (defTypeC2) defTypeC2.checked = true;
        document.getElementById('member-referred-input').value = '';

        addMemberInput.focus();
        renderTempMembersList();
    }
    
    addMemberBtn.addEventListener('click', handleAddMember);
    // Allow pressing enter on name/mobile inputs to add
    [addMemberInput, document.getElementById('member-mobile-input')].forEach(inputEl => {
        if (inputEl) {
            inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMember();
                }
            });
        }
    });
    
    // Save Group and Members
    document.getElementById('btn-finalize-group').addEventListener('click', () => {
        if (State.tempMemberList.length === 0) {
            showNotification('Please add at least one member to create the group.', 'error');
            return;
        }
        
        // Generate Group object
        const groupId = generateUUID();
        const newGroup = {
            id: groupId,
            name: State.tempGroup.name,
            chitAmount: State.tempGroup.chitAmount,
            duration: State.tempGroup.duration,
            monthlyInstallment: State.tempGroup.monthlyInstallment,
            currentMonth: 1,
            startMonth: State.tempGroup.startMonth,
            startYear: State.tempGroup.startYear,
            createdAt: new Date().toISOString(),
            members: [],
            installments: State.tempGroup.installments,
            payouts: State.tempGroup.payouts
        };
        
        // Generate Member objects
        State.tempMemberList.forEach(memberData => {
            const memberId = generateUUID();
            newGroup.members.push(memberId);
            
            const memberObj = {
                id: memberId,
                groupId: groupId,
                name: memberData.name,
                mobileNo: memberData.mobileNo || '',
                placeOfWork: memberData.placeOfWork || '',
                occupation: memberData.occupation || '',
                place: memberData.place || '',
                address: memberData.address || '',
                customerType: memberData.customerType || 'New',
                referredBy: memberData.referredBy || '',
                payments: {}, // monthNum -> { paid: boolean, paidAt: ISO_Date, amount: number }
                status: 'Active'
            };
            
            // Initialize payment structures
            for (let m = 1; m <= newGroup.duration; m++) {
                memberObj.payments[m] = {
                    paid: false,
                    paidAt: null,
                    amount: newGroup.installments && newGroup.installments[m] !== undefined ? newGroup.installments[m] : newGroup.monthlyInstallment
                };
            }
            
            State.members.push(memberObj);
        });
        
        State.groups.push(newGroup);
        
        // Save and cleanup
        saveState();
        showNotification('Group created successfully!');
        
        // Switch to Dashboard
        switchView('screen-dashboard');
    });
    
    // --- Group Details Screen ---
    // Month adjusters
    document.getElementById('btn-month-decrement').addEventListener('click', () => {
        adjustGroupMonth(-1);
    });
    
    document.getElementById('btn-month-increment').addEventListener('click', () => {
        adjustGroupMonth(1);
    });
    
    // Quick Add Member button
    document.getElementById('btn-details-add-member').addEventListener('click', () => {
        document.getElementById('new-member-name-input').value = '';
        document.getElementById('add-member-modal-backdrop').classList.add('active');
        document.getElementById('new-member-name-input').focus();
    });
    
    document.getElementById('btn-close-add-member-modal').addEventListener('click', () => {
        document.getElementById('add-member-modal-backdrop').classList.remove('active');
    });
    
    document.getElementById('btn-cancel-add-member').addEventListener('click', () => {
        document.getElementById('add-member-modal-backdrop').classList.remove('active');
    });
    
    document.getElementById('btn-save-new-member').addEventListener('click', saveMemberToExistingGroup);
    const newMemberNameInput = document.getElementById('new-member-name-input');
    if (newMemberNameInput) {
        newMemberNameInput.addEventListener('input', () => {
            const val = newMemberNameInput.value.trim().toLowerCase();
            let match = null;
            if (val.length >= 2) {
                // Cascading search: 1. Exact match, 2. Starts with, 3. Includes
                match = State.members.find(m => m.name.trim().toLowerCase() === val);
                if (!match) {
                    match = State.members.find(m => m.name.trim().toLowerCase().startsWith(val));
                }
                if (!match) {
                    match = State.members.find(m => m.name.trim().toLowerCase().includes(val));
                }
            }
            
            if (match) {
                document.getElementById('new-member-mobile-input').value = match.mobileNo || '';
                document.getElementById('new-member-work-input').value = match.placeOfWork || '';
                document.getElementById('new-member-occupation-input').value = match.occupation || '';
                document.getElementById('new-member-place-input').value = match.place || '';
                document.getElementById('new-member-address-input').value = match.address || '';
                const typeInputNew = document.querySelector(`input[name="new-member-customer-type"][value="${match.customerType || 'New'}"]`);
                if (typeInputNew) typeInputNew.checked = true;
                document.getElementById('new-member-referred-input').value = match.referredBy || '';
            } else {
                document.getElementById('new-member-mobile-input').value = '';
                document.getElementById('new-member-work-input').value = '';
                document.getElementById('new-member-occupation-input').value = '';
                document.getElementById('new-member-place-input').value = '';
                document.getElementById('new-member-address-input').value = '';
                const defTypeNew = document.querySelector('input[name="new-member-customer-type"][value="New"]');
                if (defTypeNew) defTypeNew.checked = true;
                document.getElementById('new-member-referred-input').value = '';
            }
        });
        newMemberNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveMemberToExistingGroup();
            }
        });
    }

    // Global Refresh Button
    const btnGlobalRefresh = document.getElementById('btn-global-refresh');
    if (btnGlobalRefresh) {
        btnGlobalRefresh.addEventListener('click', async () => {
            const icon = btnGlobalRefresh.querySelector('i');
            if (icon) icon.classList.add('spin-anim');
            await loadState();
            renderDashboard();
            if (icon) icon.classList.remove('spin-anim');
            if (typeof showNotification === 'function') showNotification('Data refreshed', 'info');
        });
    }

    // Global PDF Export Modal Bindings
    const btnGlobalExportPdf = document.getElementById('btn-global-export-pdf');
    if (btnGlobalExportPdf) {
        btnGlobalExportPdf.addEventListener('click', () => {
            const selectEl = document.getElementById('global-pdf-export-month-select');
            selectEl.innerHTML = '';
            
            let monthKeys = new Set();
            
            // Always add current real-world month
            const today = new Date();
            const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            monthKeys.add(currentMonthKey);
            
            State.groups.forEach(group => {
                const startMonth = group.startMonth !== undefined ? parseInt(group.startMonth) : new Date(group.createdAt).getMonth();
                const startYear = group.startYear !== undefined ? parseInt(group.startYear) : new Date(group.createdAt).getFullYear();
                
                let date = new Date(startYear, startMonth, 1);
                for (let i = 0; i < group.duration; i++) {
                    const mStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    monthKeys.add(mStr);
                    date.setMonth(date.getMonth() + 1);
                }
            });
            
            let sortedKeys = Array.from(monthKeys).sort((a,b) => b.localeCompare(a));
            sortedKeys.forEach(k => {
                const [y, m] = k.split('-');
                const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1);
                const monthName = dateObj.toLocaleString('default', { month: 'long' });
                
                const opt = document.createElement('option');
                opt.value = k;
                opt.textContent = `${monthName} ${y}`;
                if (k === currentMonthKey) {
                    opt.selected = true;
                    opt.textContent += ' (Current)';
                }
                selectEl.appendChild(opt);
            });
            
            document.getElementById('global-pdf-export-modal-backdrop').classList.add('active');
        });
    }

    const btnCloseGlobalPdfModal = document.getElementById('btn-close-global-pdf-export-modal');
    if (btnCloseGlobalPdfModal) {
        btnCloseGlobalPdfModal.addEventListener('click', () => {
            document.getElementById('global-pdf-export-modal-backdrop').classList.remove('active');
        });
    }

    const btnGenerateGlobalPdf = document.getElementById('btn-generate-global-pdf');
    if (btnGenerateGlobalPdf) {
        btnGenerateGlobalPdf.addEventListener('click', () => {
            generateGlobalPdfReport();
        });
    }

    // Details Refresh Button
    const btnDetailsRefresh = document.getElementById('btn-details-refresh');
    if (btnDetailsRefresh) {
        btnDetailsRefresh.addEventListener('click', async () => {
            const icon = btnDetailsRefresh.querySelector('i');
            if (icon) icon.classList.add('spin-anim');
            await loadState();
            renderGroupDetails(State.selectedGroupId);
            if (icon) icon.classList.remove('spin-anim');
            if (typeof showNotification === 'function') showNotification('Data refreshed', 'info');
        });
    }

    // PDF Export Modal Bindings
    const btnExportPdf = document.getElementById('btn-details-export-pdf');
    if (btnExportPdf) {
        btnExportPdf.addEventListener('click', () => {
            const group = State.groups.find(g => g.id === State.selectedGroupId);
            if (!group) return;
            
            const selectEl = document.getElementById('pdf-export-month-select');
            selectEl.innerHTML = '';
            for (let i = 1; i <= group.duration; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = `Month ${i}`;
                if (i === group.currentMonth) opt.selected = true;
                selectEl.appendChild(opt);
            }
            
            document.getElementById('pdf-export-modal-backdrop').classList.add('active');
        });
    }

    const btnClosePdfModal = document.getElementById('btn-close-pdf-export-modal');
    if (btnClosePdfModal) {
        btnClosePdfModal.addEventListener('click', () => {
            document.getElementById('pdf-export-modal-backdrop').classList.remove('active');
        });
    }

    const btnGeneratePdf = document.getElementById('btn-generate-pdf');
    if (btnGeneratePdf) {
        btnGeneratePdf.addEventListener('click', () => {
            generatePdfReport();
        });
    }

    // Edit Group Modal Bindings
    document.getElementById('btn-details-edit-group').addEventListener('click', openEditGroupModal);
    document.getElementById('btn-close-edit-group-modal').addEventListener('click', () => {
        document.getElementById('edit-group-modal-backdrop').classList.remove('active');
    });
    document.getElementById('btn-cancel-edit-group').addEventListener('click', () => {
        document.getElementById('edit-group-modal-backdrop').classList.remove('active');
    });
    document.getElementById('btn-save-edit-group').addEventListener('click', saveGroupEdit);
    document.getElementById('btn-delete-group').addEventListener('click', deleteGroup);
    
    document.getElementById('edit-group-amount').addEventListener('input', () => {
        const newAmount = parseFloat(document.getElementById('edit-group-amount').value) || 0;
        const groupId = State.selectedGroupId;
        const group = State.groups.find(g => g.id === groupId);
        if (!group) return;
        
        const duration = group.duration;
        const defaultInstallment = Math.round(newAmount / duration);
        
        document.querySelectorAll('.edit-schedule-inst-input').forEach(input => {
            input.value = defaultInstallment;
        });
        document.querySelectorAll('.edit-schedule-payout-input').forEach(input => {
            input.value = newAmount;
        });
    });

    const fixedInput = document.getElementById('group-installment-fixed');
    if (fixedInput) {
        fixedInput.addEventListener('input', () => {
            const val = parseFloat(fixedInput.value) || 0;
            if (val > 0) {
                document.querySelectorAll('.schedule-inst-input').forEach(input => {
                    input.value = val;
                });
            }
        });
    }

    const editFixedInput = document.getElementById('edit-group-installment-fixed');
    if (editFixedInput) {
        editFixedInput.addEventListener('input', () => {
            const val = parseFloat(editFixedInput.value) || 0;
            if (val > 0) {
                document.querySelectorAll('.edit-schedule-inst-input').forEach(input => {
                    input.value = val;
                });
            }
        });
    }
    
    // Search member filters
    const searchInput = document.getElementById('member-search-input');
    searchInput.addEventListener('input', () => {
        filterAndRenderMembers();
    });
    
    // Filter pills
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            filterAndRenderMembers();
        });
    });
    
    // --- Payment Checklist Modal ---
    document.getElementById('btn-close-payment-modal').addEventListener('click', () => {
        document.getElementById('payment-modal-backdrop').classList.remove('active');
        // Re-render views
        renderGroupDetails(State.selectedGroupId);
        renderDashboard();
    });
    
    document.getElementById('btn-save-payment-modal').addEventListener('click', () => {
        document.getElementById('payment-modal-backdrop').classList.remove('active');
        renderGroupDetails(State.selectedGroupId);
        renderDashboard();
    });

    const btnToggleProfile = document.getElementById('btn-toggle-profile-details');
    if (btnToggleProfile) {
        btnToggleProfile.addEventListener('click', () => {
            const wrapper = document.getElementById('profile-details-collapsible');
            const icon = document.getElementById('profile-toggle-icon');
            if (wrapper && icon) {
                wrapper.classList.toggle('expanded');
                icon.classList.toggle('rotated');
            }
        });
    }
    
    // Bulk Payment Actions in Modal
    document.getElementById('btn-modal-mark-all').addEventListener('click', () => {
        bulkTogglePayments(true);
    });
    
    document.getElementById('btn-modal-unmark-all').addEventListener('click', () => {
        bulkTogglePayments(false);
    });

    // Inline Member Profile Editor event listeners
    const btnEditProfile = document.getElementById('btn-edit-member-profile');
    if (btnEditProfile) {
        btnEditProfile.addEventListener('click', () => {
            const member = State.members.find(m => m.id === State.selectedMemberId);
            if (!member) return;
            
            // Populate fields
            document.getElementById('edit-member-name').value = member.name || '';
            document.getElementById('edit-member-work').value = member.placeOfWork || '';
            document.getElementById('edit-member-occupation').value = member.occupation || '';
            document.getElementById('edit-member-place').value = member.place || '';
            document.getElementById('edit-member-mobile').value = member.mobileNo || '';
            document.getElementById('edit-member-address').value = member.address || '';
            const typeInputEdit = document.querySelector(`input[name="edit-member-customer-type"][value="${member.customerType || 'New'}"]`);
            if (typeInputEdit) typeInputEdit.checked = true;
            document.getElementById('edit-member-referred').value = member.referredBy || '';
            
            // Toggle view
            document.getElementById('payment-modal-member-profile-card').classList.add('hidden');
            document.getElementById('payment-modal-member-profile-edit').classList.remove('hidden');
            
            // Auto expand wrapper if collapsed
            const wrapper = document.getElementById('profile-details-collapsible');
            const icon = document.getElementById('profile-toggle-icon');
            if (wrapper) wrapper.classList.add('expanded');
            if (icon) icon.classList.add('rotated');
        });
    }

    const btnCancelMemberEdit = document.getElementById('btn-cancel-member-edit');
    if (btnCancelMemberEdit) {
        btnCancelMemberEdit.addEventListener('click', () => {
            document.getElementById('payment-modal-member-profile-card').classList.remove('hidden');
            document.getElementById('payment-modal-member-profile-edit').classList.add('hidden');
        });
    }

    const btnSaveMemberEdit = document.getElementById('btn-save-member-edit');
    if (btnSaveMemberEdit) {
        btnSaveMemberEdit.addEventListener('click', () => {
            const member = State.members.find(m => m.id === State.selectedMemberId);
            if (!member) return;

            const nameVal = document.getElementById('edit-member-name').value.trim();
            if (!nameVal) {
                showNotification('Member name is required.', 'error');
                return;
            }

            // Save details
            member.name = nameVal;
            member.placeOfWork = document.getElementById('edit-member-work').value.trim();
            member.occupation = document.getElementById('edit-member-occupation').value.trim();
            member.place = document.getElementById('edit-member-place').value.trim();
            member.mobileNo = document.getElementById('edit-member-mobile').value.trim();
            member.address = document.getElementById('edit-member-address').value.trim();
            const editTypeEl = document.querySelector('input[name="edit-member-customer-type"]:checked');
            member.customerType = editTypeEl ? editTypeEl.value : 'New';
            member.referredBy = document.getElementById('edit-member-referred').value.trim();

            saveState();
            
            // Refresh modal UI
            openPaymentModal(member.id);
            
            // Re-render behind scenes
            if (State.selectedGroupId) {
                renderGroupDetails(State.selectedGroupId);
            }
            
            // Force completely clean dashboard re-render
            const activeDashFilterPill = document.querySelector('#dashboard-filter-pills .filter-pill.active');
            if (activeDashFilterPill) {
                State.dashboardFilter = activeDashFilterPill.getAttribute('data-dashfilter');
            }
            const searchVal = document.getElementById('dashboard-member-search')?.value.toLowerCase().trim() || '';
            renderDashboardMembersList(searchVal);
            
            showNotification('Member profile details updated successfully!');
        });
    }

    const btnDeleteMember = document.getElementById('btn-delete-member');
    if (btnDeleteMember) {
        btnDeleteMember.addEventListener('click', async () => {
            const member = State.members.find(m => m.id === State.selectedMemberId);
            if (!member) return;

            const confirmed = await showCustomConfirm(
                'Delete Member',
                `Are you sure you want to delete member "${member.name}"? This will permanently erase their payment checklist history from this group.`
            );
            if (confirmed) {
                // Delete member
                State.members = State.members.filter(m => m.id !== member.id);
                saveState();

                // Close payment modal
                document.getElementById('payment-modal-backdrop').classList.remove('active');

                // Refresh UI views
                renderGroupDetails(State.selectedGroupId);
                renderDashboard();

                showNotification(`Member "${member.name}" has been deleted.`, 'info');
            }
        });
    }

    // --- Scheme Templates Management ---
    let editingTemplateId = null;

    function renderTemplatesList() {
        const listContainer = document.getElementById('templates-list-container');
        if (!listContainer) return;
        listContainer.innerHTML = '';

        if (!State.templates || State.templates.length === 0) {
            listContainer.innerHTML = `<p class="section-desc" style="font-style: italic;">No templates created yet.</p>`;
            return;
        }

        const filterVal = State.templateFilterDuration || '12';
        const filteredTemplates = State.templates.filter(t => {
            const dur = parseInt(t.duration);
            if (filterVal === '12') return dur === 12;
            if (filterVal === '20') return dur === 20;
            return dur !== 12 && dur !== 20;
        });

        // Sort templates by amount ascending (lower to higher)
        filteredTemplates.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));

        if (filteredTemplates.length === 0) {
            listContainer.innerHTML = `<p class="section-desc" style="font-style: italic; padding: 10px 0;">No templates for this duration.</p>`;
            return;
        }

        filteredTemplates.forEach(t => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '12px 16px';
            row.style.marginBottom = '8px';
            row.style.border = '1px solid var(--border)';
            row.style.borderRadius = 'var(--radius-md)';
            row.style.backgroundColor = 'var(--bg-surface-elevated)';
            row.style.boxShadow = 'var(--shadow-sm)';
            
            row.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <strong style="color: var(--primary); font-size: 1rem; font-weight: 800;">₹${parseFloat(t.amount).toLocaleString('en-IN')}</strong>
                    <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">${t.duration} Months Scheme</span>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="btn edit-tpl-btn" data-id="${t.id}" style="padding: 0; height: 32px; width: 32px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); border: 1px solid var(--border); background-color: transparent; cursor: pointer; color: var(--text-main);" type="button" title="Edit Template">
                        <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
                    </button>
                    <button class="btn delete-tpl-btn" data-id="${t.id}" style="padding: 0; height: 32px; width: 32px; background-color: rgba(255, 59, 48, 0.1); border: 1px solid rgba(255, 59, 48, 0.2); color: #ff3b30; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); cursor: pointer;" type="button" title="Delete Template">
                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                </div>
            `;

            row.querySelector('.edit-tpl-btn').addEventListener('click', () => {
                openTemplateModal(t.id);
            });

            row.querySelector('.delete-tpl-btn').addEventListener('click', async () => {
                const confirmed = await showCustomConfirm(
                    'Delete Template',
                    `Are you sure you want to delete this template (₹${parseFloat(t.amount).toLocaleString('en-IN')} - ${t.duration}m)?`
                );
                if (confirmed) {
                    State.templates = State.templates.filter(x => x.id !== t.id);
                    saveState();
                    renderTemplatesList();
                    showNotification('Template deleted successfully!');
                }
            });

            listContainer.appendChild(row);
        });
        lucide.createIcons();
    }

    function openTemplateModal(templateId = null) {
        editingTemplateId = templateId;
        const modal = document.getElementById('template-modal-backdrop');
        const titleEl = document.getElementById('template-modal-title');
        const amountInput = document.getElementById('template-amount');
        const durationInput = document.getElementById('template-duration');
        const deleteBtn = document.getElementById('btn-delete-template');
        const tplCustomWrapper = document.getElementById('template-custom-duration-wrapper');
        const tplCustomInput = document.getElementById('template-duration-custom');

        if (templateId) {
            const t = State.templates.find(x => x.id === templateId);
            titleEl.textContent = 'Edit Scheme Template';
            amountInput.value = formatNumberIndian(t.amount);
            durationInput.value = t.duration;
            deleteBtn.style.display = 'block';

            const durationVal = parseInt(t.duration);
            if (durationVal === 12 || durationVal === 20) {
                const radio = document.querySelector(`input[name="template-duration-type"][value="${durationVal}"]`);
                if (radio) radio.checked = true;
                tplCustomWrapper.classList.add('hidden');
                tplCustomInput.value = '';
            } else {
                const radio = document.querySelector('input[name="template-duration-type"][value="custom"]');
                if (radio) radio.checked = true;
                tplCustomWrapper.classList.remove('hidden');
                tplCustomInput.value = durationVal;
            }

            regenerateTemplateModalScheduleTable(t);
        } else {
            titleEl.textContent = 'New Scheme Template';
            amountInput.value = '';
            durationInput.value = '12';
            deleteBtn.style.display = 'none';

            const radio12 = document.querySelector('input[name="template-duration-type"][value="12"]');
            if (radio12) radio12.checked = true;
            tplCustomWrapper.classList.add('hidden');
            tplCustomInput.value = '';

            document.getElementById('template-schedule-rows-container').innerHTML = '';
        }

        modal.classList.add('active');
    }

    function regenerateTemplateModalScheduleTable(existingTemplate = null) {
        const container = document.getElementById('template-schedule-rows-container');
        if (!container) return;
        
        const amount = parseFloat(document.getElementById('template-amount').value) || 0;
        const duration = parseInt(document.getElementById('template-duration').value) || 0;
        
        container.innerHTML = '';
        if (duration <= 0) return;
        
        const defaultInstallment = Math.round(amount / duration);
        
        for (let m = 1; m <= duration; m++) {
            const instVal = existingTemplate && existingTemplate.installments && existingTemplate.installments[m] !== undefined
                ? existingTemplate.installments[m]
                : defaultInstallment;
                
            const payoutVal = existingTemplate && existingTemplate.payouts && existingTemplate.payouts[m] !== undefined
                ? existingTemplate.payouts[m]
                : amount;
                
            const row = document.createElement('div');
            row.className = 'schedule-month-card';
            
            row.innerHTML = `
                <div class="month-card-header">Month ${m}</div>
                <div class="month-card-inputs">
                    <div class="month-input-group">
                        <label>Installment (₹)</label>
                        <input type="text" inputmode="numeric" class="template-schedule-inst-input amount-input" data-month="${m}" value="${formatNumberIndian(instVal)}" required>
                    </div>
                    <div class="month-input-group">
                        <label>Payout (₹)</label>
                        <input type="text" inputmode="numeric" class="template-schedule-payout-input amount-input" data-month="${m}" value="${formatNumberIndian(payoutVal)}" required>
                    </div>
                </div>
            `;
            container.appendChild(row);
        }
    }

    // Modal lifecycle updates
    document.getElementById('btn-add-template').addEventListener('click', () => {
        openTemplateModal(null);
    });

    document.getElementById('btn-close-template-modal').addEventListener('click', () => {
        document.getElementById('template-modal-backdrop').classList.remove('active');
    });

    document.getElementById('btn-cancel-template').addEventListener('click', () => {
        document.getElementById('template-modal-backdrop').classList.remove('active');
    });

    // Trigger schedule generation on input change
    const updateTplRows = () => {
        const amount = parseFloat(document.getElementById('template-amount').value) || 0;
        const duration = parseInt(document.getElementById('template-duration').value) || 0;
        if (amount > 0 && duration > 0) {
            regenerateTemplateModalScheduleTable(editingTemplateId ? State.templates.find(x => x.id === editingTemplateId) : null);
        }
    };
    document.getElementById('template-amount').addEventListener('input', updateTplRows);
    document.getElementById('template-duration').addEventListener('input', updateTplRows);

    // Template Duration Chips & Custom Input listeners
    const templateDurationRadios = document.querySelectorAll('input[name="template-duration-type"]');
    const templateCustomDurationWrapper = document.getElementById('template-custom-duration-wrapper');
    const templateCustomDurationInput = document.getElementById('template-duration-custom');
    const templateDurationHidden = document.getElementById('template-duration');

    function updateTemplateDurationValue() {
        const selectedRadio = document.querySelector('input[name="template-duration-type"]:checked');
        let duration = 12;
        if (selectedRadio) {
            if (selectedRadio.value === 'custom') {
                templateCustomDurationWrapper.classList.remove('hidden');
                templateCustomDurationInput.required = true;
                duration = parseInt(templateCustomDurationInput.value) || 0;
            } else {
                templateCustomDurationWrapper.classList.add('hidden');
                templateCustomDurationInput.required = false;
                duration = parseInt(selectedRadio.value);
            }
        }
        templateDurationHidden.value = duration;
        templateDurationHidden.dispatchEvent(new Event('input'));
    }

    templateDurationRadios.forEach(radio => {
        radio.addEventListener('change', updateTemplateDurationValue);
    });
    templateCustomDurationInput.addEventListener('input', updateTemplateDurationValue);

    // Save Template
    document.getElementById('btn-save-template').addEventListener('click', (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('template-amount').value);
        const duration = parseInt(document.getElementById('template-duration').value);

        if (isNaN(amount) || amount <= 0 || isNaN(duration) || duration < 2 || duration > 120) {
            showNotification('Please provide a valid amount and duration.', 'error');
            return;
        }

        const installments = {};
        const payouts = {};
        document.querySelectorAll('.template-schedule-inst-input').forEach(input => {
            const m = parseInt(input.getAttribute('data-month'));
            installments[m] = parseFloat(input.value) || 0;
        });
        document.querySelectorAll('.template-schedule-payout-input').forEach(input => {
            const m = parseInt(input.getAttribute('data-month'));
            payouts[m] = parseFloat(input.value) || 0;
        });

        if (editingTemplateId) {
            const index = State.templates.findIndex(x => x.id === editingTemplateId);
            if (index !== -1) {
                State.templates[index] = {
                    id: editingTemplateId,
                    amount,
                    duration,
                    installments,
                    payouts
                };
            }
        } else {
            const newTpl = {
                id: generateUUID(),
                amount,
                duration,
                installments,
                payouts
            };
            if (!State.templates) State.templates = [];
            State.templates.push(newTpl);
        }

        saveState();
        showNotification('Scheme template saved!');
        document.getElementById('template-modal-backdrop').classList.remove('active');
        
        // Auto-switch filter to match saved template's duration
        if (duration === 12 || duration === 20) {
            State.templateFilterDuration = duration.toString();
        } else {
            State.templateFilterDuration = 'other';
        }
        const tplPills = document.querySelectorAll('.template-filter-pills .filter-pill');
        tplPills.forEach(p => {
            if (p.getAttribute('data-duration') === State.templateFilterDuration) {
                p.classList.add('active');
            } else {
                p.classList.remove('active');
            }
        });
        
        renderTemplatesList();
    });

    // Delete Template
    document.getElementById('btn-delete-template').addEventListener('click', async () => {
        if (!editingTemplateId) return;
        const confirmed = await showCustomConfirm('Delete Template', 'Are you sure you want to delete this scheme template?');
        if (confirmed) {
            State.templates = State.templates.filter(x => x.id !== editingTemplateId);
            saveState();
            showNotification('Template deleted successfully!');
            document.getElementById('template-modal-backdrop').classList.remove('active');
            renderTemplatesList();
        }
    });

    // Render templates list on settings open
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', () => {
            // Keep filter sync
            State.templateFilterDuration = '12';
            const tplPills = document.querySelectorAll('.template-filter-pills .filter-pill');
            tplPills.forEach(p => {
                if (p.getAttribute('data-duration') === '12') {
                    p.classList.add('active');
                } else {
                    p.classList.remove('active');
                }
            });
            renderTemplatesList();
        });
    }

    // Modal Close Logic
    const tplModal = document.getElementById('templates-list-modal-backdrop');
    const btnCloseTplModal = document.getElementById('btn-close-templates-list-modal');
    if (btnCloseTplModal) {
        btnCloseTplModal.addEventListener('click', () => {
            tplModal.classList.remove('active');
        });
    }
}

// --- Screen Renderers ---

function getTargetCalendarYearMonth(selMonth) {
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth();
    
    if (selMonth !== 'current' && selMonth !== 'accumulated') {
        const parts = selMonth.split('-');
        if (parts.length === 2) {
            year = parseInt(parts[0]);
            month = parseInt(parts[1]);
        }
    }
    return { year, month };
}

function getRelativeMonthForGroup(group, targetYear, targetMonth) {
    const startMonth = group.startMonth !== undefined ? parseInt(group.startMonth) : new Date(group.createdAt).getMonth();
    const startYear = group.startYear !== undefined ? parseInt(group.startYear) : new Date(group.createdAt).getFullYear();
    
    const diffMonths = (targetYear - startYear) * 12 + (targetMonth - startMonth);
    return diffMonths + 1; // 1-indexed relative month
}

function populateDashboardMonthDropdown() {
    const dropdown = document.getElementById('dashboard-month-select');
    if (!dropdown) return;
    
    const currentVal = State.dashboardSelectedMonth || 'current';
    dropdown.innerHTML = '';
    
    // 1. Add Accumulated Dues option
    const optAccum = document.createElement('option');
    optAccum.value = 'accumulated';
    optAccum.textContent = 'All Dues (Accumulated)';
    dropdown.appendChild(optAccum);
    
    // 2. Add Current Month option
    const today = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonthLabel = `${monthNames[today.getMonth()]} ${today.getFullYear()}`;
    
    const optCurrent = document.createElement('option');
    optCurrent.value = 'current';
    optCurrent.textContent = `Current Month (${currentMonthLabel})`;
    dropdown.appendChild(optCurrent);
    
    // 3. Add all calendar months spanning active groups
    const allMonths = [];
    State.groups.forEach(g => {
        const startMonth = g.startMonth !== undefined ? parseInt(g.startMonth) : new Date(g.createdAt).getMonth();
        const startYear = g.startYear !== undefined ? parseInt(g.startYear) : new Date(g.createdAt).getFullYear();
        
        for (let m = 1; m <= g.duration; m++) {
            const dateObj = new Date(startYear, startMonth + m - 1, 1);
            const y = dateObj.getFullYear();
            const mon = dateObj.getMonth();
            const val = `${y}-${mon.toString().padStart(2, '0')}`;
            const label = `${monthNames[mon]} ${y}`;
            
            if (!allMonths.some(item => item.value === val)) {
                allMonths.push({ year: y, month: mon, label, value: val });
            }
        }
    });
    
    // Sort chronologically
    allMonths.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
    });
    
    allMonths.forEach(item => {
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = item.label;
        dropdown.appendChild(option);
    });
    
    // Restore selection
    if (currentVal === 'current' || currentVal === 'accumulated' || allMonths.some(m => m.value === currentVal)) {
        dropdown.value = currentVal;
        State.dashboardSelectedMonth = currentVal;
    } else {
        dropdown.value = 'current';
        State.dashboardSelectedMonth = 'current';
    }
}

// 1. Dashboard Renderer
function renderDashboard() {
    // Global Metrics Calculation
    const globalMetrics = getGlobalMetrics(State.dashboardSelectedMonth);
    
    // Removed stat-total-groups update
    document.getElementById('stat-total-collected').textContent = '₹' + globalMetrics.totalCollected.toLocaleString('en-IN');
    
    const cashEl = document.getElementById('stat-summary-collected-cash');
    if (cashEl) cashEl.textContent = '₹' + (globalMetrics.totalCollectedCash || 0).toLocaleString('en-IN');
    
    const gpayEl = document.getElementById('stat-summary-collected-gpay');
    if (gpayEl) gpayEl.textContent = '₹' + (globalMetrics.totalCollectedGpay || 0).toLocaleString('en-IN');

    document.getElementById('stat-total-pending').textContent = '₹' + globalMetrics.totalPending.toLocaleString('en-IN');
    
    // Populate month dropdown dynamic options
    populateDashboardMonthDropdown();

    // Bind month dropdown logic
    const monthSelect = document.getElementById('dashboard-month-select');
    if (monthSelect) {
        const newSelect = monthSelect.cloneNode(true);
        monthSelect.parentNode.replaceChild(newSelect, monthSelect);
        newSelect.value = State.dashboardSelectedMonth;
        newSelect.addEventListener('change', () => {
            State.dashboardSelectedMonth = newSelect.value;
            
            // Re-evaluate metrics for the new month selection
            const metrics = getGlobalMetrics(State.dashboardSelectedMonth);
            document.getElementById('stat-total-collected').textContent = '₹' + metrics.totalCollected.toLocaleString('en-IN');
            
            const mCashEl = document.getElementById('stat-summary-collected-cash');
            if (mCashEl) mCashEl.textContent = '₹' + (metrics.totalCollectedCash || 0).toLocaleString('en-IN');
            
            const mGpayEl = document.getElementById('stat-summary-collected-gpay');
            if (mGpayEl) mGpayEl.textContent = '₹' + (metrics.totalCollectedGpay || 0).toLocaleString('en-IN');

            document.getElementById('stat-total-pending').textContent = '₹' + metrics.totalPending.toLocaleString('en-IN');
            
            const searchVal = document.getElementById('dashboard-member-search')?.value.toLowerCase().trim() || '';
            renderDashboardMembersList(searchVal);
        });
    }

    // Bind search field logic
    const searchInput = document.getElementById('dashboard-member-search');
    if (searchInput) {
        // Remove old listeners by cloning
        const newSearch = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearch, searchInput);
        newSearch.addEventListener('input', () => {
            renderDashboardMembersList(newSearch.value.toLowerCase().trim());
        });
    }

    // Modal life cycles for Groups view
    const toggleToGroupsBtn = document.getElementById('btn-toggle-to-groups');
    const groupsModal = document.getElementById('groups-list-modal-backdrop');
    const closeGroupsModalBtn = document.getElementById('btn-close-groups-modal');

    if (toggleToGroupsBtn && groupsModal) {
        toggleToGroupsBtn.onclick = () => {
            renderDashboardGroupsList();
            groupsModal.classList.add('active');
        };
    }
    if (closeGroupsModalBtn && groupsModal) {
        closeGroupsModalBtn.onclick = () => {
            groupsModal.classList.remove('active');
        };
    }

    // Bind dashboard filter pills
    const dashboardPills = document.querySelectorAll('#dashboard-filter-pills .filter-pill');
    dashboardPills.forEach(pill => {
        const newPill = pill.cloneNode(true);
        pill.parentNode.replaceChild(newPill, pill);
        
        if (newPill.getAttribute('data-dashfilter') === State.dashboardFilter) {
            newPill.classList.add('active');
        } else {
            newPill.classList.remove('active');
        }

        newPill.addEventListener('click', () => {
            document.querySelectorAll('#dashboard-filter-pills .filter-pill').forEach(p => p.classList.remove('active'));
            newPill.classList.add('active');
            State.dashboardFilter = newPill.getAttribute('data-dashfilter');
            const searchVal = document.getElementById('dashboard-member-search')?.value.toLowerCase().trim() || '';
            renderDashboardMembersList(searchVal);
        });
    });

    // Render primary tables
    const searchVal = document.getElementById('dashboard-member-search')?.value.toLowerCase().trim() || '';
    renderDashboardMembersList(searchVal);
}

function renderDashboardGroupsList() {
    const container = document.getElementById('group-list-container');
    container.innerHTML = '';
    
    const countBadge = document.getElementById('modal-total-groups-count');
    if (countBadge) {
        countBadge.textContent = State.groups.length;
    }
    
    if (State.groups.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 20px;">
                <h3>No Chit Groups Yet</h3>
                <p>Click "+" below to create your first savings group.</p>
            </div>
        `;
        return;
    }
    
    // Sort groups by creation date (newest first)
    const sortedGroups = [...State.groups].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    sortedGroups.forEach(group => {
        const metrics = getGroupMetrics(group.id);
        const card = document.createElement('div');
        card.className = 'group-card';
        card.setAttribute('data-id', group.id);
        
        const progressPercentage = metrics.totalMembers > 0 
            ? Math.round((metrics.paidMembersForCurrentMonth / metrics.totalMembers) * 100)
            : 0;
            
        const currentInstallment = group.installments && group.installments[group.currentMonth] !== undefined
            ? group.installments[group.currentMonth]
            : group.monthlyInstallment;

        card.innerHTML = `
            <div class="group-card-header">
                <div class="group-card-title">${group.name}</div>
                <div class="group-card-amount">₹${currentInstallment.toLocaleString('en-IN', { maximumFractionDigits: 2 })}/mo</div>
            </div>
            <div class="group-card-info">
                <div class="info-item">
                    <i data-lucide="users"></i>
                    <span>${metrics.totalMembers} Members</span>
                </div>
                <div class="info-item">
                    <i data-lucide="calendar"></i>
                    <span>${group.duration} Months</span>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            State.selectedGroupId = group.id;
            document.getElementById('groups-list-modal-backdrop').classList.remove('active');
            switchView('screen-group-details');
        });
        
        container.appendChild(card);
    });
    lucide.createIcons();
}

function renderDashboardMembersList(searchQuery = '') {
    const listContainer = document.getElementById('dashboard-members-container');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const selMonth = State.dashboardSelectedMonth || 'current';
    const isAccumulated = selMonth === 'accumulated';
    const { year: targetYear, month: targetMonth } = getTargetCalendarYearMonth(selMonth);

    // Collect all members from all groups (e.g. if deviation in multiple groups, show double items)
    const allList = [];
    State.groups.forEach(group => {
        const groupMembers = State.members.filter(m => m.groupId === group.id);
        const relativeMonthNum = getRelativeMonthForGroup(group, targetYear, targetMonth);
        
        groupMembers.forEach(member => {
            let dueMonthsCount = 0;
            let dueAmount = 0;
            let paidAmount = 0;
            let currentMonthPaid = false;
            let displayPaidDate = '--';
            let isApplicable = true;
            let isFuture = false;

            if (isAccumulated) {
                // Accumulative up to currentMonth
                for (let m = 1; m <= group.duration; m++) {
                    if (m <= group.currentMonth) {
                        const payment = member.payments[m];
                        const instVal = group.installments && group.installments[m] !== undefined 
                            ? group.installments[m] 
                            : group.monthlyInstallment;
                        
                        if (payment) {
                            if (payment.paid) {
                                paidAmount += instVal;
                            } else {
                                const partial = payment.partialPaid || 0;
                                paidAmount += partial;
                                dueAmount += (instVal - partial);
                                dueMonthsCount++;
                            }
                        }
                    }
                }
                currentMonthPaid = member.payments[group.currentMonth] && member.payments[group.currentMonth].paid;
                
                const startMonth = group.startMonth !== undefined ? parseInt(group.startMonth) : new Date(group.createdAt).getMonth();
                const startYear = group.startYear !== undefined ? parseInt(group.startYear) : new Date(group.createdAt).getFullYear();
                const dateObj = new Date(startYear, startMonth + group.currentMonth - 1, 1);
                const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                const yyyy = dateObj.getFullYear();
                
                const paymentObj = member.payments[group.currentMonth];
                const customDateDay = paymentObj && paymentObj.customDate ? String(paymentObj.customDate).padStart(2, '0') : '';
                const partialPaid = paymentObj ? (paymentObj.partialPaid || 0) : 0;
                if (currentMonthPaid) {
                    displayPaidDate = customDateDay ? `${customDateDay}/${mm}/${yyyy}` : `Checked`;
                } else if (partialPaid > 0) {
                    displayPaidDate = customDateDay ? `${customDateDay}/${mm}/${yyyy}` : String(new Date().getDate()).padStart(2, '0') + `/${mm}/${yyyy}`;
                } else {
                    displayPaidDate = '--';
                }
            } else {
                // Calendar-month specific view (e.g. June 2026)
                if (relativeMonthNum < 1 || relativeMonthNum > group.duration) {
                    isApplicable = false;
                } else {
                    isFuture = relativeMonthNum > group.currentMonth;
                    const payment = member.payments[relativeMonthNum];
                    const instVal = group.installments && group.installments[relativeMonthNum] !== undefined 
                        ? group.installments[relativeMonthNum] 
                        : group.monthlyInstallment;
                    
                    if (payment) {
                        currentMonthPaid = payment.paid;
                        if (payment.paid) {
                            paidAmount = instVal;
                            dueAmount = 0;
                            dueMonthsCount = 0;
                        } else {
                            const partial = payment.partialPaid || 0;
                            paidAmount = partial;
                            dueAmount = instVal - partial;
                            dueMonthsCount = 1;
                        }
                    } else {
                        dueAmount = instVal;
                        paidAmount = 0;
                        dueMonthsCount = 1;
                        currentMonthPaid = false;
                    }

                    const startMonth = group.startMonth !== undefined ? parseInt(group.startMonth) : new Date(group.createdAt).getMonth();
                    const startYear = group.startYear !== undefined ? parseInt(group.startYear) : new Date(group.createdAt).getFullYear();
                    const dateObj = new Date(startYear, startMonth + relativeMonthNum - 1, 1);
                    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const yyyy = dateObj.getFullYear();
                    
                    const customDateDay = payment && payment.customDate ? String(payment.customDate).padStart(2, '0') : '';
                    const partialPaid = payment ? (payment.partialPaid || 0) : 0;
                    if (currentMonthPaid) {
                        displayPaidDate = customDateDay ? `${customDateDay}/${mm}/${yyyy}` : `Checked`;
                    } else if (partialPaid > 0) {
                        displayPaidDate = customDateDay ? `${customDateDay}/${mm}/${yyyy}` : String(new Date().getDate()).padStart(2, '0') + `/${mm}/${yyyy}`;
                    } else {
                        displayPaidDate = '--';
                    }
                }
            }

            let hasTakenPayout = false;
            let payoutVal = 0;
            let payoutMethod = null;
            let payoutDate = null;
            if (member.payments) {
                for (let m = 1; m <= group.duration; m++) {
                    if (member.payments[m] && member.payments[m].payoutClaimed) {
                        hasTakenPayout = true;
                        payoutVal = group.payouts && group.payouts[m] !== undefined ? group.payouts[m] : group.chitAmount;
                        payoutMethod = member.payments[m].payoutMethod;
                        payoutDate = member.payments[m].payoutDate;
                        break;
                    }
                }
            }

            let paymentMethodThisMonth = null;
            if (isAccumulated) {
                const paymentObj = member.payments[group.currentMonth];
                paymentMethodThisMonth = paymentObj && paymentObj.paid ? paymentObj.method : null;
            } else {
                const payment = member.payments[relativeMonthNum];
                paymentMethodThisMonth = payment && payment.paid ? payment.method : null;
            }

            allList.push({
                member,
                group,
                dueMonthsCount,
                dueAmount,
                paidAmount,
                currentMonthPaid,
                displayPaidDate,
                isApplicable,
                isFuture,
                relativeMonthNum,
                hasTakenPayout,
                payoutVal,
                payoutMethod,
                payoutDate,
                paymentMethodThisMonth
            });
        });
    });

    // Filter by search query
    let filteredList = allList;
    if (searchQuery) {
        filteredList = allList.filter(item => item.member.name.toLowerCase().includes(searchQuery));
    }

    // Only exclude members where the selected month is outside the group's range (isApplicable = false)
    // Keep isFuture items — they are valid months not yet tracked, and the user wants to see & mark them
    filteredList = filteredList.filter(item => item.isApplicable);

    // Compute status filter counts (excluding future items)
    let countAll = filteredList.length;
    let countPaid = 0;
    let countPartial = 0;
    let countPending = 0;
    let countChitTaken = 0;
    let amountChitTaken = 0;
    let countNewCustomerMonth = 0;
    let countNewCustomer = 0;
    let countGpay = 0;
    let countCash = 0;

    filteredList.forEach(item => {
        if (item.currentMonthPaid) {
            countPaid++;
        } else if (item.paidAmount > 0) {
            countPartial++;
        } else {
            countPending++;
        }
        
        if (item.hasTakenPayout) {
            countChitTaken++;
            amountChitTaken += item.payoutVal;
        }

        if (item.member.customerType === 'New') {
            countNewCustomer++;
            if (item.relativeMonthNum === 1) countNewCustomerMonth++;
        }
        
        if (item.paymentMethodThisMonth === 'gpay') {
            countGpay++;
        } else if (item.paymentMethodThisMonth === 'cash') {
            countCash++;
        }
    });

    // Update pill badges
    const dashCountAll = document.getElementById('dash-count-all');
    const dashCountPaid = document.getElementById('dash-count-paid');
    const dashCountPartial = document.getElementById('dash-count-partial');
    const dashCountPending = document.getElementById('dash-count-pending');
    const dashCountChitTaken = document.getElementById('dash-count-chit-taken');
    const dashCountNewCustomerMonth = document.getElementById('dash-count-new-customer-month');
    const dashCountNewCustomer = document.getElementById('dash-count-new-customer');
    const dashCountGpay = document.getElementById('dash-count-gpay');
    const dashCountCash = document.getElementById('dash-count-cash');
    
    if (dashCountAll) dashCountAll.textContent = countAll;
    if (dashCountPaid) dashCountPaid.textContent = countPaid;
    if (dashCountPartial) dashCountPartial.textContent = countPartial;
    if (dashCountPending) dashCountPending.textContent = countPending;
    if (dashCountChitTaken) dashCountChitTaken.textContent = countChitTaken;
    if (dashCountNewCustomerMonth) dashCountNewCustomerMonth.textContent = countNewCustomerMonth;
    if (dashCountNewCustomer) dashCountNewCustomer.textContent = countNewCustomer;
    if (dashCountGpay) dashCountGpay.textContent = countGpay;
    if (dashCountCash) dashCountCash.textContent = countCash;
    
    // Update dashboard summary box for Chit Taken
    const statSummaryChitTakenAmount = document.getElementById('stat-summary-chit-taken-amount');
    const statSummaryChitTakenCount = document.getElementById('stat-summary-chit-taken-count');
    if (statSummaryChitTakenAmount) {
        statSummaryChitTakenAmount.textContent = `₹${amountChitTaken.toLocaleString('en-IN')}`;
    }
    if (statSummaryChitTakenCount) {
        statSummaryChitTakenCount.textContent = `(${countChitTaken})`;
    }

    const statSummaryCollectedCount = document.getElementById('stat-summary-collected-count');
    if (statSummaryCollectedCount) {
        statSummaryCollectedCount.textContent = `(${countPaid})`;
    }

    const statSummaryPendingCount = document.getElementById('stat-summary-pending-count');
    if (statSummaryPendingCount) {
        statSummaryPendingCount.textContent = `(${countPending})`;
    }

    // Update Target Collection
    let totalExpectedAmount = 0;
    allList.filter(item => item.isApplicable).forEach(item => {
        totalExpectedAmount += (item.dueAmount + item.paidAmount);
    });
    const statTargetCollection = document.getElementById('dashboard-target-collection-text');
    if (statTargetCollection) {
        statTargetCollection.textContent = `Target: ₹${totalExpectedAmount.toLocaleString('en-IN')}`;
    }

    // Filter by dashboard filter status pill
    if (State.dashboardFilter && State.dashboardFilter !== 'all') {
        filteredList = filteredList.filter(item => {
            if (State.dashboardFilter === 'paid') {
                return item.currentMonthPaid;
            } else if (State.dashboardFilter === 'partial') {
                return item.paidAmount > 0 && !item.currentMonthPaid;
            } else if (State.dashboardFilter === 'pending') {
                return !item.currentMonthPaid && item.paidAmount === 0;
            } else if (State.dashboardFilter === 'chit_taken') {
                return item.hasTakenPayout;
            } else if (State.dashboardFilter === 'new_customer_month') {
                return item.member.customerType === 'New' && item.relativeMonthNum === 1;
            } else if (State.dashboardFilter === 'new_customer') {
                return item.member.customerType === 'New';
            } else if (State.dashboardFilter === 'gpay') {
                return item.paymentMethodThisMonth === 'gpay';
            } else if (State.dashboardFilter === 'cash') {
                return item.paymentMethodThisMonth === 'cash';
            }
            return true;
        });
    }

    // Sort alphabetically by member name
    filteredList.sort((a, b) => a.member.name.localeCompare(b.member.name));

    // Update Badge Counter
    document.getElementById('member-total-badge').textContent = `${filteredList.length} Members`;

    if (filteredList.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state-small" style="padding: 20px; text-align: center;">
                <p>No members found matching your database.</p>
            </div>
        `;
        return;
    }

    filteredList.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'dashboard-member-row';
        row.style.cursor = item.isApplicable ? 'pointer' : 'default';
        row.style.backgroundColor = item.currentMonthPaid ? 'rgba(48, 209, 88, 0.03)' : 'transparent';
        
        let monthNoText = item.relativeMonthNum;
        let dueAmountText = `₹${item.dueAmount.toLocaleString('en-IN')}`;
        let paidAmountText = `₹${item.paidAmount.toLocaleString('en-IN')}`;
        let paidDateText = item.displayPaidDate;
        let checkboxHtml = '';

        if (!item.isApplicable) {
            monthNoText = '--';
            dueAmountText = 'N/A';
            paidAmountText = 'N/A';
            paidDateText = 'N/A';
            checkboxHtml = `<span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">N/A</span>`;
        } else {
            // isFuture rows are treated same as DUE — user wants to see & mark them
            if (item.currentMonthPaid) {
                checkboxHtml = `<span class="status-badge-pill paid"><i data-lucide="check" style="width: 10px; height: 10px;"></i> Paid</span>`;
            } else if (item.paidAmount > 0) {
                checkboxHtml = `<span class="status-badge-pill partial"><i data-lucide="trending-up" style="width: 10px; height: 10px;"></i> Partial</span>`;
            } else {
                checkboxHtml = `<span class="status-badge-pill pending"><i data-lucide="alert-circle" style="width: 10px; height: 10px;"></i> Due</span>`;
            }
        }

        let reminderBtnHtml = '';
        if (item.isApplicable && item.dueAmount > 0) {
            reminderBtnHtml = `
                <button class="whatsapp-reminder-btn" title="Send WhatsApp Reminder" style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background-color: rgba(37, 211, 102, 0.12); border: 1px solid rgba(37, 211, 102, 0.25); color: #25d366; cursor: pointer; outline: none;">
                    <i data-lucide="send" style="width: 11px; height: 11px;"></i>
                </button>
            `;
        }

        let methodLetterHtml = '';
        if (item.payoutMethod === 'cash') {
            methodLetterHtml = ` <span style="color: var(--green-dark); font-weight: 800;">/ C</span>`;
        } else if (item.payoutMethod === 'gpay') {
            methodLetterHtml = ` <span style="color: #4285F4; font-weight: 800;">/ G</span>`;
        }

        let dateStr = '';
        if (item.payoutDate) {
            const parts = item.payoutDate.split('-');
            if (parts.length === 3) {
                dateStr = ` <span style="font-size: 0.65rem; opacity: 0.8; font-weight: 800; margin-left: 2px;">(${parts[2]}/${parts[1]})</span>`;
            }
        }

        let chitTakenHtml = item.hasTakenPayout ? `<span class="status-badge-pill" style="background-color: rgba(147, 51, 234, 0.12); color: #9333ea; border: 1px solid rgba(147, 51, 234, 0.3);"><i data-lucide="check-circle" style="width: 10px; height: 10px;"></i> ₹${item.payoutVal.toLocaleString('en-IN')}${methodLetterHtml}${dateStr}</span>` : `<span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">--</span>`;

        let schemeAmountStr = '';
        let amount = item.group.chitAmount;
        if (amount >= 100000) {
            let lakhs = amount / 100000;
            schemeAmountStr = (lakhs % 1 === 0 ? lakhs : lakhs.toFixed(1)) + ' Lakh';
        } else if (amount >= 1000) {
            let k = amount / 1000;
            schemeAmountStr = (k % 1 === 0 ? k : k.toFixed(1)) + 'K';
        } else {
            schemeAmountStr = amount.toString();
        }
        const schemeText = `${schemeAmountStr} / ${item.group.duration}M`;

        let newCustomerBadgeHtml = '';
        if (item.member.customerType === 'New') {
            newCustomerBadgeHtml = `<span style="background-color: var(--primary); color: #fff; font-size: 0.55rem; padding: 2px 4px; border-radius: 4px; vertical-align: middle; margin-left: 6px; font-weight: 800;">NEW</span>`;
        }

        row.innerHTML = `
            <span style="font-weight: 700; color: var(--text-secondary); font-size: 0.8rem; text-align: center;">${index + 1}</span>
            <span class="member-name" style="font-weight: 800; font-size: 0.95rem; color: var(--text-main); text-align: left; text-transform: uppercase; padding-left: 8px;">${item.member.name}${newCustomerBadgeHtml}</span>
            <span style="font-size: 0.8rem; color: var(--text-secondary); text-align: left;">${item.group.name}</span>
            <span style="text-align: center;"><span class="status-badge-pill" style="background-color: var(--bg-surface-elevated); border: 1px solid var(--border); color: var(--text-main); text-transform: none; font-size: 0.72rem;">${schemeText}</span></span>
            <span style="font-size: 1.05rem; font-weight: 800; color: var(--primary); text-align: center;">${monthNoText}</span>
            <span style="font-size: 1.05rem; font-weight: 800; color: ${item.dueAmount > 0 ? 'var(--red-dark)' : 'var(--green-dark)'}; text-align: left;">${dueAmountText}</span>
            <span style="font-size: 1.05rem; font-weight: 800; color: ${item.paidAmount > 0 ? 'var(--green-dark)' : 'var(--text-muted)'}; text-align: left;">${paidAmountText}</span>
            <span style="font-size: 0.75rem; font-weight: 800; color: ${item.currentMonthPaid ? 'var(--green-dark)' : (item.displayPaidDate !== '--' ? '#f59e0b' : 'var(--text-muted)')}; text-align: left;">${paidDateText}</span>
            <div style="display: flex; justify-content: center; align-items: center;">
                ${checkboxHtml}
            </div>
            <div style="display: flex; justify-content: center; align-items: center;">
                ${chitTakenHtml}
            </div>
            <div style="display: flex; justify-content: center; align-items: center;">
                ${reminderBtnHtml || '<span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">--</span>'}
            </div>
        `;

        if (item.isApplicable) {
            const chk = row.querySelector('.status-badge-pill.paid, .status-badge-pill.partial, .status-badge-pill.pending');
            if (chk) {
                chk.addEventListener('click', (e) => {
                    e.stopPropagation();
                    State.selectedGroupId = item.group.id;
                    openPaymentModal(item.member.id, 'single_month', item.relativeMonthNum);
                });
            }

            const waBtn = row.querySelector('.whatsapp-reminder-btn');
            if (waBtn) {
                waBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    sendWhatsAppReminder(item.member.id);
                });
            }

            const nameEl = row.querySelector('.member-name');
            if (nameEl) {
                nameEl.style.cursor = 'pointer';
                nameEl.style.textDecoration = 'underline';
                nameEl.style.textDecorationColor = 'transparent';
                nameEl.style.transition = 'text-decoration-color 0.2s ease, color 0.2s ease';
                nameEl.addEventListener('mouseenter', () => {
                    nameEl.style.textDecorationColor = 'var(--primary)';
                    nameEl.style.color = 'var(--primary)';
                });
                nameEl.addEventListener('mouseleave', () => {
                    nameEl.style.textDecorationColor = 'transparent';
                    nameEl.style.color = 'var(--text-main)';
                });
                nameEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    State.selectedGroupId = item.group.id;
                    openPaymentModal(item.member.id);
                });
            }
        }

        listContainer.appendChild(row);
    });
    lucide.createIcons();
}

// Render members list during group creation (Transient)
function renderTempMembersList() {
    const listContainer = document.getElementById('added-members-list');
    const countIndicator = document.getElementById('member-count-indicator');
    
    listContainer.innerHTML = '';
    
    if (State.tempMemberList.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state-small" style="width: 100%">
                <p>No members added yet. Type a name above to start building the list.</p>
            </div>
        `;
        countIndicator.textContent = '0 Members';
        return;
    }
    
    countIndicator.textContent = `${State.tempMemberList.length} Members`;
    
    State.tempMemberList.forEach((memberData, index) => {
        const pill = document.createElement('div');
        pill.className = 'member-pill';
        
        let extraInfo = '';
        if (memberData.mobileNo || memberData.place) {
            const parts = [];
            if (memberData.mobileNo) parts.push(memberData.mobileNo);
            if (memberData.place) parts.push(memberData.place);
            extraInfo = ` (${parts.join(' - ')})`;
        }
        
        let newBadgeHtml = '';
        if (memberData.customerType === 'New') {
            newBadgeHtml = `<span style="background-color: var(--primary); color: #fff; font-size: 0.55rem; padding: 2px 4px; border-radius: 4px; vertical-align: middle; margin-left: 6px; font-weight: 800;">NEW</span>`;
        }

        pill.innerHTML = `
            <span><strong>${memberData.name}</strong>${newBadgeHtml}${extraInfo}</span>
            <button class="member-pill-delete" data-index="${index}">
                <i data-lucide="x"></i>
            </button>
        `;
        
        pill.querySelector('.member-pill-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            State.tempMemberList.splice(index, 1);
            renderTempMembersList();
        });
        
        listContainer.appendChild(pill);
    });
    
    lucide.createIcons();
}

// 2. Group Details Renderer
function renderGroupDetails(groupId) {
    const group = State.groups.find(g => g.id === groupId);
    if (!group) {
        switchView('screen-dashboard');
        return;
    }
    
    const activeInstallment = group.installments && group.installments[group.currentMonth] !== undefined
        ? group.installments[group.currentMonth]
        : group.monthlyInstallment;
        
    const activePayout = group.payouts && group.payouts[group.currentMonth] !== undefined
        ? group.payouts[group.currentMonth]
        : group.chitAmount;

    // Update Hero elements
    document.getElementById('details-group-name').textContent = group.name;
    // Show monthly installment as the primary amount
    const chitValueEl = document.getElementById('details-chit-value');
    if (chitValueEl) {
        chitValueEl.textContent = '₹' + activeInstallment.toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' / mo';
    }
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const startMonth = group.startMonth !== undefined ? parseInt(group.startMonth) : new Date(group.createdAt).getMonth();
    const startYear = group.startYear !== undefined ? parseInt(group.startYear) : new Date(group.createdAt).getFullYear();
    const startDate = new Date(startYear, startMonth, 1);
    const endDate = new Date(startYear, startMonth + group.duration - 1, 1);
    const dateRangeStr = `(${monthNames[startDate.getMonth()]} ${startDate.getFullYear()} - ${monthNames[endDate.getMonth()]} ${endDate.getFullYear()})`;
    
    document.getElementById('details-duration').textContent = `${group.duration} Months ${dateRangeStr}`;
    document.getElementById('details-installment-value').textContent = '₹' + group.chitAmount.toLocaleString('en-IN');
    
    const activeMonthName = getMonthLabel(group, group.currentMonth);
    document.getElementById('details-current-month-text').textContent = `Month ${group.currentMonth} (${activeMonthName})`;
    document.getElementById('progress-current-month').textContent = `${group.currentMonth} (${activeMonthName})`;
    
    // Set current month payout
    const payoutEl = document.getElementById('details-month-payout');
    if (payoutEl) {
        payoutEl.textContent = '₹' + activePayout.toLocaleString('en-IN');
    }
    
    // Recalculate metrics
    const metrics = getGroupMetrics(groupId);
    
    document.getElementById('details-total-collected').textContent = '₹' + metrics.totalCollected.toLocaleString('en-IN');
    document.getElementById('details-total-pending').textContent = '₹' + metrics.totalPending.toLocaleString('en-IN');
    
    // Current cycle progress bar
    const progressPercentage = metrics.totalMembers > 0 
        ? Math.round((metrics.paidMembersForCurrentMonth / metrics.totalMembers) * 100)
        : 0;
    
    document.getElementById('details-progress-bar').style.width = progressPercentage + '%';
    document.getElementById('progress-percentage-text').textContent = progressPercentage + '%';
    
    const collectedCycleAmount = metrics.paidMembersForCurrentMonth * activeInstallment;
    const expectedCycleAmount = metrics.totalMembers * activeInstallment;
    document.getElementById('progress-amount-desc').textContent = 
        `₹${collectedCycleAmount.toLocaleString('en-IN')} of ₹${expectedCycleAmount.toLocaleString('en-IN')} collected for active cycle`;
        
    // Reset filters and search inputs
    // (We do not reset search on every active billing month update so user can keep editing)
    
    filterAndRenderMembers();
}

// Dynamic Filter & Render of Member Cards inside Group Details
function filterAndRenderMembers() {
    const groupId = State.selectedGroupId;
    const group = State.groups.find(g => g.id === groupId);
    if (!group) return;
    
    const searchVal = document.getElementById('member-search-input').value.toLowerCase().trim();
    const activeFilter = document.querySelector('.filter-pill.active').getAttribute('data-filter');
    
    const container = document.getElementById('details-members-grid');
    container.innerHTML = '';
    
    // Fetch group members
    const groupMembers = State.members.filter(m => m.groupId === groupId);
    
    // Sort members alphabetically
    groupMembers.sort((a, b) => a.name.localeCompare(b.name));
    
    let filteredMembers = groupMembers.filter(member => {
        // Search filter
        const matchesSearch = member.name.toLowerCase().includes(searchVal);
        
        // Status filter (based on currentMonth payment status)
        const isPaidThisMonth = member.payments[group.currentMonth] && member.payments[group.currentMonth].paid;
        
        let matchesFilter = true;
        if (activeFilter === 'paid') {
            matchesFilter = isPaidThisMonth;
        } else if (activeFilter === 'pending') {
            matchesFilter = !isPaidThisMonth;
        }
        
        return matchesSearch && matchesFilter;
    });
    
    // Update badge filter counters
    let allCount = groupMembers.length;
    let paidCount = groupMembers.filter(m => m.payments[group.currentMonth] && m.payments[group.currentMonth].paid).length;
    let pendingCount = allCount - paidCount;
    
    document.getElementById('count-filter-all').textContent = allCount;
    document.getElementById('count-filter-paid').textContent = paidCount;
    document.getElementById('count-filter-pending').textContent = pendingCount;
    
    if (filteredMembers.length === 0) {
        container.innerHTML = `
            <div class="empty-state-small">
                <p>No members match the search / filter rules.</p>
            </div>
        `;
        return;
    }
    
    // Sort filtered members alphabetically (already sorted above, but sorting again to ensure alphabetical index is computed correctly on filtered list)
    filteredMembers.sort((a, b) => a.name.localeCompare(b.name));

    filteredMembers.forEach((member, index) => {
        // Calculate paid months vs remaining
        let paidMonthsCount = 0;
        for (let m = 1; m <= group.duration; m++) {
            if (member.payments[m] && member.payments[m].paid) {
                paidMonthsCount++;
            }
        }
        const remainingMonths = group.duration - paidMonthsCount;
        
        // Check active month payment status
        const currentMonthPaid = member.payments[group.currentMonth] && member.payments[group.currentMonth].paid;
        
        let reminderBtnHtml = '';
        if (!currentMonthPaid) {
            reminderBtnHtml = `
                <button class="whatsapp-reminder-btn" title="Send WhatsApp Reminder" style="display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background-color: rgba(37, 211, 102, 0.12); border: 1px solid rgba(37, 211, 102, 0.25); color: #25d366; cursor: pointer; outline: none;">
                    <i data-lucide="send" style="width: 12px; height: 12px;"></i>
                </button>
            `;
        }

        const card = document.createElement('div');
        card.className = 'member-card';
        card.style.display = 'flex';
        card.style.alignItems = 'center';
        card.style.justifyContent = 'space-between';
        card.style.width = '100%';
        card.style.padding = '12px 16px';
        card.style.marginBottom = '8px';
        
        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <span style="font-weight: 700; color: var(--text-secondary); font-size: 0.9rem; min-width: 24px;">${index + 1}.</span>
                <div class="member-card-details" style="display: flex; flex-direction: column; gap: 2px;">
                    <span class="member-name" style="font-weight: 600; font-size: 0.95rem; color: var(--text-main);">${member.name}</span>
                    <div class="member-stats" style="display: flex; gap: 8px; font-size: 0.72rem;">
                        <span class="member-stats-paid" style="color: var(--primary); font-weight: 600;">${paidMonthsCount} Paid</span>
                        <span class="member-stats-pending" style="color: var(--text-muted);">${remainingMonths} Left</span>
                    </div>
                </div>
            </div>
            
            <div class="member-card-right" style="display: flex; align-items: center; gap: 8px;">
                ${reminderBtnHtml}
                <div class="member-card-status-badge ${currentMonthPaid ? 'paid' : 'pending'}" style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background-color: ${currentMonthPaid ? 'var(--green-light)' : 'var(--red-light)'}; color: ${currentMonthPaid ? 'var(--green-dark)' : 'var(--red-dark)'};" title="${currentMonthPaid ? 'Paid this month' : 'Pending this month'}">
                    <i data-lucide="${currentMonthPaid ? 'check' : 'alert-circle'}" style="width: 14px; height: 14px;"></i>
                </div>
                <span class="member-status-pill active" style="font-size: 0.65rem;">Active</span>
            </div>
        `;
        
        // Card click opens payment modal
        card.addEventListener('click', () => {
            openPaymentModal(member.id);
        });

        const waBtn = card.querySelector('.whatsapp-reminder-btn');
        if (waBtn) {
            waBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                sendWhatsAppReminder(member.id);
            });
        }
        
        container.appendChild(card);
    });
    
    lucide.createIcons();
}

// 3. Payment Checklist Modal Renderer
function openPaymentModal(memberId, filterMode = 'all', targetMonthNum = null) {
    State.paymentModalFilterMode = filterMode;
    State.paymentModalTargetMonth = targetMonthNum;
    const member = State.members.find(m => m.id === memberId);
    if (!member) return;
    
    const group = State.groups.find(g => g.id === member.groupId);
    if (!group) return;
    
    State.selectedMemberId = memberId;
    
    // Fill text labels
    document.getElementById('payment-modal-group-name').textContent = group.name;
    document.getElementById('payment-modal-member-name').textContent = member.name;
    
    // Fill member profile details
    document.getElementById('modal-detail-work').textContent = member.placeOfWork || '--';
    document.getElementById('modal-detail-occupation').textContent = member.occupation || '--';
    document.getElementById('modal-detail-place').textContent = member.place || '--';
    
    const mobileEl = document.getElementById('modal-detail-mobile');
    if (mobileEl) {
        mobileEl.textContent = member.mobileNo || '--';
    }
    
    const typeEl = document.getElementById('modal-detail-type');
    if (typeEl) {
        typeEl.textContent = member.customerType || 'New';
    }
    
    const refEl = document.getElementById('modal-detail-referred');
    if (refEl) {
        refEl.textContent = member.referredBy || '--';
    }
    
    document.getElementById('modal-detail-address').textContent = member.address || '--';

    // Show Modal
    const backdrop = document.getElementById('payment-modal-backdrop');
    backdrop.classList.add('active');
    
    // Reset edit state to show profile card and hide edit form
    const editForm = document.getElementById('payment-modal-member-profile-edit');
    const profileCard = document.getElementById('payment-modal-member-profile-card');
    if (editForm) editForm.classList.add('hidden');
    if (profileCard) profileCard.classList.remove('hidden');
    
    // Default wrapper to collapsed
    const wrapper = document.getElementById('profile-details-collapsible');
    const icon = document.getElementById('profile-toggle-icon');
    if (wrapper) wrapper.classList.remove('expanded');
    if (icon) icon.classList.remove('rotated');
    
    renderChecklist(member, group);
}

// --- Payment Method Selection Logic ---
let pendingPaymentMethodSelection = null; // Store {memberId, monthNum}

function openPaymentMethodModal(memberId, monthNum) {
    pendingPaymentMethodSelection = { memberId, monthNum };
    
    const backdrop = document.getElementById('payment-method-modal-backdrop');
    const noteSection = document.getElementById('gpay-note-section');
    const noteInput = document.getElementById('gpay-note-input');
    
    // Reset UI state
    noteSection.style.display = 'none';
    noteInput.value = '';
    
    // Remove active styling from buttons
    document.getElementById('btn-select-cash').style.backgroundColor = 'transparent';
    document.getElementById('btn-select-cash').style.color = 'var(--green-dark)';
    document.getElementById('btn-select-gpay').style.backgroundColor = 'transparent';
    document.getElementById('btn-select-gpay').style.color = '#4285F4';
    
    // Set up one-time click listeners for the modal options
    const cashBtn = document.getElementById('btn-select-cash');
    const gpayBtn = document.getElementById('btn-select-gpay');
    const confirmBtn = document.getElementById('btn-confirm-gpay');
    const closeBtn = document.getElementById('btn-close-method-modal');
    
    // Cleanup old listeners to prevent duplicates
    const newCashBtn = cashBtn.cloneNode(true);
    cashBtn.parentNode.replaceChild(newCashBtn, cashBtn);
    
    const newGpayBtn = gpayBtn.cloneNode(true);
    gpayBtn.parentNode.replaceChild(newGpayBtn, gpayBtn);
    
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

    // Attach new listeners
    newCashBtn.addEventListener('click', () => {
        // Immediate confirm for cash
        confirmPayment(memberId, monthNum, 'cash', '');
        backdrop.classList.remove('active');
    });

    newGpayBtn.addEventListener('click', () => {
        // Show note input section
        noteSection.style.display = 'flex';
        newGpayBtn.style.backgroundColor = 'rgba(66, 133, 244, 0.1)';
        noteInput.focus();
    });
    
    newConfirmBtn.addEventListener('click', () => {
        const noteVal = noteInput.value.trim();
        confirmPayment(memberId, monthNum, 'gpay', noteVal);
        backdrop.classList.remove('active');
    });
    
    newCloseBtn.addEventListener('click', () => {
        backdrop.classList.remove('active');
        pendingPaymentMethodSelection = null;
    });
    
    backdrop.classList.add('active');
}

function confirmPayment(memberId, monthNum, method, note) {
    const member = State.members.find(m => m.id === memberId);
    if (!member) return;
    
    const group = State.groups.find(g => g.id === member.groupId);
    if (!group) return;
    
    member.payments[monthNum].paid = true;
    member.payments[monthNum].partialPaid = null;
    member.payments[monthNum].paidAt = new Date().toISOString();
    if (!member.payments[monthNum].customDate) {
        member.payments[monthNum].customDate = String(new Date().getDate());
    }
    member.payments[monthNum].method = method; // 'cash' or 'gpay'
    member.payments[monthNum].note = note; // Custom note
    
    saveState();
    renderChecklist(member, group);
}

function renderChecklist(member, group) {
    const container = document.getElementById('modal-checklist-container');
    container.innerHTML = '';
    
    let paidCount = 0;
    let dueCount = 0;
    let pendingAmount = 0;
    
    for (let m = 1; m <= group.duration; m++) {
        const payment = member.payments[m] || { paid: false, paidAt: null, amount: group.monthlyInstallment, customDate: '', partialPaid: null };
        const isPaid = payment.paid;
        const isCurrentOrPast = m <= group.currentMonth;
        
        const instVal = group.installments && group.installments[m] !== undefined ? group.installments[m] : group.monthlyInstallment;
        const payoutVal = group.payouts && group.payouts[m] !== undefined ? group.payouts[m] : group.chitAmount;
        
        // Calculate partial paid values
        const enteredPartialVal = payment.partialPaid !== undefined && payment.partialPaid !== null ? payment.partialPaid : '';
        const currentPaid = isPaid ? instVal : (payment.partialPaid || 0);
        const currentDue = isPaid ? 0 : (instVal - currentPaid);

        if (isPaid) {
            paidCount++;
        } else if (isCurrentOrPast) {
            dueCount++;
            pendingAmount += currentDue;
        }
        
        const filterMode = State.paymentModalFilterMode || 'all';
        const targetMonthNum = State.paymentModalTargetMonth;
        
        if (filterMode === 'single_month' && targetMonthNum) {
            if (m !== targetMonthNum) continue;
        } else if (filterMode === 'due_only') {
            if (isPaid || !isCurrentOrPast) continue;
        }

        // Determine Month & Year of this installment
        const startMonth = group.startMonth !== undefined ? parseInt(group.startMonth) : new Date(group.createdAt).getMonth();
        const startYear = group.startYear !== undefined ? parseInt(group.startYear) : new Date(group.createdAt).getFullYear();
        const dateObj = new Date(startYear, startMonth + m - 1, 1);
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthYearStr = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
        
        let customDateVal = payment.customDate;
        if (!customDateVal && !payment.paid) {
            customDateVal = String(new Date().getDate());
        }
        
        // Generate calendar date options 1 to 31
        let dateOptions = `<option value="">--</option>`;
        for (let d = 1; d <= 31; d++) {
            const selected = String(d) === customDateVal ? 'selected' : '';
            dateOptions += `<option value="${d}" ${selected}>${d}</option>`;
        }

        const row = document.createElement('div');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '0.6fr 1.1fr 0.9fr 0.9fr 0.9fr 0.6fr';
        row.style.gap = '8px';
        row.style.padding = '8px 10px';
        row.style.borderBottom = '1px solid var(--border)';
        row.style.alignItems = 'center';
        row.style.textAlign = 'center';
        row.style.backgroundColor = isPaid ? 'rgba(48, 209, 88, 0.05)' : (payment.partialPaid > 0 ? 'rgba(212, 175, 55, 0.05)' : 'transparent');

        const methodTagHtml = isPaid && payment.method === 'gpay' 
            ? `<div style="font-size: 0.65rem; font-weight: 700; color: #4285F4; margin-top: 4px; text-transform: uppercase;">GPay${payment.note ? '<br><span style="color: var(--text-muted); font-size: 0.6rem; text-transform: none;">' + payment.note + '</span>' : ''}</div>`
            : (isPaid && payment.method === 'cash' ? `<div style="font-size: 0.65rem; font-weight: 700; color: var(--green-dark); margin-top: 4px; text-transform: uppercase;">Cash</div>` : '');

        const isClaimed = payment.payoutClaimed;
        
        let payoutMethodHtml = '';
        if (isClaimed && payment.payoutMethod) {
            if (payment.payoutMethod === 'gpay') {
                payoutMethodHtml = `<div style="font-size: 0.65rem; font-weight: 700; color: #4285F4; margin-top: 4px; text-transform: uppercase;">GPay${payment.payoutNote ? '<br><span style="color: var(--text-muted); font-size: 0.6rem; text-transform: none;">' + payment.payoutNote + '</span>' : ''}</div>`;
            } else if (payment.payoutMethod === 'cash') {
                payoutMethodHtml = `<div style="font-size: 0.65rem; font-weight: 700; color: var(--green-dark); margin-top: 4px; text-transform: uppercase;">Cash</div>`;
            }
        }

        let payoutDateHtml = '';
        if (isClaimed && member.payments[m] && member.payments[m].payoutDate) {
            const parts = member.payments[m].payoutDate.split('-');
            if (parts.length === 3) {
                payoutDateHtml = `<div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; margin-top: 2px;">${parts[2]}/${parts[1]}/${parts[0].slice(-2)}</div>`;
            }
        }

        const payoutHtml = isClaimed 
            ? `<div style="display: flex; flex-direction: column; align-items: center;"><div class="payout-claim-btn" data-month="${m}" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 0.75rem; font-weight: 700; color: var(--green-dark); background-color: rgba(48, 209, 88, 0.1); border-radius: var(--radius-sm); border: 1px solid rgba(48, 209, 88, 0.3); cursor: pointer; text-transform: uppercase;">
                 <i data-lucide="check-circle" style="width: 14px; height: 14px;"></i> Taken ₹${payoutVal.toLocaleString('en-IN')}
               </div>${payoutMethodHtml}${payoutDateHtml}</div>`
            : `<div class="payout-claim-btn" data-month="${m}" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 0.75rem; font-weight: 700; color: var(--primary); border: 1px dashed var(--primary); border-radius: var(--radius-sm); cursor: pointer; text-transform: uppercase;">
                 Claim ₹${payoutVal.toLocaleString('en-IN')}
               </div>`;

        row.innerHTML = `
            <span style="font-weight: 700; font-size: 0.8rem; color: var(--text-main);">${m}</span>
            <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                <select class="custom-payment-date-select" data-month="${m}" style="padding: 4px 6px; font-size: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background-color: var(--bg-surface); color: var(--text-main); text-align: center;">
                    ${dateOptions}
                </select>
                <span style="font-size: 0.7rem; color: var(--text-secondary); white-space: nowrap;">${monthYearStr}</span>
            </div>
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">₹${instVal.toLocaleString('en-IN')}</span>
            <input type="text" inputmode="numeric" class="custom-payment-partial-input amount-input" data-month="${m}" placeholder="0" value="${formatNumberIndian(enteredPartialVal)}" style="padding: 4px 6px; font-size: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background-color: var(--bg-surface); color: var(--text-main); width: 100%; text-align: center;" ${isPaid ? 'disabled' : ''}>
            ${payoutHtml}
            <div style="display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <div class="row-checkbox-wrapper ${isPaid ? 'paid' : ''}" style="width: 20px; height: 20px; border-radius: 40%; border: 2px solid ${isPaid ? 'var(--green-dark)' : 'var(--text-muted)'}; background-color: ${isPaid ? 'var(--green-dark)' : 'transparent'}; color: ${isPaid ? '#fff' : 'transparent'}; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: all var(--transition-fast);">
                    <i data-lucide="check" style="width: 12px; height: 12px; stroke-width: 4px;"></i>
                </div>
                ${methodTagHtml}
            </div>
        `;
        
        // Listen to Date changes
        const dateSelect = row.querySelector('.custom-payment-date-select');
        dateSelect.addEventListener('change', (e) => {
            member.payments[m].customDate = e.target.value;
            saveState();
        });

        // Listen to Partial amount input changes
        const partialInput = row.querySelector('.custom-payment-partial-input');
        partialInput.addEventListener('input', (e) => {
            const val = e.target.value !== '' ? parseFloat(e.target.value) : null;
            member.payments[m].partialPaid = val;
            saveState();
            
            // Live calculate summary box numbers
            let livePaidCount = 0;
            let liveDueCount = 0;
            let livePendingAmount = 0;
            for (let i = 1; i <= group.duration; i++) {
                const pay = member.payments[i] || { paid: false, amount: group.monthlyInstallment };
                const isP = pay.paid;
                const instValue = group.installments && group.installments[i] !== undefined ? group.installments[i] : group.monthlyInstallment;
                const partValue = pay.partialPaid || 0;
                
                if (isP) {
                    livePaidCount++;
                } else if (i <= group.currentMonth) {
                    liveDueCount++;
                    livePendingAmount += (instValue - partValue);
                }
            }
            document.getElementById('modal-paid-count').textContent = livePaidCount;
            document.getElementById('modal-pending-count').textContent = liveDueCount;
            document.getElementById('modal-payment-due-val').textContent = '₹' + livePendingAmount.toLocaleString('en-IN');
            
            const liveWaBtn = document.getElementById('btn-modal-whatsapp-reminder');
            if (livePendingAmount > 0) {
                document.getElementById('modal-payment-due-label').textContent = 'Outstanding Due';
                document.getElementById('modal-payment-due-val').className = 'outstanding-value text-red';
                if (liveWaBtn) {
                    liveWaBtn.classList.remove('hidden');
                    const clonedWaBtn = liveWaBtn.cloneNode(true);
                    liveWaBtn.parentNode.replaceChild(clonedWaBtn, liveWaBtn);
                    clonedWaBtn.addEventListener('click', () => {
                        sendWhatsAppReminder(member.id);
                    });
                }
            } else {
                document.getElementById('modal-payment-due-label').textContent = 'Clear of Dues';
                document.getElementById('modal-payment-due-val').className = 'outstanding-value text-green';
                if (liveWaBtn) {
                    liveWaBtn.classList.add('hidden');
                }
            }
        });
        
        // Listen to Checkbox toggle clicks
        const chk = row.querySelector('.row-checkbox-wrapper');
        chk.addEventListener('click', () => {
            toggleMonthlyPayment(member.id, m);
        });
        
        // Listen to Payout Claim toggle clicks
        const claimBtn = row.querySelector('.payout-claim-btn');
        if (claimBtn) {
            claimBtn.addEventListener('click', () => {
                togglePayoutClaim(member.id, m);
            });
        }
        
        container.appendChild(row);
    }
    
    // Update summary tags in modal
    document.getElementById('modal-paid-count').textContent = paidCount;
    document.getElementById('modal-pending-count').textContent = dueCount;
    document.getElementById('modal-payment-due-val').textContent = '₹' + pendingAmount.toLocaleString('en-IN');
    
    const outstandingLabel = document.getElementById('modal-payment-due-label');
    const waBtn = document.getElementById('btn-modal-whatsapp-reminder');
    if (pendingAmount > 0) {
        outstandingLabel.textContent = 'Outstanding Due';
        document.getElementById('modal-payment-due-val').className = 'outstanding-value text-red';
        if (waBtn) {
            waBtn.classList.remove('hidden');
            const clonedWaBtn = waBtn.cloneNode(true);
            waBtn.parentNode.replaceChild(clonedWaBtn, waBtn);
            clonedWaBtn.addEventListener('click', () => {
                sendWhatsAppReminder(member.id);
            });
        }
    } else {
        outstandingLabel.textContent = 'Clear of Dues';
        document.getElementById('modal-payment-due-val').className = 'outstanding-value text-green';
        if (waBtn) {
            waBtn.classList.add('hidden');
        }
    }
    
    lucide.createIcons();
}

function sendWhatsAppReminder(memberId) {
    const member = State.members.find(m => m.id === memberId);
    if (!member) return;
    
    const group = State.groups.find(g => g.id === member.groupId);
    if (!group) return;

    if (!member.mobileNo || member.mobileNo.trim() === '') {
        showNotification('Please add a mobile number for this member to send reminders.', 'error');
        // Automatically click edit profile details button to slide open form
        const btnEdit = document.getElementById('btn-edit-member-profile');
        if (btnEdit) {
            // If payment modal is not already open, open it first
            if (!document.getElementById('payment-modal-backdrop').classList.contains('active')) {
                openPaymentModal(member.id);
            }
            setTimeout(() => {
                btnEdit.click();
                const mobileInput = document.getElementById('edit-member-mobile');
                if (mobileInput) {
                    mobileInput.focus();
                }
            }, 300);
        }
        return;
    }

    // Calculate dues
    let pendingMonths = [];
    let totalDueAmount = 0;

    const now = new Date();
    const currentRelativeMonth = getRelativeMonthForGroup(group, now.getFullYear(), now.getMonth());
    const effectiveLimit = Math.max(group.currentMonth || 1, currentRelativeMonth);

    for (let m = 1; m <= group.duration; m++) {
        if (m <= effectiveLimit) {
            const payment = member.payments[m];
            const instVal = group.installments && group.installments[m] !== undefined 
                ? group.installments[m] 
                : group.monthlyInstallment;
            
            if (!payment || !payment.paid) {
                const partial = payment ? (payment.partialPaid || 0) : 0;
                totalDueAmount += (instVal - partial);
                pendingMonths.push(`Month ${m} (${getMonthLabel(group, m)})`);
            }
        }
    }

    if (totalDueAmount <= 0) {
        showNotification('This member has no outstanding dues!', 'info');
        return;
    }

    // Format greeting
    const greeting = `Dear ${member.name},\n\nThis is a friendly savings installment reminder for *${group.name}* (Ponnusamy Savings).\n\n*Outstanding Dues Details:*\n` +
        `• Total Outstanding: *₹${totalDueAmount.toLocaleString('en-IN')}*\n` +
        `• Due Cycles:\n  - ${pendingMonths.join('\n  - ')}\n\n` +
        `Please clear your pending dues at your earliest convenience. If you have already paid, please ignore this message.\n\nThank you!`;

    // Format mobile number: default to India prefix 91 if length is 10 digits
    let formattedPhone = member.mobileNo.replace(/\D/g, '');
    if (formattedPhone.length === 10) {
        formattedPhone = '91' + formattedPhone;
    }

    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(greeting)}`;
    window.open(waUrl, '_blank');
}

function togglePayoutClaim(memberId, monthNum) {
    const member = State.members.find(m => m.id === memberId);
    if (!member) return;
    
    const group = State.groups.find(g => g.id === member.groupId);
    if (!group) return;
    
    // Ensure the payments array is initialized for this month
    if (!member.payments[monthNum]) {
        member.payments[monthNum] = { paid: false };
    }
    
    const isClaimed = member.payments[monthNum].payoutClaimed;
    
    if (isClaimed) {
        member.payments[monthNum].payoutClaimed = false;
        member.payments[monthNum].payoutMethod = null;
        member.payments[monthNum].payoutNote = null;
        saveState();
        renderChecklist(member, group);
    } else {
        // Check if any other month is already claimed
        let alreadyClaimedMonth = null;
        for (const m in member.payments) {
            if (member.payments[m] && member.payments[m].payoutClaimed) {
                alreadyClaimedMonth = m;
                break;
            }
        }
        
        if (alreadyClaimedMonth) {
            showNotification(`Month ${alreadyClaimedMonth} is already claimed. Undo it first to select a new month.`, 'error');
            return;
        }

        pendingPayoutMemberId = memberId;
        pendingPayoutMonthNum = monthNum;
        document.getElementById('payout-note-input').value = '';
        document.querySelector('input[name="payout-method"][value="cash"]').checked = true;
        document.getElementById('payout-gpay-note-wrapper').classList.add('hidden');
        document.getElementById('payout-method-modal-backdrop').classList.add('active');
    }
}

function toggleMonthlyPayment(memberId, monthNum) {
    const member = State.members.find(m => m.id === memberId);
    if (!member) return;
    
    const group = State.groups.find(g => g.id === member.groupId);
    if (!group) return;
    
    const isCurrentlyPaid = member.payments[monthNum].paid;
    
    if (!isCurrentlyPaid) {
        // Instead of marking paid immediately, open the Payment Method Selection Modal
        openPaymentMethodModal(memberId, monthNum);
    } else {
        // If it is already paid, just unmark it
        member.payments[monthNum].paid = false;
        member.payments[monthNum].paidAt = null;
        member.payments[monthNum].method = null;
        member.payments[monthNum].note = null;
        member.payments[monthNum].customDate = '';
        
        saveState();
        renderChecklist(member, group);
    }
}

// Bulk mark all or clear all
function bulkTogglePayments(markPaid) {
    const memberId = State.selectedMemberId;
    const member = State.members.find(m => m.id === memberId);
    if (!member) return;
    
    const group = State.groups.find(g => g.id === member.groupId);
    if (!group) return;
    
    // If markPaid = true: mark all months up to currentMonth as paid
    // If markPaid = false: clear all months
    const limit = markPaid ? group.currentMonth : group.duration;
    
    for (let m = 1; m <= group.duration; m++) {
        if (markPaid) {
            // Only toggle if currently unpaid and in the active bill scope
            if (m <= limit && !member.payments[m].paid) {
                member.payments[m].paid = true;
                member.payments[m].partialPaid = null;
                member.payments[m].paidAt = new Date().toISOString();
                if (!member.payments[m].customDate) {
                    member.payments[m].customDate = String(new Date().getDate());
                }
            }
        } else {
            // Uncheck all
            member.payments[m].paid = false;
            member.payments[m].paidAt = null;
        }
    }
    
    saveState();
    renderChecklist(member, group);
    showNotification(markPaid ? 'Dues marked as paid!' : 'Cleared payment checklist!');
}

// --- Dynamic Financial Calculations ---

function getGroupMetrics(groupId) {
    const group = State.groups.find(g => g.id === groupId);
    if (!group) return { totalMembers: 0, totalCollected: 0, totalPending: 0, paidMembersForCurrentMonth: 0 };
    
    const groupMembers = State.members.filter(m => m.groupId === groupId);
    const totalMembers = groupMembers.length;
    
    let totalCollected = 0;
    let totalPending = 0;
    let paidMembersForCurrentMonth = 0;
    
    groupMembers.forEach(member => {
        // Check billing month specifically
        if (member.payments[group.currentMonth] && member.payments[group.currentMonth].paid) {
            paidMembersForCurrentMonth++;
        }
        
        // Aggregate totals
        for (let m = 1; m <= group.duration; m++) {
            const payment = member.payments[m];
            if (payment) {
                if (payment.paid) {
                    totalCollected += payment.amount;
                } else if (m <= group.currentMonth) {
                    // Unpaid months up to current cycle are pending
                    totalPending += payment.amount;
                }
            }
        }
    });
    
    return {
        totalMembers,
        totalCollected,
        totalPending,
        paidMembersForCurrentMonth
    };
}

function getGlobalMetrics(selectedMonth = 'current') {
    let totalGroups = State.groups.length;
    let totalMembers = State.members.length;
    let totalCollected = 0;
    let totalCollectedCash = 0;
    let totalCollectedGpay = 0;
    let totalPending = 0;
    
    const selMonth = selectedMonth || 'current';
    const isAccumulated = selMonth === 'accumulated';
    const { year: targetYear, month: targetMonth } = getTargetCalendarYearMonth(selMonth);
    
    State.groups.forEach(group => {
        const groupMembers = State.members.filter(m => m.groupId === group.id);
        const relativeMonthNum = getRelativeMonthForGroup(group, targetYear, targetMonth);
        
        groupMembers.forEach(member => {
            if (isAccumulated) {
                // Accumulative up to currentMonth
                for (let m = 1; m <= group.duration; m++) {
                    if (m <= group.currentMonth) {
                        const payment = member.payments[m];
                        const instVal = group.installments && group.installments[m] !== undefined 
                            ? group.installments[m] 
                            : group.monthlyInstallment;
                        
                        if (payment) {
                            if (payment.paid) {
                                totalCollected += instVal;
                                if (payment.method === 'cash') totalCollectedCash += instVal;
                                if (payment.method === 'gpay') totalCollectedGpay += instVal;
                            } else {
                                const partial = payment.partialPaid || 0;
                                totalCollected += partial;
                                totalPending += (instVal - partial);
                                if (payment.method === 'cash') totalCollectedCash += partial;
                                if (payment.method === 'gpay') totalCollectedGpay += partial;
                            }
                        } else {
                            totalPending += instVal;
                        }
                    }
                }
            } else {
                // Calendar-month specific view
                if (relativeMonthNum < 1 || relativeMonthNum > group.duration) {
                    // Not active for this group in this calendar month
                    return;
                }
                
                const payment = member.payments[relativeMonthNum];
                const instVal = group.installments && group.installments[relativeMonthNum] !== undefined 
                    ? group.installments[relativeMonthNum] 
                    : group.monthlyInstallment;
                
                if (payment) {
                    if (payment.paid) {
                        totalCollected += instVal;
                        if (payment.method === 'cash') totalCollectedCash += instVal;
                        if (payment.method === 'gpay') totalCollectedGpay += instVal;
                    } else {
                        const partial = payment.partialPaid || 0;
                        totalCollected += partial;
                        totalPending += (instVal - partial);
                        if (payment.method === 'cash') totalCollectedCash += partial;
                        if (payment.method === 'gpay') totalCollectedGpay += partial;
                    }
                } else {
                    totalPending += instVal;
                }
            }
        });
    });
    
    return {
        totalGroups,
        totalMembers,
        totalCollected,
        totalCollectedCash,
        totalCollectedGpay,
        totalPending
    };
}

// Adjust Current Month inside details
function adjustGroupMonth(delta) {
    const groupId = State.selectedGroupId;
    const group = State.groups.find(g => g.id === groupId);
    if (!group) return;
    
    const newMonth = group.currentMonth + delta;
    
    if (newMonth < 1) {
        showNotification('Already at Month 1.', 'info');
        return;
    }
    
    if (newMonth > group.duration) {
        showNotification(`Cannot exceed scheme duration of ${group.duration} months.`, 'info');
        return;
    }
    
    group.currentMonth = newMonth;
    saveState();
    
    // Re-render
    renderGroupDetails(groupId);
}

// Save Member to Existing Group Action
function saveMemberToExistingGroup() {
    const nameInput = document.getElementById('new-member-name-input');
    const name = nameInput.value.trim();
    const mobile = document.getElementById('new-member-mobile-input').value.trim();
    const place = document.getElementById('new-member-place-input').value.trim();
    const work = document.getElementById('new-member-work-input').value.trim();
    const occupation = document.getElementById('new-member-occupation-input').value.trim();
    const address = document.getElementById('new-member-address-input').value.trim();
    const customerTypeElNew = document.querySelector('input[name="new-member-customer-type"]:checked');
    const customerType = customerTypeElNew ? customerTypeElNew.value : 'New';
    const referredBy = document.getElementById('new-member-referred-input').value.trim();
    
    if (!name) {
        showNotification('Please enter a name.', 'error');
        return;
    }
    
    const groupId = State.selectedGroupId;
    const group = State.groups.find(g => g.id === groupId);
    if (!group) return;
    
    // Duplication check in this group
    const groupMembers = State.members.filter(m => m.groupId === groupId);
    if (groupMembers.some(m => m.name.toLowerCase() === name.toLowerCase())) {
        showNotification('A member with this name already exists in this group.', 'error');
        return;
    }
    
    const memberId = generateUUID();
    const newMemberObj = {
        id: memberId,
        groupId: groupId,
        name: name,
        mobileNo: mobile,
        place: place,
        placeOfWork: work,
        occupation: occupation,
        address: address,
        customerType: customerType,
        referredBy: referredBy,
        payments: {},
        status: 'Active'
    };
    
    // Populate payments structure (default all unpaid)
    for (let m = 1; m <= group.duration; m++) {
        newMemberObj.payments[m] = {
            paid: false,
            paidAt: null,
            amount: group.installments && group.installments[m] !== undefined ? group.installments[m] : group.monthlyInstallment
        };
    }
    
    // Clear quick add input fields
    nameInput.value = '';
    document.getElementById('new-member-mobile-input').value = '';
    document.getElementById('new-member-place-input').value = '';
    document.getElementById('new-member-work-input').value = '';
    document.getElementById('new-member-occupation-input').value = '';
    document.getElementById('new-member-address-input').value = '';
    const defTypeSave = document.querySelector('input[name="new-member-customer-type"][value="New"]');
    if (defTypeSave) defTypeSave.checked = true;
    document.getElementById('new-member-referred-input').value = '';
    
    // Add member to state
    State.members.push(newMemberObj);
    group.members.push(memberId);
    
    saveState();
    
    // Close modal
    document.getElementById('add-member-modal-backdrop').classList.remove('active');
    showNotification(`${name} added to group!`);
    
    // Re-render
    renderGroupDetails(groupId);
}

// --- Edit Group Operations ---
function openEditGroupModal() {
    const groupId = State.selectedGroupId;
    const group = State.groups.find(g => g.id === groupId);
    if (!group) return;
    
    document.getElementById('edit-group-name').value = group.name;
    document.getElementById('edit-group-amount').value = formatNumberIndian(group.chitAmount);
    document.getElementById('edit-group-start-month').value = group.startMonth !== undefined ? group.startMonth : 5;
    document.getElementById('edit-group-start-year').value = group.startYear !== undefined ? group.startYear : 2026;
    
    regenerateEditScheduleTable(group);
    
    document.getElementById('edit-group-modal-backdrop').classList.add('active');
}

function regenerateEditScheduleTable(group) {
    const container = document.getElementById('edit-schedule-rows-container');
    if (!container) return;
    
    container.innerHTML = '';
    const duration = group.duration;
    
    if (!group.installments) group.installments = {};
    if (!group.payouts) group.payouts = {};
    
    const template = (State.templates || []).find(t => parseFloat(t.amount) === group.chitAmount && parseInt(t.duration) === duration);
    const defaultInstallment = Math.round(group.chitAmount / duration);
    
    for (let m = 1; m <= duration; m++) {
        const instVal = group.installments[m] !== undefined
            ? group.installments[m]
            : (template && template.installments && template.installments[m] !== undefined ? template.installments[m] : defaultInstallment);
            
        const payoutVal = group.payouts[m] !== undefined
            ? group.payouts[m]
            : (template && template.payouts && template.payouts[m] !== undefined ? template.payouts[m] : group.chitAmount);
        
        const row = document.createElement('div');
        row.className = 'schedule-month-card';
        
        row.innerHTML = `
            <div class="month-card-header">Month ${m}</div>
            <div class="month-card-inputs">
                <div class="month-input-group">
                    <label>Installment (₹)</label>
                    <input type="text" inputmode="numeric" class="edit-schedule-inst-input amount-input" data-month="${m}" value="${formatNumberIndian(instVal)}" required>
                </div>
                <div class="month-input-group">
                    <label>Payout (₹)</label>
                    <input type="text" inputmode="numeric" class="edit-schedule-payout-input amount-input" data-month="${m}" value="${formatNumberIndian(payoutVal)}" required>
                </div>
            </div>
        `;
        container.appendChild(row);
    }
}

function saveGroupEdit() {
    const groupId = State.selectedGroupId;
    const group = State.groups.find(g => g.id === groupId);
    if (!group) return;
    
    const newName = document.getElementById('edit-group-name').value.trim();
    const newAmount = parseFloat(document.getElementById('edit-group-amount').value);
    const newStartMonth = parseInt(document.getElementById('edit-group-start-month').value);
    const newStartYear = parseInt(document.getElementById('edit-group-start-year').value);
    
    if (!newName) {
        showNotification('Group name is required.', 'error');
        return;
    }
    
    if (isNaN(newAmount) || newAmount <= 0) {
        showNotification('Total scheme amount must be greater than 0.', 'error');
        return;
    }
    
    // Retrieve customized installments and payouts
    const installments = {};
    const payouts = {};
    document.querySelectorAll('.edit-schedule-inst-input').forEach(input => {
        const m = parseInt(input.getAttribute('data-month'));
        installments[m] = parseFloat(input.value) || 0;
    });
    document.querySelectorAll('.edit-schedule-payout-input').forEach(input => {
        const m = parseInt(input.getAttribute('data-month'));
        payouts[m] = parseFloat(input.value) || 0;
    });
    
    const firstMonthInstallment = installments[1] !== undefined ? installments[1] : (newAmount / group.duration);
    
    group.name = newName;
    group.chitAmount = newAmount;
    group.monthlyInstallment = firstMonthInstallment;
    group.startMonth = newStartMonth;
    group.startYear = newStartYear;
    group.installments = installments;
    group.payouts = payouts;
    
    const groupMembers = State.members.filter(m => m.groupId === groupId);
    groupMembers.forEach(member => {
        for (let m = 1; m <= group.duration; m++) {
            if (member.payments && member.payments[m]) {
                member.payments[m].amount = installments[m] !== undefined ? installments[m] : firstMonthInstallment;
            }
        }
    });
    
    saveState();
    document.getElementById('edit-group-modal-backdrop').classList.remove('active');
    showNotification('Group details updated successfully!');
    
    renderGroupDetails(groupId);
}

async function deleteGroup() {
    const groupId = State.selectedGroupId;
    const group = State.groups.find(g => g.id === groupId);
    if (!group) return;
    
    const confirmDelete = await showCustomConfirm('Delete Chit Group', `Are you sure you want to delete the group "${group.name}" and all its members? This cannot be undone.`);
    if (confirmDelete) {
        State.groups = State.groups.filter(g => g.id !== groupId);
        State.members = State.members.filter(m => m.groupId !== groupId);
        
        saveState();
        document.getElementById('edit-group-modal-backdrop').classList.remove('active');
        showNotification('Group deleted successfully!');
        
        switchView('screen-dashboard');
    }
}

// --- Settings Operations: Backup, Restore & Reset ---

// 1. Export Data to JSON
function exportBackup() {
    if (State.groups.length === 0) {
        showNotification('No data to export.', 'info');
        return;
    }
    
    const dataObj = {
        app: 'Ponnusamy Savings Backup',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        groups: State.groups,
        members: State.members,
        templates: State.templates || []
    };
    
    const dataString = JSON.stringify(dataObj, null, 2);
    const blob = new Blob([dataString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const dateStr = new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ponnusamy_savings_backup_${dateStr}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('Backup file generated and downloaded!');
}

function emailBackupDraft() {
    if (State.groups.length === 0) {
        showNotification('No data to email.', 'info');
        return;
    }

    const dataObj = {
        app: 'Ponnusamy Savings Backup',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        groups: State.groups,
        members: State.members,
        templates: State.templates || []
    };
    
    const dataString = JSON.stringify(dataObj, null, 2);
    
    showNotification('Sending backup email via Google...', 'info');

    const email = State.backupEmail || 'noreply@ponnusamysavings.com';
    const payload = {
        email: email,
        backupData: dataString
    };

    // Replace this URL with your Google Apps Script Web App URL
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyQMuRKJrhJ9ETARBOCF9prnTN5orRys9Lg12vJm6YUgcGha0p64FGatZ5h_Y9y7j0q/exec";

    return fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload)
    })
    .then(() => {
        // With no-cors, we can't read the exact response, so assume success
        showNotification('Backup emailed successfully as an attachment!', 'success');
    })
    .catch(error => {
        console.error('Network Error:', error);
        showNotification('Email Failed: Check your internet connection.', 'error');
        navigator.clipboard.writeText(dataString); // Fallback
    });
}

// 2. Import Data from JSON
function importBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(evt) {
        try {
            const importedData = JSON.parse(evt.target.result);
            
            // Simple validation
            if (!importedData.groups || !importedData.members) {
                showNotification('Invalid backup file structure. Missing groups or members.', 'error');
                return;
            }
            
            const confirmImport = await showCustomConfirm('Import Backup', 'WARNING: Importing this backup will overwrite all current groups, members, and scheme templates. Are you sure you want to proceed?');
            if (confirmImport) {
                State.groups = importedData.groups;
                State.members = importedData.members;
                if (importedData.templates) {
                    State.templates = importedData.templates;
                }
                saveState();
                
                showNotification('Database imported successfully!');
                
                // Close settings drawer (if it exists)
                const settingsBackdrop = document.getElementById('settings-backdrop');
                if (settingsBackdrop) {
                    settingsBackdrop.classList.remove('active');
                }
                
                // We are on settings page, so maybe navigate to dashboard
                if (typeof navigateTo === 'function') {
                    navigateTo('screen-dashboard');
                } else {
                    renderDashboard();
                }
                // Re-render dashboard/details
                renderDashboard();
            }
        } catch (err) {
            console.error('Error parsing backup file:', err);
            showNotification('Error reading file. Make sure it is valid JSON.', 'error');
        }
    };
    reader.readAsText(file);
    
    // Clear input so same file can be imported again if needed
    e.target.value = '';
}

// 3. Reset All App Data
async function resetAllData() {
    const confirmReset = await showCustomConfirm(
        'Wipe All App Data', 
        'WARNING: This will permanently erase all chit groups and member records. An automatic backup will be downloaded first. Your custom scheme templates will be kept. Are you sure you want to proceed?'
    );
    if (confirmReset) {
        // Auto-download backup before wipe
        if (typeof exportBackup === 'function') {
            exportBackup();
        }
        
        // Auto-email backup before wipe
        if (typeof emailBackupDraft === 'function' && State.backupEmail) {
            await emailBackupDraft();
        }

        // Add a small delay to ensure download starts before state vanishes
        setTimeout(() => {
            localStorage.removeItem(getStorageKey('groups'));
            localStorage.removeItem(getStorageKey('members'));
            State.groups = [];
            State.members = [];
            saveState();
            
            showNotification('App wiped successfully! Auto-backup downloaded and templates preserved.', 'info');
            
            // Close settings drawer
            const settingsBackdrop = document.getElementById('settings-backdrop');
            if (settingsBackdrop) {
                settingsBackdrop.classList.remove('active');
            }
            
            renderDashboard();
        }, 500);
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

// --- PDF Generation Logic ---
function generatePdfReport() {
    const group = State.groups.find(g => g.id === State.selectedGroupId);
    if (!group) return;
    
    const monthNum = parseInt(document.getElementById('pdf-export-month-select').value);
    if (isNaN(monthNum)) return;
    
    // Close modal
    document.getElementById('pdf-export-modal-backdrop').classList.remove('active');
    
    // Prepare Data
    const members = State.members.filter(m => m.groupId === group.id);
    let collected = 0;
    let pending = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let takenChitCount = 0;
    
    const installmentVal = group.installments && group.installments[monthNum] !== undefined 
        ? group.installments[monthNum] 
        : group.monthlyInstallment;
        
    const payoutVal = group.payouts && group.payouts[monthNum] !== undefined
        ? group.payouts[monthNum]
        : 0;

    const targetCollection = members.length * installmentVal;

    const tbody = document.getElementById('pdf-table-body');
    const defaultersBody = document.getElementById('pdf-defaulters-body');
    
    tbody.innerHTML = '';
    defaultersBody.innerHTML = '';
    
    let pendingMembers = [];

    members.forEach((member, index) => {
        const payment = member.payments[monthNum];
        const isPaid = payment && payment.paid;
        
        let hasTakenChit = false;
        for (let m = 1; m <= group.duration; m++) {
            if (member.payments[m] && member.payments[m].payoutClaimed) {
                hasTakenChit = true;
                break;
            }
        }

        if (hasTakenChit) takenChitCount++;
        
        if (isPaid) {
            collected += installmentVal;
            paidCount++;
        } else {
            pending += installmentVal;
            pendingCount++;
            pendingMembers.push(member);
        }
        
        const tr = document.createElement('tr');
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f9fafb';
        tr.style.backgroundColor = rowBg;
        
        const statusColor = isPaid ? '#065f46' : '#991b1b';
        const statusBg = isPaid ? '#d1fae5' : '#fee2e2';
        const statusText = isPaid ? 'PAID' : 'PENDING';
        
        const chitStatusText = hasTakenChit ? '<span style="color: #4338ca; font-weight: 700;">Taken</span>' : '<span style="color: #64748b;">Not Taken</span>';
        
        let datePaidText = '--';
        if (isPaid) {
            if (payment.customDate) {
                datePaidText = new Date(payment.customDate).toLocaleDateString();
            } else if (payment.paidAt) {
                datePaidText = new Date(payment.paidAt).toLocaleDateString();
            } else {
                datePaidText = 'Paid';
            }
        }

        tr.innerHTML = `
            <td style="padding: 12px; color: #334155; border: 1px solid #d1d5db; text-align: center;">${index + 1}</td>
            <td style="padding: 12px; color: #0f172a; font-weight: 700; border: 1px solid #d1d5db;">${member.name}</td>
            <td style="padding: 12px; text-align: center; border: 1px solid #d1d5db;">${chitStatusText}</td>
            <td style="padding: 12px; color: #475569; font-size: 11px; border: 1px solid #d1d5db;">${datePaidText}</td>
            <td style="padding: 12px; text-align: right; color: #0f172a; font-weight: 600; border: 1px solid #d1d5db;">₹${formatNumberIndian(installmentVal)}</td>
            <td style="padding: 12px; text-align: center; border: 1px solid #d1d5db;">
                <span style="background-color: ${statusBg}; color: ${statusColor}; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 800;">${statusText}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });

    pendingMembers.forEach((member) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #fecaca';
        tr.innerHTML = `
            <td style="padding: 8px; color: #991b1b; font-weight: 700;">${member.name}</td>
            <td style="padding: 8px; color: #991b1b;">${member.mobileNo || '--'}</td>
            <td style="padding: 8px; text-align: right; color: #991b1b; font-weight: 800;">₹${formatNumberIndian(installmentVal)}</td>
        `;
        defaultersBody.appendChild(tr);
    });
    
    if (pendingMembers.length === 0) {
        defaultersBody.innerHTML = `<tr><td colspan="3" style="padding: 8px; text-align: center; color: #059669; font-weight: 700;">No pending dues this month! All collected.</td></tr>`;
    }

    // Populate Headers and Summary
    document.getElementById('pdf-group-name').textContent = group.name;
    document.getElementById('pdf-month-name').textContent = `Month ${monthNum} / ${group.duration}`;
    
    const now = new Date();
    document.getElementById('pdf-gen-date').textContent = `Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    
    document.getElementById('pdf-target-collection').textContent = `₹${formatNumberIndian(targetCollection)}`;
    document.getElementById('pdf-total-collected').textContent = `₹${formatNumberIndian(collected)}`;
    document.getElementById('pdf-total-pending').textContent = `₹${formatNumberIndian(pending)}`;

    const percentage = targetCollection > 0 ? ((collected / targetCollection) * 100).toFixed(1) : 0;
    document.getElementById('pdf-collection-percentage').textContent = `${percentage}%`;

    document.getElementById('pdf-total-members').textContent = members.length;
    document.getElementById('pdf-members-paid').textContent = paidCount;
    document.getElementById('pdf-members-pending').textContent = pendingCount;
    document.getElementById('pdf-members-taken').textContent = takenChitCount;

    // Show temporary container, generate, hide
    const overlay = document.getElementById('pdf-loading-overlay');
    if (overlay) overlay.style.display = 'flex';
    
    const container = document.getElementById('pdf-template-container');
    container.style.display = 'block';

    const opt = {
        margin:       [10, 5],
        filename:     `${group.name.replace(/\s+/g, '_')}_Month_${monthNum}_Report.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(container).save().then(() => {
        container.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
        showNotification('PDF Report Generated Successfully!', 'success');
    }).catch(err => {
        console.error(err);
        container.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
        showNotification('Error generating PDF', 'error');
    });
}

function generateGlobalPdfReport() {
    const selectedMonthKey = document.getElementById('global-pdf-export-month-select').value;
    if (!selectedMonthKey) return;
    
    document.getElementById('global-pdf-export-modal-backdrop').classList.remove('active');
    
    const [selYearStr, selMonthStr] = selectedMonthKey.split('-');
    const selYear = parseInt(selYearStr);
    const selMonth = parseInt(selMonthStr);
    
    let globalTarget = 0;
    let globalCollected = 0;
    let globalPending = 0;
    
    const groupsContainer = document.getElementById('global-pdf-unified-table-container');
    if (!groupsContainer) return; // safety
    groupsContainer.innerHTML = '';
    
    // Find all groups active in this calendar month
    let activeGroupsForMonth = [];
    
    State.groups.forEach(group => {
        const startMonth = group.startMonth !== undefined ? parseInt(group.startMonth) : new Date(group.createdAt).getMonth();
        const startYear = group.startYear !== undefined ? parseInt(group.startYear) : new Date(group.createdAt).getFullYear();
        
        let gDate = new Date(startYear, startMonth, 1);
        
        for (let m = 1; m <= group.duration; m++) {
            if (gDate.getFullYear() === selYear && (gDate.getMonth() + 1) === selMonth) {
                // This group's "Month M" falls in the selected Calendar Month
                activeGroupsForMonth.push({ group, relMonthNum: m });
                break;
            }
            gDate.setMonth(gDate.getMonth() + 1);
        }
    });
    
    if (activeGroupsForMonth.length === 0) {
        showNotification("No data to export for this month.", "error");
        return;
    }
    
    let allMembersFlattened = [];

    activeGroupsForMonth.forEach(item => {
        const { group, relMonthNum } = item;
        const members = State.members.filter(m => m.groupId === group.id);
        
        const installmentVal = group.installments && group.installments[relMonthNum] !== undefined 
            ? group.installments[relMonthNum] 
            : group.monthlyInstallment;
            
        let groupTarget = members.length * installmentVal;
        let groupCollected = 0;
        let groupPending = 0;
        
        const schemeName = `${(group.chitAmount >= 100000 ? group.chitAmount/100000 + ' Lakh' : group.chitAmount/1000 + 'K')} / ${group.duration}M`;

        members.forEach((member) => {
            const payment = member.payments[relMonthNum];
            const isPaid = payment && payment.paid;
            
            let hasTakenChit = false;
            let chitAmountStr = '';
            let chitModeStr = '';
            for (let i = 1; i <= group.duration; i++) {
                if (member.payments[i] && member.payments[i].payoutClaimed) {
                    hasTakenChit = true;
                    const payoutVal = group.payouts && group.payouts[i] !== undefined ? group.payouts[i] : 0;
                    chitAmountStr = `₹${formatNumberIndian(payoutVal)}`;
                    chitModeStr = member.payments[i].paymentMode ? member.payments[i].paymentMode.substring(0,1).toUpperCase() : 'C'; // e.g., 'G' for Gpay
                    break;
                }
            }
            
            if (isPaid) {
                groupCollected += installmentVal;
            } else {
                groupPending += installmentVal;
            }
            
            let dateText = '--';
            if (isPaid && payment.customDate) dateText = new Date(payment.customDate).toLocaleDateString();
            else if (isPaid && payment.paidAt) dateText = new Date(payment.paidAt).toLocaleDateString();
            
            allMembersFlattened.push({
                name: member.name,
                groupName: group.name,
                scheme: schemeName,
                monthNo: relMonthNum,
                dueAmount: isPaid ? 0 : installmentVal,
                paidAmount: isPaid ? installmentVal : 0,
                paidDate: dateText,
                isPaid: isPaid,
                hasTakenChit: hasTakenChit,
                chitTakenDisplay: hasTakenChit ? `${chitAmountStr} / ${chitModeStr}` : '--'
            });
        });
        
        globalTarget += groupTarget;
        globalCollected += groupCollected;
        globalPending += groupPending;
    });

    let tableRowsHtml = '';
    allMembersFlattened.forEach((row, index) => {
        
        const markPill = row.isPaid 
            ? `<span style="background-color: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 99px; font-size: 10px; font-weight: 800; border: 1px solid #bbf7d0;"><i class="fa-solid fa-check" style="margin-right: 4px;"></i> PAID</span>`
            : `<span style="background-color: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 99px; font-size: 10px; font-weight: 800; border: 1px solid #fecaca;"><i class="fa-solid fa-circle-exclamation" style="margin-right: 4px;"></i> DUE</span>`;
            
        const chitPill = row.hasTakenChit
            ? `<span style="background-color: #f3e8ff; color: #6b21a8; padding: 4px 10px; border-radius: 99px; font-size: 10px; font-weight: 800; border: 1px solid #e9d5ff;"><i class="fa-solid fa-circle-check" style="margin-right: 4px;"></i> ${row.chitTakenDisplay}</span>`
            : `<span style="color: #94a3b8; font-weight: 600;">--</span>`;

        const rowBg = index % 2 === 0 ? '#ffffff' : '#f9fafb';
        tableRowsHtml += `
            <tr style="background-color: ${rowBg};">
                <td style="padding: 12px 10px; color: #334155; font-size: 12px; font-weight: 700; text-align: center; border: 1px solid #d1d5db;">${index + 1}</td>
                <td style="padding: 12px 10px; color: #0f172a; font-weight: 800; font-size: 12px; text-transform: uppercase; border: 1px solid #d1d5db;">${row.name}</td>
                <td style="padding: 12px 10px; color: #64748b; font-size: 12px; font-weight: 600; border: 1px solid #d1d5db;">${row.groupName}</td>
                <td style="padding: 12px 10px; text-align: center; border: 1px solid #d1d5db;">
                    <span style="border: 1px solid #e2e8f0; background: #ffffff; padding: 4px 8px; border-radius: 99px; font-size: 10px; font-weight: 800; color: #1e293b;">${row.scheme}</span>
                </td>
                <td style="padding: 12px 10px; color: #d97706; font-size: 12px; font-weight: 800; text-align: center; border: 1px solid #d1d5db;">${row.monthNo}</td>
                <td style="padding: 12px 10px; text-align: right; color: ${row.dueAmount > 0 ? '#ef4444' : '#10b981'}; font-weight: 800; font-size: 12px; border: 1px solid #d1d5db;">₹${formatNumberIndian(row.dueAmount)}</td>
                <td style="padding: 12px 10px; text-align: right; color: ${row.paidAmount > 0 ? '#10b981' : '#94a3b8'}; font-weight: 800; font-size: 12px; border: 1px solid #d1d5db;">₹${formatNumberIndian(row.paidAmount)}</td>
                <td style="padding: 12px 10px; color: ${row.paidDate !== '--' ? '#10b981' : '#94a3b8'}; font-size: 12px; font-weight: 700; text-align: center; border: 1px solid #d1d5db;">${row.paidDate}</td>
                <td style="padding: 12px 10px; text-align: center; border: 1px solid #d1d5db;">${markPill}</td>
                <td style="padding: 12px 10px; text-align: center; border: 1px solid #d1d5db;">${chitPill}</td>
            </tr>
        `;
    });

    groupsContainer.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; background: white;">
            <thead>
                <tr style="background-color: #111827;">
                    <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">S.No</th>
                    <th style="padding: 15px 10px; text-align: left; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Name</th>
                    <th style="padding: 15px 10px; text-align: left; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Chit Group</th>
                    <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Scheme</th>
                    <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Month No.</th>
                    <th style="padding: 15px 10px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Due Amount</th>
                    <th style="padding: 15px 10px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Paid Amount</th>
                    <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Paid Date</th>
                    <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Mark</th>
                    <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Chit Taken</th>
                </tr>
            </thead>
            <tbody>
                ${tableRowsHtml}
            </tbody>
        </table>
    `;

    const dateObj = new Date(selYear, selMonth - 1, 1);
    const monthName = dateObj.toLocaleString('default', { month: 'long' });
    
    document.getElementById('global-pdf-month-name').textContent = `${monthName} ${selYear}`;
    
    const now = new Date();
    document.getElementById('global-pdf-gen-date').textContent = `Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    
    document.getElementById('global-pdf-target').textContent = `₹${formatNumberIndian(globalTarget)}`;
    document.getElementById('global-pdf-collected').textContent = `₹${formatNumberIndian(globalCollected)}`;
    document.getElementById('global-pdf-pending').textContent = `₹${formatNumberIndian(globalPending)}`;

    const globalPercentage = globalTarget > 0 ? ((globalCollected / globalTarget) * 100).toFixed(1) : 0;
    document.getElementById('global-pdf-percentage').textContent = `${globalPercentage}%`;

    const overlay = document.getElementById('pdf-loading-overlay');
    if (overlay) overlay.style.display = 'flex';

    const container = document.getElementById('global-pdf-template-container');
    container.style.display = 'block';

    const opt = {
        margin:       [10, 5],
        filename:     `Global_Report_${monthName}_${selYear}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(container).save().then(() => {
        container.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
        showNotification('Global PDF Report Generated Successfully!', 'success');
    }).catch(err => {
        console.error(err);
        container.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
        showNotification('Error generating PDF', 'error');
    });
}



/* --- PWA Install Logic --- */
let deferredPrompt;

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.log('SW registration failed: ', err);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const pwaPopup = document.getElementById('pwa-install-prompt');
    const btnPwaInstall = document.getElementById('pwa-install-btn');
    const btnPwaLater = document.getElementById('pwa-later-btn');
    const btnPwaClose = document.getElementById('pwa-close-btn');
    const btnManualInstall = document.getElementById('btn-manual-install');

    function hidePwaPopup(decline = false) {
        if (pwaPopup) {
            pwaPopup.classList.remove('show');
            setTimeout(() => {
                pwaPopup.style.display = 'none';
            }, 500); // match transition duration
        }
        if (decline) {
            localStorage.setItem('pwaPromptDeclined', 'true');
        }
    }

    if (btnPwaClose) btnPwaClose.addEventListener('click', () => hidePwaPopup(false));
    if (btnPwaLater) btnPwaLater.addEventListener('click', () => hidePwaPopup(true));

    if (btnManualInstall) {
        btnManualInstall.addEventListener('click', (e) => {
            e.preventDefault();
            // Close dropdown safely
            const profileMenu = document.getElementById('profile-dropdown-menu');
            if (profileMenu) profileMenu.classList.remove('active');
            
            // Show PWA popup
            if (pwaPopup) {
                pwaPopup.style.display = 'flex';
                setTimeout(() => pwaPopup.classList.add('show'), 50);
            }
        });
    }

    if (btnPwaInstall) {
        btnPwaInstall.addEventListener('click', async () => {
            hidePwaPopup();
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log('User response to the install prompt: ' + outcome);
                deferredPrompt = null;
            } else {
                alert("Your browser doesn't support automatic installation. Please click the 'Share' or 'Menu' button in your browser and select 'Add to Home Screen' or 'Install App'.");
            }
        });
    }

    // Handle Install Prompt globally
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (pwaPopup) {
            localStorage.removeItem('pwaPromptDeclined');
            pwaPopup.style.display = 'flex';
            setTimeout(() => pwaPopup.classList.add('show'), 50);
        }
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        hidePwaPopup();
        console.log('PWA was installed');
    });
});













