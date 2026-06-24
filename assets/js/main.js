const burgerToggle = document.getElementById('burgerToggle');
const mobileNav = document.getElementById('mobileNav');

burgerToggle.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('open');
    burgerToggle.classList.toggle('active');
    burgerToggle.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
});

function closeMobileNav() {
    mobileNav.classList.remove('open');
    burgerToggle.classList.remove('active');
    burgerToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
}

const loginModal = document.getElementById('login-contabilidad');
const loginTriggers = document.querySelectorAll('.js-accounting-login');
const loginCloseControls = document.querySelectorAll('[data-close-login]');
const accountingLoginForm = document.getElementById('accountingLoginForm');
const accountingUser = document.getElementById('accountingUser');
const accountingPassword = document.getElementById('accountingPassword');
const accountingLoginError = document.getElementById('accountingLoginError');
const authModeButtons = document.querySelectorAll('[data-auth-mode]');
const TEMP_ACCOUNTING_USER = 'dreams@local.test';
const TEMP_ACCOUNTING_PASSWORD = 'conta2026';
let authMode = 'login';

function openAccountingLogin() {
    closeMobileNav();
    if (accountingLoginError) accountingLoginError.textContent = '';
    loginModal.classList.add('open');
    loginModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => accountingUser.focus(), 100);
}

function setAuthMode(mode) {
    authMode = mode;
    authModeButtons.forEach(button => button.classList.toggle('active', button.dataset.authMode === mode));
    accountingPassword.required = mode !== 'reset';
    accountingPassword.parentElement?.classList.toggle('is-hidden', false);
    accountingPassword.style.display = mode === 'reset' ? 'none' : '';
    document.querySelector('label[for="accountingPassword"]').style.display = mode === 'reset' ? 'none' : '';
    const submitText = mode === 'signup' ? 'Crear cuenta' : mode === 'reset' ? 'Enviar recuperacion' : 'Ingresar';
    accountingLoginForm.querySelector('button[type="submit"]').lastChild.textContent = ` ${submitText}`;
    if (accountingLoginError) accountingLoginError.textContent = '';
}

authModeButtons.forEach(button => {
    button.addEventListener('click', () => setAuthMode(button.dataset.authMode));
});

function closeAccountingLogin() {
    loginModal.classList.remove('open');
    loginModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

loginTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
        e.preventDefault();
        openAccountingLogin();
    });
});

loginCloseControls.forEach(control => {
    control.addEventListener('click', closeAccountingLogin);
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && loginModal.classList.contains('open')) {
        closeAccountingLogin();
    }
});

accountingLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!accountingLoginForm.checkValidity()) {
        accountingLoginForm.reportValidity();
        return;
    }
    const user = accountingUser.value.trim().toLowerCase();
    const password = accountingPassword.value.trim();
    try {
        if (window.dreamsSupabase?.configured()) {
            if (authMode === 'reset') {
                await window.dreamsSupabase.resetPassword(user);
                accountingLoginError.textContent = 'Te enviamos un correo para recuperar tu contraseña.';
                return;
            }
            if (authMode === 'signup') {
                await window.dreamsSupabase.signUp(user, password);
                accountingLoginError.textContent = 'Cuenta creada. Revisa tu correo si Supabase solicita confirmacion.';
                return;
            }
            await window.dreamsSupabase.signIn(user, password);
            window.location.href = 'contabilidad.html';
            return;
        }

        if (user !== TEMP_ACCOUNTING_USER || password !== TEMP_ACCOUNTING_PASSWORD) {
            accountingLoginError.textContent = 'Usuario o contraseña incorrectos. Usa el acceso temporal indicado.';
            accountingPassword.value = '';
            accountingPassword.focus();
            return;
        }
        localStorage.setItem('dreamsAccountingSession', JSON.stringify({
            user,
            enteredAt: new Date().toISOString(),
            mode: 'temporary'
        }));
        window.location.href = 'contabilidad.html';
    } catch (error) {
        accountingLoginError.textContent = error.message || 'No se pudo completar la accion.';
    }
});

function openLoginFromHash() {
    if (window.location.hash === '#login-contabilidad') {
        openAccountingLogin();
    }
}

openLoginFromHash();
window.addEventListener('load', openLoginFromHash);
window.addEventListener('hashchange', openLoginFromHash);

function checkMobileCta() {
    const mobileCta = document.getElementById('mobileCta');
    if (window.innerWidth >= 768) {
        mobileCta.style.display = 'inline-flex';
    } else {
        mobileCta.style.display = 'none';
    }
}
checkMobileCta();
window.addEventListener('resize', checkMobileCta);

const scrollTextLeft = document.getElementById('scrollTextLeft');
const scrollTextRight = document.getElementById('scrollTextRight');

function updateScrollText() {
    const scrollY = window.scrollY;
    const vh = window.innerHeight;
    const opacity = Math.max(0, 1 - scrollY / (vh * 0.6));
    scrollTextLeft.style.opacity = opacity;
    scrollTextRight.style.opacity = opacity;
}
window.addEventListener('scroll', updateScrollText);
updateScrollText();

const siteHeader = document.getElementById('siteHeader');

function updateHeader() {
    if (window.scrollY > 100) {
        siteHeader.style.background = 'rgba(10,10,10,0.9)';
        siteHeader.style.backdropFilter = 'blur(10px)';
    } else {
        siteHeader.style.background = 'transparent';
        siteHeader.style.backdropFilter = 'none';
    }
}
window.addEventListener('scroll', updateHeader);
updateHeader();

const revealElements = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
});

revealElements.forEach(el => revealObserver.observe(el));

const statNumbers = document.querySelectorAll('.stat-number[data-target]');

const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.getAttribute('data-target'));
            const duration = 2000;
            const startTime = performance.now();

            function animate(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = Math.round(eased * target);
                el.textContent = current + '+';
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            }

            requestAnimationFrame(animate);
            counterObserver.unobserve(el);
        }
    });
}, { threshold: 0.5 });

statNumbers.forEach(el => counterObserver.observe(el));

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        if (this.classList.contains('js-accounting-login')) return;
        const href = this.getAttribute('href');
        if (href === '#') return;
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            const headerHeight = siteHeader.offsetHeight;
            const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});
