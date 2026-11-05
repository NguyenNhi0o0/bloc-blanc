const { pool } = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

function isValidEmail(email) {
  return email.length <= 100 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function handleError(res, err) {
  console.error("Authentication error:", err.code || err.message);
  return res.status(500).json({
    message: "Une erreur interne est survenue.",
  });
}

exports.register = async (req, res) => {
  const { username, email, password } = req.body ?? {};

  const cleanUsername = typeof username === "string" ? username.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim() : "";

  if (!cleanUsername || [...cleanUsername].length > 50) {
    return res.status(400).json({
      message: "Le nom d’utilisateur doit contenir entre 1 et 50 caractères.",
    });
  }

  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({
      message: "Veuillez saisir une adresse e-mail valide.",
    });
  }

  if (
    typeof password !== "string" ||
    !password.trim() ||
    [...password].length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({
      message:
        "Le mot de passe doit contenir au moins 8 caractères et ne pas dépasser 72 octets.",
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.execute(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [cleanUsername, cleanEmail, hashedPassword],
    );

    return res.status(201).json({
      message: "Compte créé avec succès.",
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message:
          "Ce nom d’utilisateur ou cette adresse e-mail est déjà utilisé.",
      });
    }

    return handleError(res, err);
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body ?? {};
  const cleanEmail = typeof email === "string" ? email.trim() : "";

  if (!isValidEmail(cleanEmail) || typeof password !== "string" || !password) {
    return res.status(400).json({
      message: "Veuillez saisir une adresse e-mail valide et un mot de passe.",
    });
  }

  try {
    const [users] = await pool.execute(
      "SELECT id, username, email, password, avatar FROM users WHERE email = ?",
      [cleanEmail],
    );

    const user = users[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Adresse e-mail ou mot de passe incorrect.",
      });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    return handleError(res, err);
  }
};
