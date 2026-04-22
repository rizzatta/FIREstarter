const toggleBtn = document.querySelector('#togglePassword');
const passwordInput = document.querySelector('#password');
const eyeImg = document.querySelector('#eyeIcon');

toggleBtn.addEventListener('click', function () {
   
    const isPassword = passwordInput.type === 'password';
    
    passwordInput.type = isPassword ? 'text' : 'password';

    eyeImg.src = isPassword ? './icons/eye-hidden.svg' : './icons/eye.svg';
  
    console.log("Password visibility toggled to:", passwordInput.type);
});