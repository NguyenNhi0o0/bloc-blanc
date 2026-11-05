const { pool } = require('../config/db');

function validateArticle({ title, content } = {}) {
    if (typeof title !== 'string' || !title.trim() || [...title].length > 255) {
        return 'Le titre est obligatoire et doit contenir au maximum 255 caractères.';
    }

    if (typeof content !== 'string' || !content.trim()) {
        return 'Le contenu est obligatoire.';
    }

    if (Buffer.byteLength(content, 'utf8') > 65535) {
        return 'Le contenu de l’article est trop long.';
    }

    return null;
}

function handleError(res, err) {
    console.error('Article controller:', err);
    return res.status(500).json({ message: 'Une erreur interne est survenue.' });
}

exports.getAllArticles = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT articles.*, users.username, users.avatar
            FROM articles
            JOIN users ON articles.user_id = users.id
            ORDER BY articles.created_at DESC
        `);

        return res.json(rows);
    } catch (err) {
        return handleError(res, err);
    }
};

exports.getArticleById = async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT articles.*, users.username, users.avatar
            FROM articles
            JOIN users ON articles.user_id = users.id
            WHERE articles.id = ?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Article not found' });
        }

        return res.json(rows[0]);
    } catch (err) {
        return handleError(res, err);
    }
};

exports.createArticle = async (req, res) => {
    try {
        const validationError = validateArticle(req.body);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const { title, content } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : null;

        const [result] = await pool.execute(
            'INSERT INTO articles (title, content, image, user_id) VALUES (?, ?, ?, ?)',
            [title, content, image, req.userId]
        );

        return res.status(201).json({ id: result.insertId, title, content, image });
    } catch (err) {
        return handleError(res, err);
    }
};

exports.updateArticle = async (req, res) => {
    try {
        const [articles] = await pool.execute(
            'SELECT user_id, image FROM articles WHERE id = ?',
            [req.params.id]
        );

        const article = articles[0];
        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        if (article.user_id !== req.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const validationError = validateArticle(req.body);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const { title, content } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : article.image;

        await pool.execute(
            'UPDATE articles SET title = ?, content = ?, image = ? WHERE id = ? AND user_id = ?',
            [title, content, image, req.params.id, req.userId]
        );

        return res.json({ message: 'Article updated successfully' });
    } catch (err) {
        return handleError(res, err);
    }
};

exports.deleteArticle = async (req, res) => {
    try {
        const [articles] = await pool.execute(
            'SELECT user_id FROM articles WHERE id = ?',
            [req.params.id]
        );

        const article = articles[0];
        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        if (article.user_id !== req.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await pool.execute(
            'DELETE FROM articles WHERE id = ? AND user_id = ?',
            [req.params.id, req.userId]
        );

        return res.json({ message: 'Article deleted successfully' });
    } catch (err) {
        return handleError(res, err);
    }
};