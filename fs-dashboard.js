const userId = localStorage.getItem('activeUserId');

// GATEKEEPER
if (!userId || userId === "null") window.location.href = "fs-login.html";

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`http://localhost:5000/api/user-data/${userId}`);
        if (response.ok) {
            const data = await response.json();
            updateUI(data);
            initChart(data); 
        } else {
            logout();
        }
    } catch (err) { console.error("Archive Access Denied:", err); }
});

// UI UPDATER
function updateUI(data) {
    const expenses = parseFloat(data.annual_expenses) || 0;
    const mult = parseFloat(data.fire_multiplier) || 25;
    const savings = parseFloat(data.current_savings) || 0;
    const fireTarget = expenses * mult;

    document.getElementById('welcomeName').innerText = data.username;
    document.getElementById('fireTarget').innerText = `₱${fireTarget.toLocaleString()}`;
    document.getElementById('currentSavings').innerText = `₱${savings.toLocaleString()}`;
    document.getElementById('targetLabel').innerText = `₱${fireTarget.toLocaleString()}`;
    
    const progress = fireTarget > 0 ? Math.min((savings / fireTarget) * 100, 100).toFixed(1) : 0;
    document.getElementById('fireProgress').style.width = progress + "%";
    document.getElementById('progressPct').innerText = progress + "%";
}

function initChart(data) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    const currentAge = parseInt(data.age);
    const retireAge = parseInt(data.target_retirement_age);
    const returnRate = (parseFloat(data.investment_return_rate) / 100) || 0.08;
    const monthlySavings = (parseFloat(data.annual_expenses) / 12) * (parseFloat(data.savings_rate) / 100);

    let labels = [];
    let principalData = [];
    let returnsData = [];
    
    let currentTotal = parseFloat(data.current_savings);
    let currentPrincipal = currentTotal;

    for (let age = currentAge; age <= retireAge + 5; age++) {
        labels.push(age);
        principalData.push(currentPrincipal);
        returnsData.push(Math.max(0, currentTotal - currentPrincipal));

        currentTotal = (currentTotal * (1 + returnRate)) + (monthlySavings * 12);
        currentPrincipal += (monthlySavings * 12);
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Principal', data: principalData, backgroundColor: 'rgba(40, 167, 69, 0.6)', fill: true },
                { label: 'Returns', data: returnsData, backgroundColor: 'rgba(255, 140, 0, 0.4)', fill: true }
            ]
        },
        options: { 
            responsive: true, maintainAspectRatio: false, 
            scales: { y: { stacked: true, ticks: { callback: v => '₱' + v.toLocaleString() } } } 
        }
    });

    document.getElementById('projAge').innerText = retireAge;
    document.getElementById('projWorth').innerText = `₱${currentTotal.toLocaleString()}`;
}

window.logout = function() {
    localStorage.removeItem('activeUserId');
    window.location.href = "fs-login.html";
};

// SETTINGS
function updateUI(data) {
    const expenses = parseFloat(data.annual_expenses) || 0;
    const mult = parseFloat(data.fire_multiplier) || 25;
    const savings = parseFloat(data.current_savings) || 0;
    const fireTarget = expenses * mult;

    const welcomeEl = document.getElementById('welcomeName');
    if (welcomeEl) welcomeEl.innerText = data.username || "Archivist";

    document.getElementById('fireTarget').innerText = `₱${fireTarget.toLocaleString()}`;
    document.getElementById('currentSavings').innerText = `₱${savings.toLocaleString()}`;
}