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
    const savings = parseFloat(data.current_savings) || 0;
    const mult = parseFloat(data.fire_multiplier) || 25;
    const fireTarget = expenses * mult;
    const leanTarget = expenses * 20;
    const standardTarget = expenses * 25;
    const fatTarget = expenses * 30;

    const progressPct = fireTarget > 0 ? Math.min((savings / fireTarget) * 100, 100).toFixed(1) : 0;
    const progressBar = document.getElementById('fireProgress');
    if (progressBar) progressBar.style.width = progressPct + "%";
    document.getElementById('progressPct').innerText = progressPct + "%";

    let statusText = "Building Archive...";
    if (savings >= fatTarget) statusText = "FAT FIRE REACHED";
    else if (savings >= standardTarget) statusText = "STANDARD FIRE REACHED";
    else if (savings >= leanTarget) statusText = "LEAN FIRE REACHED";
    
    document.getElementById('fireTypeDisplay').innerText = statusText;
    document.getElementById('targetLabel').innerText = `₱${fireTarget.toLocaleString()}`;
}

// GROWTH CHART
async function initChart(data) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    const currentAge = parseInt(data.age);
    const retireAgeTarget = parseInt(data.target_retirement_age);
    const annualExpenses = parseFloat(data.annual_expenses);
    const returnRate = (parseFloat(data.investment_return_rate) / 100) || 0.08;
    
    const monthlySavings = (annualExpenses / (1 - (data.savings_rate/100))) * (data.savings_rate/100) / 12;
    const fireTarget = annualExpenses * parseFloat(data.fire_multiplier);

    let labels = [], principalData = [], returnsData = [];
    let totalSavings = parseFloat(data.current_savings);
    let totalPrincipal = totalSavings;
    let fireAge = null;

    for (let age = currentAge; age <= 80; age++) {
        labels.push(age);
        principalData.push(totalPrincipal);
        returnsData.push(Math.max(0, totalSavings - totalPrincipal));

        if (totalSavings >= fireTarget && fireAge === null) fireAge = age;

        totalSavings = (totalSavings * (1 + returnRate)) + (monthlySavings * 12);
        totalPrincipal += (monthlySavings * 12);
    }

    const earlyRetireAge = Math.max(currentAge + 1, (fireAge || retireAgeTarget) - 5);
    const yearsToEarly = earlyRetireAge - currentAge;
    const extraNeeded = Math.max(0, (fireTarget - totalSavings) / (yearsToEarly * 12)); 

    renderChart(ctx, labels, principalData, returnsData, fireTarget); 
    updateSummary(data, fireTarget, fireAge, extraNeeded, earlyRetireAge); 
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

async function initChart(data) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    
    // DATA PARSING
    const currentAge = parseInt(data.age);
    const retireAgeTarget = parseInt(data.target_retirement_age);
    const annualExpenses = parseFloat(data.annual_expenses);
    const fireMultiplier = parseFloat(data.fire_multiplier);
    const returnRate = (parseFloat(data.investment_return_rate) / 100);
    const initialSavings = parseFloat(data.current_savings);
    
    const fireTarget = annualExpenses * fireMultiplier;
    
    const monthlySavings = (annualExpenses / (1 - (data.savings_rate/100))) * (data.savings_rate/100) / 12;

    let labels = [];
    let principalData = []; 
    let returnsData = [];   
    let totalSavings = initialSavings;
    let totalPrincipal = initialSavings;
    let retirementYear = null;

    for (let age = currentAge; age <= 80; age++) {
        labels.push(age);
        principalData.push(totalPrincipal);
        returnsData.push(Math.max(0, totalSavings - totalPrincipal));

        if (totalSavings >= fireTarget && retirementYear === null) {
            retirementYear = age;
        }

        totalSavings = (totalSavings * (1 + returnRate)) + (monthlySavings * 12);
        totalPrincipal += (monthlySavings * 12);
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Principal Saved',
                    data: principalData,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)', 
                    fill: true,
                    stack: 'combined'
                },
                {
                    label: 'Investment Returns',
                    data: returnsData,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)', 
                    fill: true,
                    stack: 'combined'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    stacked: true, 
                    beginAtZero: true,
                    ticks: { callback: (v) => '₱' + v.toLocaleString() }
                }
            },
            plugins: {
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line',
                            yMin: fireTarget,
                            yMax: fireTarget,
                            borderColor: 'red',
                            borderDash: [6, 6],
                            borderWidth: 3,
                            label: { content: 'FIRE Target', display: true, position: 'end' }
                        }
                    }
                }
            }
        }
    });

    document.getElementById('savingsRateCalc').innerText = 
        `Initial savings rate: ${data.savings_rate}% (spending: ₱${annualExpenses.toLocaleString()})`;
    document.getElementById('fireTargetCalc').innerText = 
        `FIRE Target: ₱${fireTarget.toLocaleString()} (${fireMultiplier}x expected expenses)`;
    document.getElementById('returnRateCalc').innerText = 
        `Expected Portfolio Returns: ${(returnRate * 100).toFixed(1)}% annually`;
    
    const verdictEl = document.getElementById('retirementVerdict');
    if (retirementYear) {
        const yearsToFire = retirementYear - currentAge;
        verdictEl.innerHTML = `You can retire in <span>${yearsToFire} years</span> (at age ${retirementYear})`;
    } else {
        verdictEl.innerText = "Target not reached by age 80. Adjust your savings or return rate.";
    }
}

// GOAL TRACKER
function updateSummary(data, fireTarget, fireAge, extraNeeded, earlyAge) {
    const calcBox = document.getElementById('chartCalculations');
    
    document.getElementById('savingsRateCalc').innerText = 
        `Initial savings rate: ${data.savings_rate}% (₱${(parseFloat(data.annual_expenses)/12).toLocaleString()}/mo spending)`;
    
    document.getElementById('fireTargetCalc').innerText = 
        `FIRE Target: ₱${fireTarget.toLocaleString()} (${data.fire_multiplier}x expenses)`;

    const verdict = document.getElementById('retirementVerdict');
    if (fireAge) {
        verdict.innerHTML = `You can retire in <span>${fireAge - data.age} years</span> (at age ${fireAge}).<br>
        <small>To retire at age ${earlyAge}, save an extra <b>₱${Math.round(extraNeeded).toLocaleString()}</b> per month.</small>`;
    } else {
        verdict.innerText = "Current savings pace does not reach target by age 80.";
    }
}

// LIVE GROWTH CHART GRAPH
let growthChart = null;

function liveUpdate() {
    const income = parseFloat(document.getElementById('liveIncome').value) || 0;
    const currentSpend = parseFloat(document.getElementById('liveSpending').value) || 0;
    const retireSpend = parseFloat(document.getElementById('liveRetireSpending').value) || 0;
    const returnRate = parseFloat(document.getElementById('liveReturn').value) || 0;
    const swr = parseFloat(document.getElementById('liveSWR').value) || 4;

    const savingsAmount = income - currentSpend;
    const savingsRate = (savingsAmount / income * 100).toFixed(1);
    const fireTarget = (retireSpend / (swr / 100)); 

    document.getElementById('fireTarget').innerText = `₱${fireTarget.toLocaleString()}`;
    document.getElementById('statSavingsRate').innerText = `${savingsRate}%`;
    document.getElementById('statReturn').innerText = `${returnRate}%`;
    document.getElementById('statSWR').innerText = `${swr}%`;

    const userData = {
        age: parseInt(document.getElementById('displayAge').innerText),
        current_savings: parseFloat(document.getElementById('currentSavings').innerText.replace(/₱|,/g, '')),
        annual_expenses: currentSpend * 12,
        savings_rate: savingsRate,
        investment_return_rate: returnRate,
        fire_multiplier: 100 / swr 
    initChart(userData, fireTarget, savingsAmount * 12);
}

function initChart(data, target, annualSavings) {

    const verdict = document.getElementById('liveVerdict');
    const yearsToFire = fireAge ? (fireAge - data.age) : "unknown";
    verdict.innerHTML = `Based on your ideal spending, you need <span>₱${target.toLocaleString()}</span>. 
    You will reach this in <span>${yearsToFire} years</span>.`;
}

async function updateDatabase() {
    const confirm = window.confirm("Archive career change? This will update your permanent financial record.");
    if (!confirm) return;

    const updatedData = {
        userId: localStorage.getItem('activeUserId'),
        expenses: parseFloat(document.getElementById('liveSpending').value) * 12,
        sRate: parseFloat(document.getElementById('statSavingsRate').innerText),
        rRate: parseFloat(document.getElementById('liveReturn').value)
    };

    const response = await fetch('http://localhost:5000/api/save-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
    });
    
    if (response.ok) alert("Archive Synchronized.");
}