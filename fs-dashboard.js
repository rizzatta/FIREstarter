// THE GATEKEEPER 
const userId = localStorage.getItem('activeUserId');

if (!userId || userId === "undefined" || userId === "null") {
    window.location.href = "fs-login.html";
}

// DASHBOARD INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
    const mainGrid = document.querySelector('.dashboard-grid');
    if (mainGrid) mainGrid.style.opacity = "0";

    try {
        const response = await fetch(`http://localhost:5000/api/user-data/${userId}`);
        
        if (response.ok) {
            const data = await response.json();
            if (data && data.user_id) {
                updateUI(data);
                initChart(userId); 
                if (mainGrid) {
                    mainGrid.style.transition = "opacity 0.5s ease-in-out";
                    mainGrid.style.opacity = "1";
                }
            } else {
                window.location.href = "fs-onboarding.html";
            }
        } else {
            if (response.status === 404) logout(); 
        }
    } catch (err) {
        console.error("Connection Error:", err);
    }
});

// UI UPDATER
function updateUI(data) {
    const expenses = parseFloat(data.annual_expenses) || 0;
    const multiplier = parseFloat(data.fire_multiplier) || 25;
    const savings = parseFloat(data.current_savings) || 0;
    
    const fireTarget = expenses * multiplier;

    document.getElementById('navUsername').innerText = data.username || "Archivist";
    document.getElementById('fireTarget').innerText = `₱${fireTarget.toLocaleString()}`;
    document.getElementById('currentSavings').innerText = `₱${savings.toLocaleString()}`;
    document.getElementById('displayAge').innerText = data.age || "-";
    document.getElementById('displayRetireAge').innerText = data.target_retirement_age || "-";
    document.getElementById('displayExpenses').innerText = `₱${expenses.toLocaleString()}`;
    
    const progressPercent = fireTarget > 0 ? Math.min((savings / fireTarget) * 100, 100).toFixed(1) : 0;
    const progressBar = document.getElementById('fireProgress');
    if (progressBar) {
        progressBar.style.width = progressPercent + "%";
    }
}

function initChart(uid) {
    console.log("Archive visualization ready for user:", uid);
}

function logout() {
    console.log("Terminating secure session...");
    localStorage.removeItem('activeUserId');
    window.location.href = "fs-login.html";
}