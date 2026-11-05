const express = require("express");
const articleController = require("../controllers/article.controller");
const commentController = require("../controllers/comment.controller");
const verifyToken = require("../middleware/auth");
const upload = require("../middleware/upload");
const { pool } = require("../config/db");

const router = express.Router();

async function requireArticleOwner(req, res, next) {
  const { id } = req.params;

  if (!/^\d+$/.test(id) || Number(id) < 1 || Number(id) > 2147483647) {
    return res.status(400).json({
      message: "Identifiant d’article invalide.",
    });
  }

  try {
    const [rows] = await pool.execute(
      "SELECT user_id FROM articles WHERE id = ?",
      [Number(id)],
    );

    const article = rows[0];

    if (!article) {
      return res.status(404).json({
        message: "Article introuvable.",
      });
    }

    if (article.user_id !== req.userId) {
      return res.status(403).json({
        message: "Vous ne pouvez modifier que vos propres articles.",
      });
    }

    return next();
  } catch (err) {
    console.error("Article ownership check:", err.code || err.message);
    return res.status(500).json({
      message: "Une erreur interne est survenue.",
    });
  }
}

router.get("/", articleController.getAllArticles);
router.get("/:id", articleController.getArticleById);

router.post(
  "/",
  verifyToken,
  upload.single("image"),
  articleController.createArticle,
);

router.put(
  "/:id",
  verifyToken,
  requireArticleOwner,
  upload.single("image"),
  articleController.updateArticle,
);

router.delete("/:id", verifyToken, articleController.deleteArticle);

router.get("/:articleId/comments", commentController.listComments);

router.post(
  "/:articleId/comments",
  verifyToken,
  commentController.createComment,
);

router.patch(
  "/:articleId/comments/:commentId",
  verifyToken,
  commentController.updateComment,
);

router.delete(
  "/:articleId/comments/:commentId",
  verifyToken,
  commentController.deleteComment,
);

module.exports = router;
