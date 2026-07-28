// --- Initializing App ---
document.addEventListener('DOMContentLoaded', () => {
    // [PHASE 4] Debounce lucide.createIcons to prevent main thread freezing
    if (typeof lucide !== 'undefined' && typeof window.lucideOriginalCreateIcons === 'undefined') {
        window.lucideOriginalCreateIcons = lucide.createIcons;
        let iconRaf;
        lucide.createIcons = function(options) {
            if (iconRaf) cancelAnimationFrame(iconRaf);
            iconRaf = requestAnimationFrame(() => {
                window.lucideOriginalCreateIcons.call(lucide, options);
            });
        };
    }

    // Initialize Theme
    setupTheme();
    initAppearanceSettings();

    // Load data from localStorage
    loadState();
    
    // Setup Navigation & Routing
    setupRouting();
    
    // Setup Action Listeners
    setupEventListeners();
    
    // Initial Render
    const lastScreen = localStorage.getItem('pms_last_active_screen');
    const lastGroup = localStorage.getItem('pms_last_active_group');
    
    if (lastScreen && document.getElementById(lastScreen)) {
        if (lastScreen === 'screen-group-details' && lastGroup) {
            State.selectedGroupId = lastGroup;
        }
        switchView(lastScreen);
    } else {
        switchView('screen-dashboard');
    }
    // Update live clock in status bar
    updateStatusBarClock();
    setInterval(updateStatusBarClock, 60000);

    // Set time-based greeting on dashboard
    const greetEl = document.getElementById('db-greeting-text');
    if (greetEl) {
        const h = new Date().getHours();
        greetEl.textContent = h < 12 ? 'Good morning ðŸ‘‹' : h < 17 ? 'Good afternoon ðŸ‘‹' : 'Good evening ðŸ‘‹';
    }
    
    // Initialize Lucide Icons
    lucide.createIcons();
});

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
    // --- Note Management ---
    const btnAddNote = document.getElementById('btn-add-note');
    const btnDelNote = document.getElementById('btn-delete-note');
    const noteInput = document.getElementById('gpay-note-input');
    
    if (btnAddNote && noteInput) {
        btnAddNote.addEventListener('click', () => {
            const val = noteInput.value.trim();
            if (val && !State.savedNotes.some(n => n.toUpperCase() === val.toUpperCase())) {
                State.savedNotes.push(val);
                saveState();
                renderSavedNotesList();
                showNotification('Note added to saved list', 'success');
            } else if (val) {
                showNotification('Note is already in the list', 'info');
            }
        });
    }
    
    if (btnDelNote && noteInput) {
        btnDelNote.addEventListener('click', () => {
            const val = noteInput.value.trim();
            if (val) {
                const initialLength = State.savedNotes.length;
                State.savedNotes = State.savedNotes.filter(n => n.toUpperCase() !== val.toUpperCase());
                if (State.savedNotes.length < initialLength) {
                    saveState();
                    renderSavedNotesList();
                    noteInput.value = '';
                    showNotification('Note deleted from list', 'info');
                } else {
                    showNotification('Note not found in saved list', 'error');
                }
            }
        });
    }

    // --- Global Document Clicks ---
    document.addEventListener('click', (e) => {
        // Handle Custom Month Dropdown Click Outside
        const menu = document.getElementById('custom-month-dropdown-menu');
        const btn = document.getElementById('custom-month-dropdown-btn');
        if (menu && btn) {
            if (btn.contains(e.target)) {
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            } else if (!menu.contains(e.target)) {
                menu.style.display = 'none';
            }
        }
    });

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
        const endStr = `${monthNames[endDate.getMonth()]} ${endDate.getFullYear()}`;        document.getElementById('preview-group-months').textContent = `${State.tempGroup.duration} Months (${startStr} - ${endStr})`;
        document.getElementById('preview-group-installment').textContent = '₹' + State.tempGroup.monthlyInstallment.toLocaleString('en-IN', { maximumFractionDigits: 2 }) + '/mo';
        
        // Reset inputs when loading Add Members screen
        document.getElementById('member-mobile-input').value = '';
        document.getElementById('member-work-input').value = '';
        document.getElementById('member-occupation-input').value = '';
        document.getElementById('member-place-input').value = '';
        document.getElementById('member-address-input').value = '';
        const defTypeCStart = document.querySelector('input[name="member-customer-type"][value="New"]');
        if (defTypeCStart) defTypeCStart.checked = true;
        document.getElementById('member-referred-input').value = '';
        document.getElementById('member-dob-input').value = '';
        document.getElementById('member-anniversary-input').value = '';
        const mDatesContainerStart = document.getElementById('member-new-dates-container');
        if (mDatesContainerStart) mDatesContainerStart.style.display = 'grid';

        renderTempMembersList();
        switchView('screen-add-members');
    });
    
    // --- Add Members Screen ---
    const addMemberInput = document.getElementById('member-name-input');
    const addMemberBtn = document.getElementById('btn-add-member-list');
    
    // Listen for customer type change to toggle date inputs in Form 1
    document.querySelectorAll('input[name="member-customer-type"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const container = document.getElementById('member-new-dates-container');
            if (container) {
                container.style.display = (radio.value === 'Old') ? 'none' : 'grid';
            }
        });
    });

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
                document.getElementById('member-dob-input').value = match.dob || '';
                document.getElementById('member-anniversary-input').value = match.anniversary || '';
                
                const container = document.getElementById('member-new-dates-container');
                if (container) {
                    container.style.display = (match.customerType === 'Old') ? 'none' : 'grid';
                }
            } else {
                document.getElementById('member-mobile-input').value = '';
                document.getElementById('member-work-input').value = '';
                document.getElementById('member-occupation-input').value = '';
                document.getElementById('member-place-input').value = '';
                document.getElementById('member-address-input').value = '';
                const defTypeC = document.querySelector('input[name="member-customer-type"][value="New"]');
                if (defTypeC) defTypeC.checked = true;
                document.getElementById('member-referred-input').value = '';
                document.getElementById('member-dob-input').value = '';
                document.getElementById('member-anniversary-input').value = '';
                
                const container = document.getElementById('member-new-dates-container');
                if (container) {
                    container.style.display = 'grid';
                }
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
        const mDOB = mCustomerType === 'New' ? document.getElementById('member-dob-input').value : '';
        const mAnniversary = mCustomerType === 'New' ? document.getElementById('member-anniversary-input').value : '';

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
            referredBy: mReferredBy,
            dob: mDOB,
            anniversary: mAnniversary
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
        document.getElementById('member-dob-input').value = '';
        document.getElementById('member-anniversary-input').value = '';
        
        const container = document.getElementById('member-new-dates-container');
        if (container) {
            container.style.display = 'grid';
        }

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
                dob: memberData.dob || '',
                anniversary: memberData.anniversary || '',
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
        document.getElementById('new-member-mobile-input').value = '';
        document.getElementById('new-member-place-input').value = '';
        document.getElementById('new-member-work-input').value = '';
        document.getElementById('new-member-occupation-input').value = '';
        document.getElementById('new-member-address-input').value = '';
        const defTypeNew = document.querySelector('input[name="new-member-customer-type"][value="New"]');
        if (defTypeNew) defTypeNew.checked = true;
        document.getElementById('new-member-referred-input').value = '';
        document.getElementById('new-member-dob-input').value = '';
        document.getElementById('new-member-anniversary-input').value = '';
        
        const qDatesContainer = document.getElementById('quick-add-member-dates-container');
        if (qDatesContainer) {
            qDatesContainer.style.display = '';
        }
        
        document.getElementById('add-member-modal-backdrop').classList.add('active');
        document.getElementById('new-member-name-input').focus();
    });
    
    document.getElementById('btn-close-add-member-modal').addEventListener('click', () => {
        document.getElementById('add-member-modal-backdrop').classList.remove('active');
    });
    
    document.getElementById('btn-cancel-add-member').addEventListener('click', () => {
        document.getElementById('add-member-modal-backdrop').classList.remove('active');
    });
    
    // Listen for customer type change to toggle date inputs in Form 3
    document.querySelectorAll('input[name="new-member-customer-type"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const container = document.getElementById('quick-add-member-dates-container');
            if (container) {
                container.style.display = (radio.value === 'Old') ? 'none' : '';
            }
        });
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
                document.getElementById('new-member-dob-input').value = match.dob || '';
                document.getElementById('new-member-anniversary-input').value = match.anniversary || '';
                
                const qDatesContainer = document.getElementById('quick-add-member-dates-container');
                if (qDatesContainer) {
                    qDatesContainer.style.display = (match.customerType === 'Old') ? 'none' : '';
                }
            } else {
                document.getElementById('new-member-mobile-input').value = '';
                document.getElementById('new-member-work-input').value = '';
                document.getElementById('new-member-occupation-input').value = '';
                document.getElementById('new-member-place-input').value = '';
                document.getElementById('new-member-address-input').value = '';
                const defTypeNew = document.querySelector('input[name="new-member-customer-type"][value="New"]');
                if (defTypeNew) defTypeNew.checked = true;
                document.getElementById('new-member-referred-input').value = '';
                document.getElementById('new-member-dob-input').value = '';
                document.getElementById('new-member-anniversary-input').value = '';
                
                const qDatesContainer = document.getElementById('quick-add-member-dates-container');
                if (qDatesContainer) {
                    qDatesContainer.style.display = '';
                }
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
            
            // Fade out container
            const dashboardContainer = document.querySelector('.dashboard-container');
            if (dashboardContainer) {
                dashboardContainer.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
                dashboardContainer.style.opacity = '0';
                dashboardContainer.style.transform = 'scale(0.98)';
            }
            
            await new Promise(r => setTimeout(r, 200));
            
            await loadState();
            renderDashboard();
            
            // Fade back in
            if (dashboardContainer) {
                dashboardContainer.style.opacity = '1';
                dashboardContainer.style.transform = 'scale(1)';
            }
            
            setTimeout(() => {
                if (icon) icon.classList.remove('spin-anim');
            }, 300);
            
            if (typeof showNotification === 'function') showNotification('Data refreshed', 'info');
        });
    }

    // Mobile quick-action bar â€” delegates to desktop button clicks
    const mobileButtonMap = {
        'btn-global-refresh-m': 'btn-global-refresh',
        'btn-privacy-toggle-m': 'btn-privacy-toggle',
        'btn-global-export-pdf-m': 'btn-global-export-pdf',
        'btn-toggle-theme-m': 'btn-toggle-theme-desktop',
    };
    Object.entries(mobileButtonMap).forEach(([mobileId, desktopId]) => {
        const mobileBtn = document.getElementById(mobileId);
        const desktopBtn = document.getElementById(desktopId);
        if (mobileBtn && desktopBtn) {
            mobileBtn.addEventListener('click', () => desktopBtn.click());
        }
    });

    // Global Privacy Mode Toggle Button
    const btnPrivacyToggle = document.getElementById('btn-privacy-toggle');
    if (btnPrivacyToggle) {
        // Init state from localStorage
        const isPrivacyActive = localStorage.getItem('pms_privacy_mode') === 'true';
        if (isPrivacyActive) {
            document.body.classList.add('privacy-mode-active');
            const icon = document.getElementById('privacy-eye-icon');
            if (icon) {
                icon.setAttribute('data-lucide', 'eye-off');
            }
        }
        
        btnPrivacyToggle.addEventListener('click', () => {
            const isActive = document.body.classList.toggle('privacy-mode-active');
            localStorage.setItem('pms_privacy_mode', isActive ? 'true' : 'false');
            const icon = document.getElementById('privacy-eye-icon');
            if (icon) {
                if (isActive) {
                    icon.setAttribute('data-lucide', 'eye-off');
                } else {
                    icon.setAttribute('data-lucide', 'eye');
                }
                if (window.lucide) window.lucide.createIcons();
            }
        });
    }

    // Global PDF Export Modal Bindings
    const btnGlobalExportPdf = document.getElementById('btn-global-export-pdf');
    if (btnGlobalExportPdf) {
        btnGlobalExportPdf.addEventListener('click', () => {
            const yearSelectEl = document.getElementById('yearly-pdf-export-year-select');
            const chitSelectEl = document.getElementById('chit-pdf-export-month-select');
            if(yearSelectEl) yearSelectEl.innerHTML = '';
            if(chitSelectEl) chitSelectEl.innerHTML = '';
            
            let monthKeys = new Set();
            let years = new Set();
            
            // Always add current real-world month and year
            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonthKey = `${currentYear}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            monthKeys.add(currentMonthKey);
            years.add(currentYear);
            
            State.groups.forEach(group => {
                const startMonth = group.startMonth !== undefined ? parseInt(group.startMonth) : new Date(group.createdAt).getMonth();
                const startYear = group.startYear !== undefined ? parseInt(group.startYear) : new Date(group.createdAt).getFullYear();
                
                let date = new Date(startYear, startMonth, 1);
                for (let i = 0; i < group.duration; i++) {
                    const y = date.getFullYear();
                    const mStr = `${y}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    monthKeys.add(mStr);
                    years.add(y);
                    date.setMonth(date.getMonth() + 1);
                }
            });
            
            // Populate Year Select
            if (yearSelectEl) {
                let sortedYears = Array.from(years).sort((a,b) => b - a);
                sortedYears.forEach(y => {
                    const opt = document.createElement('option');
                    opt.value = y;
                    opt.textContent = y;
                    if (y === currentYear) opt.selected = true;
                    yearSelectEl.appendChild(opt);
                });
            }

            // Populate Month Select
            if (chitSelectEl) {
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
                    chitSelectEl.appendChild(opt);
                });
            }
            
            document.getElementById('global-pdf-export-modal-backdrop').classList.add('active');
        });
    }

    const btnCloseGlobalPdfModal = document.getElementById('btn-close-global-pdf-export-modal');
    if (btnCloseGlobalPdfModal) {
        btnCloseGlobalPdfModal.addEventListener('click', () => {
            document.getElementById('global-pdf-export-modal-backdrop').classList.remove('active');
        });
    }

    // Modal Tabs Logic
    const tabYearly = document.getElementById('tab-yearly-report');
    const tabChit = document.getElementById('tab-chit-report');
    const sectionYearly = document.getElementById('section-yearly-report');
    const sectionChit = document.getElementById('section-chit-report');
    
    if(tabYearly && tabChit && sectionYearly && sectionChit) {
        tabYearly.addEventListener('click', () => {
            tabYearly.style.backgroundColor = 'rgba(217, 119, 6, 0.1)';
            tabYearly.style.color = 'var(--primary)';
            tabYearly.style.borderColor = 'var(--primary)';
            
            tabChit.style.backgroundColor = 'transparent';
            tabChit.style.color = 'var(--text-muted)';
            tabChit.style.borderColor = 'transparent';
            
            sectionYearly.style.display = 'block';
            sectionChit.style.display = 'none';
        });
        
        tabChit.addEventListener('click', () => {
            tabChit.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
            tabChit.style.color = '#6366f1';
            tabChit.style.borderColor = '#6366f1';
            
            tabYearly.style.backgroundColor = 'transparent';
            tabYearly.style.color = 'var(--text-muted)';
            tabYearly.style.borderColor = 'transparent';
            
            sectionYearly.style.display = 'none';
            sectionChit.style.display = 'block';
        });
    }

    // Bind new generate buttons
    const btnGenerateYearlyPdf = document.getElementById('btn-generate-yearly-pdf');
    if (btnGenerateYearlyPdf) {
        btnGenerateYearlyPdf.addEventListener('click', () => {
            const overlay = document.getElementById('pdf-loading-overlay');
            if (overlay) overlay.style.display = 'flex';
            setTimeout(() => {
                generateYearlyPdfReport();
            }, 50);
        });
    }
    const btnGenerateChitPdf = document.getElementById('btn-generate-chit-pdf');
    if (btnGenerateChitPdf) {
        btnGenerateChitPdf.addEventListener('click', () => generateChitTakenPdfReport());
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

    // Quick Dashboard Report
    const btnQuickDashboardReport = document.getElementById('btn-quick-dashboard-report');
    const quickReportMenu = document.getElementById('quick-report-dropdown-menu');
    const btnQuickReportDownload = document.getElementById('btn-quick-report-download');
    const btnQuickReportShare = document.getElementById('btn-quick-report-share');
    
    if (btnQuickDashboardReport && quickReportMenu) {
        btnQuickDashboardReport.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = quickReportMenu.style.display === 'block';
            document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none'); // close others
            quickReportMenu.style.display = isVisible ? 'none' : 'block';
        });
        
        // Close menu on click outside
        document.addEventListener('click', (e) => {
            if (!btnQuickDashboardReport.contains(e.target) && !quickReportMenu.contains(e.target)) {
                quickReportMenu.style.display = 'none';
            }
        });
        
        function handleQuickReport(mode) {
            quickReportMenu.style.display = 'none';
            let monthKey = State.dashboardSelectedMonth || 'current';
            
            if (monthKey === 'accumulated') {
                showNotification("Cannot generate a date-wise report for 'All Dues'. Please select a specific month.", "warning");
                return;
            }
            
            // If current, get the 1-indexed month key
            if (monthKey === 'current') {
                const today = new Date();
                monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            } else {
                // dashboardSelectedMonth uses 0-indexed month (e.g. 2026-06 for July). Convert to 1-indexed.
                const [y, mStr] = monthKey.split('-');
                const m1Indexed = parseInt(mStr, 10) + 1;
                monthKey = `${y}-${String(m1Indexed).padStart(2, '0')}`;
            }
            
            const dateFilterEl = document.getElementById('dashboard-date-filter');
            const dayValue = dateFilterEl && dateFilterEl.value !== '' ? dateFilterEl.value : 'all';
            
            // Populate global export month select to ensure options exist
            const globalMonthSelect = document.getElementById('global-pdf-export-month-select');
            const globalDaySelect = document.getElementById('global-pdf-export-day-select');
            
            if (globalMonthSelect) {
                // Check if option exists
                let optionExists = false;
                for (let i = 0; i < globalMonthSelect.options.length; i++) {
                    if (globalMonthSelect.options[i].value === monthKey) {
                        optionExists = true;
                        break;
                    }
                }
                if (!optionExists) {
                    const opt = document.createElement('option');
                    opt.value = monthKey;
                    globalMonthSelect.appendChild(opt);
                }
                globalMonthSelect.value = monthKey;
            }
            
            if (globalDaySelect) {
                globalDaySelect.value = dayValue;
            }
            
            const tagFilterEl = document.getElementById('dashboard-tag-filter');
            const activeFilter = tagFilterEl ? tagFilterEl.value : 'all';
            
            // Show loading overlay immediately before yielding thread
            const overlay = document.getElementById('pdf-loading-overlay');
            if (overlay) overlay.style.display = 'flex';
            
            // Yield main thread to allow browser to paint UI (fixes INP issue)
            setTimeout(() => {
                if (activeFilter === 'chit_taken') {
                    generateChitTakenPdfReport(monthKey, mode);
                } else {
                    generateGlobalPdfReport(mode);
                }
            }, 50);
        }
        
        if (btnQuickReportDownload) {
            btnQuickReportDownload.addEventListener('click', () => handleQuickReport('download'));
        }
        if (btnQuickReportShare) {
            btnQuickReportShare.addEventListener('click', () => handleQuickReport('share'));
        }
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
    const btnMarkAll = document.getElementById('btn-modal-mark-all');
    if (btnMarkAll) {
        btnMarkAll.addEventListener('click', () => {
            bulkTogglePayments(true);
        });
    }
    
    const btnUnmarkAll = document.getElementById('btn-modal-unmark-all');
    if (btnUnmarkAll) {
        btnUnmarkAll.addEventListener('click', () => {
            bulkTogglePayments(false);
        });
    }

    // Inline Member Profile Editor event listeners
    // Listen for customer type change to toggle date inputs in Form 2
    document.querySelectorAll('input[name="edit-member-customer-type"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const editDatesContainer = document.getElementById('edit-member-new-dates-container');
            if (editDatesContainer) {
                editDatesContainer.style.display = (radio.value === 'Old') ? 'none' : 'grid';
            }
        });
    });

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
            
            // Populate DOB & Anniversary
            document.getElementById('edit-member-dob').value = member.dob || '';
            document.getElementById('edit-member-anniversary').value = member.anniversary || '';
            
            const editDatesContainer = document.getElementById('edit-member-new-dates-container');
            if (editDatesContainer) {
                editDatesContainer.style.display = (member.customerType === 'Old') ? 'none' : 'grid';
            }
            
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
            
            // Save DOB & Anniversary if New Customer
            member.dob = member.customerType === 'New' ? document.getElementById('edit-member-dob').value : '';
            member.anniversary = member.customerType === 'New' ? document.getElementById('edit-member-anniversary').value : '';

            saveState();
            
            // Refresh modal UI
            openPaymentModal(member.id);
            
            // Re-render behind scenes
            if (State.selectedGroupId) {
                renderGroupDetails(State.selectedGroupId);
            }
            
            // Force completely clean dashboard re-render
            const tagFilter = document.getElementById('dashboard-tag-filter');
            if (tagFilter) {
                State.dashboardFilter = tagFilter.value;
            } else {
                const activeDashFilterPill = document.querySelector('#dashboard-filter-pills .filter-pill.active');
                if (activeDashFilterPill) {
                    State.dashboardFilter = activeDashFilterPill.getAttribute('data-dashfilter');
                }
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
    
    // Populate the custom dropdown menu
    const customMenu = document.getElementById('custom-month-dropdown-menu');
    const customText = document.getElementById('custom-month-dropdown-text');
    if (customMenu && customText) {
        customMenu.innerHTML = '';
        
        // Helper to update text
        const updateCustomText = (val) => {
            if (val === 'accumulated') customText.textContent = 'All Dues (Accumulated)';
            else if (val === 'current') customText.textContent = `Current Month (${currentMonthLabel})`;
            else {
                const found = allMonths.find(m => m.value === val);
                customText.textContent = found ? found.label : val;
            }
        };
        updateCustomText(State.dashboardSelectedMonth);

        // Helper to create custom options
        const createCustomOption = (val, text) => {
            const btn = document.createElement('button');
            btn.className = 'dropdown-item';
            btn.textContent = text;
            if (val === State.dashboardSelectedMonth) {
                btn.style.backgroundColor = 'var(--primary-glow)';
                btn.style.color = 'var(--primary)';
                btn.style.fontWeight = '700';
            }
            btn.addEventListener('click', () => {
                dropdown.value = val;
                dropdown.dispatchEvent(new Event('change'));
                customMenu.style.display = 'none';
            });
            return btn;
        };

        customMenu.appendChild(createCustomOption('accumulated', 'All Dues (Accumulated)'));
        customMenu.appendChild(createCustomOption('current', `Current Month (${currentMonthLabel})`));
        
        if (allMonths.length > 0) {
            const div = document.createElement('div');
            div.className = 'dropdown-divider';
            customMenu.appendChild(div);
        }
        
        allMonths.forEach(item => {
            customMenu.appendChild(createCustomOption(item.value, item.label));
        });

        // Add Custom Date Range option at the bottom
        const dividerEnd = document.createElement('div');
        dividerEnd.className = 'dropdown-divider';
        customMenu.appendChild(dividerEnd);
        const customRangeBtn = document.createElement('button');
        customRangeBtn.className = 'dropdown-item';
        customRangeBtn.style.cssText = 'color: var(--primary); font-weight: 700; display: flex; align-items: center; gap: 8px;';
        const hasActiveRange = State.dashboardDateRangeFrom && State.dashboardDateRangeTo;
        customRangeBtn.innerHTML = `<i data-lucide="calendar-range" style="width:14px; height:14px;"></i> ${hasActiveRange ? 'Custom Range (Active)' : 'Custom Date Range...'}`;
        if (hasActiveRange) {
            customRangeBtn.style.backgroundColor = 'var(--primary-glow)';
        }
        customRangeBtn.addEventListener('click', () => {
            customMenu.style.display = 'none';
            const modal = document.getElementById('custom-date-range-modal');
            if (modal) {
                modal.style.display = 'flex';
                if (window.lucide) window.lucide.createIcons();
                const fromInput = document.getElementById('date-range-from');
                const toInput = document.getElementById('date-range-to');
                if (fromInput && State.dashboardDateRangeFrom) fromInput.value = State.dashboardDateRangeFrom;
                if (toInput && State.dashboardDateRangeTo) toInput.value = State.dashboardDateRangeTo;
            }
        });
        customMenu.appendChild(customRangeBtn);
    }
}

// 1. Dashboard Renderer
let renderDashboardRAF = null;
function renderDashboard() {
    if (renderDashboardRAF) cancelAnimationFrame(renderDashboardRAF);
    renderDashboardRAF = requestAnimationFrame(_renderDashboard);
}

function _renderDashboard() {
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
            
            // Re-render dropdown to update selected state
            populateDashboardMonthDropdown();
        });
    }

    // Bind search field logic
    const searchInput = document.getElementById('dashboard-member-search');
    const btnClearSearch = document.getElementById('btn-clear-dashboard-search');
    if (searchInput) {
        // Remove old listeners by cloning
        const newSearch = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearch, searchInput);
        
        let newBtnClear = null;
        if (btnClearSearch) {
            newBtnClear = btnClearSearch.cloneNode(true);
            btnClearSearch.parentNode.replaceChild(newBtnClear, btnClearSearch);
        }
        
        const syncClearBtn = () => {
            const currentVal = document.getElementById('dashboard-member-search')?.value || '';
            const clearBtn = document.getElementById('btn-clear-dashboard-search');
            if (clearBtn) clearBtn.style.display = currentVal.length > 0 ? 'flex' : 'none';
        };

        newSearch.addEventListener('input', () => {
            syncClearBtn();
            renderDashboardMembersList(newSearch.value.toLowerCase().trim());
        });
        
        if (newBtnClear) {
            syncClearBtn();
            newBtnClear.addEventListener('click', () => {
                const currentSearch = document.getElementById('dashboard-member-search');
                if (currentSearch) currentSearch.value = '';
                newBtnClear.style.display = 'none';
                renderDashboardMembersList('');
            });
        }
    }

    // Modal life cycles for Groups view WIZARD
    const toggleToGroupsBtn = document.getElementById('btn-toggle-to-groups');
    const groupsModal = document.getElementById('groups-list-modal-backdrop');
    const closeGroupsModalBtn = document.getElementById('btn-close-groups-modal');

    // Wizard state
    let wizardState = {
        year: new Date().getFullYear(),
        month: null,
        amount: null,
        duration: null
    };

    function showWizardStep(stepNum) {
        document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active-step'));
        document.getElementById(`wizard-step-${stepNum}`).classList.add('active-step');
        
        const backBtn = document.getElementById('btn-wizard-back');
        if (stepNum > 1) {
            backBtn.style.display = 'block';
            backBtn.onclick = () => {
                if (stepNum === 2) renderWizardStep1();
                else if (stepNum === 3) renderWizardStep2();
                else if (stepNum === 4) renderWizardStep3();
            };
        } else {
            backBtn.style.display = 'none';
        }
    }

    function formatAmount(num) {
        if (isNaN(num)) return "0";
        if (num >= 100000) return (num / 100000) + 'L';
        if (num >= 1000) return (num / 1000) + 'K';
        return num.toString();
    }

    function extractNumericAmount(g) {
        let raw = g.chitAmount || g.amount || (g.monthlyInstallment ? parseFloat(g.monthlyInstallment) * parseInt(g.duration) : 0);
        if (typeof raw === 'string') {
            raw = parseFloat(raw.replace(/,/g, '').replace(/[^0-9.]/g, ''));
        }
        return isNaN(raw) ? 0 : raw;
    }

    function extractNumericDuration(g) {
        let raw = g.duration;
        if (typeof raw === 'string') raw = parseInt(raw.replace(/[^0-9]/g, ''), 10);
        return isNaN(raw) ? 12 : raw;
    }

    function renderWizardStep1() {
        showWizardStep(1);
        document.getElementById('wizard-title').textContent = 'Select Month';
        document.getElementById('wizard-year-display').textContent = wizardState.year;
        
        const grid = document.getElementById('wizard-calendar-grid');
        if (!grid) return;
        grid.innerHTML = '';
        
        const mNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        
        // Find which months have groups for the selected year
        const activeMonths = new Set();
        State.groups.forEach(g => {
            const y = g.startYear !== undefined ? parseInt(g.startYear) : new Date(g.createdAt).getFullYear();
            const m = g.startMonth !== undefined ? parseInt(g.startMonth) : new Date(g.createdAt).getMonth();
            if (y === wizardState.year) {
                activeMonths.add(m);
            }
        });
        
        mNames.forEach((monthName, idx) => {
            const card = document.createElement('div');
            card.className = 'wizard-month-card';
            if (!activeMonths.has(idx)) {
                card.classList.add('disabled');
            }
            
            card.innerHTML = `
                <div class="wizard-month-top">${wizardState.year}</div>
                <div class="wizard-month-body">${monthName}</div>
            `;
            
            card.onclick = () => {
                if (activeMonths.has(idx)) {
                    wizardState.month = idx;
                    renderWizardStep2();
                }
            };
            grid.appendChild(card);
        });
    }

    function renderWizardStep2() {
        showWizardStep(2);
        document.getElementById('wizard-title').textContent = 'Select Duration';
        
        const chipsContainer = document.getElementById('wizard-duration-chips');
        if (!chipsContainer) return;
        chipsContainer.innerHTML = '';
        
        // Filter groups for chosen year and month
        const matchedGroups = State.groups.filter(g => {
            const y = g.startYear !== undefined ? parseInt(g.startYear) : new Date(g.createdAt).getFullYear();
            const m = g.startMonth !== undefined ? parseInt(g.startMonth) : new Date(g.createdAt).getMonth();
            return y === wizardState.year && m === wizardState.month;
        });

        if (matchedGroups.length === 0) {
            chipsContainer.innerHTML = '<p style="color: var(--text-secondary);">No groups found. Please go back.</p>';
            return;
        }
        
        const durations = new Set();
        matchedGroups.forEach(g => {
            durations.add(extractNumericDuration(g));
        });
        
        // Sort durations
        const sortedDurations = Array.from(durations).sort((a,b) => a - b);
        
        sortedDurations.forEach(dur => {
            const chip = document.createElement('button');
            chip.className = 'wizard-chip';
            chip.textContent = `${dur} Months`;
            chip.onclick = () => {
                wizardState.duration = dur;
                renderWizardStep3();
            };
            chipsContainer.appendChild(chip);
        });
    }

    function renderWizardStep3() {
        showWizardStep(3);
        document.getElementById('wizard-title').textContent = 'Select Scheme Amount';
        
        const chipsContainer = document.getElementById('wizard-amount-chips');
        if (!chipsContainer) return;
        chipsContainer.innerHTML = '';
        
        // Filter groups for chosen year, month, and duration
        const matchedGroups = State.groups.filter(g => {
            const y = g.startYear !== undefined ? parseInt(g.startYear) : new Date(g.createdAt).getFullYear();
            const m = g.startMonth !== undefined ? parseInt(g.startMonth) : new Date(g.createdAt).getMonth();
            const dur = extractNumericDuration(g);
            return y === wizardState.year && m === wizardState.month && dur === wizardState.duration;
        });
        
        if (matchedGroups.length === 0) {
            chipsContainer.innerHTML = '<p style="color: var(--text-secondary);">No amounts found. Please go back.</p>';
            return;
        }

        const amounts = new Set();
        matchedGroups.forEach(g => amounts.add(extractNumericAmount(g)));
        
        const sortedAmounts = Array.from(amounts).sort((a,b) => a - b);
        
        sortedAmounts.forEach(amt => {
            const chipGroups = matchedGroups.filter(g => extractNumericAmount(g) === amt);
            let totalMembers = 0;
            chipGroups.forEach(g => {
                totalMembers += State.members.filter(m => m.groupId === g.id).length;
            });
            
            const chip = document.createElement('button');
            chip.className = 'wizard-chip';
            chip.style.display = 'flex';
            chip.style.flexDirection = 'column';
            chip.style.alignItems = 'center';
            chip.style.gap = '4px';
            
            const amtText = document.createElement('span');
            amtText.textContent = formatAmount(amt);
            amtText.style.fontWeight = '800';
            amtText.style.fontSize = '1.1rem';
            
            const metaText = document.createElement('span');
            if (chipGroups.length > 1) {
                metaText.textContent = `${chipGroups.length} Groups â€¢ ${totalMembers} Mbrs`;
            } else {
                metaText.textContent = `${totalMembers} Members`;
            }
            metaText.style.fontSize = '0.75rem';
            metaText.style.fontWeight = '600';
            metaText.style.opacity = '0.85';
            
            chip.appendChild(amtText);
            chip.appendChild(metaText);
            
            chip.onclick = () => {
                wizardState.amount = amt;
                if (chipGroups.length === 1) {
                    // Bypass Step 4 and directly open the group details
                    State.selectedGroupId = chipGroups[0].id;
                    const modal = document.getElementById('groups-list-modal-backdrop');
                    if (modal) modal.classList.remove('active');
                    switchView('screen-group-details');
                } else {
                    renderWizardStep4();
                }
            };
            chipsContainer.appendChild(chip);
        });
    }

    function renderWizardStep4() {
        showWizardStep(4);
        document.getElementById('wizard-title').textContent = 'Matched Groups';
        
        // Use existing render logic but with filter
        renderDashboardGroupsList({
            year: wizardState.year,
            month: wizardState.month,
            amount: wizardState.amount,
            duration: wizardState.duration
        });
    }

    const yearPrevBtn = document.getElementById('wizard-year-prev');
    const yearNextBtn = document.getElementById('wizard-year-next');
    if (yearPrevBtn) yearPrevBtn.addEventListener('click', () => { wizardState.year--; renderWizardStep1(); });
    if (yearNextBtn) yearNextBtn.addEventListener('click', () => { wizardState.year++; renderWizardStep1(); });

    if (toggleToGroupsBtn && groupsModal) {
        toggleToGroupsBtn.onclick = () => {
            wizardState.year = new Date().getFullYear();
            renderWizardStep1();
            groupsModal.classList.add('active');
        };
    }
    if (closeGroupsModalBtn && groupsModal) {
        closeGroupsModalBtn.onclick = () => {
            groupsModal.classList.remove('active');
        };
    }

    // Toggle custom filter dropdown
    const filterBtn = document.getElementById('filter-dropdown-btn');
    const filterMenu = document.getElementById('filter-dropdown-menu');
    if (filterBtn && filterMenu) {
        // Remove old listeners by cloning
        const newBtn = filterBtn.cloneNode(true);
        filterBtn.parentNode.replaceChild(newBtn, filterBtn);
        
        newBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = filterMenu.style.display === 'block';
            filterMenu.style.display = isVisible ? 'none' : 'block';
        });
        
        // Close menu on click outside
        document.addEventListener('click', (e) => {
            if (!newBtn.contains(e.target) && !filterMenu.contains(e.target)) {
                filterMenu.style.display = 'none';
            }
        });
    }

    // Bind dashboard tag filter select dropdown (kept in sync, hidden in layout)
    const tagFilterSelect = document.getElementById('dashboard-tag-filter');
    if (tagFilterSelect) {
        const newTagSelect = tagFilterSelect.cloneNode(true);
        tagFilterSelect.parentNode.replaceChild(newTagSelect, tagFilterSelect);
        newTagSelect.value = State.dashboardFilter || 'all';
        newTagSelect.addEventListener('change', () => {
            State.dashboardFilter = newTagSelect.value;
            
            // Reset date filter
            State.dashboardFilterDate = '';
            const dSelect = document.getElementById('dashboard-date-filter');
            if (dSelect) dSelect.value = '';
            syncDateDropdownTrigger();
            
            // Sync hidden pills active classes
            document.querySelectorAll('#dashboard-filter-pills .filter-pill').forEach(p => {
                if (p.getAttribute('data-dashfilter') === State.dashboardFilter) {
                    p.classList.add('active');
                } else {
                    p.classList.remove('active');
                }
            });
            
            const searchVal = document.getElementById('dashboard-member-search')?.value.toLowerCase().trim() || '';
            renderDashboardMembersList(searchVal);
        });
    }

    // Bind dashboard filter pills (kept in sync, hidden in layout)
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
            
            // Sync with tag filter select dropdown
            const tagSel = document.getElementById('dashboard-tag-filter');
            if (tagSel) tagSel.value = State.dashboardFilter;
            
            // Reset the date filter dropdown when a status pill is clicked
            State.dashboardFilterDate = '';
            const dSelect = document.getElementById('dashboard-date-filter');
            if (dSelect) dSelect.value = '';
            syncDateDropdownTrigger();

            const searchVal = document.getElementById('dashboard-member-search')?.value.toLowerCase().trim() || '';
            renderDashboardMembersList(searchVal);
        });
    });

    // Bind Custom Date Filter Dropdown
    const dateBtn = document.getElementById('date-dropdown-btn');
    const dateMenu = document.getElementById('date-dropdown-menu');
    const dateGrid = document.getElementById('date-dropdown-grid');
    const clearDateBtn = document.getElementById('btn-clear-date-filter');
    
    if (dateBtn && dateMenu) {
        // Remove old listeners by cloning
        const newDateBtn = dateBtn.cloneNode(true);
        dateBtn.parentNode.replaceChild(newDateBtn, dateBtn);
        
        // Keep selected day text updated
        const updateDateDropdownTrigger = () => {
            const textEl = newDateBtn.querySelector('#date-dropdown-selected-number');
            const monthTextEl = newDateBtn.querySelector('#date-dropdown-month-text');
            
            if (monthTextEl) {
                let activeMonthName = "ALL";
                if (State.dashboardSelectedMonth === 'current' || State.dashboardSelectedMonth === 'accumulated') {
                    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
                    activeMonthName = monthNames[new Date().getMonth()];
                } else if (State.dashboardSelectedMonth) {
                    const parts = State.dashboardSelectedMonth.split('-');
                    if (parts.length === 2) {
                        const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
                        activeMonthName = monthNames[parseInt(parts[1], 10)];
                    }
                }
                monthTextEl.textContent = activeMonthName;
            }
            
            if (textEl) {
                if (State.dashboardFilterDate) {
                    textEl.textContent = State.dashboardFilterDate;
                    textEl.style.fontSize = '14px';
                } else {
                    textEl.textContent = 'ALL';
                    textEl.style.fontSize = '14px';
                }
            }
        };
        updateDateDropdownTrigger();
        
        // Populate the calendar items grid
        const renderDateDropdownMenu = () => {
            if (!dateGrid) return;
            dateGrid.innerHTML = '';
            
            let activeMonthName = "ALL";
            if (State.dashboardSelectedMonth === 'current' || State.dashboardSelectedMonth === 'accumulated') {
                const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
                activeMonthName = monthNames[new Date().getMonth()];
            } else if (State.dashboardSelectedMonth) {
                const parts = State.dashboardSelectedMonth.split('-');
                if (parts.length === 2) {
                    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
                    activeMonthName = monthNames[parseInt(parts[1], 10)];
                }
            }
            
            for (let day = 1; day <= 31; day++) {
                const item = document.createElement('div');
                item.style.cssText = `
                    position: relative; 
                    width: 36px; 
                    height: 38px; 
                    cursor: pointer; 
                    display: inline-flex; 
                    flex-direction: column;
                    align-items: center; 
                    justify-content: flex-start;
                    border-radius: 6px;
                    transition: transform 0.1s ease;
                    background-color: #ffffff;
                    border: 1px solid var(--border);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    overflow: hidden;
                `;
                item.className = 'date-grid-item';
                
                const isSelected = State.dashboardFilterDate && parseInt(State.dashboardFilterDate, 10) === day;
                if (isSelected) {
                    item.style.boxShadow = '0 0 0 2px var(--primary), 0 4px 8px rgba(0,0,0,0.1)';
                    item.style.transform = 'scale(1.05)';
                }
                
                item.innerHTML = `
                    <div style="background: linear-gradient(180deg, #ef4444, #dc2626); color: #fff; width: 100%; text-align: center; font-size: 8px; font-weight: 800; padding: 2px 0; letter-spacing: 0.5px; line-height: 1; border-bottom: 1px solid #b91c1c;">${activeMonthName}</div>
                    <div style="color: #111827; flex: 1; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900; font-family: sans-serif; margin-top: -1px;">${day}</div>
                    <!-- Calendar rings -->
                    <div style="position: absolute; top: -3px; left: 6px; width: 4px; height: 8px; background: #cbd5e1; border-radius: 4px; border: 1px solid #94a3b8; box-shadow: 0 1px 1px rgba(0,0,0,0.3);"></div>
                    <div style="position: absolute; top: -3px; right: 6px; width: 4px; height: 8px; background: #cbd5e1; border-radius: 4px; border: 1px solid #94a3b8; box-shadow: 0 1px 1px rgba(0,0,0,0.3);"></div>
                `;
                
                item.addEventListener('mouseenter', () => {
                    item.style.transform = 'scale(1.1)';
                });
                item.addEventListener('mouseleave', () => {
                    if (!isSelected) item.style.transform = 'scale(1)';
                    else item.style.transform = 'scale(1.05)';
                });
                
                item.addEventListener('click', () => {
                    State.dashboardFilterDate = day.toString();
                    
                    // Sync hidden select
                    const dSelect = document.getElementById('dashboard-date-filter');
                    if (dSelect) dSelect.value = day.toString();
                    
                    updateDateDropdownTrigger();
                    dateMenu.style.display = 'none';
                    
                    const searchVal = document.getElementById('dashboard-member-search')?.value.toLowerCase().trim() || '';
                    renderDashboardMembersList(searchVal);
                });
                
                dateGrid.appendChild(item);
            }
        };
        
        newDateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = dateMenu.style.display === 'block';
            dateMenu.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
                renderDateDropdownMenu();
            }
        });
        
        // Document-level listener to close when clicking outside
        const closeMenuListener = (e) => {
            if (!newDateBtn.contains(e.target) && !dateMenu.contains(e.target)) {
                dateMenu.style.display = 'none';
            }
        };
        document.addEventListener('click', closeMenuListener);
        
        if (clearDateBtn) {
            clearDateBtn.addEventListener('click', () => {
                State.dashboardFilterDate = '';
                const dSelect = document.getElementById('dashboard-date-filter');
                if (dSelect) dSelect.value = '';
                
                updateDateDropdownTrigger();
                dateMenu.style.display = 'none';
                
                const searchVal = document.getElementById('dashboard-member-search')?.value.toLowerCase().trim() || '';
                renderDashboardMembersList(searchVal);
            });
        }
    }

    // Render primary tables
    const searchVal = document.getElementById('dashboard-member-search')?.value.toLowerCase().trim() || '';
    renderDashboardMembersList(searchVal);
}

function renderDashboardGroupsList(filterConfig = null) {
        const container = document.getElementById('group-list-container');
        if (!container) return;
        const fragment = document.createDocumentFragment();
        
        let groupsToRender = [...State.groups];

        // If filterConfig is provided, apply the wizard filters
        if (filterConfig) {
            groupsToRender = groupsToRender.filter(g => {
                const y = g.startYear !== undefined ? parseInt(g.startYear) : new Date(g.createdAt).getFullYear();
                const m = g.startMonth !== undefined ? parseInt(g.startMonth) : new Date(g.createdAt).getMonth();
                const amt = extractNumericAmount(g);
                const dur = extractNumericDuration(g);
                
                return y === filterConfig.year && 
                       m === filterConfig.month && 
                       amt === filterConfig.amount && 
                       dur === filterConfig.duration;
            });
        }

        const countBadge = document.getElementById('modal-total-groups-count');
        if (countBadge) {
            countBadge.textContent = groupsToRender.length;
            // Update title based on whether it's all groups or filtered
            document.getElementById('wizard-title').innerHTML = filterConfig ? `Groups (${groupsToRender.length})` : `Chit Groups`;
        }
        
        if (groupsToRender.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 20px;">
                    <h3>No Chit Groups Found</h3>
                    <p>No groups match your selection.</p>
                </div>
            `;
            return;
        }
        
        // Sort groups chronologically
        const sortedGroups = groupsToRender.sort((a, b) => {
            if (a.startYear !== b.startYear) return a.startYear - b.startYear;
            return a.startMonth - b.startMonth;
        });

    const boxColors = [
        { border: '#3b82f6', bg: 'rgba(59,130,246,0.07)' },
        { border: '#10b981', bg: 'rgba(16,185,129,0.07)' },
        { border: '#f59e0b', bg: 'rgba(245,158,11,0.07)' },
        { border: '#ef4444', bg: 'rgba(239,68,68,0.07)' },
        { border: '#8b5cf6', bg: 'rgba(139,92,246,0.07)' },
        { border: '#ec4899', bg: 'rgba(236,72,153,0.07)' },
        { border: '#06b6d4', bg: 'rgba(6,182,212,0.07)' },
        { border: '#14b8a6', bg: 'rgba(20,184,166,0.07)' }
    ];
    
    const mNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    sortedGroups.forEach((group, index) => {
        const metrics = getGroupMetrics(group.id);
        const card = document.createElement('div');
        card.className = 'group-card';
        card.setAttribute('data-id', group.id);
        
        const colorPair = boxColors[index % boxColors.length];
        card.style.border = `2px solid ${colorPair.border}`;
        // Adaptive background that works in both Light and Dark themes
        card.style.backgroundColor = `var(--bg-surface-elevated)`;
        card.style.backgroundImage = `linear-gradient(${colorPair.bg}, ${colorPair.bg})`;
        card.style.boxShadow = `0 4px 16px ${colorPair.border}30, inset 0 1px 0 rgba(255,255,255,0.05)`;
            
        const schemeAmount = group.chitAmount || group.amount || (group.monthlyInstallment ? group.monthlyInstallment * group.duration : 0);
        
        // Calculate date range labels using month names
        const sMonthIdx = group.startMonth !== undefined ? parseInt(group.startMonth) : new Date(group.createdAt).getMonth();
        const sYear = group.startYear !== undefined ? parseInt(group.startYear) : new Date(group.createdAt).getFullYear();
        const sDateObj = new Date(sYear, sMonthIdx, 1);
        const eDateObj = new Date(sYear, sMonthIdx + group.duration - 1, 1);
        const startLabel = `${mNames[sDateObj.getMonth()]} ${sDateObj.getFullYear()}`;
        const endLabel = `${mNames[eDateObj.getMonth()]} ${eDateObj.getFullYear()}`;

        card.innerHTML = `
            <div class="group-card-header">
                <div class="group-card-title" style="display: flex; align-items: center; color: var(--text-main);">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; background: ${colorPair.border}; color: #fff; font-size: 0.78rem; font-weight: 900; margin-right: 10px; flex-shrink: 0; box-shadow: 0 2px 6px ${colorPair.border}80;">${index + 1}</span>
                    <span style="font-weight: 700; letter-spacing: 0.3px;">${group.name}</span>
                </div>
                <div class="group-card-amount" style="background: linear-gradient(135deg, #9333ea, #7e22ce); color: #ffffff; padding: 4px 10px; border-radius: 8px; border: none; font-weight: 900; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(147,51,234,0.3);">₹${schemeAmount.toLocaleString('en-IN')}</div>
            </div>
            <div class="group-card-info" style="color: var(--text-muted);">
                <div class="info-item">
                    <i data-lucide="users"></i>
                    <span>${metrics.totalMembers} Members</span>
                </div>
                <div class="info-item">
                    <i data-lucide="calendar"></i>
                    <span>${group.duration} Months</span>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 0.74rem; font-weight: 700;">
                <span style="color: #15803d; background: rgba(74,222,128,0.12); border: 1px solid rgba(74,222,128,0.3); padding: 2px 7px; border-radius: 5px; letter-spacing: 0.2px;">${startLabel}</span>
                <span style="color: var(--text-muted); font-weight: 800; font-size: 0.85rem; line-height: 1;">â€”</span>
                <span style="color: #b91c1c; background: rgba(248,113,113,0.12); border: 1px solid rgba(248,113,113,0.3); padding: 2px 7px; border-radius: 5px; letter-spacing: 0.2px;">${endLabel}</span>
            </div>
        `;
        
        card.addEventListener('click', () => {
            State.selectedGroupId = group.id;
            document.getElementById('groups-list-modal-backdrop').classList.remove('active');
            switchView('screen-group-details');
        });
        
        fragment.appendChild(card);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
    lucide.createIcons();
}

function renderDashboardMembersList(searchQuery = '') {
    const listContainer = document.getElementById('dashboard-members-container');
    if (!listContainer) return;
    const fragment = document.createDocumentFragment();

    const selMonth = State.dashboardSelectedMonth || 'current';
    const isAccumulated = selMonth === 'accumulated';
    const { year: targetYear, month: targetMonth } = getTargetCalendarYearMonth(selMonth);

    const hasDateRange = State.dashboardDateRangeFrom && State.dashboardDateRangeTo;
    const rangeFromTs = hasDateRange ? new Date(State.dashboardDateRangeFrom + 'T00:00:00').getTime() : 0;
    const rangeToTs = hasDateRange ? new Date(State.dashboardDateRangeTo + 'T23:59:59').getTime() : 0;

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
            let rangeTotalGpay = 0;
            let rangeTotalCash = 0;
            let paymentNoteThisMonth = null;

            if (hasDateRange) {
                const gStartMonth = group.startMonth !== undefined ? parseInt(group.startMonth) : new Date(group.createdAt).getMonth();
                const gStartYear = group.startYear !== undefined ? parseInt(group.startYear) : new Date(group.createdAt).getFullYear();
                for (let m = 1; m <= group.duration; m++) {
                    const payment = member.payments[m];
                    if (payment && payment.paid) {
                        const instDateObj = new Date(gStartYear, gStartMonth + m - 1, 1);
                        const instMonthTs = instDateObj.getTime();
                        if (instMonthTs >= rangeFromTs && instMonthTs <= rangeToTs) {
                            const instVal = group.installments && group.installments[m] !== undefined ? group.installments[m] : group.monthlyInstallment;
                            paidAmount += instVal;
                            currentMonthPaid = true;
                            if (payment.method === 'gpay') rangeTotalGpay += instVal;
                            if (payment.method === 'cash') rangeTotalCash += instVal;
                            if (payment.note) {
                                if (!paymentNoteThisMonth) paymentNoteThisMonth = payment.note;
                                else if (!paymentNoteThisMonth.includes(payment.note)) paymentNoteThisMonth += ' ' + payment.note;
                            }
                        }
                    }
                }
                displayPaidDate = 'In Range';
            } else if (isAccumulated) {
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
            let payoutMonthNum = null;
            if (member.payments) {
                for (let m = 1; m <= group.duration; m++) {
                    if (member.payments[m] && member.payments[m].payoutClaimed) {
                        hasTakenPayout = true;
                        payoutVal = group.chitAmount;
                        if (group.payouts && group.payouts[m] !== undefined) {
                            payoutVal = group.payouts[m];
                        } else {
                            const matchedTemplate = State.schemeTemplates && State.schemeTemplates.find(t => t.chitAmount === group.chitAmount && t.duration === group.duration);
                            if (matchedTemplate && matchedTemplate.payouts && matchedTemplate.payouts[m] !== undefined) {
                                payoutVal = matchedTemplate.payouts[m];
                            }
                        }
                        payoutMethod = member.payments[m].payoutMethod;
                        payoutDate = member.payments[m].payoutDate;
                        payoutMonthNum = m;
                        break;
                    }
                }
            }

            let paymentMethodThisMonth = null;
            if (hasDateRange) {
                if (rangeTotalGpay > 0 && rangeTotalCash === 0) paymentMethodThisMonth = 'gpay';
                else if (rangeTotalCash > 0 && rangeTotalGpay === 0) paymentMethodThisMonth = 'cash';
                else if (rangeTotalGpay > 0 || rangeTotalCash > 0) paymentMethodThisMonth = 'mixed';
            } else if (isAccumulated) {
                const paymentObj = member.payments[group.currentMonth];
                paymentMethodThisMonth = paymentObj && paymentObj.paid ? paymentObj.method : null;
                paymentNoteThisMonth = paymentObj && paymentObj.paid ? paymentObj.note : null;
            } else {
                const payment = member.payments[relativeMonthNum];
                paymentMethodThisMonth = payment && payment.paid ? payment.method : null;
                paymentNoteThisMonth = payment && payment.paid ? payment.note : null;
            }

            let takenThisSelectedMonth = false;
            if (isAccumulated) {
                takenThisSelectedMonth = hasTakenPayout;
            } else {
                if (hasTakenPayout && payoutDate) {
                    const parts = payoutDate.split('-');
                    if (parts.length === 3) {
                        const pYear = parseInt(parts[0]);
                        const pMonth = parseInt(parts[1]) - 1;
                        if (pYear === targetYear && pMonth === targetMonth) {
                            takenThisSelectedMonth = true;
                        }
                    }
                } else if (hasTakenPayout && !payoutDate) {
                    takenThisSelectedMonth = true;
                }
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
                takenThisSelectedMonth,
                payoutVal,
                payoutMethod,
                payoutDate,
                payoutMonthNum,
                paymentMethodThisMonth,
                paymentNoteThisMonth,
                rangeTotalGpay,
                rangeTotalCash
            });
        });
    });

    // Filter by search query
    let filteredList = allList;
    if (searchQuery) {
        filteredList = allList.filter(item => {
            const matchesName = item.member.name.toLowerCase().includes(searchQuery);
            const matchesNote = item.paymentNoteThisMonth && item.paymentNoteThisMonth.toLowerCase().includes(searchQuery);
            return matchesName || matchesNote;
        });
    }

    // Only exclude members where the selected month is outside the group's range (isApplicable = false)
    // Keep isFuture items â€” they are valid months not yet tracked, and the user wants to see & mark them
    filteredList = filteredList.filter(item => item.isApplicable);

    // Compute status filter counts (excluding future items)
    let countAll = filteredList.length;
    let countPaid = 0;
    let countPartial = 0;
    let countPending = 0;
    let countChitTaken = 0;
    let countChitNotTaken = 0;
    let amountChitTaken = 0;
    let countNewCustomerMonth = 0;
    let countNewCustomer = 0;
    let countGpay = 0;
    let countCash = 0;
    
    let gpayMembers = [];
    let cashMembers = [];

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
        } else {
            countChitNotTaken++;
        }
        
        if (item.takenThisSelectedMonth) {
            amountChitTaken += item.payoutVal;
        }

        if (item.member.customerType === 'New') {
            countNewCustomer++;
            if (item.relativeMonthNum === 1) countNewCustomerMonth++;
        }
        
        if (item.paymentMethodThisMonth === 'gpay') {
            countGpay++;
            const label = item.paymentNoteThisMonth && item.paymentNoteThisMonth.trim() !== '' ? item.paymentNoteThisMonth.trim() : item.member.name;
            gpayMembers.push(label);
        } else if (item.paymentMethodThisMonth === 'cash') {
            countCash++;
            const label = item.paymentNoteThisMonth && item.paymentNoteThisMonth.trim() !== '' ? item.paymentNoteThisMonth.trim() : item.member.name;
            cashMembers.push(label);
        }
    });

    // Update pill badges
    const dashCountAll = document.getElementById('dash-count-all');
    const dashCountPaid = document.getElementById('dash-count-paid');
    const dashCountPartial = document.getElementById('dash-count-partial');
    const dashCountPending = document.getElementById('dash-count-pending');
    const dashCountChitTaken = document.getElementById('dash-count-chit-taken');
    const dashCountChitNotTaken = document.getElementById('dash-count-chit-not-taken');
    const dashCountNewCustomerMonth = document.getElementById('dash-count-new-customer-month');
    const dashCountNewCustomer = document.getElementById('dash-count-new-customer');
    const dashCountGpay = document.getElementById('dash-count-gpay');
    const dashCountCash = document.getElementById('dash-count-cash');
    
    if (dashCountAll) dashCountAll.textContent = countAll;
    if (dashCountPaid) dashCountPaid.textContent = countPaid;
    if (dashCountPartial) dashCountPartial.textContent = countPartial;
    if (dashCountPending) dashCountPending.textContent = countPending;
    if (dashCountChitTaken) dashCountChitTaken.textContent = countChitTaken;
    if (dashCountChitNotTaken) dashCountChitNotTaken.textContent = countChitNotTaken;
    if (dashCountNewCustomerMonth) dashCountNewCustomerMonth.textContent = countNewCustomerMonth;
    if (dashCountNewCustomer) dashCountNewCustomer.textContent = countNewCustomer;
    if (dashCountGpay) dashCountGpay.textContent = countGpay;
    if (dashCountCash) dashCountCash.textContent = countCash;

    // Update tag select option label counts dynamically
    const tagFilter = document.getElementById('dashboard-tag-filter');
    if (tagFilter) {
        const optAll = tagFilter.querySelector('option[value="all"]');
        const optPaid = tagFilter.querySelector('option[value="paid"]');
        const optPartial = tagFilter.querySelector('option[value="partial"]');
        const optPending = tagFilter.querySelector('option[value="pending"]');
        const optChitTaken = tagFilter.querySelector('option[value="chit_taken"]');
        const optChitNotTaken = tagFilter.querySelector('option[value="chit_not_taken"]');
        const optNewCustomerMonth = tagFilter.querySelector('option[value="new_customer_month"]');
        const optNewCustomer = tagFilter.querySelector('option[value="new_customer"]');
        const optGpay = tagFilter.querySelector('option[value="gpay"]');
        const optCash = tagFilter.querySelector('option[value="cash"]');
        
        if (optAll) optAll.textContent = `All (${countAll})`;
        if (optPaid) optPaid.textContent = `Paid (${countPaid})`;
        if (optPartial) optPartial.textContent = `Partial (${countPartial})`;
        if (optPending) optPending.textContent = `Due (${countPending})`;
        if (optChitTaken) optChitTaken.textContent = `Chit Taken (${countChitTaken})`;
        if (optChitNotTaken) optChitNotTaken.textContent = `Chit Not Taken (${countChitNotTaken})`;
        if (optNewCustomerMonth) optNewCustomerMonth.textContent = `New Customer (${countNewCustomerMonth})`;
        if (optNewCustomer) optNewCustomer.textContent = `All New Customer (${countNewCustomer})`;
        if (optGpay) optGpay.textContent = `Gpay (${countGpay})`;
        if (optCash) optCash.textContent = `Cash (${countCash})`;
    }

    // Dynamic rendering of custom filter dropdown items
    const customFilterMenu = document.getElementById('filter-dropdown-menu');
    if (customFilterMenu) {
        const filterItems = [
            { value: 'all', label: 'All', count: countAll },
            { value: 'paid', label: 'Paid', count: countPaid },
            { value: 'partial', label: 'Partial', count: countPartial },
            { value: 'pending', label: 'Due', count: countPending },
            { value: 'chit_taken', label: 'Chit Taken', count: countChitTaken },
            { value: 'chit_not_taken', label: 'Chit Not Taken', count: countChitNotTaken },
            { value: 'new_customer_month', label: 'New Customer', count: countNewCustomerMonth },
            { value: 'new_customer', label: 'All New Customer', count: countNewCustomer },
            { value: 'gpay', label: 'Gpay', count: countGpay, subItems: gpayMembers },
            { value: 'cash', label: 'Cash', count: countCash, subItems: cashMembers }
        ];

        customFilterMenu.innerHTML = '';
        filterItems.forEach(item => {
            const isActive = State.dashboardFilter === item.value;
            const menuItem = document.createElement('div');
            menuItem.className = `custom-dropdown-item ${isActive ? 'active' : ''}`;
            menuItem.style.cssText = `
                padding: 10px 16px;
                font-size: 0.85rem;
                color: ${isActive ? '#ffffff' : 'var(--text-main)'};
                background-color: ${isActive ? 'var(--primary)' : 'transparent'};
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: background-color 0.15s ease, color 0.15s ease;
                font-weight: ${isActive ? '700' : '500'};
            `;
            
            if (!isActive) {
                menuItem.addEventListener('mouseenter', () => {
                    menuItem.style.backgroundColor = 'var(--primary-glow)';
                    menuItem.style.color = 'var(--primary)';
                });
                menuItem.addEventListener('mouseleave', () => {
                    menuItem.style.backgroundColor = 'transparent';
                    menuItem.style.color = 'var(--text-main)';
                });
            }

            const hasSubItems = item.subItems && item.subItems.length > 0;
            
            menuItem.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${hasSubItems ? `<span class="submenu-toggle-icon" style="display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 4px; background: rgba(0,0,0,0.05); color: inherit; transition: background 0.2s; margin-left: -4px;"><i data-lucide="chevron-right" style="width: 14px; height: 14px; transition: transform 0.2s ease; pointer-events: none;"></i></span>` : ''}
                    <span>${item.label}</span>
                </div>
                <span class="count-badge" style="
                    font-size: 0.72rem;
                    background-color: ${isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-surface-elevated)'};
                    color: ${isActive ? '#ffffff' : 'var(--text-secondary)'};
                    padding: 2px 8px;
                    border-radius: 20px;
                    font-weight: 800;
                    border: 1px solid ${isActive ? 'rgba(255,255,255,0.1)' : 'var(--border)'};
                ">${item.count}</span>
            `;

            const subMenuContainer = document.createElement('div');
            subMenuContainer.style.display = 'none';
            subMenuContainer.style.flexDirection = 'column';
            subMenuContainer.style.backgroundColor = 'var(--bg-body)';
            subMenuContainer.style.borderTop = '1px solid var(--border)';
            subMenuContainer.style.borderBottom = '1px solid var(--border)';
            
            if (hasSubItems) {
                // Remove duplicate names if a member paid multiple chits with Gpay
                const uniqueNames = [...new Set(item.subItems)];
                uniqueNames.forEach(name => {
                    const subItem = document.createElement('div');
                    subItem.style.cssText = `
                        padding: 8px 16px 8px 36px;
                        font-size: 0.75rem;
                        color: var(--text-muted);
                        cursor: pointer;
                        font-weight: 600;
                        transition: background-color 0.15s ease, color 0.15s ease;
                    `;
                    subItem.textContent = name;
                    subItem.addEventListener('mouseenter', () => {
                        subItem.style.backgroundColor = 'var(--primary-glow)';
                        subItem.style.color = 'var(--primary)';
                    });
                    subItem.addEventListener('mouseleave', () => {
                        subItem.style.backgroundColor = 'transparent';
                        subItem.style.color = 'var(--text-muted)';
                    });
                    subItem.addEventListener('click', (e) => {
                        e.stopPropagation();
                        State.dashboardFilter = item.value;
                        const tagSelect = document.getElementById('dashboard-tag-filter');
                        if (tagSelect) tagSelect.value = item.value;
                        
                        const searchInput = document.getElementById('dashboard-member-search');
                        if (searchInput) {
                            searchInput.value = name;
                            searchInput.dispatchEvent(new Event('input'));
                            const btnClear = document.getElementById('btn-clear-dashboard-search');
                            if (btnClear) btnClear.style.display = 'flex';
                        }
                        
                        customFilterMenu.style.display = 'none';
                        renderDashboardMembersList(name.toLowerCase());
                    });
                    subMenuContainer.appendChild(subItem);
                });
                
                const toggleIconSpan = menuItem.querySelector('.submenu-toggle-icon');
                if (toggleIconSpan) {
                    toggleIconSpan.addEventListener('mouseenter', (e) => {
                        toggleIconSpan.style.background = 'rgba(0,0,0,0.1)';
                    });
                    toggleIconSpan.addEventListener('mouseleave', (e) => {
                        toggleIconSpan.style.background = 'rgba(0,0,0,0.05)';
                    });
                    toggleIconSpan.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const isVisible = subMenuContainer.style.display === 'flex';
                        subMenuContainer.style.display = isVisible ? 'none' : 'flex';
                        
                        // lucide.createIcons() replaces <i> with <svg>, so we look for either
                        const iconEl = toggleIconSpan.querySelector('svg') || toggleIconSpan.querySelector('i');
                        if (iconEl) {
                            iconEl.style.transform = isVisible ? 'rotate(90deg)' : 'rotate(0deg)';
                            iconEl.style.transition = 'transform 0.2s ease';
                        }
                    });
                }
            }

            menuItem.addEventListener('click', () => {
                State.dashboardFilter = item.value;
                
                // Update hidden select
                const tagSelect = document.getElementById('dashboard-tag-filter');
                if (tagSelect) {
                    tagSelect.value = item.value;
                }
                
                // Sync date filter
                State.dashboardFilterDate = '';
                const dSelect = document.getElementById('dashboard-date-filter');
                if (dSelect) dSelect.value = '';
                syncDateDropdownTrigger();

                // Sync hidden pills
                document.querySelectorAll('#dashboard-filter-pills .filter-pill').forEach(p => {
                    if (p.getAttribute('data-dashfilter') === State.dashboardFilter) {
                        p.classList.add('active');
                    } else {
                        p.classList.remove('active');
                    }
                });

                // Update trigger button selected text
                const selectedTextEl = document.getElementById('filter-dropdown-selected-text');
                if (selectedTextEl) {
                    selectedTextEl.textContent = item.label;
                }

                // Hide menu
                customFilterMenu.style.display = 'none';

                // Re-render
                const searchVal = document.getElementById('dashboard-member-search')?.value.toLowerCase().trim() || '';
                renderDashboardMembersList(searchVal);
            });

            const itemWrapper = document.createElement('div');
            itemWrapper.appendChild(menuItem);
            if (hasSubItems) itemWrapper.appendChild(subMenuContainer);
            customFilterMenu.appendChild(itemWrapper);
        });

        // Update trigger button text with active filter label
        const activeItem = filterItems.find(item => item.value === State.dashboardFilter);
        const selectedTextEl = document.getElementById('filter-dropdown-selected-text');
        if (selectedTextEl && activeItem) {
            selectedTextEl.textContent = activeItem.label;
        }
    }
    
    // Update dashboard summary box for Chit Taken
    // Removed old count updates because we now do synced updates later

    // Update Target Collection
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
            } else if (State.dashboardFilter === 'chit_not_taken') {
                return !item.hasTakenPayout;
            } else if (State.dashboardFilter === 'new_customer_month') {
                return item.member.customerType === 'New' && item.relativeMonthNum === 1;
            } else if (State.dashboardFilter === 'new_customer') {
                return item.member.customerType === 'New';
            } else if (State.dashboardFilter === 'gpay') {
                return item.paymentMethodThisMonth === 'gpay' || item.paymentMethodThisMonth === 'mixed';
            } else if (State.dashboardFilter === 'cash') {
                return item.paymentMethodThisMonth === 'cash' || item.paymentMethodThisMonth === 'mixed';
            }
            return true;
        });
    }

    // Filter by date filter dropdown if active
    if (State.dashboardFilterDate) {
        filteredList = filteredList.filter(item => {
            const relMonth = item.relativeMonthNum;
            const gp = item.group;
            const isAccum = State.dashboardSelectedMonth === 'accumulated';
            const payObj = isAccum ? item.member.payments[gp.currentMonth] : item.member.payments[relMonth];
            if (!payObj || (!payObj.paid && !(payObj.partialPaid > 0))) return false;
            
            const customDateDay = payObj.customDate ? String(payObj.customDate) : '';
            return customDateDay && parseInt(customDateDay, 10) === parseInt(State.dashboardFilterDate, 10);
        });
    }

    // Filter by custom date range if active
    if (State.dashboardDateRangeFrom && State.dashboardDateRangeTo) {
        const fromTs = new Date(State.dashboardDateRangeFrom + 'T00:00:00').getTime();
        const toTs = new Date(State.dashboardDateRangeTo + 'T23:59:59').getTime();
        filteredList = filteredList.filter(item => {
            // Check across all months for payments within the range
            let matches = false;
            const allPayments = item.member.payments;
            if (!allPayments) return false;
            Object.values(allPayments).forEach(pay => {
                if (!pay || !pay.paid) return;
                let payTs = null;
                if (pay.paidAt) {
                    payTs = new Date(pay.paidAt).getTime();
                } else if (pay.customDate) {
                    // customDate is just a day number; use paidAt's month/year context
                    // We'll use paidAt if available, otherwise skip
                    return;
                }
                if (payTs && payTs >= fromTs && payTs <= toTs) matches = true;
            });
            return matches;
        });
    }

    // Sort alphabetically by member name
    filteredList.sort((a, b) => a.member.name.localeCompare(b.member.name));

    // Calculate Synced Dashboard Stats based on the FINAL filtered list
    let syncExpectedAmount = 0;
    let syncCollected = 0;
    let syncCollectedCash = 0;
    let syncCollectedGpay = 0;
    let syncPending = 0;
    let syncChitTaken = 0;
    
    let syncCountPaid = 0;
    let syncCountPending = 0;
    let syncCountChitTaken = 0;

    filteredList.forEach(item => {
        syncExpectedAmount += (item.dueAmount + item.paidAmount);
        syncCollected += item.paidAmount;
        if (item.paymentMethodThisMonth === 'cash') syncCollectedCash += item.paidAmount;
        if (item.paymentMethodThisMonth === 'gpay') syncCollectedGpay += item.paidAmount;
        syncPending += item.dueAmount;
        
        if (item.currentMonthPaid || item.paidAmount > 0) {
            syncCountPaid++;
        } else {
            syncCountPending++;
        }
        
        if (item.takenThisSelectedMonth) {
            syncChitTaken += item.payoutVal;
            syncCountChitTaken++;
        }
    });

    // Update Dashboard DOM Elements
    const statTargetCollection = document.getElementById('dashboard-target-collection-text');
    if (statTargetCollection) {
        statTargetCollection.textContent = `Target: ₹${syncExpectedAmount.toLocaleString('en-IN')}`;
    }

    const statTotalCollected = document.getElementById('stat-total-collected');
    if (statTotalCollected) statTotalCollected.textContent = '₹' + syncCollected.toLocaleString('en-IN');
    
    const mCashEl = document.getElementById('stat-summary-collected-cash');
    if (mCashEl) mCashEl.textContent = '₹' + syncCollectedCash.toLocaleString('en-IN');
    const mGpayEl = document.getElementById('stat-summary-collected-gpay');
    if (mGpayEl) mGpayEl.textContent = '₹' + syncCollectedGpay.toLocaleString('en-IN');
    
    const statTotalPending = document.getElementById('stat-total-pending');
    if (statTotalPending) statTotalPending.textContent = '₹' + syncPending.toLocaleString('en-IN');
    
    const mChitTakenEl = document.getElementById('stat-summary-chit-taken-amount');
    if (mChitTakenEl) mChitTakenEl.textContent = '₹' + syncChitTaken.toLocaleString('en-IN');
    
    const statSummaryCollectedCount = document.getElementById('stat-summary-collected-count');
    if (statSummaryCollectedCount) statSummaryCollectedCount.textContent = `(${syncCountPaid})`;
    
    const statSummaryPendingCount = document.getElementById('stat-summary-pending-count');
    if (statSummaryPendingCount) statSummaryPendingCount.textContent = `(${syncCountPending})`;
    
    const statSummaryChitTakenCount = document.getElementById('stat-summary-chit-taken-count');
    if (statSummaryChitTakenCount) statSummaryChitTakenCount.textContent = `(${syncCountChitTaken})`;

    // Update Surplus/Deficit calculation
    const containerSD = document.getElementById('stat-surplus-deficit-container');
    if (containerSD) {
        const difference = syncExpectedAmount - syncChitTaken;
        if (syncChitTaken === 0 && syncExpectedAmount === 0) {
            containerSD.innerHTML = `<span style="color: #9ca3af;">--</span>`;
            containerSD.style.backgroundColor = "transparent";
        } else if (difference < 0) {
            containerSD.innerHTML = `<span style="color: #ffffff; font-weight: 900;"><i data-lucide="trending-down" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> Deficit: ₹${Math.abs(difference).toLocaleString('en-IN')}</span>`;
            containerSD.style.backgroundColor = "#ef4444"; // Solid Red
            containerSD.style.borderTop = "none";
        } else if (difference >= 0) {
            containerSD.innerHTML = `<span style="color: #ffffff; font-weight: 900;"><i data-lucide="trending-up" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> Surplus: ₹${Math.abs(difference).toLocaleString('en-IN')}</span>`;
            containerSD.style.backgroundColor = "#22c55e"; // Solid Green
            containerSD.style.borderTop = "none";
        }
        if (window.lucide) window.lucide.createIcons();
    }

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
        let dueAmountText = item.dueAmount === 0 ? '--' : `₹${item.dueAmount.toLocaleString('en-IN')}`;
        let paidAmountText = item.paidAmount === 0 ? '--' : `₹${item.paidAmount.toLocaleString('en-IN')}`;
        let paidDateText = item.displayPaidDate;
        let checkboxHtml = '';

        let dueColor = item.dueAmount > 0 ? 'var(--red-dark)' : 'var(--text-muted)';
        let paidColor = item.paidAmount > 0 ? 'var(--green-dark)' : 'var(--text-muted)';

        let paidDateHtml = '';
        if (!item.isApplicable || paidDateText === 'N/A' || paidDateText === '--') {
            paidDateHtml = `<span style="color: var(--text-muted); font-weight: 600; font-size: 0.8rem;">--</span>`;
        } else {
            if (item.currentMonthPaid) {
                paidDateHtml = `<span style="display: inline-block; width: 92%; padding: 4px 2px; border-radius: 4px; background-color: #dbeafe; color: #1e3a8a; font-weight: 800; font-size: 0.75rem; text-align: center; border: 1px solid #bfdbfe;">${paidDateText}</span>`;
            } else if (item.paidAmount > 0) {
                paidDateHtml = `<span style="display: inline-block; width: 92%; padding: 4px 2px; border-radius: 4px; background-color: #fef3c7; color: #92400e; font-weight: 800; font-size: 0.75rem; text-align: center; border: 1px solid #fde68a;">${paidDateText}</span>`;
            } else {
                paidDateHtml = `<span style="color: var(--text-muted); font-weight: 600; font-size: 0.8rem;">--</span>`;
            }
        }

        if (!item.isApplicable) {
            monthNoText = '--';
            dueAmountText = 'N/A';
            paidAmountText = 'N/A';
            paidDateText = 'N/A';
            dueColor = 'var(--text-muted)';
            paidColor = 'var(--text-muted)';
            checkboxHtml = `<span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">N/A</span>`;
        } else {
            // isFuture rows are treated same as DUE â€” user wants to see & mark them
            if (item.currentMonthPaid) {
                let methodSuffix = '';
                if (item.paymentMethodThisMonth === 'gpay') {
                    methodSuffix = ` <span style="color: #1d4ed8; font-weight: 900; font-size: 0.8rem; text-shadow: 0 1px 2px rgba(255,255,255,0.4);">/ G</span>`;
                } else if (item.paymentMethodThisMonth === 'cash') {
                    methodSuffix = ` <span style="color: #b91c1c; font-weight: 900; font-size: 0.8rem; text-shadow: 0 1px 2px rgba(255,255,255,0.4);">/ C</span>`;
                }
                checkboxHtml = `<span class="status-badge-pill paid" style="display: inline-flex; align-items: center; justify-content: center;"><i data-lucide="check" style="width: 10px; height: 10px; margin-right: 2px;"></i> Paid${methodSuffix}</span>`;
            } else if (item.paidAmount > 0) {
                checkboxHtml = `<span class="status-badge-pill partial"><i data-lucide="trending-up" style="width: 10px; height: 10px;"></i> Partial</span>`;
            } else {
                checkboxHtml = `<span class="status-badge-pill pending"><i data-lucide="alert-circle" style="width: 10px; height: 10px;"></i> Due</span>`;
            }
        }

        let contactMenuHtml = '';
        if (item.isApplicable) {
            contactMenuHtml = `
                <div class="contact-action-wrapper" style="position: relative; display: inline-block;">
                    <button class="contact-action-btn" data-member-id="${item.member.id}" title="Contact" style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #10b981, #047857); border: none; color: #ffffff; cursor: pointer; outline: none; box-shadow: 0 2px 5px rgba(16, 185, 129, 0.4); transition: transform 0.2s ease, box-shadow 0.2s ease;">
                        <i data-lucide="user" style="width: 15px; height: 15px;"></i>
                    </button>
                    <div class="contact-action-menu" style="display: none; position: absolute; right: 100%; top: 50%; transform: translateY(-50%); margin-right: 12px; background: white; border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); padding: 8px; z-index: 50; flex-direction: row; gap: 8px; align-items: center;">
                        <button class="contact-call-btn" data-phone="${item.member.mobileNo}" title="Call" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: #eff6ff; border: 1px solid #bfdbfe; color: #3b82f6; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);">
                            <i data-lucide="phone" style="width: 16px; height: 16px;"></i>
                        </button>
                        <button class="contact-wa-btn" data-member-id="${item.member.id}" title="WhatsApp" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: #dcfce7; border: 1px solid #bbf7d0; color: #22c55e; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(34, 197, 94, 0.1);">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                        </button>
                    </div>
                </div>
            `;
        }

        let methodLetterHtml = '';
        if (item.payoutMethod === 'cash') {
            methodLetterHtml = ` <span style="color: #4c1d95; font-weight: 900; text-shadow: 0 1px 2px rgba(255,255,255,0.4);">/ C</span>`;
        } else if (item.payoutMethod === 'gpay') {
            methodLetterHtml = ` <span style="color: #1e3a8a; font-weight: 900; text-shadow: 0 1px 2px rgba(255,255,255,0.4);">/ G</span>`;
        }

        let chitTakenHtml = item.hasTakenPayout ? `<span class="status-badge-pill chit-taken-badge" style="background: linear-gradient(135deg, #a855f7, #7e22ce); color: #fff; font-weight: 800; border: none; box-shadow: 0 2px 6px rgba(147, 51, 234, 0.4); cursor: pointer; letter-spacing: 0.03em;"><i data-lucide="check-circle" style="width: 10px; height: 10px; color: #fff;"></i> ₹${item.payoutVal.toLocaleString('en-IN')}${methodLetterHtml}</span>` : `<span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">--</span>`;

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

        const groupNameParts = item.group.name.split('-');
        let groupNameHtml = item.group.name;
        if (groupNameParts.length === 2) {
            const start = groupNameParts[0].trim();
            const end = groupNameParts[1].trim();
            groupNameHtml = `<span style="color: var(--green-dark) !important; font-weight: 900 !important; font-size: 0.95rem !important;">${start}</span> - <span style="color: var(--red-dark) !important; font-weight: 900 !important; font-size: 0.95rem !important;">${end}</span>`;
        }

        row.innerHTML = `
            <span style="font-weight: 700; color: var(--text-secondary); font-size: 0.8rem; text-align: center;">${index + 1}</span>
            <span class="member-name" style="font-weight: 800; font-size: 0.95rem; color: var(--text-main); text-align: left; text-transform: uppercase; padding-left: 8px;">${item.member.name}${newCustomerBadgeHtml}</span>
            <span style="font-size: 0.95rem; color: var(--text-main); font-weight: 800; text-align: center; justify-content: center; width: 100%;">${groupNameHtml}</span>
            <span style="text-align: center;"><span class="status-badge-pill" style="background-color: var(--bg-surface-elevated); border: 1px solid var(--border); color: var(--text-main); text-transform: none; font-size: 0.72rem;">${schemeText}</span></span>
            <span style="font-size: 1.05rem; font-weight: 800; color: var(--primary); text-align: center;">${monthNoText}</span>
            <span style="font-size: 1.05rem; font-weight: 800; color: ${dueColor}; text-align: left;">${dueAmountText}</span>
            <span style="font-size: 1.05rem; font-weight: 800; color: ${paidColor}; text-align: left;">${paidAmountText}</span>
            <span style="display: flex; justify-content: center; align-items: center; width: 100%; text-align: center;">${paidDateHtml}</span>
            <div style="display: flex; justify-content: center; align-items: center;">
                ${checkboxHtml}
            </div>
            <div style="display: flex; justify-content: center; align-items: center;">
                ${chitTakenHtml}
            </div>
            <div style="display: flex; justify-content: center; align-items: center;">
                ${contactMenuHtml || '<span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">--</span>'}
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

            const contactBtn = row.querySelector('.contact-action-btn');
            const contactMenu = row.querySelector('.contact-action-menu');
            if (contactBtn && contactMenu) {
                contactBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Close all other open menus
                    document.querySelectorAll('.contact-action-menu').forEach(menu => {
                        if (menu !== contactMenu) menu.style.display = 'none';
                    });
                    const isVisible = contactMenu.style.display === 'flex';
                    contactMenu.style.display = isVisible ? 'none' : 'flex';
                });
            }

            const callBtn = row.querySelector('.contact-call-btn');
            if (callBtn) {
                callBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.location.href = `tel:${callBtn.dataset.phone}`;
                    if (contactMenu) contactMenu.style.display = 'none';
                });
            }

            const waBtn = row.querySelector('.contact-wa-btn');
            if (waBtn) {
                waBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    sendWhatsAppReminder(item.member.id);
                    if (contactMenu) contactMenu.style.display = 'none';
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

            const chitBadgeEl = row.querySelector('.chit-taken-badge');
            if (chitBadgeEl) {
                chitBadgeEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    State.selectedGroupId = item.group.id;
                    openPaymentModal(item.member.id, 'single_month', item.payoutMonthNum);
                });
            }
        }

        fragment.appendChild(row);
    });

    // Update Filtered Summary Footer
    const summaryEl = document.getElementById('dashboard-filtered-summary');
    const hasActiveFilter = searchQuery || (State.dashboardFilter && State.dashboardFilter !== 'all') || State.dashboardFilterDate || (State.dashboardDateRangeFrom && State.dashboardDateRangeTo);
    if (summaryEl) {
        if (hasActiveFilter && filteredList.length > 0) {
            let totalPaid = 0, totalGpay = 0, totalCash = 0;
            filteredList.forEach(item => {
                if (State.dashboardDateRangeFrom && State.dashboardDateRangeTo) {
                    if (State.dashboardFilter === 'gpay') {
                        totalPaid += item.rangeTotalGpay;
                        totalGpay += item.rangeTotalGpay;
                    } else if (State.dashboardFilter === 'cash') {
                        totalPaid += item.rangeTotalCash;
                        totalCash += item.rangeTotalCash;
                    } else {
                        totalPaid += item.paidAmount;
                        totalGpay += item.rangeTotalGpay;
                        totalCash += item.rangeTotalCash;
                    }
                } else {
                    totalPaid += item.paidAmount;
                    if (item.paymentMethodThisMonth === 'gpay') totalGpay += item.paidAmount;
                    if (item.paymentMethodThisMonth === 'cash') totalCash += item.paidAmount;
                }
            });
            summaryEl.style.display = 'flex';
            const countEl = document.getElementById('filter-summary-count');
            const paidEl = document.getElementById('filter-summary-paid');
            const gpayEl = document.getElementById('filter-summary-gpay');
            const cashEl = document.getElementById('filter-summary-cash');
            if (countEl) countEl.textContent = filteredList.length;
            if (paidEl) paidEl.textContent = '\u20b9' + totalPaid.toLocaleString('en-IN');
            if (gpayEl) gpayEl.textContent = '\u20b9' + totalGpay.toLocaleString('en-IN');
            if (cashEl) cashEl.textContent = '\u20b9' + totalCash.toLocaleString('en-IN');
        } else {
            summaryEl.style.display = 'none';
        }
    }

    listContainer.innerHTML = '';
    listContainer.appendChild(fragment);
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
    const dateRangeStr = `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()} - ${monthNames[endDate.getMonth()]} ${endDate.getFullYear()}`;
    
    document.getElementById('details-duration').textContent = `${group.duration} Months`;
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
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
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
    
    // Calculate scheme string
    let schemeAmountStr = '';
    let amount = group.chitAmount;
    if (amount >= 100000) {
        let lakhs = amount / 100000;
        schemeAmountStr = (lakhs % 1 === 0 ? lakhs : lakhs.toFixed(1)) + ' Lakh';
    } else if (amount >= 1000) {
        let k = amount / 1000;
        schemeAmountStr = (k % 1 === 0 ? k : k.toFixed(1)) + 'K';
    } else {
        schemeAmountStr = amount.toString();
    }
    const schemeText = `${group.duration}M / ${schemeAmountStr}`;
    
    // Fill text labels
    document.getElementById('payment-modal-group-name').innerHTML = `${group.name} <span style="color: #b45309; font-weight: 800; font-size: 0.75rem; letter-spacing: 0.05em; background-color: #fef3c7; border: 1px solid #fcd34d; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">${schemeText}</span>`;
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

    // Populate DOB & Anniversary in read-only modal if New Customer
    const dobVal = member.customerType === 'New' && member.dob ? formatInputDateToDisplay(member.dob) : '--';
    const anniversaryVal = member.customerType === 'New' && member.anniversary ? formatInputDateToDisplay(member.anniversary) : '--';
    
    const dobRow = document.getElementById('modal-detail-dob-row');
    const annRow = document.getElementById('modal-detail-anniversary-row');
    if (dobRow) dobRow.style.display = (member.customerType === 'New') ? '' : 'none';
    if (annRow) annRow.style.display = (member.customerType === 'New') ? '' : 'none';
    
    const dobSpan = document.getElementById('modal-detail-dob');
    const annSpan = document.getElementById('modal-detail-anniversary');
    if (dobSpan) dobSpan.textContent = dobVal;
    if (annSpan) annSpan.textContent = anniversaryVal;

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
    let selectedMethod = null;

    newCashBtn.addEventListener('click', () => {
        selectedMethod = 'cash';
        noteSection.style.display = 'flex';
        newCashBtn.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
        newGpayBtn.style.backgroundColor = 'transparent';
        noteInput.focus();
    });

    newGpayBtn.addEventListener('click', () => {
        selectedMethod = 'gpay';
        noteSection.style.display = 'flex';
        newGpayBtn.style.backgroundColor = 'rgba(66, 133, 244, 0.1)';
        newCashBtn.style.backgroundColor = 'transparent';
        noteInput.focus();
    });
    
    newConfirmBtn.addEventListener('click', () => {
        if (!selectedMethod) return;
        const noteVal = noteInput.value.trim();
        confirmPayment(memberId, monthNum, selectedMethod, noteVal);
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
        let payoutVal = group.chitAmount;
        if (group.payouts && group.payouts[m] !== undefined) {
            payoutVal = group.payouts[m];
        } else {
            const matchedTemplate = State.schemeTemplates && State.schemeTemplates.find(t => t.chitAmount === group.chitAmount && t.duration === group.duration);
            if (matchedTemplate && matchedTemplate.payouts && matchedTemplate.payouts[m] !== undefined) {
                payoutVal = matchedTemplate.payouts[m];
            }
        }
        const enteredPartialVal = payment.partialPaid !== undefined && payment.partialPaid !== null ? payment.partialPaid : '';
        const currentPaid = isPaid ? instVal : (payment.partialPaid || 0);
        const currentDue = isPaid ? 0 : (instVal - currentPaid);
        const partialBlinkClass = (payment.partialPaid > 0 && !isPaid) ? 'blink-partial' : (isPaid ? 'blink-paid' : '');

        if (isPaid) {
            paidCount++;
        } else if (isCurrentOrPast) {
            dueCount++;
            pendingAmount += currentDue;
        }
        
        const filterMode = State.paymentModalFilterMode || 'all';
        const targetMonthNum = State.paymentModalTargetMonth;
        
        if (filterMode === 'single_month' && targetMonthNum) {
            // Show only the target month
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
            : (isPaid && payment.method === 'cash' ? `<div style="font-size: 0.65rem; font-weight: 700; color: var(--green-dark); margin-top: 4px; text-transform: uppercase;">Cash${payment.note ? '<br><span style="color: var(--text-muted); font-size: 0.6rem; text-transform: none;">' + payment.note + '</span>' : ''}</div>` : '');

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
            ? `<div style="display: flex; flex-direction: column; align-items: center;"><div class="payout-claim-btn" data-month="${m}" style="display: inline-flex; justify-content: center; align-items: center; gap: 6px; padding: 6px 10px; font-size: 0.75rem; font-weight: 800; color: #fff; background: linear-gradient(135deg, #ef4444, #b91c1c); border: none; border-radius: var(--radius-sm); box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4); cursor: pointer; text-transform: uppercase; letter-spacing: 0.05em; transition: all 0.2s ease;">
                 <i data-lucide="check-circle" style="width: 14px; height: 14px; color: #fff;"></i> Taken ₹${payoutVal.toLocaleString('en-IN')}
               </div>${payoutMethodHtml}${payoutDateHtml}</div>`
            : `<div class="payout-claim-btn" data-month="${m}" style="display: inline-flex; justify-content: center; align-items: center; gap: 6px; padding: 6px 10px; font-size: 0.75rem; font-weight: 800; color: #fff; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; border-radius: var(--radius-sm); box-shadow: 0 2px 6px rgba(217, 119, 6, 0.4); cursor: pointer; text-transform: uppercase; letter-spacing: 0.05em; transition: all 0.2s ease;">
                 Claim ₹${payoutVal.toLocaleString('en-IN')}
               </div>`;

        const isCurrentMonth = (m === group.currentMonth);
        const monthBadgeStyle = isCurrentMonth 
            ? `background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; box-shadow: 0 0 8px rgba(37,99,235,0.4);`
            : (isPaid 
                ? `background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3);`
                : (payment.partialPaid > 0 ? `background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3);` : `background: rgba(255,255,255,0.05); color: var(--text-secondary); border: 1px solid var(--border);`));

        row.innerHTML = `
            <span style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 7px; font-weight: 900; font-size: 0.78rem; font-family: var(--font-heading); ${monthBadgeStyle}">${m}</span>
            <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                <select class="custom-payment-date-select" data-month="${m}" style="padding: 4px 6px; font-size: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background-color: var(--bg-surface); color: var(--text-main); text-align: center;">
                    ${dateOptions}
                </select>
                <span style="font-size: 0.68rem; color: var(--text-secondary); white-space: nowrap;">ðŸ“… ${monthYearStr}</span>
            </div>
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">₹${instVal.toLocaleString('en-IN')}</span>
            <input type="text" inputmode="numeric" class="custom-payment-partial-input amount-input ${partialBlinkClass}" data-month="${m}" placeholder="0" value="${isPaid ? '' : formatNumberIndian(enteredPartialVal)}" style="padding: 4px 6px; font-size: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background-color: var(--bg-surface); color: var(--text-main); width: 100%; text-align: center;" ${isPaid ? 'disabled' : ''}>
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
    const baseMember = State.members.find(m => m.id === memberId);
    if (!baseMember) return;

    if (!baseMember.mobileNo || baseMember.mobileNo.trim() === '') {
        showNotification('Please add a mobile number for this member to send reminders.', 'error');
        // Automatically click edit profile details button to slide open form
        const btnEdit = document.getElementById('btn-edit-member-profile');
        if (btnEdit) {
            // If payment modal is not already open, open it first
            if (!document.getElementById('payment-modal-backdrop').classList.contains('active')) {
                openPaymentModal(baseMember.id);
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

    const basePhoneRaw = baseMember.mobileNo.replace(/\D/g, '');
    const baseName = baseMember.name.trim().toLowerCase();
    
    const matchedMembers = State.members.filter(m => {
        const phoneMatch = basePhoneRaw !== '' && m.mobileNo && m.mobileNo.replace(/\D/g, '') === basePhoneRaw;
        const nameMatch = m.name.trim().toLowerCase() === baseName;
        return phoneMatch || nameMatch;
    });

    let totalDueAmount = 0;
    const groupBlocks = [];

    const now = new Date();
    // Use the current month for the header
    const currentMonthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const fullMonths = {"Jan":"January", "Feb":"February", "Mar":"March", "Apr":"April", "May":"May", "Jun":"June", "Jul":"July", "Aug":"August", "Sep":"September", "Oct":"October", "Nov":"November", "Dec":"December"};
    const expandMonth = (str) => {
        const parts = str.split(' ');
        if (parts.length === 2 && fullMonths[parts[0]]) return fullMonths[parts[0]] + ' ' + parts[1];
        return str;
    };
    const getOrdinalSuffix = (i) => {
        let j = i % 10, k = i % 100;
        if (j == 1 && k != 11) return i + "st";
        if (j == 2 && k != 12) return i + "nd";
        if (j == 3 && k != 13) return i + "rd";
        return i + "th";
    };

    for (const member of matchedMembers) {
        const group = State.groups.find(g => g.id === member.groupId);
        if (!group) continue;

        const currentRelativeMonth = getRelativeMonthForGroup(group, now.getFullYear(), now.getMonth());
        const effectiveLimit = Math.max(group.currentMonth || 1, currentRelativeMonth);

        let groupPendingText = [];
        let groupHasDues = false;

        for (let m = 1; m <= group.duration; m++) {
            if (m <= effectiveLimit) {
                const payment = member.payments[m];
                const instVal = group.installments && group.installments[m] !== undefined 
                    ? group.installments[m] 
                    : group.monthlyInstallment;
                
                if (!payment || !payment.paid) {
                    const partial = payment ? (payment.partialPaid || 0) : 0;
                    const dueAmount = instVal - partial;
                    totalDueAmount += dueAmount;
                    
                    groupPendingText.push(`${getOrdinalSuffix(m)} month due=${dueAmount}`);
                    groupHasDues = true;
                }
            }
        }

        if (groupHasDues) {
            const startMonthLabel = expandMonth(getMonthLabel(group, 1));
            const schemeAmount = group.chitAmount || group.amount || (group.monthlyInstallment ? group.monthlyInstallment * group.duration : 0);
            
            let schemeLine = '';
            if (schemeAmount === 100000) {
                schemeLine = 'One lakh scheme';
            } else {
                const schemeStr = schemeAmount >= 100000 ? (schemeAmount / 100000) + ' lakhs' : (schemeAmount / 1000) + 'k';
                schemeLine = `${schemeStr}/${group.duration} months scheme`;
            }
            
            groupBlocks.push(`${startMonthLabel} group\n${schemeLine}\n${groupPendingText.join('\n')}`);
        }
    }

    let formattedPhone = basePhoneRaw;
    if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;

    if (totalDueAmount <= 0) {
        const noDuesMsg = `Hello ${baseMember.name},\n\nYou have no pending dues for ${currentMonthName}. Thank you for your prompt payments!`;
        const waUrl = `https://api.whatsapp.com/send/?phone=${formattedPhone}&text=${encodeURIComponent(noDuesMsg)}`;
        window.open(waUrl, '_blank');
        return;
    }

    const greeting = `${currentMonthName}\n\n${groupBlocks.join('\n\n')}\n\nTotal=${totalDueAmount}`;

    const waUrl = `https://api.whatsapp.com/send/?phone=${formattedPhone}&text=${encodeURIComponent(greeting)}`;
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
        let wasClaimedOriginally = false;
        if (typeof originalStateSnapshot !== 'undefined' && originalStateSnapshot) {
            try {
                const parsed = JSON.parse(originalStateSnapshot);
                const origMember = parsed.members.find(m => m.id === memberId);
                if (origMember && origMember.payments[monthNum] && origMember.payments[monthNum].payoutClaimed) {
                    wasClaimedOriginally = true;
                }
            } catch(e) {}
        }
        
        if (wasClaimedOriginally) {
            openEditCancelModal(memberId, monthNum, 'payout');
        } else {
            unmarkPayout(memberId, monthNum);
        }
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
        // If it is already paid, determine if it was paid in the original state
        let wasPaidOriginally = false;
        if (typeof originalStateSnapshot !== 'undefined' && originalStateSnapshot) {
            try {
                const parsed = JSON.parse(originalStateSnapshot);
                const origMember = parsed.members.find(m => m.id === memberId);
                if (origMember && origMember.payments[monthNum] && origMember.payments[monthNum].paid) {
                    wasPaidOriginally = true;
                }
            } catch(e) {}
        }
        
        if (wasPaidOriginally) {
            // Show Edit / Cancel Alert
            openEditCancelModal(memberId, monthNum);
        } else {
            // It was just paid in this session (unsaved), just unmark it
            unmarkPayment(memberId, monthNum);
        }
    }
}

function unmarkPayment(memberId, monthNum) {
    const member = State.members.find(m => m.id === memberId);
    if (!member) return;
    const group = State.groups.find(g => g.id === member.groupId);
    if (!group) return;

    member.payments[monthNum].paid = false;
    member.payments[monthNum].paidAt = null;
    member.payments[monthNum].method = null;
    member.payments[monthNum].note = null;
    member.payments[monthNum].customDate = '';
    
    saveState();
    renderChecklist(member, group);
}

function unmarkPayout(memberId, monthNum) {
    const member = State.members.find(m => m.id === memberId);
    if (!member) return;
    const group = State.groups.find(g => g.id === member.groupId);
    if (!group) return;

    member.payments[monthNum].payoutClaimed = false;
    member.payments[monthNum].payoutMethod = null;
    member.payments[monthNum].payoutNote = null;
    member.payments[monthNum].payoutDate = null;
    saveState();
    renderChecklist(member, group);
}

let pendingEditCancelMemberId = null;
let pendingEditCancelMonthNum = null;

function openEditCancelModal(memberId, monthNum, type = 'payment') {
    pendingEditCancelMemberId = memberId;
    pendingEditCancelMonthNum = monthNum;
    
    const backdrop = document.getElementById('edit-cancel-modal-backdrop');
    if (!backdrop) return;
    
    const title = backdrop.querySelector('.modal-title');
    const desc = backdrop.querySelector('.modal-body p');
    const btnEdit = document.getElementById('btn-action-edit-payment');
    const btnUnmark = document.getElementById('btn-action-unmark-payment');
    const btnCancel = document.getElementById('btn-action-cancel-edit');
    const btnClose = document.getElementById('btn-close-edit-cancel');
    
    if (type === 'payout') {
        if (title) title.textContent = 'Payout Options';
        if (desc) desc.textContent = 'Do you want to edit this payout or unmark it?';
        btnEdit.textContent = 'Edit Payout';
        btnUnmark.textContent = 'Unmark Payout';
    } else {
        if (title) title.textContent = 'Payment Options';
        if (desc) desc.textContent = 'Do you want to edit this payment or unmark it?';
        btnEdit.textContent = 'Edit Payment';
        btnUnmark.textContent = 'Unmark Payment';
    }
    
    const cleanup = () => {
        backdrop.classList.remove('active');
    };
    
    const cloneNodeAndReplace = (node) => {
        const newNode = node.cloneNode(true);
        node.parentNode.replaceChild(newNode, node);
        return newNode;
    };
    
    const newBtnEdit = cloneNodeAndReplace(btnEdit);
    const newBtnUnmark = cloneNodeAndReplace(btnUnmark);
    const newBtnCancel = cloneNodeAndReplace(btnCancel);
    const newBtnClose = cloneNodeAndReplace(btnClose);
    
    newBtnEdit.addEventListener('click', () => {
        cleanup();
        if (type === 'payout') {
            pendingPayoutMemberId = pendingEditCancelMemberId;
            pendingPayoutMonthNum = pendingEditCancelMonthNum;
            const member = State.members.find(m => m.id === pendingPayoutMemberId);
            const payoutMethod = member.payments[pendingPayoutMonthNum].payoutMethod || 'cash';
            const payoutNote = member.payments[pendingPayoutMonthNum].payoutNote || '';
            
            document.querySelector(`input[name="payout-method"][value="${payoutMethod}"]`).checked = true;
            document.getElementById('payout-note-input').value = payoutNote;
            if (payoutMethod === 'gpay') {
                document.getElementById('payout-gpay-note-wrapper').classList.remove('hidden');
            } else {
                document.getElementById('payout-gpay-note-wrapper').classList.add('hidden');
            }
            document.getElementById('payout-method-modal-backdrop').classList.add('active');
        } else {
            openPaymentMethodModal(pendingEditCancelMemberId, pendingEditCancelMonthNum);
        }
    });
    
    newBtnUnmark.addEventListener('click', () => {
        cleanup();
        if (type === 'payout') {
            unmarkPayout(pendingEditCancelMemberId, pendingEditCancelMonthNum);
        } else {
            unmarkPayment(pendingEditCancelMemberId, pendingEditCancelMonthNum);
        }
    });
    
    newBtnCancel.addEventListener('click', cleanup);
    newBtnClose.addEventListener('click', cleanup);
    
    backdrop.classList.add('active');
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


/* ============================================================
   INSTALLMENT CARDS MODULE  (v2 - standalone screen)
   ============================================================ */
(function InstallmentCardsModule() {
    const STORAGE_KEY = 'pms_installment_cards';
    let currentTenure = null;

    function loadData() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
        catch (e) { return {}; }
    }
    function saveData(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    function showTenureSelector() {
        var tenureSelector = document.getElementById('ic-tenure-selector');
        var cardsGridView  = document.getElementById('ic-cards-grid-view');
        if (tenureSelector) tenureSelector.style.display = 'flex';
        if (cardsGridView)  cardsGridView.style.display  = 'none';
        currentTenure = null;
        if (window.lucide) window.lucide.createIcons();
    }

    function openTenureCards(tenure) {
        currentTenure = tenure;
        var tenureSelector = document.getElementById('ic-tenure-selector');
        var cardsGridView  = document.getElementById('ic-cards-grid-view');
        var label          = document.getElementById('ic-grid-tenure-label');
        if (tenureSelector) tenureSelector.style.display = 'none';
        if (cardsGridView)  cardsGridView.style.display  = 'flex';
        cardsGridView.style.flexDirection = 'column';
        if (label)          label.textContent = tenure + ' Scheme';
        renderCards();
        if (window.lucide) window.lucide.createIcons();
    }

    function renderCards() {
        var list = document.getElementById('ic-cards-list');
        if (!list) return;
        var data  = loadData();
        var cards = (data[currentTenure] || []);
        list.innerHTML = '';

        if (cards.length === 0) {
            list.innerHTML = '<div class="ic-empty-state"><i data-lucide="image-off"></i><p>No cards yet. Tap "Upload New Card" to add your first card photo!</p></div>';
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        cards.forEach(function(card) {
            var item = document.createElement('div');
            item.style.cssText = 'background:var(--bg-surface);border:1px solid var(--border);border-radius:18px;overflow:hidden;transition:box-shadow 0.25s,transform 0.25s;position:relative;';
            item.dataset.cardId = card.id;
            var hasImage = !!card.imageData;
            var imgAreaStyle = 'width:100%;min-height:180px;background:var(--bg-surface);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;border-radius:16px 16px 0 0;';
            var imgHTML = hasImage
                ? '<img src="' + card.imageData + '" alt="' + (card.label || 'Card') + '" loading="lazy" style="width:100%;height:auto;display:block;object-fit:contain;max-height:360px;"><button class="ic-change-photo-btn" style="position:absolute;top:8px;right:8px;width:32px;height:32px;border-radius:8px;background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.2);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:blur(4px);" title="Change Photo"><i data-lucide="camera" style="width:15px;height:15px;"></i></button>'
                : '<div class="ic-upload-placeholder" style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:48px 20px;cursor:pointer;width:100%;"><i data-lucide="upload-cloud" style="width:44px;height:44px;color:#6366f1;opacity:0.7;"></i><span style="font-size:0.85rem;font-weight:600;color:var(--text-muted);">Tap to upload card photo</span></div>';
            item.innerHTML = '<div style="' + imgAreaStyle + '">' + imgHTML + '</div>'
                + '<div style="display:flex;align-items:center;padding:12px 14px;border-top:1px solid var(--border);gap:10px;">'
                + '<input class="ic-card-label-input" type="text" value="' + (card.label || '') + '" placeholder="e.g. 50K, 1L, 2L..." maxlength="30" style="flex:1;background:transparent;border:none;border-bottom:1px dashed var(--border);color:var(--text-main);font-size:1rem;font-weight:800;outline:none;padding:4px 6px;min-width:0;">'
                + '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">'
                + '<button class="ic-share-btn" title="Share to WhatsApp" style="width:38px;height:38px;border-radius:10px;border:1px solid rgba(37,211,102,0.4);background:rgba(37,211,102,0.12);color:#25d366;display:flex;align-items:center;justify-content:center;cursor:pointer;"><i data-lucide="share-2" style="width:16px;height:16px;"></i></button>'
                + '<button class="ic-delete-btn" title="Delete Card" style="width:34px;height:34px;border-radius:8px;border:1px solid rgba(239,68,68,0.25);background:rgba(239,68,68,0.08);color:#ef4444;display:flex;align-items:center;justify-content:center;cursor:pointer;"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>'
                + '</div></div>';
            list.appendChild(item);

            var fileInput = document.createElement('input');
            fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.style.display = 'none';
            item.appendChild(fileInput);

            var placeholder = item.querySelector('.ic-upload-placeholder');
            if (placeholder) placeholder.addEventListener('click', function() { fileInput.click(); });
            var changeBtn = item.querySelector('.ic-change-photo-btn');
            if (changeBtn) changeBtn.addEventListener('click', function(e) { e.stopPropagation(); fileInput.click(); });

            fileInput.addEventListener('change', function() {
                var file = fileInput.files[0];
                if (!file) return;
                var reader = new FileReader();
                reader.onload = function(ev) {
                    var d = loadData();
                    var idx = (d[currentTenure] || []).findIndex(function(c) { return c.id === card.id; });
                    if (idx > -1) { d[currentTenure][idx].imageData = ev.target.result; saveData(d); renderCards(); }
                };
                reader.readAsDataURL(file);
            });

            var labelInput = item.querySelector('.ic-card-label-input');
            labelInput.addEventListener('blur', function() {
                var d = loadData();
                var idx = (d[currentTenure] || []).findIndex(function(c) { return c.id === card.id; });
                if (idx > -1) { d[currentTenure][idx].label = labelInput.value.trim(); saveData(d); }
            });

            item.querySelector('.ic-share-btn').addEventListener('click', function() { shareCard(card); });
            item.querySelector('.ic-delete-btn').addEventListener('click', function() {
                if (!confirm('Delete this card?')) return;
                var d = loadData();
                d[currentTenure] = (d[currentTenure] || []).filter(function(c) { return c.id !== card.id; });
                saveData(d); renderCards();
            });
        });

        if (window.lucide) window.lucide.createIcons();
    }

    function dataURLtoFile(dataUrl, filename) {
        var arr = dataUrl.split(','), mime = arr[0].match(/:(.*?);/)[1], bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        return new File([u8arr], filename, { type: mime });
    }

    async function shareImageFile(file, title) {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try { await navigator.share({ title: title, files: [file] }); }
            catch (err) { if (err.name !== 'AbortError') alert('Could not share. Please try again.'); }
        } else {
            var url = URL.createObjectURL(file);
            window.open(url, '_blank');
            setTimeout(function() { URL.revokeObjectURL(url); }, 30000);
            if (typeof showNotification === 'function') showNotification('Opened in new tab - save and share manually.', 'info');
        }
    }

    function shareCard(card) {
        if (!card.imageData) { alert('Please upload a card image first.'); return; }
        shareImageFile(dataURLtoFile(card.imageData, (card.label || 'card') + '.jpg'), (currentTenure || '') + ' ' + (card.label || 'card') + ' Installment Card');
    }

    async function shareAllCards() {
        var d = loadData();
        var cards = (d[currentTenure] || []).filter(function(c) { return !!c.imageData; });
        if (!cards.length) { alert('No card images uploaded yet.'); return; }
        if (cards.length === 1) { shareCard(cards[0]); return; }
        if (typeof showNotification === 'function') showNotification('Preparing images...', 'info');
        var imgs = await Promise.all(cards.map(function(c) {
            return new Promise(function(resolve) {
                var img = new Image();
                img.onload = function() { resolve(img); }; img.onerror = function() { resolve(null); };
                img.src = c.imageData;
            });
        }));
        var validImgs = imgs.filter(Boolean);
        if (!validImgs.length) { alert('Could not load images.'); return; }
        var GAP = 16;
        var maxW = Math.max.apply(null, validImgs.map(function(i) { return i.naturalWidth; }));
        var totalH = validImgs.reduce(function(acc, img) { return acc + Math.round(img.naturalHeight * (maxW / img.naturalWidth)) + GAP; }, GAP);
        var canvas = document.createElement('canvas');
        canvas.width = maxW; canvas.height = totalH;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0f0f0f'; ctx.fillRect(0, 0, maxW, totalH);
        var y = GAP;
        validImgs.forEach(function(img) {
            var drawH = Math.round(img.naturalHeight * (maxW / img.naturalWidth));
            ctx.drawImage(img, 0, y, maxW, drawH); y += drawH + GAP;
        });
        canvas.toBlob(async function(blob) {
            var file = new File([blob], (currentTenure || 'All') + '_Cards.jpg', { type: 'image/jpeg' });
            await shareImageFile(file, currentTenure + ' Installment Cards');
        }, 'image/jpeg', 0.92);
    }

    function addNewCardSlot(file) {
        var reader = new FileReader();
        reader.onload = function(ev) {
            var d = loadData();
            if (!d[currentTenure]) d[currentTenure] = [];
            d[currentTenure].push({ id: uid(), label: '', imageData: ev.target.result });
            saveData(d); renderCards();
        };
        reader.readAsDataURL(file);
    }

    function init() {
        // Reset to tenure selector every time screen-cards is opened
        document.addEventListener('click', function(e) {
            if (e.target.closest('[data-target="screen-cards"]')) {
                setTimeout(showTenureSelector, 60);
            }
        });

        var backTenureBtn = document.getElementById('btn-ic-back-tenure');
        if (backTenureBtn) backTenureBtn.addEventListener('click', showTenureSelector);

        document.querySelectorAll('.ic-tenure-slide').forEach(function(btn) {
            btn.addEventListener('click', function() { openTenureCards(btn.dataset.tenure); });
        });

        var addCardBtn   = document.getElementById('btn-ic-add-card');
        var addCardInput = document.getElementById('ic-add-card-file-input');
        if (addCardBtn && addCardInput) {
            addCardBtn.addEventListener('click', function() { addCardInput.click(); });
            addCardInput.addEventListener('change', function() {
                if (addCardInput.files[0]) { addNewCardSlot(addCardInput.files[0]); addCardInput.value = ''; }
            });
        }

        var shareAllBtn = document.getElementById('btn-ic-share-all');
        if (shareAllBtn) shareAllBtn.addEventListener('click', shareAllCards);
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
/* ============================================================
   END INSTALLMENT CARDS MODULE
   ============================================================ */