// Progressive Onboarding
function next(stepNumber) {
    document.querySelectorAll('.step').forEach(step => {
        step.style.display = 'none';
        step.classList.remove('active');
    });

    const target = document.getElementById(`step${stepNumber}`);
    if (target) {
        target.style.display = 'block';
        target.classList.add('active');
    }
    
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        const progress = (stepNumber / 4) * 100;
        progressBar.style.width = `${progress}%`;
    }
}

document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('input', function() {
        if (this.value < 0) this.value = 0;
    });
});

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