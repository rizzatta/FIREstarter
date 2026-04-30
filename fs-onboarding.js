// Progressive Onboarding
function next(stepNumber) {
    const currentStep = document.querySelector('.step[style*="display: block"]') || document.getElementById('step1');
    
    const inputs = currentStep.querySelectorAll('input[required]');
    
    let allValid = true;
    inputs.forEach(input => {
        if (!input.checkValidity()) {
            input.reportValidity(); 
            allValid = false;
        }
    });

    if (allValid || stepNumber < parseInt(currentStep.id.replace('step', ''))) {
        const steps = document.querySelectorAll('.step');
        steps.forEach(step => step.style.display = 'none');

        const targetStep = document.getElementById('step' + stepNumber);
        if (targetStep) targetStep.style.display = 'block';

        const progressBar = document.getElementById('progressBar');
        progressBar.style.width = (stepNumber / 4) * 100 + '%';
    }
}

// FIRE Number Optimization
function calculateOptimization() {
    const expenses = parseFloat(document.getElementById('annualExpenses').value);
    const fireType = document.querySelector('input[name="fireType"]:checked').value;
    
    let multiplier = 25;
    if (fireType === 'lean') multiplier = 20;
    if (fireType === 'fat') multiplier = 30;

    const fireNumber = expenses * multiplier;
    console.log(`Optimized FIRE Target: ₱${fireNumber.toLocaleString()}`);
    return { fireNumber, multiplier };
}

// Onboarding Form Data Checker
document.getElementById('fireOnboardingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const savedId = localStorage.getItem('activeUserId');

    if (!savedId) {
        alert("Session expired. Please log in again.");
        window.location.href = "fs-login.html";
        return;
    }

    const onboardingData = {
        userId: savedId, 
        username: document.getElementById('username').value,
        age: document.getElementById('currentAge').value,
        retireAge: document.getElementById('targetRetireAge').value,
        savings: document.getElementById('currentSavings').value,
        expenses: document.getElementById('annualExpenses').value,
        sRate: document.getElementById('savingsRate').value,
        rRate: document.getElementById('returnRate').value,
        fireType: document.querySelector('input[name=\"fireType\"]:checked').value
    };

    try {
        const response = await fetch('http://localhost:5000/api/save-onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(onboardingData)
        });

        if (response.ok) {
            alert("FIREstarter Initialized Successfully!");
            window.location.href = "fs-dashboard.html";
        } else {
            alert("Error saving your details. Please check the server.");
        }
    } catch (err) {
        console.error("Connection Error:", err);
        alert("Server is offline. Ensure 'node fs-server.js' is running.");
    }
});