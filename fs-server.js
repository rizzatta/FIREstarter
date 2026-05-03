const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'FIREstarter', 
    password: 'rizza', 
    port: 5432,
});

// AUTH ROUTES 
app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = await pool.query(
            "INSERT INTO users (first_name, last_name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING *",
            [firstName, lastName, email, hashedPassword]
        );

        res.status(201).json({ 
            user: newUser.rows[0].email,
            userId: newUser.rows[0].user_id 
        });
    } catch (err) {
        res.status(500).json({ error: "Email already exists." });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (user.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });
        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!validPassword) return res.status(401).json({ error: "Invalid credentials" });
        res.status(200).json({ userId: user.rows[0].user_id, userName: user.rows[0].first_name });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// DATA ROUTES 
app.get('/api/user-data/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query("SELECT * FROM user_profiles WHERE user_id = $1", [userId]);
        if (result.rows.length === 0) return res.status(404).json({ error: "No profile" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "DB Error" });
    }
});

app.post('/api/save-onboarding', async (req, res) => {
    const { userId, username, age, retireAge, savings, expenses, sRate, rRate, fireType } = req.body;
    const multipliers = { lean: 20, standard: 25, fat: 30 };
    const multiplier = multipliers[fireType] || 25;
    try {
        const query = `
            INSERT INTO user_profiles (user_id, username, age, target_retirement_age, current_savings, annual_expenses, savings_rate, investment_return_rate, fire_multiplier)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (user_id) DO UPDATE SET 
                username = EXCLUDED.username, age = EXCLUDED.age, target_retirement_age = EXCLUDED.target_retirement_age,
                current_savings = EXCLUDED.current_savings, annual_expenses = EXCLUDED.annual_expenses,
                savings_rate = EXCLUDED.savings_rate, investment_return_rate = EXCLUDED.investment_return_rate,
                fire_multiplier = EXCLUDED.fire_multiplier;
        `;
        await pool.query(query, [userId, username, age, retireAge, savings, expenses, sRate, rRate, multiplier]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Save failed" });
    }
});

app.get('/api/user-status/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const profile = await pool.query("SELECT * FROM user_profiles WHERE user_id = $1", [userId]);
        res.json({ onboardingComplete: profile.rows.length > 0 });
    } catch (err) {
        res.status(500).json({ error: "Status check failed" });
    }
});

app.post('/api/save-snapshot', async (req, res) => {
    const { userId, totalNetWorth } = req.body;
    try {
        const query = `INSERT INTO wealth_snapshots (user_id, total_net_worth) VALUES ($1, $2)
                       ON CONFLICT (user_id, snapshot_date) DO UPDATE SET total_net_worth = EXCLUDED.total_net_worth;`;
        await pool.query(query, [userId, totalNetWorth]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Snapshot failed" });
    }
});

// START SERVER (ONE TIME ONLY)
app.listen(5000, () => console.log('FIREstarter API running on port 5000'));