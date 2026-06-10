// Supabase Configuration
const supabaseUrl = 'https://ypkmtmmmsjcdmnarkmhf.supabase.co';
const supabaseAnonKey = 'sb_publishable_qtUyeCpKdqAYYQsIDKiStQ_8ZM39iIU';
let supabaseClient = null;
try {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    window.supabaseClient = supabaseClient;
} catch (e) {
    console.error("Supabase failed to load", e);
    alert("Error: Failed to load Supabase! Please ensure you have an internet connection and are not running on file:/// with restrictions.");
}

// Simulated Authentication & Settings Logic
const AuthState = {
    isAuthenticated: false,
    currentUser: null,
    theme: 'light'
};
window.AuthState = AuthState;

async function initAuth() {
    if (!supabaseClient) {
        AuthState.isAuthenticated = false;
        navigateTo('screen-landing');
        setupAuthListeners();
        return;
    }
    // Check active Supabase session
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (session) {
            // Force network fetch to get the absolute latest user_metadata across devices
            const { data: { user }, error } = await supabaseClient.auth.getUser();
            const activeUser = user || session.user;
            
            AuthState.isAuthenticated = true;
            AuthState.currentUser = {
                id: activeUser.id, // Ensure ID is passed down!
                name: activeUser.user_metadata?.full_name || activeUser.email.split('@')[0],
                email: activeUser.email,
                avatar: activeUser.user_metadata?.avatar_url || null,
                user_metadata: activeUser.user_metadata || {}
            };
            navigateTo('screen-dashboard');
            updateProfileUI();
            if (typeof loadState === 'function') await loadState();
            if (typeof renderDashboard === 'function') renderDashboard();
        } else {
            AuthState.isAuthenticated = false;
            navigateTo('screen-landing');
        }
    } catch(err) {
        console.error(err);
        navigateTo('screen-landing');
    }

    // Listen for auth changes (like returning from Google login redirect)
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            // Force network fetch to get the absolute latest user_metadata across devices
            const { data: { user }, error } = await supabaseClient.auth.getUser();
            const activeUser = user || session.user;
            
            AuthState.isAuthenticated = true;
            AuthState.currentUser = {
                id: activeUser.id, // Ensure ID is passed down!
                name: activeUser.user_metadata?.full_name || activeUser.email.split('@')[0],
                email: activeUser.email,
                avatar: activeUser.user_metadata?.avatar_url || null,
                user_metadata: activeUser.user_metadata || {}
            };
            navigateTo('screen-dashboard');
            updateProfileUI();
            if (typeof loadState === 'function') await loadState();
            if (typeof renderDashboard === 'function') renderDashboard();
        } else if (event === 'SIGNED_OUT') {
            AuthState.isAuthenticated = false;
            AuthState.currentUser = null;
            if (typeof loadState === 'function') await loadState();
            navigateTo('screen-landing');
        }
    });

    setupAuthListeners();
}

function navigateTo(screenId) {
    document.querySelectorAll('.app-screen').forEach(el => {
        el.classList.remove('active');
    });
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
    }
}

function updateProfileUI() {
    if (!AuthState.currentUser) return;
    
    // Dropdown
    document.getElementById('dropdown-user-name').textContent = AuthState.currentUser.name;
    document.getElementById('dropdown-user-email').textContent = AuthState.currentUser.email;
    
    // Settings Page
    document.getElementById('settings-user-name-display').textContent = AuthState.currentUser.name;
    document.getElementById('settings-user-email-display').textContent = AuthState.currentUser.email;
    document.getElementById('settings-input-name').value = AuthState.currentUser.name;
    document.getElementById('settings-input-email').value = AuthState.currentUser.email;
    
    // Avatars
    const avatarUrl = AuthState.currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(AuthState.currentUser.name)}&background=0D8ABC&color=fff&size=80`;
    
    const headerAvatar = document.getElementById('header-avatar-img');
    const settingsAvatar = document.getElementById('settings-avatar-img');
    
    if (headerAvatar) headerAvatar.src = avatarUrl;
    if (settingsAvatar) settingsAvatar.src = avatarUrl;
}

function triggerVaultTransition(callback) {
    const overlay = document.getElementById('transition-overlay');
    if (!overlay) {
        callback();
        return;
    }
    
    overlay.classList.add('active');
    
    setTimeout(() => {
        callback();
        
        setTimeout(() => {
            overlay.classList.remove('active');
        }, 1200);
    }, 400);
}

function setupAuthListeners() {
    // Landing -> Login
    document.getElementById('btn-goto-login').addEventListener('click', () => {
        triggerVaultTransition(() => {
            navigateTo('screen-login');
        });
    });
    
    // Top Nav -> Login
    document.getElementById('nav-login-btn').addEventListener('click', () => {
        triggerVaultTransition(() => {
            navigateTo('screen-login');
        });
    });
    document.getElementById('nav-get-started-btn').addEventListener('click', () => {
        triggerVaultTransition(() => {
            navigateTo('screen-login');
        });
    });

    // Login Form Submit
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const name = email.split('@')[0].toUpperCase();
        
        let userData = { name, email, avatar: null };
        const savedUserData = localStorage.getItem('ps_user_' + email);
        if (savedUserData) {
            userData = JSON.parse(savedUserData);
        } else {
            localStorage.setItem('ps_user_' + email, JSON.stringify(userData));
        }
        
        AuthState.isAuthenticated = true;
        AuthState.currentUser = userData;
        localStorage.setItem('ps_auth', JSON.stringify(AuthState));
        
        if (typeof loadState === 'function') {
            loadState();
        }
        
        updateProfileUI();
        
        if (typeof renderDashboard === 'function') {
            renderDashboard();
        }
        
        navigateTo('screen-dashboard');
    });

    // Mock Registration
    document.getElementById('register-new-link').addEventListener('click', (e) => {
        e.preventDefault();
        AuthState.isAuthenticated = true;
        AuthState.currentUser = { name: 'New User', email: 'newuser@example.com' };
        localStorage.setItem('ps_auth', JSON.stringify(AuthState));
        navigateTo('screen-dashboard');
        updateProfileUI();
        if (typeof renderDashboard === 'function') renderDashboard();
    });

    // Mock Google Login
    document.getElementById('google-login-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) {
            console.error("Google Login Error:", error.message);
            if (typeof showNotification === 'function') showNotification('Google login failed', 'error');
        }
    });

    // Avatar Dropdown Toggle
    const btnProfile = document.getElementById('btn-profile-dropdown');
    const dropdown = document.getElementById('profile-dropdown-menu');
    
    btnProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!btnProfile.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });

    // Dropdown items
    document.getElementById('btn-goto-settings').addEventListener('click', () => {
        dropdown.classList.remove('active');
        navigateTo('screen-settings');
    });
    
    document.getElementById('btn-sign-out').addEventListener('click', async () => {
        dropdown.classList.remove('active');
        await supabaseClient.auth.signOut();
    });

    // Settings actions
    const btnSettingsSignOut = document.getElementById('btn-settings-sign-out');
    if (btnSettingsSignOut) {
        btnSettingsSignOut.addEventListener('click', async () => {
            if (typeof showCustomConfirm === 'function') {
                const confirm = await showCustomConfirm('Sign Out', 'Are you sure you want to sign out of your account?');
                if (!confirm) return;
            } else {
                if (!window.confirm('Are you sure you want to sign out of your account?')) return;
            }

            await supabaseClient.auth.signOut();
            if (typeof showNotification === 'function') {
                showNotification('Signed out successfully.', 'info');
            }
        });
    }

    document.getElementById('btn-back-to-dashboard').addEventListener('click', () => {
        navigateTo('screen-dashboard');
    });
    
    document.getElementById('btn-save-profile').addEventListener('click', () => {
        const newName = document.getElementById('settings-input-name').value;
        if (newName) {
            AuthState.currentUser.name = newName;
            localStorage.setItem('ps_user_' + AuthState.currentUser.email, JSON.stringify(AuthState.currentUser));
            localStorage.setItem('ps_auth', JSON.stringify(AuthState));
            updateProfileUI();
            
            // Show toast (if exist)
            if (typeof showNotification === 'function') {
                showNotification('Profile updated successfully!', 'success');
            } else {
                const toast = document.getElementById('toast');
                const toastMsg = document.getElementById('toast-message');
                if (toast && toastMsg) {
                    toastMsg.textContent = 'Profile updated successfully!';
                    toast.classList.add('show');
                    setTimeout(() => toast.classList.remove('show'), 3000);
                }
            }
        }
    });

    // Avatar Upload Logic
    const avatarInput = document.getElementById('settings-avatar-input');
    if (avatarInput) {
        avatarInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 2 * 1024 * 1024) {
                    if (typeof showNotification === 'function') {
                        showNotification('Image must be less than 2MB', 'error');
                    } else {
                        alert('Image must be less than 2MB');
                    }
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(event) {
                    AuthState.currentUser.avatar = event.target.result;
                    localStorage.setItem('ps_user_' + AuthState.currentUser.email, JSON.stringify(AuthState.currentUser));
                    localStorage.setItem('ps_auth', JSON.stringify(AuthState));
                    updateProfileUI();
                    
                    if (typeof showNotification === 'function') {
                        showNotification('Profile photo updated!', 'success');
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Change Password Modal
    const pwModal = document.getElementById('change-password-modal-backdrop');
    document.getElementById('btn-open-change-password').addEventListener('click', () => {
        pwModal.classList.add('active');
    });
    
    document.getElementById('btn-close-change-password-modal').addEventListener('click', () => {
        pwModal.classList.remove('active');
    });
    document.getElementById('btn-cancel-change-password').addEventListener('click', () => {
        pwModal.classList.remove('active');
    });
    document.getElementById('btn-save-change-password').addEventListener('click', () => {
        // Show success and close
        if (typeof showNotification === 'function') {
            showNotification('Password updated successfully!', 'success');
        } else {
            const toast = document.getElementById('toast');
            const toastMsg = document.getElementById('toast-message');
            if (toast && toastMsg) {
                toastMsg.textContent = 'Password updated successfully!';
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 3000);
            }
        }
        pwModal.classList.remove('active');
    });
}

// Call on load
document.addEventListener('DOMContentLoaded', initAuth);

