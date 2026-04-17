// Login Page Module
// Handles login form rendering and authentication

const LoginPage = {
  state: {
    loading: false,
    error: null,
  },

  render() {
    const loginView = document.getElementById('login-view');

    const html = `
      <div class="min-h-screen flex items-center justify-center px-4 py-8">
        <div class="w-full max-w-md">
          <!-- Card with dark theme and orange accents -->
          <div class="rounded-2xl p-8 shadow-2xl" style="background: hsl(25,10%,10%); border: 1px solid hsl(25,8%,18%); box-shadow: 0 20px 50px rgba(0,0,0,0.5);">

            <!-- Logo and Title -->
            <div class="text-center mb-8">
              <div class="flex items-center justify-center mb-4">
                <span style="font-size: 48px; margin-right: 8px;">🍔</span>
                <div class="text-4xl font-bold" style="background: linear-gradient(135deg, #f97316 0%, #fbbf24 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                  Mr Tasty
                </div>
              </div>
              <p class="text-white/60 text-sm">Sistema de gestión de locales</p>
            </div>

            <!-- Form -->
            <form id="login-form" class="space-y-5">
              <!-- Email Input -->
              <div>
                <label for="email" class="block text-white/80 text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="admin@mrtasty.com"
                  class="w-full px-4 py-3 rounded-lg text-white transition-colors"
                  style="background: hsl(25,8%,14%); border: 1px solid hsl(25,8%,18%); color: hsl(40,15%,92%);"
                  required
                  autocomplete="email"
                />
              </div>

              <!-- Password Input -->
              <div>
                <label for="password" class="block text-white/80 text-sm font-medium mb-2">
                  Contraseña
                </label>
                <div class="relative">
                  <input
                    type="password"
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    class="w-full px-4 py-3 rounded-lg text-white transition-colors pr-10"
                    style="background: hsl(25,8%,14%); border: 1px solid hsl(25,8%,18%); color: hsl(40,15%,92%);"
                    required
                    autocomplete="current-password"
                  />
                  <button
                    type="button"
                    id="toggle-password"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                    style="font-size: 18px;"
                  >
                    👁️
                  </button>
                </div>
              </div>

              <!-- Error Message -->
              <div id="error-message" class="hidden p-3 rounded-lg text-red-200" style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);">
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                id="login-btn"
                class="w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2"
                style="background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); box-shadow: 0 4px 15px rgba(249,115,22,0.3);"
              >
                <span id="btn-text">Iniciar sesión</span>
                <span id="btn-spinner" class="hidden">
                  <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
              </button>

              <!-- Hint Text -->
              <p class="text-center text-white/40 text-xs pt-4 border-t" style="border-color: hsl(25,8%,18%);">
                Demo: admin@mrtasty.com / mrtasty2024
              </p>
            </form>
          </div>

          <!-- Footer -->
          <div class="mt-8 text-center text-white/30 text-xs">
            <p>Mr Tasty © 2026 — Gestión de Hamburgueserías</p>
          </div>
        </div>
      </div>

      <style>
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }

        /* Input focus styles */
        input:focus {
          outline: none;
          border-color: #f97316 !important;
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
        }

        /* Password toggle animation */
        #toggle-password:hover {
          transform: scale(1.1);
        }
      </style>
    `;

    loginView.innerHTML = html;
    this.bindEvents();
  },

  bindEvents() {
    const form = document.getElementById('login-form');
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.getElementById('toggle-password');
    const emailInput = document.getElementById('email');

    // Password visibility toggle
    let showPassword = false;
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showPassword = !showPassword;
      passwordInput.type = showPassword ? 'text' : 'password';
      toggleBtn.textContent = showPassword ? '🙈' : '👁️';
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        this.showError('Por favor completa todos los campos');
        return;
      }

      await this.handleLogin(email, password);
    });

    // Clear error on input
    emailInput.addEventListener('input', () => {
      this.clearError();
    });

    passwordInput.addEventListener('input', () => {
      this.clearError();
    });

    // Set focus on email input
    emailInput.focus();
  },

  async handleLogin(email, password) {
    const loginBtn = document.getElementById('login-btn');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');

    try {
      this.state.loading = true;
      loginBtn.disabled = true;
      btnText.classList.add('hidden');
      btnSpinner.classList.remove('hidden');

      const response = await App.api('/api/auth/login.php', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (response.ok && response.user) {
        // Update app state
        App.state.user = response.user;

        // Load stores and suppliers
        await Promise.all([
          App.loadStores(),
          App.loadSuppliers(),
        ]);

        // Show app and initialize routing
        App.showApp();
        App.renderSidebar();
        App.setupRouting();

        // Navigate to dashboard
        App.navigate('dashboard');

        App.toast('¡Bienvenido, ' + response.user.name + '!', 'success');
      }
    } catch (error) {
      this.showError(error.message || 'Error al iniciar sesión. Intenta de nuevo.');
      App.toast('Error al iniciar sesión', 'error');
    } finally {
      this.state.loading = false;
      loginBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');
    }
  },

  showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.remove('hidden');
    }
    this.state.error = message;
  },

  clearError() {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
      errorDiv.classList.add('hidden');
      errorDiv.textContent = '';
    }
    this.state.error = null;
  },
};
