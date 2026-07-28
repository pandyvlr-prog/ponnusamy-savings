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
    dashboardFilterDate: '',
    dashboardDateRangeFrom: '',
    dashboardDateRangeTo: '',
    backupEmail: localStorage.getItem('ponnusamy_backup_email') || '',
    templateFilterDuration: '12',
    savedNotes: [],
    // [PHASE 4] Introduced isDirty flags for smart view caching
    isDirty: {
        dashboard: true,
        pnl: true,
        notes: true,
        members: true
    }
};

let originalStateSnapshot = null;

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
function renderSavedNotesList() {
    const datalist = document.getElementById('gpay-notes-suggestions');
    if (!datalist) return;
    datalist.innerHTML = '';
    
    if (!State.savedNotes) State.savedNotes = [];
    
    if (State.savedNotes.length === 0 && !localStorage.getItem(getStorageKey('savedNotes_init'))) {
        State.savedNotes = [
            "P.PANDYAN - CUB",
            "P.PANDYAN - HDFC",
            "P.PANDYAN - IB",
            "PANDIAMMAL"
        ];
        localStorage.setItem(getStorageKey('savedNotes_init'), 'true');
        saveState();
    }
    
    State.savedNotes.forEach(note => {
        const opt = document.createElement('option');
        opt.value = note;
        datalist.appendChild(opt);
    });
}

async function loadState() {
    try {
        // Fallback Local Storage load first
        const storedGroups = localStorage.getItem(getStorageKey('groups'));
        const storedMembers = localStorage.getItem(getStorageKey('members'));
        const storedTemplates = localStorage.getItem('ponnusamy_templates');
        const storedNotes = localStorage.getItem(getStorageKey('savedNotes'));
        
        State.groups = storedGroups ? JSON.parse(storedGroups) : [];
        State.members = storedMembers ? JSON.parse(storedMembers) : [];
        State.templates = storedTemplates ? JSON.parse(storedTemplates) : [];
        State.savedNotes = storedNotes ? JSON.parse(storedNotes) : [];

        // If authenticated with Supabase, pull cloud data
        if (window.supabaseClient && window.AuthState?.isAuthenticated && window.AuthState.currentUser?.id) {
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
                State.savedNotes = data.notes_data || [];
                
                // Restore Workspace Notepad
                if (data.workspace_notepad) {
                    localStorage.setItem('pms_workspace_notepad', JSON.stringify(data.workspace_notepad));
                    if (typeof loadNotes === 'function') loadNotes(); // Refresh UI if function exists
                }
                
                // Sync backup email from user metadata
                if (window.AuthState?.currentUser?.user_metadata?.backupEmail !== undefined) {
                    State.backupEmail = window.AuthState.currentUser.user_metadata.backupEmail;
                    localStorage.setItem('ponnusamy_backup_email', State.backupEmail);
                }
                
                // Restore Installment Cards
                if (data.installment_cards_data) {
                    localStorage.setItem('pms_installment_cards', JSON.stringify(data.installment_cards_data));
                }
                
                // Save to local storage for offline use
                localStorage.setItem(getStorageKey('groups'), JSON.stringify(State.groups));
                localStorage.setItem(getStorageKey('members'), JSON.stringify(State.members));
                localStorage.setItem('ponnusamy_templates', JSON.stringify(State.templates));
                localStorage.setItem(getStorageKey('savedNotes'), JSON.stringify(State.savedNotes));
            } else if (error && error.code === 'PGRST116') {
                // No cloud data yet (row not found). Let's push our local data!
                await commitState(true); 
            } else if (error) {
                console.error("Supabase load error:", error);
            }
        }
        
        if (ensureDefaultTemplates()) {
            await commitState(true);
        }
        
        renderSavedNotesList();
        
        originalStateSnapshot = JSON.stringify(State);
    } catch (e) {
        console.error('Error loading state:', e);
    }
}

async function commitState(skipBanner = false) {
    try {
        // Always save locally first for speed and offline fallback
        localStorage.setItem(getStorageKey('groups'), JSON.stringify(State.groups));
        localStorage.setItem(getStorageKey('members'), JSON.stringify(State.members));
        localStorage.setItem('ponnusamy_templates', JSON.stringify(State.templates || []));
        localStorage.setItem(getStorageKey('savedNotes'), JSON.stringify(State.savedNotes || []));
        
        // If authenticated with Supabase, sync to cloud
        if (window.supabaseClient && window.AuthState?.isAuthenticated && window.AuthState.currentUser?.id) {
            let workspaceNotepadData = [];
            try {
                const storedNotepad = localStorage.getItem('pms_workspace_notepad');
                if (storedNotepad) workspaceNotepadData = JSON.parse(storedNotepad);
            } catch (e) {}

            let installmentCardsData = {};
            try {
                const storedCards = localStorage.getItem('pms_installment_cards');
                if (storedCards) installmentCardsData = JSON.parse(storedCards);
            } catch (e) {}

            const cloudIcon = document.getElementById('cloud-sync-icon');
            const cloudBtn = document.getElementById('cloud-sync-status-btn');
            if (cloudIcon) {
                cloudIcon.setAttribute('data-lucide', 'refresh-cw');
                cloudIcon.classList.add('lucide-spin');
                if (cloudBtn) cloudBtn.style.color = '#f59e0b'; // Amber for syncing
                if (window.lucide) window.lucide.createIcons({ icons: { 'refresh-cw': window.lucide.icons.RefreshCw }, nameAttr: 'data-lucide', attrs: { class: 'lucide-spin' } });
            }

            const { error } = await window.supabaseClient
                .from('user_data')
                .upsert({
                    user_id: window.AuthState.currentUser.id,
                    groups_data: State.groups,
                    members_data: State.members,
                    templates_data: State.templates,
                    notes_data: State.savedNotes,
                    workspace_notepad: workspaceNotepadData,
                    installment_cards_data: installmentCardsData,
                    updated_at: new Date().toISOString()
                });
                
            if (error) {
                console.error("Supabase save error:", error);
                if (cloudIcon) {
                    cloudIcon.setAttribute('data-lucide', 'cloud-off');
                    cloudIcon.classList.remove('lucide-spin');
                    if (cloudBtn) cloudBtn.style.color = '#ef4444'; // Red for offline/error
                    if (window.lucide) window.lucide.createIcons();
                }
            } else {
                if (cloudIcon) {
                    cloudIcon.setAttribute('data-lucide', 'cloud-check');
                    cloudIcon.classList.remove('lucide-spin');
                    if (cloudBtn) cloudBtn.style.color = '#10b981'; // Green for success
                    if (window.lucide) window.lucide.createIcons();
                }
            }
        }
        
        originalStateSnapshot = JSON.stringify(State);
        if (!skipBanner) hideSaveDiscardBanner();
        
    } catch (e) {
        console.error('Error saving state:', e);
    }
}

async function saveState() {
    // [PHASE 4] Mark all views as dirty so they re-render on next visit
    State.isDirty = {
        dashboard: true,
        pnl: true,
        notes: true,
        members: true
    };
    
    if (!originalStateSnapshot) {
        return commitState(true);
    }
    const currentStr = JSON.stringify(State);
    if (currentStr !== originalStateSnapshot) {
        showSaveDiscardBanner();
    } else {
        hideSaveDiscardBanner();
    }
}

function discardState() {
    if (originalStateSnapshot) {
        const parsed = JSON.parse(originalStateSnapshot);
        // Only update data, retain view state
        State.groups = parsed.groups || [];
        State.members = parsed.members || [];
        State.templates = parsed.templates || [];
        State.savedNotes = parsed.savedNotes || [];
    }
    hideSaveDiscardBanner();
    
    // Re-render
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderGroupDetails === 'function' && State.selectedGroupId) {
        renderGroupDetails();
        const member = State.members.find(m => m.id === State.selectedMemberId);
        const group = State.groups.find(g => g.id === State.selectedGroupId);
        if (member && group && typeof renderChecklist === 'function') {
            renderChecklist(member, group);
        }
    }
}

function showSaveDiscardBanner() {
    const banner = document.getElementById('save-discard-banner');
    if (banner) banner.classList.add('visible');
}

function hideSaveDiscardBanner() {
    const banner = document.getElementById('save-discard-banner');
    if (banner) banner.classList.remove('visible');
}

document.addEventListener('DOMContentLoaded', () => {
    const btnSave = document.getElementById('btn-save-changes');
    const btnDiscard = document.getElementById('btn-discard-changes');
    if (btnSave) btnSave.addEventListener('click', () => commitState());
    if (btnDiscard) btnDiscard.addEventListener('click', () => discardState());
});


// Helper to generate Unique IDs
function generateUUID() {
    return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// Helper to format YYYY-MM-DD input date to DD/MM/YYYY for display
function formatInputDateToDisplay(dateStr) {
    if (!dateStr) return '--';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

// Helper to calculate calendar month label based on group scheme start date
function getMonthLabel(group, monthNum) {
    const startMonth = group.startMonth !== undefined ? parseInt(group.startMonth) : new Date(group.createdAt).getMonth();
    const startYear = group.startYear !== undefined ? parseInt(group.startYear) : new Date(group.createdAt).getFullYear();
    
    const date = new Date(startYear, startMonth + monthNum - 1, 1);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

