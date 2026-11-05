import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const MAX_COMMENT_LENGTH = 2000;

export default function CommentsSection({ articleId }) {
    const { user } = useAuth();
    const endpoint = `/articles/${articleId}/comments`;

    const [comments, setComments] = useState([]);
    const [draft, setDraft] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [actionError, setActionError] = useState('');
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        async function loadComments() {
            try {
                const { data } = await API.get(endpoint, {
                    signal: controller.signal,
                });

                if (!controller.signal.aborted) {
                    setComments(data);
                }
            } catch (err) {
                if (!controller.signal.aborted) {
                    setLoadError(
                        err.response?.data?.message ||
                        'Impossible de charger les commentaires.'
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadComments();
        return () => controller.abort();
    }, [endpoint, revision]);

    function reloadComments() {
        setLoadError('');
        setLoading(true);
        setRevision(value => value + 1);
    }

    function resetForm() {
        setEditingId(null);
        setDraft('');
        setActionError('');
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!user || saving) return;

        const content = draft.trim();

        if (!content || [...content].length > MAX_COMMENT_LENGTH) {
            setActionError('Le commentaire doit contenir entre 1 et 2 000 caractères.');
            return;
        }

        setSaving(true);
        setActionError('');

        try {
            if (editingId === null) {
                await API.post(endpoint, { content });
            } else {
                await API.patch(`${endpoint}/${editingId}`, { content });
            }

            resetForm();
            reloadComments();
        } catch (err) {
            setActionError(
                err.response?.data?.message ||
                'Impossible d’enregistrer le commentaire.'
            );
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(commentId) {
        if (saving || !window.confirm('Supprimer ce commentaire ?')) return;

        setSaving(true);
        setActionError('');

        try {
            await API.delete(`${endpoint}/${commentId}`);

            if (editingId === commentId) {
                resetForm();
            }

            reloadComments();
        } catch (err) {
            setActionError(
                err.response?.data?.message ||
                'Impossible de supprimer le commentaire.'
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <section
            className="glass"
            aria-labelledby="comments-heading"
            style={{ marginTop: '32px', padding: '24px' }}
        >
            <h2 id="comments-heading">Commentaires</h2>

            {loading && <p role="status">Chargement des commentaires…</p>}

            {loadError && (
                <div>
                    <p role="alert">{loadError}</p>
                    <button type="button" className="btn glass" onClick={reloadComments}>
                        Réessayer
                    </button>
                </div>
            )}

            {!loading && !loadError && comments.length === 0 && (
                <p>Aucun commentaire pour le moment.</p>
            )}

            <ul style={{ listStyle: 'none', padding: 0 }}>
                {comments.map(comment => (
                    <li
                        key={comment.id}
                        style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}
                    >
                        <strong>{comment.username}</strong>
                        {' · '}
                        <time dateTime={comment.created_at}>
                            {new Date(comment.created_at).toLocaleString('fr-FR')}
                        </time>

                        <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                            {comment.content}
                        </p>

                        {user?.id === comment.user_id && (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    className="btn glass"
                                    disabled={saving || loading}
                                    onClick={() => {
                                        setEditingId(comment.id);
                                        setDraft(comment.content);
                                        setActionError('');
                                    }}
                                >
                                    Modifier
                                </button>

                                <button
                                    type="button"
                                    className="btn glass"
                                    disabled={saving || loading}
                                    onClick={() => handleDelete(comment.id)}
                                >
                                    Supprimer
                                </button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>

            {actionError && <p role="alert">{actionError}</p>}

            {user ? (
                <form onSubmit={handleSubmit}>
                    <label htmlFor="comment-content">
                        {editingId === null ? 'Votre commentaire' : 'Modifier votre commentaire'}
                    </label>

                    <textarea
                        id="comment-content"
                        value={draft}
                        onChange={event => setDraft(event.target.value)}
                        rows={4}
                        required
                        disabled={saving}
                    />

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Enregistrement…' : editingId === null ? 'Publier' : 'Enregistrer'}
                        </button>

                        {editingId !== null && (
                            <button
                                type="button"
                                className="btn glass"
                                disabled={saving}
                                onClick={resetForm}
                            >
                                Annuler
                            </button>
                        )}
                    </div>
                </form>
            ) : (
                <p><Link to="/login">Connectez-vous</Link> pour publier un commentaire.</p>
            )}
        </section>
    );
}