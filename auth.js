// Authentication Module using Supabase

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Check if user is already logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            this.currentUser = session.user;
            this.updateUIForLoggedInUser();
        }

        // Listen for auth state changes
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                this.currentUser = session.user;
                this.updateUIForLoggedInUser();
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.updateUIForLoggedOutUser();
            }
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Sign Up Form
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignUp(e));
        }

        // Sign In Form
        const signinForm = document.getElementById('signin-form');
        if (signinForm) {
            signinForm.addEventListener('submit', (e) => this.handleSignIn(e));
        }

        // Forgot Password Form
        const forgotPasswordForm = document.getElementById('forgot-password-form');
        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', (e) => this.handleForgotPassword(e));
        }

        // Logout buttons
        const logoutBtns = document.querySelectorAll('#logout-btn, #nav-logout-btn');
        logoutBtns.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.handleLogout());
            }
        });

        // Modal navigation
        const showSignIn = document.getElementById('show-signin');
        const showSignUp = document.getElementById('show-signup');
        const backToSignIn = document.getElementById('back-to-signin');
        const forgotPasswordLink = document.getElementById('forgot-password-link');

        if (showSignIn) {
            showSignIn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal('signup-modal');
                this.openModal('signin-modal');
            });
        }

        if (showSignUp) {
            showSignUp.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal('signin-modal');
                this.openModal('signup-modal');
            });
        }

        if (backToSignIn) {
            backToSignIn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal('forgot-password-modal');
                this.openModal('signin-modal');
            });
        }

        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal('signin-modal');
                this.openModal('forgot-password-modal');
            });
        }

        // Close modal buttons
        const closeSignup = document.getElementById('close-signup');
        const closeSignin = document.getElementById('close-signin');
        const closeForgot = document.getElementById('close-forgot');

        if (closeSignup) closeSignup.addEventListener('click', () => this.closeModal('signup-modal'));
        if (closeSignin) closeSignin.addEventListener('click', () => this.closeModal('signin-modal'));
        if (closeForgot) closeForgot.addEventListener('click', () => this.closeModal('forgot-password-modal'));

        // Nav buttons
        const navSignInBtn = document.getElementById('nav-sign-in-btn');
        const navSignUpBtn = document.getElementById('nav-sign-up-btn');

        if (navSignInBtn) {
            navSignInBtn.addEventListener('click', () => this.openModal('signin-modal'));
        }

        if (navSignUpBtn) {
            navSignUpBtn.addEventListener('click', () => this.openModal('signup-modal'));
        }
    }

    async handleSignUp(e) {
        e.preventDefault();
        const errorDiv = document.getElementById('signup-error');
        errorDiv.textContent = '';

        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const organization = document.getElementById('signup-organization').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;

        // Validate passwords match
        if (password !== confirmPassword) {
            errorDiv.textContent = 'Passwords do not match';
            return;
        }

        if (password.length < 6) {
            errorDiv.textContent = 'Password must be at least 6 characters';
            return;
        }

        try {
            // Sign up user
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        name: name,
                        organization: organization
                    }
                }
            });

            if (error) {
                errorDiv.textContent = error.message;
                return;
            }

            // Insert user profile into database
            if (data.user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            id: data.user.id,
                            name: name,
                            organization: organization,
                            email: email
                        }
                    ]);

                if (profileError && profileError.code !== '23505') { // Ignore duplicate key error
                    console.error('Error creating profile:', profileError);
                }
            }

            // Show success message
            errorDiv.style.color = 'green';
            errorDiv.textContent = 'Sign up successful! Please check your email to verify your account.';
            
            // Clear form
            document.getElementById('signup-form').reset();
            
            // Close modal after 2 seconds
            setTimeout(() => {
                this.closeModal('signup-modal');
                this.openModal('signin-modal');
            }, 2000);

        } catch (err) {
            errorDiv.textContent = 'An error occurred. Please try again.';
            console.error('Sign up error:', err);
        }
    }

    async handleSignIn(e) {
        e.preventDefault();
        const errorDiv = document.getElementById('signin-error');
        errorDiv.textContent = '';

        const email = document.getElementById('signin-email').value;
        const password = document.getElementById('signin-password').value;

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                errorDiv.textContent = error.message;
                return;
            }

            // Success - user is now logged in
            this.currentUser = data.user;
            this.closeModal('signin-modal');
            document.getElementById('signin-form').reset();
            
            // Update UI
            this.updateUIForLoggedInUser();

        } catch (err) {
            errorDiv.textContent = 'An error occurred. Please try again.';
            console.error('Sign in error:', err);
        }
    }

    async handleForgotPassword(e) {
        e.preventDefault();
        const errorDiv = document.getElementById('forgot-error');
        const successDiv = document.getElementById('forgot-success');
        errorDiv.textContent = '';
        successDiv.textContent = '';

        const email = document.getElementById('reset-email').value;

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/landing.html?reset=true`
            });

            if (error) {
                errorDiv.textContent = error.message;
                return;
            }

            successDiv.textContent = 'Password reset link sent to your email!';
            document.getElementById('forgot-password-form').reset();

        } catch (err) {
            errorDiv.textContent = 'An error occurred. Please try again.';
            console.error('Forgot password error:', err);
        }
    }

    async handleLogout() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Logout error:', error);
                return;
            }

            this.currentUser = null;
            this.updateUIForLoggedOutUser();
            
            // Redirect to landing page if on map page
            if (document.getElementById('map-page').classList.contains('active')) {
                this.showPage('landing-page');
            }

        } catch (err) {
            console.error('Logout error:', err);
        }
    }

    updateUIForLoggedInUser() {
        // Get user profile (silently handle errors)
        this.getUserProfile().then(profile => {
            const userName = profile?.name || this.currentUser?.email || 'User';
            const userSpan = document.getElementById('current-user');
            if (userSpan) {
                userSpan.textContent = userName;
            }

            // Update nav buttons
            const navSignIn = document.getElementById('nav-sign-in-btn');
            const navSignUp = document.getElementById('nav-sign-up-btn');
            const navMapView = document.getElementById('nav-map-view-btn');
            const navTour = document.getElementById('nav-tour-btn');
            const navLogout = document.getElementById('nav-logout-btn');

            if (navSignIn) navSignIn.style.display = 'none';
            if (navSignUp) navSignUp.style.display = 'none';
            if (navMapView) navMapView.style.display = 'block';
            if (navTour) navTour.style.display = 'block';
            if (navLogout) navLogout.style.display = 'block';
        }).catch(err => {
            // Silently handle profile errors - UI will still update
            console.log('Profile fetch handled silently');
        });
    }

    updateUIForLoggedOutUser() {
        const navSignIn = document.getElementById('nav-sign-in-btn');
        const navSignUp = document.getElementById('nav-sign-up-btn');
        const navMapView = document.getElementById('nav-map-view-btn');
        const navTour = document.getElementById('nav-tour-btn');
        const navLogout = document.getElementById('nav-logout-btn');

        if (navSignIn) navSignIn.style.display = 'block';
        if (navSignUp) navSignUp.style.display = 'block';
        if (navMapView) navMapView.style.display = 'none';
        if (navTour) navTour.style.display = 'none';
        if (navLogout) navLogout.style.display = 'none';

        const userSpan = document.getElementById('current-user');
        if (userSpan) {
            userSpan.textContent = 'Guest';
        }
    }

    async getUserProfile() {
        if (!this.currentUser) return null;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .maybeSingle();

            // Handle errors - 406 or PGRST116 means table doesn't exist or no rows
            if (error) {
                // 406 = Not Acceptable (usually means table doesn't exist or RLS issue)
                // PGRST116 = no rows found
                if (error.code === 'PGRST116' || error.code === '42P01' || error.status === 406 || 
                    error.message?.includes('0 rows') || error.message?.includes('single JSON object') ||
                    error.message?.includes('relation') || error.message?.includes('does not exist')) {
                    // Silently try to create profile, but don't fail if it doesn't work
                    try {
                        return await this.createProfile();
                    } catch {
                        // Profile table might not exist - that's okay
                        return null;
                    }
                }
                // For other errors, try creating profile anyway
                try {
                    return await this.createProfile();
                } catch {
                    return null;
                }
            }

            // If no data returned, try to create profile
            if (!data) {
                try {
                    return await this.createProfile();
                } catch {
                    return null;
                }
            }

            return data;
        } catch (err) {
            // Silently handle all errors - profile is optional
            return null;
        }
    }

    async createProfile() {
        if (!this.currentUser) return null;

        try {
            const email = this.currentUser.email || '';
            const name = this.currentUser.user_metadata?.name || email.split('@')[0] || 'User';
            const organization = this.currentUser.user_metadata?.organization || 'Individual';

            const { data, error } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: this.currentUser.id,
                        email: email,
                        name: name,
                        organization: organization
                    }
                ])
                .select()
                .maybeSingle();

            if (error) {
                // Ignore duplicate key errors (23505) - profile already exists
                if (error.code === '23505') {
                    // Profile already exists, try to fetch it
                    const { data: existingData } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', this.currentUser.id)
                        .maybeSingle();
                    return existingData;
                }
                // Only log non-duplicate errors
                console.error('Error creating profile:', error);
                return null;
            }

            return data;
        } catch (err) {
            // Silently handle - profile might already exist
            console.error('Error creating profile:', err);
            return null;
        }
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// Initialize auth manager when DOM is loaded
let authManager;
document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
});

