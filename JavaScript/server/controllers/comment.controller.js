const { pool } = require("../config/db");

function parseId(value) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

function getContent(body) {
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  return content && [...content].length <= 2000 ? content : null;
}

async function articleExists(articleId) {
  const [rows] = await pool.execute("SELECT id FROM articles WHERE id = ?", [
    articleId,
  ]);

  return rows.length > 0;
}

async function respondToFailedMutation(res, articleId, commentId, userId) {
  const [rows] = await pool.execute(
    "SELECT user_id FROM comments WHERE id = ? AND article_id = ?",
    [commentId, articleId],
  );

  const comment = rows[0];

  if (!comment) {
    return res.status(404).json({ message: "Commentaire introuvable." });
  }

  if (comment.user_id !== userId) {
    return res.status(403).json({
      message: "Seul l’auteur peut modifier ou supprimer ce commentaire.",
    });
  }

  // Certains réglages MySQL comptent uniquement les lignes modifiées.
  // Une mise à jour avec le même texte reste une opération valide.
  return res.status(204).end();
}

function handleError(res, err) {
  console.error("Comment controller:", err.code || err.message);
  return res.status(500).json({ message: "Une erreur interne est survenue." });
}

exports.listComments = async (req, res) => {
  const articleId = parseId(req.params.articleId);

  if (articleId === null) {
    return res.status(400).json({ message: "Identifiant d’article invalide." });
  }

  try {
    if (!(await articleExists(articleId))) {
      return res.status(404).json({ message: "Article introuvable." });
    }

    const [comments] = await pool.execute(
      `SELECT comments.id, comments.content, comments.article_id,
                    comments.user_id, comments.created_at, users.username
             FROM comments
             JOIN users ON users.id = comments.user_id
             WHERE comments.article_id = ?
             ORDER BY comments.created_at ASC, comments.id ASC`,
      [articleId],
    );

    return res.json(comments);
  } catch (err) {
    return handleError(res, err);
  }
};

exports.createComment = async (req, res) => {
  const articleId = parseId(req.params.articleId);
  const content = getContent(req.body);

  if (articleId === null) {
    return res.status(400).json({ message: "Identifiant d’article invalide." });
  }

  if (content === null) {
    return res.status(400).json({
      message: "Le commentaire doit contenir entre 1 et 2 000 caractères.",
    });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO comments (content, article_id, user_id)
             SELECT ?, articles.id, ?
             FROM articles
             WHERE articles.id = ?`,
      [content, req.userId, articleId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Article introuvable." });
    }

    return res.status(201).json({
      id: result.insertId,
      content,
      article_id: articleId,
      user_id: req.userId,
    });
  } catch (err) {
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(409).json({
        message: "L’article ou le compte associé n’est plus disponible.",
      });
    }

    return handleError(res, err);
  }
};

exports.updateComment = async (req, res) => {
  const articleId = parseId(req.params.articleId);
  const commentId = parseId(req.params.commentId);
  const content = getContent(req.body);

  if (articleId === null || commentId === null) {
    return res.status(400).json({ message: "Identifiant invalide." });
  }

  if (content === null) {
    return res.status(400).json({
      message: "Le commentaire doit contenir entre 1 et 2 000 caractères.",
    });
  }

  try {
    const [result] = await pool.execute(
      "UPDATE comments SET content = ? WHERE id = ? AND article_id = ? AND user_id = ?",
      [content, commentId, articleId, req.userId],
    );

    if (result.affectedRows === 0) {
      return await respondToFailedMutation(
        res,
        articleId,
        commentId,
        req.userId,
      );
    }

    return res.status(204).end();
  } catch (err) {
    return handleError(res, err);
  }
};

exports.deleteComment = async (req, res) => {
  const articleId = parseId(req.params.articleId);
  const commentId = parseId(req.params.commentId);

  if (articleId === null || commentId === null) {
    return res.status(400).json({ message: "Identifiant invalide." });
  }

  try {
    const [result] = await pool.execute(
      "DELETE FROM comments WHERE id = ? AND article_id = ? AND user_id = ?",
      [commentId, articleId, req.userId],
    );

    if (result.affectedRows === 0) {
      return await respondToFailedMutation(
        res,
        articleId,
        commentId,
        req.userId,
      );
    }

    return res.status(204).end();
  } catch (err) {
    return handleError(res, err);
  }
};
