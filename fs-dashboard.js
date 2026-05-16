// THE GATEKEEPER
const userId = localStorage.getItem('activeUserId');
let growthChart = null;
let globalUserData = null;

if (!userId || userId === "null") {
    window.location.href = "fs-login.html";
}

// MATH HELPERS
function randomNormal(mean, stdDev) {
    let u1 = Math.random();
    let u2 = Math.random();
    let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
}

// MAIN DASHBOARD INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch(`http://localhost:5000/api/user-data/${userId}`);
        if (!res.ok) return logout();

        const data = await res.json();
        globalUserData = data;

        document.getElementById('welcomeName').innerText = data.username || "Archivist";
        document.getElementById('displayAge').innerText = data.age || 25;
        
        const expenses = parseFloat(data.annual_expenses) || 0;
        const savingsRate = parseFloat(data.savings_rate) || 0;
        const income = (expenses / 12) / (1 - (savingsRate / 100));

        document.getElementById('liveIncome').value = Math.round(income);
        document.getElementById('liveNetWorth').value = Math.round(data.current_savings);
        document.getElementById('liveSpending').value = Math.round(expenses / 12);
        document.getElementById('liveRetireSpending').value = Math.round(expenses);
        document.getElementById('liveReturn').value = data.investment_return_rate || 8.0;
        document.getElementById('liveSWR').value = (100 / (data.fire_multiplier || 25)).toFixed(1);

        loadStrategyHistory();
        liveUpdate();
    } catch (err) {
        console.error("Archive Access Denied:", err);
    }
});

// UI UPDATER
function liveUpdate() {
    const income = parseFloat(document.getElementById('liveIncome').value) || 0;
    const netWorth = parseFloat(document.getElementById('liveNetWorth').value) || 0;
    const currentSpend = parseFloat(document.getElementById('liveSpending').value) || 0;
    const retireSpend = parseFloat(document.getElementById('liveRetireSpending').value) || 0;
    const returnRate = parseFloat(document.getElementById('liveReturn').value) || 0;
    const swr = parseFloat(document.getElementById('liveSWR').value) || 4;
    const volatility = parseFloat(document.getElementById('liveVolatility').value) || 15;
    const method = document.getElementById('projectionMethod').value;

    const savingsAmount = income - currentSpend;
    const savingsRate = income > 0 ? (savingsAmount / income * 100).toFixed(1) : 0;
    const fireTarget = (retireSpend / (swr / 100));

    document.getElementById('fireTargetDisplay').innerText = `₱${fireTarget.toLocaleString()}`;
    document.getElementById('currentSavingsDisplay').innerText = `₱${netWorth.toLocaleString()}`;
    document.getElementById('statSavingsRate').innerText = `${savingsRate}%`;
    document.getElementById('statReturn').innerText = `${returnRate}%`;
    document.getElementById('statSWR').innerText = `${swr}%`;

    const progressPct = fireTarget > 0 ? Math.min((netWorth / fireTarget) * 100, 100).toFixed(1) : 0;
    const progressBar = document.getElementById('fireProgress');
    if (progressBar) progressBar.style.width = progressPct + "%";
    
    const pctLabel = document.getElementById('progressPct');
    if (pctLabel) pctLabel.innerText = progressPct + "%";
    
    const targetLabel = document.getElementById('targetLabel');
    if (targetLabel) targetLabel.innerText = `₱${fireTarget.toLocaleString()}`;

    let statusText = "Building Archive...";
    if (netWorth >= fireTarget * 1.2) statusText = "FAT FIRE REACHED";
    else if (netWorth >= fireTarget) statusText = "STANDARD FIRE REACHED";
    else if (netWorth >= fireTarget * 0.8) statusText = "LEAN FIRE REACHED";
    document.getElementById('fireTypeDisplay').innerText = statusText;

    const userData = {
        age: parseInt(document.getElementById('displayAge').innerText),
        current_savings: netWorth,
        retire_spending: retireSpend,
        investment_return_rate: returnRate / 100,
        volatility: volatility / 100
    };
    
    initChart(userData, fireTarget, savingsAmount * 12, method);
}

// WEALTH PROJECTION CHART ENGINE
function initChart(data, target, annualSavings, method) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    if (growthChart) growthChart.destroy(); 

    const currentAge = data.age;
    const maxAge = 90;
    let labels = [];
    for (let a = currentAge; a <= maxAge; a++) labels.push(a);

    const verdict = document.getElementById('liveVerdict');

    if (method === 'fixed') {
        let principalData = [], returnsData = [];
        let totalSavings = data.current_savings;
        let totalPrincipal = totalSavings;
        let fireAge = null;

        for (let age = currentAge; age <= maxAge; age++) {
            principalData.push(totalPrincipal);
            returnsData.push(Math.max(0, totalSavings - totalPrincipal));

            if (totalSavings >= target && fireAge === null) fireAge = age;

            totalSavings = (totalSavings * (1 + data.investment_return_rate)) + annualSavings;
            totalPrincipal += annualSavings;
        }

        growthChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Principal', data: principalData, backgroundColor: 'rgba(54, 162, 235, 0.7)', fill: true, stack: 'combined' },
                    { label: 'Returns', data: returnsData, backgroundColor: 'rgba(40, 167, 69, 0.7)', fill: true, stack: 'combined' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { stacked: true, ticks: { callback: (v) => '₱' + v.toLocaleString() } } },
                plugins: {
                    annotation: {
                        annotations: {
                            line1: { type: 'line', yMin: target, yMax: target, borderColor: 'red', borderDash: [6, 6], borderWidth: 2 }
                        }
                    }
                }
            }
        });

        const yearsToFire = fireAge ? (fireAge - currentAge) : "unknown";
        verdict.innerHTML = `Based on your ideal spending, you need <span>₱${target.toLocaleString()}</span>. You will reach this in <span>${yearsToFire} years</span>.`;
    
    } else if (method === 'monte-carlo') {
        const numSimulations = 500;
        let successCount = 0;
        let datasets = [];

        for (let sim = 0; sim < numSimulations; sim++) {
            let pathData = [];
            let currentPortfolio = data.current_savings;
            let isBankrupt = false;

            for (let age = currentAge; age <= maxAge; age++) {
                pathData.push(Math.max(0, currentPortfolio));
                let randomYearlyReturn = randomNormal(data.investment_return_rate, data.volatility);

                if (currentPortfolio < target) {
                    currentPortfolio = (currentPortfolio * (1 + randomYearlyReturn)) + annualSavings;
                } else {
                    currentPortfolio = (currentPortfolio * (1 + randomYearlyReturn)) - data.retire_spending;
                }

                if (currentPortfolio <= 0) isBankrupt = true;
            }

            if (!isBankrupt) successCount++;

            if (sim < 25) {
                datasets.push({
                    label: `Sim ${sim+1}`,
                    data: pathData,
                    borderColor: isBankrupt ? 'rgba(220, 53, 69, 0.3)' : 'rgba(255, 140, 0, 0.15)',
                    borderWidth: 1.5, fill: false, pointRadius: 0
                });
            }
        }

        datasets.push({
            label: 'FIRE Target',
            data: Array(maxAge - currentAge + 1).fill(target),
            borderColor: '#333', borderDash: [5, 5], borderWidth: 2, fill: false, pointRadius: 0
        });

        growthChart = new Chart(ctx, {
            type: 'line',
            data: { labels: labels, datasets: datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { callback: (v) => '₱' + v.toLocaleString() } } }
            }
        });

        const successRate = ((successCount / numSimulations) * 100).toFixed(1);
        let color = successRate > 90 ? '#28A745' : (successRate > 75 ? '#FF8C00' : 'red');
        verdict.innerHTML = `Monte Carlo Stress Test: 500 realities simulated.<br> 
        Your strategy has a <span style="color: ${color}; font-size: 1.8rem;">${successRate}% Success Rate</span>.`;
    }
}

// ARCHIVE MANAGEMENT (Database Sync)
async function updateDatabase() {
    const income = parseFloat(document.getElementById('liveIncome').value);
    const expenses = parseFloat(document.getElementById('liveSpending').value);
    const returns = parseFloat(document.getElementById('liveReturn').value);
    const swr = parseFloat(document.getElementById('liveSWR').value);
    const target = (parseFloat(document.getElementById('liveRetireSpending').value) / (swr / 100));
    const sRate = ((income - expenses) / income * 100);

    const snapshot = {
        userId, income, expenses, returns, swr, target,
        sRate: parseFloat(sRate.toFixed(1))
    };

    try {
        const response = await fetch('http://localhost:5000/api/save-strategy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(snapshot)
        });

        if (response.ok) {
            alert("Entry Saved to Archive!");
            loadStrategyHistory(); 
        } else {
            alert("Database Error: Is the PostgreSQL table created?");
        }
    } catch (err) { console.error(err); }
}

window.logSnapshot = async function() {
    updateDatabase();
};

async function loadStrategyHistory() {
    try {
        const res = await fetch(`http://localhost:5000/api/strategy-history/${userId}`);
        if (!res.ok) return;
        const logs = await res.json();
        
        document.getElementById('snapshotCount').innerText = `${logs.length} snapshots recorded`;

        const tableBody = document.getElementById('historyLogBody');
        if (!tableBody) return; 

        tableBody.innerHTML = logs.map(log => `
            <tr>
                <td>${new Date(log.snapshot_date).toLocaleDateString()}</td>
                <td>₱${parseFloat(log.monthly_income).toLocaleString()}</td>
                <td>${log.expected_return}%</td>
                <td>₱${parseFloat(log.fire_target).toLocaleString()}</td>
                <td>
                    <button onclick="deleteStrategy(${log.snapshot_id})" style="background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch(err) { console.error("History fetch error:", err); }
}

async function deleteStrategy(snapshotId) {
    if (!confirm("Are you sure you want to delete this archive entry?")) return;

    try {
        const response = await fetch(`http://localhost:5000/api/strategy/${snapshotId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadStrategyHistory();
        } else {
            alert("Delete failed. Check server connection.");
        }
    } catch (err) {
        console.error("Delete error:", err);
    }
}

// GLOBAL ACTIONS
window.logout = function() {
    localStorage.removeItem('activeUserId');
    window.location.href = "fs-login.html";
};