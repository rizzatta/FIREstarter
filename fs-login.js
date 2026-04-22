const toggleBtn = document.querySelector('#togglePassword');
const passwordInput = document.querySelector('#password');
const eyeImg = document.querySelector('#eyeIcon');

toggleBtn.addEventListener('click', function () {
    const isPassword = passwordInput.type === 'password';
    
    passwordInput.type = isPassword ? 'text' : 'password';

    eyeImg.src = isPassword ? './icons/eye-hidden.svg' : './icons/eye.svg';
  
    console.log("Password visibility toggled to:", passwordInput.type);
});

// Login and Create account views
function showForm(type) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabs = document.querySelectorAll('.tab-btn');

    if (type === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
    }
}

function togglePass(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (input.type === "password") {
        input.type = "text";
        icon.src = "./icons/eye-hidden.svg";
    } else {
        input.type = "password";
        icon.src = "./icons/eye.svg";
    }
}

// Footer for Login and Create Account view
function showForm(type) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const footer = document.getElementById('formFooter');
    const tabs = document.querySelectorAll('.tab-btn');

    if (type === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
        
        footer.innerHTML = `
            <a href="#" class="red-link" onclick="showForm('register')">Create my account</a>
            <span class="divider">or</span>
            <a href="#" class="red-link">Forgot password</a>
        `;
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
        
        footer.innerHTML = `
            <span>Already have an account? </span>
            <a href="#" class="red-link" onclick="showForm('login')">Login</a>
        `;
    }
}