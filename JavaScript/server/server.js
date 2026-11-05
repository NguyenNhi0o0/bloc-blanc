require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDB } = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const articleRoutes = require('./routes/article.routes');
const userRoutes = require('./routes/user.routes');

const app = express();
const PORT = process.env.PORT || 5030;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.send('Blog API is running...');
});

async function startServer() {
    try {
        await initDB();

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Database initialization failed:', err.message);
        process.exit(1);
    }
}

startServer();