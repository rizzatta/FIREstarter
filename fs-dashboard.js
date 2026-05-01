// Onboarding Input Data Fetch
document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('activeUserId');
    
    if (!userId) {
        window.location.href = "fs-login.html";
        return;
    }

    try {
        const response = await fetch(`http://localhost:5000/api/user-data/${userId}`);
        const data = await response.json();

        if (response.ok) {
            updateUI(data);
        }
    } catch (err) {
        console.error("Failed to load archives:", err);
    }
});

// FIRE Target Calculator
function updateUI(data) {
    const fireTarget = data.annual_expenses * data.fire_multiplier;
    
    document.getElementById('navUsername').innerText = data.username;
    document.getElementById('fireTarget').innerText = `₱${fireTarget.toLocaleString()}`;
    document.getElementById('currentSavings').innerText = `₱${data.current_savings.toLocaleString()}`;
    document.getElementById('displayAge').innerText = data.age;
    document.getElementById('displayRetireAge').innerText = data.target_retirement_age;
    document.getElementById('displayExpenses').innerText = `₱${data.annual_expenses.toLocaleString()}`;
    
    const progressPercent = Math.min((data.current_savings / fireTarget) * 100, 100);
    document.getElementById('fireProgress').style.width = progressPercent + "%";
}

function logout() {
    localStorage.removeItem('activeUserId');
    window.location.href = "fs-login.html";
}