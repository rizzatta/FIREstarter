// Age Checker for Accurate Personalized FIRE Chart 
function next(stepNumber) {
    const currentStep = document.querySelector('.step.active');
    const inputs = currentStep.querySelectorAll('input[required]');
    
    let allValid = true;
    inputs.forEach(input => {
        if (!input.checkValidity()) {
            input.reportValidity();
            allValid = false;
        }
    });

    if (!allValid) return;

    if (currentStep.id === 'step1' && stepNumber === 2) {
        const age = parseInt(document.getElementById('currentAge').value);
        const retireAge = parseInt(document.getElementById('targetRetireAge').value);

        if (age <= 0) {
            alert("Age must be a positive number.");
            return;
        }

        if (age >= retireAge) {
            alert("Your target retirement age must be older than your current age.");
            return;
        }
    }

    document.querySelectorAll('.step').forEach(s => { 
        s.style.display = 'none'; 
        s.classList.remove('active'); 
    });
    
    const target = document.getElementById('step' + stepNumber);
    target.style.display = 'block';
    target.classList.add('active');

    document.getElementById('progressBar').style.width = (stepNumber / 4) * 100 + '%';
    
    if (stepNumber === 4) updateFIREPreview();
}

// SHOW MONTHLY BREAKDOWN OF ANNUAL EXPENSES
function updateMonthlyExpense() {
    const annual = parseFloat(document.getElementById('annualExpenses').value) || 0;
    const monthly = Math.round(annual / 12);
    document.getElementById('monthlyExpenseNote').innerText = `₱${monthly.toLocaleString()} per month`;
}

// SHOW LIVE FIRE NUMBER PREVIEW
function updateFIREPreview() {
    const expenses = parseFloat(document.getElementById('annualExpenses').value) || 0;
    const fireType = document.querySelector('input[name="fireType"]:checked').value;
    const multiplier = fireType === 'lean' ? 20 : (fireType === 'fat' ? 30 : 25);
    
    const fireNumber = expenses * multiplier;
    document.getElementById('liveFIRENumber').innerText = `₱${fireNumber.toLocaleString()}`;
}

function next(stepNumber) {
    const currentStep = document.querySelector('.step.active');
    const inputs = currentStep.querySelectorAll('input[required]');
    
    let allValid = true;
    inputs.forEach(input => { if (!input.checkValidity()) { input.reportValidity(); allValid = false; } });

    if (allValid || stepNumber < parseInt(currentStep.id.replace('step', ''))) {
        document.querySelectorAll('.step').forEach(s => { s.style.display = 'none'; s.classList.remove('active'); });
        const target = document.getElementById('step' + stepNumber);
        target.style.display = 'block';
        target.classList.add('active');

        document.getElementById('progressBar').style.width = (stepNumber / 4) * 100 + '%';
        if (stepNumber === 4) updateFIREPreview();
    }
}

document.getElementById('fireOnboardingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const annualExpenses = parseFloat(document.getElementById('annualExpenses').value);
    const savingsAmount = parseFloat(document.getElementById('savingsAmount').value);
    
    // CONVERT ₱ SAVINGS TO A RATE (%) FOR THE BACKEND DATABASE
    const calculatedRate = ((savingsAmount * 12) / (annualExpenses + (savingsAmount * 12)) * 100).toFixed(1);

    const onboardingData = {
        userId: localStorage.getItem('activeUserId'),
        username: document.getElementById('username').value,
        age: document.getElementById('currentAge').value,
        retireAge: document.getElementById('targetRetireAge').value,
        savings: document.getElementById('currentSavings').value,
        expenses: annualExpenses,
        sRate: calculatedRate,
        rRate: document.getElementById('returnRate').value,
        fireType: document.querySelector('input[name="fireType"]:checked').value
    };

    try {
        const response = await fetch('http://localhost:5000/api/save-onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(onboardingData)
        });

        if (response.ok) window.location.href = "fs-dashboard.html";
    } catch (err) { console.error("Error:", err); }
});