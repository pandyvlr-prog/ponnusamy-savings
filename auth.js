// Supabase Configuration
const supabaseUrl = 'https://ypkmtmmmsjcdmnarkmhf.supabase.co';
const supabaseAnonKey = 'sb_publishable_qtUyeCpKdqAYYQsIDKiStQ_8ZM39iIU';
let supabaseClient = null;
try {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
        window.supabaseClient = supabaseClient;
    } else {
        console.warn("Supabase library not loaded. Running in offline/mock mode.");
    }
} catch (e) {
    console.error("Supabase failed to initialize", e);
}

// Simulated Authentication & Settings Logic
const AuthState = {
    isAuthenticated: false,
    currentUser: null,
    theme: 'light'
};
window.AuthState = AuthState;

async function initAuth() {
    function navigateToLastScreen() {
        const lastScreen = localStorage.getItem('pms_last_active_screen');
        const isAuthScreen = ['screen-landing', 'screen-login', 'screen-register'].includes(lastScreen);
        let targetScreen = 'screen-dashboard';
        if (lastScreen && !isAuthScreen && document.getElementById(lastScreen)) {
            targetScreen = lastScreen;
            if (targetScreen === 'screen-group-details') {
                const lastGroup = localStorage.getItem('pms_last_active_group');
                if (lastGroup && typeof State !== 'undefined') State.selectedGroupId = lastGroup;
            }
        }
        navigateTo(targetScreen);
    }

    if (!supabaseClient) {
        AuthState.isAuthenticated = false;
        navigateTo('screen-landing');
        setupAuthListeners();
        return;
    }
    // Check active Supabase session
    try {
        // [PHASE 1] Check for cached session to render the application shell instantly
        const cachedSession = localStorage.getItem('pms_cached_session');
        let usedCache = false;
        if (cachedSession) {
            try {
                AuthState.isAuthenticated = true;
                AuthState.currentUser = JSON.parse(cachedSession);
                // navigateTo('screen-dashboard') triggers switchView which triggers renderDashboard
                navigateToLastScreen();
                updateProfileUI();
                usedCache = true;
            } catch(e) {}
        }

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
                avatar: activeUser.user_metadata?.avatar_url || activeUser.user_metadata?.picture || null,
                user_metadata: activeUser.user_metadata || {}
            };
            
            // [PHASE 1] Save session to cache
            localStorage.setItem('pms_cached_session', JSON.stringify(AuthState.currentUser));

            // [PHASE 1] Only navigate if we didn't use cache, otherwise we just update profile silently
            if (!usedCache) {
                navigateToLastScreen();
            }
            updateProfileUI();
            
            if (typeof loadState === 'function') await loadState();
            // [PHASE 1] Removed duplicate renderDashboard() call. navigateTo already triggers it via switchView.
        } else {
            AuthState.isAuthenticated = false;
            localStorage.removeItem('pms_cached_session');
            navigateTo('screen-landing');
        }
    } catch(err) {
        console.error(err);
        localStorage.removeItem('pms_cached_session');
        navigateTo('screen-landing');
    }
    
    // Hide initial loading overlay for a corporate feel
    setTimeout(() => {
        const overlay = document.getElementById('transition-overlay');
        if (overlay && overlay.classList.contains('active')) {
            overlay.classList.remove('active');
        }
    }, 400);

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
                avatar: activeUser.user_metadata?.avatar_url || activeUser.user_metadata?.picture || null,
                user_metadata: activeUser.user_metadata || {}
            };
            
            // [PHASE 1] Save session to cache
            localStorage.setItem('pms_cached_session', JSON.stringify(AuthState.currentUser));

            navigateToLastScreen();
            updateProfileUI();
            if (typeof loadState === 'function') await loadState();
            // [PHASE 1] Removed duplicate renderDashboard() call.
        } else if (event === 'SIGNED_OUT') {
            AuthState.isAuthenticated = false;
            AuthState.currentUser = null;
            // [PHASE 1] Clear cache on sign out
            localStorage.removeItem('pms_cached_session');
            if (typeof loadState === 'function') await loadState();
            navigateTo('screen-landing');
        }
    });

    setupAuthListeners();
}

function navigateTo(screenId) {
    if (screenId === 'screen-landing') {
        document.body.setAttribute('data-app-state', 'landing');
    } else if (screenId === 'screen-login' || screenId === 'screen-register') {
        document.body.setAttribute('data-app-state', 'login');
    } else {
        document.body.setAttribute('data-app-state', 'dashboard');
    }

    if (typeof switchView === 'function') {
        switchView(screenId);
        return;
    }
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
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(AuthState.currentUser.name)}&background=0D8ABC&color=fff&size=80`;
    const avatarUrl = AuthState.currentUser.avatar || fallbackUrl;
    
    const headerAvatar = document.getElementById('header-avatar-img');
    const settingsAvatar = document.getElementById('settings-avatar-img');
    
    if (headerAvatar) {
        headerAvatar.src = avatarUrl;
        headerAvatar.onerror = function() { this.onerror = null; this.src = fallbackUrl; };
    }
    if (settingsAvatar) {
        settingsAvatar.src = avatarUrl;
        settingsAvatar.onerror = function() { this.onerror = null; this.src = fallbackUrl; };
    }
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
        }, 1600);
    }, 500);
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

    // Login Form Submit — Real Supabase Auth
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const passwordEl = document.getElementById('login-password');
        const password = passwordEl ? passwordEl.value : '';

        if (!supabaseClient) {
            if (typeof showNotification === 'function') showNotification('Database not connected. Running offline.', 'error');
            return;
        }

        const submitBtn = e.target.querySelector('[type="submit"]');
        const isRegistering = document.getElementById('name-group') && document.getElementById('name-group').style.display === 'block';
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = isRegistering ? 'Signing up…' : 'Signing in…'; }

        try {
            let authResult;
            if (password) {
                if (isRegistering) {
                    const name = document.getElementById('register-name').value.trim();
                    authResult = await supabaseClient.auth.signUp({ 
                        email, 
                        password,
                        options: { data: { name: name || 'New User' } }
                    });
                    if (authResult.error) {
                        if (typeof showNotification === 'function') showNotification(authResult.error.message, 'error');
                        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sign Up'; }
                        return;
                    }
                    if (authResult.data && !authResult.data.session) {
                        if (typeof showNotification === 'function') showNotification('Account created! Please check your email to verify.', 'success');
                        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sign Up'; }
                        return;
                    }
                } else {
                    // Attempt real sign-in
                    authResult = await supabaseClient.auth.signInWithPassword({ email, password });
                    if (authResult.error) {
                        if (typeof showNotification === 'function') showNotification('Invalid login credentials.', 'error');
                        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sign In'; }
                        return;
                    }
                }
            } else {
                // No password field (legacy form): send magic link
                authResult = await supabaseClient.auth.signInWithOtp({ email });
                if (!authResult.error) {
                    if (typeof showNotification === 'function') showNotification('Magic link sent! Check your email.', 'success');
                }
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sign In'; }
                return;
            }

            if (authResult.error) {
                if (typeof showNotification === 'function') showNotification(authResult.error.message, 'error');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sign In'; }
                return;
            }

            // onAuthStateChange handles the rest (loadState, navigate)
        } catch (err) {
            console.error('Login error:', err);
            if (typeof showNotification === 'function') showNotification('Login failed. Please try again.', 'error');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sign In'; }
        }
    });

    let isRegisterMode = false;
    document.getElementById('register-new-link').addEventListener('click', (e) => {
        e.preventDefault();
        isRegisterMode = !isRegisterMode;
        
        const title = document.getElementById('auth-title');
        const subtitleText = document.getElementById('auth-subtitle-text');
        const nameGroup = document.getElementById('name-group');
        const submitBtnText = document.getElementById('auth-submit-text');
        const forgotLink = document.getElementById('forgot-password-link');
        const registerLink = document.getElementById('register-new-link');
        
        if (isRegisterMode) {
            title.textContent = 'Create Account';
            subtitleText.textContent = 'Already have an account?';
            registerLink.textContent = 'Sign in';
            nameGroup.style.display = 'block';
            document.getElementById('register-name').required = true;
            submitBtnText.textContent = 'Sign Up';
            forgotLink.style.display = 'none';
        } else {
            title.textContent = 'Welcome Back';
            subtitleText.textContent = "Don't have an account?";
            registerLink.textContent = 'Create one';
            nameGroup.style.display = 'none';
            document.getElementById('register-name').required = false;
            submitBtnText.textContent = 'Sign In';
            forgotLink.style.display = 'block';
        }
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

    // Forgot Password Trigger
    const forgotLink = document.getElementById('forgot-password-link');
    if (forgotLink) {
        forgotLink.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!supabaseClient) {
                if (typeof showNotification === 'function') {
                    showNotification('Database is not connected (Offline mode).', 'error');
                } else {
                    alert('Database is currently not connected (Offline mode).');
                }
                return;
            }
            const forgotModal = document.getElementById('forgot-password-modal');
            const closeForgotBtn = document.getElementById('close-forgot-modal');
            const forgotForm = document.getElementById('forgot-password-form');
            const forgotEmailInput = document.getElementById('forgot-email-input');
            const forgotSubmitBtn = document.getElementById('forgot-submit-btn');
            const submitTextSpan = forgotSubmitBtn.querySelector('span');

            if (!forgotModal) {
                // Fallback if modal isn't loaded yet
                const email = prompt("Enter your email address to receive a password reset link:");
                if (email) {
                    supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
                        .then(({error}) => {
                            if(error) { if(typeof showNotification === 'function') showNotification(error.message, 'error'); else alert(error.message); }
                            else { if(typeof showNotification === 'function') showNotification('Reset email sent!', 'success'); else alert('Reset email sent!'); }
                        });
                }
                return;
            }

            // Open Modal
            forgotModal.style.display = 'flex';
            if (lucide && lucide.createIcons) lucide.createIcons(); // ensure icon renders

            // Close Modal
            const closeModal = () => {
                forgotModal.style.display = 'none';
                forgotForm.reset();
            };
            
            closeForgotBtn.onclick = closeModal;
            forgotModal.onclick = (event) => {
                if (event.target === forgotModal) closeModal();
            };

            // Handle Submit
            forgotForm.onsubmit = async (event) => {
                event.preventDefault();
                const email = forgotEmailInput.value.trim();
                if (!email) return;

                forgotSubmitBtn.disabled = true;
                submitTextSpan.textContent = 'Sending...';

                try {
                    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                        redirectTo: window.location.origin
                    });
                    if (error) {
                        if (typeof showNotification === 'function') showNotification(error.message, 'error');
                        else alert('Error: ' + error.message);
                    } else {
                        if (typeof showNotification === 'function') showNotification('Password reset email sent! Please check your inbox.', 'success');
                        else alert('Password reset email sent! Check your inbox.');
                        closeModal();
                    }
                } catch (err) {
                    console.error(err);
                    if (typeof showNotification === 'function') showNotification('Error sending reset link.', 'error');
                } finally {
                    forgotSubmitBtn.disabled = false;
                    submitTextSpan.textContent = 'Send Reset Link';
                }
            };
        });
    }

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

