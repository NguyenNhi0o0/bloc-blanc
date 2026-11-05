const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const authorization = req.get("Authorization") || "";
  const match = /^Bearer\s+(\S+)$/i.exec(authorization);

  if (!match) {
    return res.status(401).json({
      message: "Vous devez vous connecter pour continuer.",
    });
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error("JWT_SECRET is missing.");
    return res.status(500).json({
      message: "Une erreur interne est survenue.",
    });
  }

  let payload;

  try {
    payload = jwt.verify(match[1], secret, { algorithms: ["HS256"] });
  } catch {
    return res.status(401).json({
      message: "Session invalide ou expirée. Veuillez vous reconnecter.",
    });
  }

  if (
    !Number.isInteger(payload?.id) ||
    payload.id < 1 ||
    payload.id > 2147483647
  ) {
    return res.status(401).json({
      message: "Session invalide. Veuillez vous reconnecter.",
    });
  }

  req.userId = payload.id;
  return next();
}

module.exports = verifyToken;
