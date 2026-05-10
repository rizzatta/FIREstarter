const userId = localStorage.getItem('activeUserId');
let fireChartInstance = null;
let globalUserData = null; 

// GATEKEEPER
if (!userId || userId === "null") {
    window.location.href = "fs-login.html";
}

// INIT
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch(`http://localhost:5000/api/user-data/${userId}`);
        if (!res.ok) return logout();

        const data = await res.json();
        globalUserData = data; 

        updateUI(data);
        initChart(data);
        populateHistory(data.history || []); 
        syncLiveInputs(data); 
    } catch (err) {
        console.error("Archive Access Denied:", err);
    }
});


// UI 
function updateUI(data) {
    const expenses = +data.annual_expenses || 0;
    const savings = +data.current_savings || 0;
    const multiplier = +data.fire_multiplier || 25;
    const fireTarget = expenses * multiplier;

    document.getElementById('welcomeName').innerText = data.username || "Archivist";
    document.getElementById('snapshotCount').innerText = `${data.history ? data.history.length : 0} snapshots recorded`;
    document.getElementById('fireTarget').innerText = `₱${fireTarget.toLocaleString()}`;
    document.getElementById('currentSavings').innerText = `₱${savings.toLocaleString()}`;
    document.getElementById('statSavingsRate').innerText = (data.savings_rate || 0) + "%";
    document.getElementById('statReturn').innerText = (data.investment_return_rate || 8) + "%";
    document.getElementById('statSWR').innerText = (100 / multiplier).toFixed(1) + "%";

    const progress = fireTarget > 0
        ? Math.min((savings / fireTarget) * 100, 100).toFixed(1)
        : 0;

    document.getElementById('fireProgress').style.width = progress + "%";
    document.getElementById('progressPct').innerText = progress + "%";

    let phaseText = "";
    if (progress < 25) phaseText = "Phase 1: Accumulation (0% - 25%)";
    else if (progress < 75) phaseText = "Phase 2: Compounding (25% - 75%)";
    else if (progress < 100) phaseText = "Phase 3: Coasting (75% - 99%)";
    else phaseText = "TARGET REACHED (100%)";

    document.getElementById('fireTypeDisplay').innerHTML = phaseText;
    document.getElementById('targetLabel').innerText = `₱${fireTarget.toLocaleString()}`;
}

// CHART 
function initChart(data, target, annualSavings, method) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    if (growthChart) growthChart.destroy(); 

    const currentAge = data.age;
    const maxAge = 90;
    let labels = [];
    for (let a = currentAge; a <= maxAge; a++) labels.push(a);

    const verdict = document.getElementById('liveVerdict');

    // OPTION A: FIXED RETURNS 
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
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { stacked: true } } }
        });

        const yearsToFire = fireAge ? (fireAge - currentAge) : "unknown";
        verdict.innerHTML = `Based on your ideal spending, you need <span>₱${target.toLocaleString()}</span>. You will reach this in <span>${yearsToFire} years</span>.`;
    } 
    
    // OPTION B: MONTE CARLO 
    else if (method === 'monte-carlo') {
        const numSimulations = 500; 
        const maxLinesToDraw = 25;  
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

            if (sim < maxLinesToDraw) {
                datasets.push({
                    label: `Sim ${sim+1}`,
                    data: pathData,
                    borderColor: isBankrupt ? 'rgba(220, 53, 69, 0.3)' : 'rgba(255, 140, 0, 0.15)', 
                    borderWidth: 1.5,
                    fill: false,
                    pointRadius: 0
                });
            }
        }

        datasets.push({
            label: 'FIRE Target',
            data: Array(maxAge - currentAge + 1).fill(target),
            borderColor: '#333',
            borderDash: [5, 5],
            borderWidth: 2,
            fill: false,
            pointRadius: 0
        });

        growthChart = new Chart(ctx, {
            type: 'line',
            data: { labels: labels, datasets: datasets },
            options: { 
                responsive: true, maintainAspectRatio: false, 
                plugins: { legend: { display: false } }, 
                scales: { y: { beginAtZero: true } }
            }
        });

        const successRate = ((successCount / numSimulations) * 100).toFixed(1);
        let color = successRate > 90 ? 'var(--success-green)' : (successRate > 75 ? 'var(--primary-orange)' : 'red');
        
        verdict.innerHTML = `Monte Carlo Stress Test: 500 market realities simulated.<br> 
        Your strategy has a <span style="color: ${color}; font-size: 1.8rem;">${successRate}% Success Rate</span> of surviving until Age 90.`;
    }
}

// SUMMARY 
function updateSummary(data, fireTarget, fireAge) {
    const verdict = document.getElementById('retirementVerdict');

    if (fireAge) {
        verdict.innerHTML = `You can retire in <span>${fireAge - (data.age || 20)} years</span> (age ${fireAge})`;
    } else {
        verdict.innerText = "Target not reached by age 80.";
    }
}

//HISTORY TABLE POPULATION 
function populateHistory(historyArr) {
    const tbody = document.getElementById('historyLogBody');
    tbody.innerHTML = '';
    
    if (!historyArr || historyArr.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No snapshots found. Click '+ Log Snapshot' to record your first milestone!</td></tr>`;
        return;
    }

    historyArr.forEach(log => {
        const dateString = new Date(log.snapshot_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${dateString}</strong></td>
            <td>₱${(+log.monthly_income || 0).toLocaleString()}</td>
            <td><span class="badge" style="background:#e7f5ff; color:#1971c2; padding: 4px 8px; border-radius: 4px;">${log.investment_return_rate || 0}%</span></td>
            <td><strong>₱${(+log.fire_target || 0).toLocaleString()}</strong></td>
            <td>
                <button class="delete-btn" onclick="deleteSnapshot(${log.snapshot_id})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// LOG AND DELETE SNAPSHOT
async function logSnapshot() {
    if (!globalUserData) return alert("Sync to database first to establish a baseline.");

    const expenses = +globalUserData.annual_expenses || 0;
    const multiplier = +globalUserData.fire_multiplier || 25;
    const target = expenses * multiplier;

    const payload = {
        userId: userId,
        monthly_income: globalUserData.monthly_income || 0,
        investment_return_rate: globalUserData.investment_return_rate || 0,
        fire_target: target,
        net_worth: globalUserData.current_savings || 0
    };

    try {
        const res = await fetch('http://localhost:5000/api/save-snapshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json(); 

        if (res.ok) {
            alert("Snapshot Logged!");
            window.location.reload(); 
        } else {
            alert("SERVER REJECTED SNAPSHOT:\n" + JSON.stringify(result));
        }
    } catch (err) {
        alert("NETWORK ERROR: Is your Node.js server running?");
        console.error("Snapshot error:", err);
    }
}

async function deleteSnapshot(snapshotId) {
    if (!confirm("Are you sure you want to delete this snapshot?")) return;

    try {
        const res = await fetch(`http://localhost:5000/api/delete-snapshot/${snapshotId}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            window.location.reload(); 
        } else {
            alert("Failed to delete.");
        }
    } catch (err) {
        console.error("Delete error:", err);
    }
}

// LIVE CALCULATOR LOGIC 
function syncLiveInputs(data) {
    if (!data) return;
    
    if (data.monthly_income > 0) document.getElementById('liveIncome').value = data.monthly_income;
    if (data.monthly_spending > 0) document.getElementById('liveSpending').value = data.monthly_spending;
    if (data.annual_expenses > 0) document.getElementById('liveRetireSpending').value = data.annual_expenses;
    if (data.investment_return_rate > 0) document.getElementById('liveReturn').value = data.investment_return_rate;
    
    const netWorthInput = document.getElementById('liveNetWorth');
    if (netWorthInput && data.current_savings > 0) {
        netWorthInput.value = data.current_savings;
    }
    
    const swr = data.fire_multiplier ? (100 / data.fire_multiplier).toFixed(1) : 4.0;
    document.getElementById('liveSWR').value = swr;
}

function liveUpdate() {
    const income = parseFloat(document.getElementById('liveIncome').value) || 0;
    const currentSpend = parseFloat(document.getElementById('liveSpending').value) || 0;
    const retireSpend = parseFloat(document.getElementById('liveRetireSpending').value) || 0;
    const returnRate = parseFloat(document.getElementById('liveReturn').value) || 0;
    const swr = parseFloat(document.getElementById('liveSWR').value) || 4;
    const volatility = parseFloat(document.getElementById('liveVolatility').value) || 15;
    const method = document.getElementById('projectionMethod').value;

    const savingsAmount = income - currentSpend;
    const savingsRate = (savingsAmount / income * 100).toFixed(1);
    const fireTarget = (retireSpend / (swr / 100)); 

    document.getElementById('fireTarget').innerText = `₱${fireTarget.toLocaleString()}`;
    const statRateEl = document.getElementById('statSavingsRate');
    if (statRateEl) statRateEl.innerText = `${savingsRate}%`;

    const userData = {
        age: parseInt(document.getElementById('displayAge') ? document.getElementById('displayAge').innerText : 25),
        current_savings: parseFloat(document.getElementById('currentSavings').innerText.replace(/₱|,/g, '')) || 0,
        annual_expenses: currentSpend * 12,
        retire_spending: retireSpend,
        savings_rate: savingsRate,
        investment_return_rate: returnRate / 100,
        volatility: volatility / 100,
        fire_multiplier: 100 / swr 
    };
    
    initChart(userData, fireTarget, savingsAmount * 12, method);
}

async function updateDatabase() {
    const btn = document.querySelector('.save-archive-btn');
    btn.innerText = "Syncing...";
    
    try {
        const netWorth = +(document.getElementById('liveNetWorth')?.value) || 0;
        const retireSpending = +(document.getElementById('liveRetireSpending')?.value) || 0;
        const returnRate = +(document.getElementById('liveReturn')?.value) || 0;
        const swr = +(document.getElementById('liveSWR')?.value) || 4.0;
        const income = +(document.getElementById('liveIncome')?.value) || 0;
        const spending = +(document.getElementById('liveSpending')?.value) || 0;
        
        const monthlySavings = income - spending;
        const newSavingsRate = income > 0 ? (monthlySavings / income) * 100 : 0;
        const newMultiplier = swr > 0 ? 100 / swr : 25;

        const payload = {
            annual_expenses: Math.round(retireSpending),
            investment_return_rate: Math.round(returnRate),
            fire_multiplier: Math.round(newMultiplier),
            savings_rate: Math.round(newSavingsRate),
            current_savings: Math.round(netWorth), 
            monthly_income: Math.round(income),
            monthly_spending: Math.round(spending)
        };

        const res = await fetch(`http://localhost:5000/api/user-data/${userId}`, {
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await res.json();

        if (res.ok && result.success) {
            btn.innerText = "Archive Synced!";
            globalUserData = { ...globalUserData, ...payload };
            updateUI(globalUserData);
            setTimeout(() => btn.innerText = "Sync to Archive", 2000);
        } else {
            alert("Sync Failed: " + (result.error || "Unknown Error"));
            btn.innerText = "Sync Failed";
        }
    } catch(err) {
        alert("CRITICAL ERROR: " + err.message);
        console.error("Sync Error:", err);
        btn.innerText = "Connection Error";
    }
}

// BOX-MULLER TRANSFORM
function randomNormal(mean, stdDev) {
    let u1 = Math.random();
    let u2 = Math.random();
    let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
}

// LOGOUT
function logout() {
    localStorage.removeItem('activeUserId');
    window.location.href = "fs-login.html";
}