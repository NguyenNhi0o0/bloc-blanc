const express = require("express");
const userController = require("../controllers/user.controller");
const verifyToken = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

function requireOwnProfile(req, res, next) {
  const { id } = req.params;
  const userId = Number(id);

  if (!/^\d+$/.test(id) || userId < 1 || userId > 2147483647) {
    return res.status(400).json({
      message: "Identifiant utilisateur invalide.",
    });
  }

  if (userId !== req.userId) {
    return res.status(403).json({
      message: "Vous ne pouvez modifier que votre propre profil.",
    });
  }

  return next();
}

router.get("/:id", userController.getProfile);

router.put(
  "/:id",
  verifyToken,
  requireOwnProfile,
  upload.single("avatar"),
  userController.updateProfile,
);

module.exports = router;
