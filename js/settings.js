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

