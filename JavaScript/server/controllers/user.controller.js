const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

function parseUserId(value) {
    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
        return null;
    }

    const id = Number(value);
    return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

function handleError(res, err) {
    console.error('Profile error:', err.code || err.message);
    return res.status(500).json({
        message: 'Une erreur interne est survenue.',
    });
}

exports.getProfile = async (req, res) => {
    const id = parseUserId(req.params.id);

    if (id === null) {
        return res.status(400).json({ message: 'Identifiant utilisateur invalide.' });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT id, username, bio, avatar, created_at FROM users WHERE id = ?',
            [id]
        );

        const profile = rows[0];

        if (!profile) {
            return res.status(404).json({ message: 'Utilisateur introuvable.' });
        }

        return res.json(profile);
    } catch (err) {
        return handleError(res, err);
    }
};

exports.updateProfile = async (req, res) => {
    const id = parseUserId(req.params.id);

    if (id === null) {
        return res.status(400).json({ message: 'Identifiant utilisateur invalide.' });
    }

    if (id !== req.userId) {
        return res.status(403).json({
            message: 'Vous ne pouvez modifier que votre propre profil.',
        });
    }

    const { username, bio = '', password } = req.body ?? {};
    const cleanUsername = typeof username === 'string' ? username.trim() : '';

    if (!cleanUsername || [...cleanUsername].length > 50) {
        return res.status(400).json({
            message: 'Le nom d’utilisateur doit contenir entre 1 et 50 caractères.',
        });
    }

    if (typeof bio !== 'string' || Buffer.byteLength(bio, 'utf8') > 65535) {
        return res.status(400).json({ message: 'Biographie invalide ou trop longue.' });
    }

    const changePassword = password !== undefined && password !== '';

    if (
        changePassword &&
        (
            typeof password !== 'string' ||
            !password.trim() ||
            [...password].length < 8 ||
            Buffer.byteLength(password, 'utf8') > 72
        )
    ) {
        return res.status(400).json({
            message: 'Le mot de passe doit contenir au moins 8 caractères et ne pas dépasser 72 octets.',
        });
    }

    try {
        const fields = ['username = ?', 'bio = ?'];
        const values = [cleanUsername, bio];

        if (changePassword) {
            fields.push('password = ?');
            values.push(await bcrypt.hash(password, 10));
        }

        if (req.file) {
            fields.push('avatar = ?');
            values.push(`/uploads/${req.file.filename}`);
        }

        values.push(id);

        const [result] = await pool.execute(
            `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Utilisateur introuvable.' });
        }

        return res.json({ message: 'Profil mis à jour avec succès.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: 'Ce nom d’utilisateur est déjà utilisé.',
            });
        }

        return handleError(res, err);
    }
};