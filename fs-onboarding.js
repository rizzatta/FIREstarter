function nextStep(stepNumber) {
    document.querySelectorAll('.form-step').forEach(step => {
        step.style.display = 'none';
    });
    document.getElementById(`step${stepNumber}`).style.display = 'block';
    
    const progress = (stepNumber / 3) * 100;
    document.getElementById('progress').style.width = `${progress}%`;
}