const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// TAB TOGGLE 
function showForm(type) {
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
            <a href="#" class="red-link">Forgot password</a>`;
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
        footer.innerHTML = `
            <span>Already have an account? </span>
            <a href="#" class="red-link" onclick="showForm('login')">Login</a>`;
    }
}

// PASSWORD VISIBILITY TOGGLE
function togglePass(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    const isPass = input.type === "password";
    input.type = isPass ? "text" : "password";
    icon.src = isPass ? "./icons/eye-hidden.svg" : "./icons/eye.svg";
}

// REAL-TIME VALIDATION
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setupValidation(formId, emailInputId, errorId) {
    const form = document.getElementById(formId);
    const emailInput = document.getElementById(emailInputId);
    const errorSpan = document.getElementById(errorId);
    const btn = form.querySelector('.main-btn');

    form.addEventListener('input', () => {
        const emailValue = emailInput.value.trim();
        const isEmailValid = emailRegex.test(emailValue);
        
        errorSpan.style.display = (emailValue.length > 0 && !isEmailValid) ? 'block' : 'none';
        emailInput.classList.toggle('invalid', emailValue.length > 0 && !isEmailValid);

        const allFilled = Array.from(form.querySelectorAll('input[required]'))
                               .every(input => input.value.trim() !== "");

        btn.disabled = !(allFilled && isEmailValid);
        btn.classList.toggle('active', allFilled && isEmailValid);
    });
}

// INITIALIZE VALIDATION
setupValidation('loginForm', 'username', 'loginEmailError');
setupValidation('registerForm', 'regEmail', 'regEmailError');

// API: CREATE ACCOUNT (POST)
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const formData = {
        firstName: registerForm.querySelectorAll('input')[0].value,
        lastName: registerForm.querySelectorAll('input')[1].value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPass').value
    };

    try {
        const response = await fetch('http://localhost:5000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (response.ok) {
            alert("Success! Welcome to FIREstarter, " + result.user);
            showForm('login'); 
        } else {
            alert("Error: " + result.error);
        }
    } catch (error) {
        alert("Server is offline. Start node server.js!");
    }
});

// API: LOGIN & REDIRECT
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginData = {
        email: document.getElementById('username').value,
        password: document.getElementById('password').value
    };
    try {
        const response = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData)
        });
        if (response.ok) window.location.href = "fs-onboarding.html";
        else alert("Invalid Credentials");
    } catch (err) { alert("Server is offline!"); }
});

// GOOGLE ICON CLICK LOGIN TRIGGER
function triggerGoogleLogin() {
    document.cookie = "g_state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    google.accounts.id.initialize({
        client_id: "YOUR_GOOGLE_CLIENT_ID_HERE",
        callback: handleCredentialResponse
    });

    google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
            alert("Google Prompt Error: " + notification.getNotDisplayedReason());
            console.error("Reason:", notification.getNotDisplayedReason());
        }
    });
}

// GOOGLE OAUTH SENDBACK
function handleCredentialResponse(response) {
    console.log("JWT Received");
    fetch('http://localhost:5000/api/auth/google/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
    })
    .then(() => window.location.href = "fs-onboarding.html");
}