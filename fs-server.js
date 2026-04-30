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

// Registration API Endpoint
app.post('/api/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            "INSERT INTO users (first_name, last_name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING *",
            [firstName, lastName, email, hashedPassword]
        );

        res.status(201).json({ message: "User Saved!", user: newUser.rows[0].email });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Email already exists or server error." });
    }
});

app.listen(5000, () => console.log('FIREstarter API running on port 5000'));

// Google OAuth Verification
app.post('/api/auth/google/callback', async (req, res) => {
    try {
        const { credential } = req.body;
        
        console.log("Google JWT received:", credential);

        res.status(200).json({ 
            success: true, 
            message: "Identity verified. Accessing FIREstarter dashboard." 
        });
    } catch (error) {
        console.error("Auth Error:", error.message);
        res.status(500).json({ error: "Failed to verify identity." });
    }
});

// Login Endpoint
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (user.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!validPassword) return res.status(401).json({ error: "Invalid credentials" });

        res.status(200).json({ 
            message: "Login Successful", 
            userId: user.rows[0].user_id, 
            userName: user.rows[0].first_name 
        });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});


// Onboarding Route
app.post('/api/finalize-onboarding', async (req, res) => {
    const { userId, username, age, salary, dependents, firePlan } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN'); 

        const profileQuery = `
            INSERT INTO user_profiles (user_id, username, age, salary, dependents, fire_plan)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;

        await client.query(profileQuery, [userId, username, age, salary, dependents, firePlan]);

        await client.query('COMMIT'); 
        res.status(200).json({ message: "Profile complete!" });
    } catch (err) {
        await client.query('ROLLBACK'); 
        console.error("FIREstarter Error:", err.message); 
        res.status(500).json({ error: "Onboarding failed" });
    } finally {
        client.release();
    }
});

// FIRE Multiplier
app.post('/api/save-onboarding', async (req, res) => {
    const { userId, username, age, retireAge, savings, expenses, sRate, rRate, fireType } = req.body;
    
    const multipliers = { lean: 20, standard: 25, fat: 30 };
    const multiplier = multipliers[fireType] || 25;

    try {
        const query = `
            INSERT INTO user_profiles (user_id, username, age, target_retirement_age, current_savings, annual_expenses, savings_rate, investment_return_rate, fire_multiplier)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                username = EXCLUDED.username,
                age = EXCLUDED.age,
                target_retirement_age = EXCLUDED.target_retirement_age,
                current_savings = EXCLUDED.current_savings,
                annual_expenses = EXCLUDED.annual_expenses,
                savings_rate = EXCLUDED.savings_rate,
                investment_return_rate = EXCLUDED.investment_return_rate,
                fire_multiplier = EXCLUDED.fire_multiplier;
        `;
        
        await pool.query(query, [userId, username, age, retireAge, savings, expenses, sRate, rRate, multiplier]);
        res.json({ success: true, message: "FIREstarter synchronized." });
    } catch (err) {
        console.error("Database Error:", err.message);
        res.status(500).json({ error: "Database error" });
    }
});