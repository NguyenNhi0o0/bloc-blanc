import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Calendar, Edit, Trash2, User } from 'lucide-react';
import API, { BACKEND_URL } from '../api/axios';
import CommentsSection from '../components/CommentsSection';
import { useAuth } from '../context/AuthContext';

function ArticleDetailPage({ id }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [deleteError, setDeleteError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        async function fetchArticle() {
            try {
                const { data } = await API.get(`/articles/${id}`, {
                    signal: controller.signal,
                });

                if (!controller.signal.aborted) {
                    setArticle(data);
                }
            } catch (err) {
                if (!controller.signal.aborted) {
                    setLoadError(
                        err.response?.status === 404
                            ? 'Article introuvable.'
                            : 'Impossible de charger l’article.'
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchArticle();
        return () => controller.abort();
    }, [id]);

    async function handleDelete() {
        if (!window.confirm('Voulez-vous vraiment supprimer cet article ?')) {
            return;
        }

        setDeleteError('');

        try {
            await API.delete(`/articles/${id}`);
            navigate('/');
        } catch {
            setDeleteError('Impossible de supprimer l’article.');
        }
    }

    if (loading) return <p role="status">Chargement de l’article…</p>;
    if (loadError) return <p role="alert">{loadError}</p>;
    if (!article) return <p>Article introuvable.</p>;

    const isOwner = user?.id === article.user_id;

    return (
        <div style={{ maxWidth: '800px', margin: '40px auto' }}>
            <article>
                {article.image && (
                    <img
                        src={`${BACKEND_URL}${article.image}`}
                        alt={article.title}
                        style={{
                            width: '100%',
                            height: '400px',
                            objectFit: 'cover',
                            borderRadius: '16px',
                            marginBottom: '30px',
                        }}
                    />
                )}

                <h1 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>
                    {article.title}
                </h1>

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '30px',
                    padding: '20px 0',
                    borderTop: '1px solid var(--border)',
                    borderBottom: '1px solid var(--border)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {article.avatar ? (
                            <img
                                src={`${BACKEND_URL}${article.avatar}`}
                                alt=""
                                style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                            />
                        ) : (
                            <User />
                        )}

                        <div>
                            <Link to={`/profile/${article.user_id}`} style={{ fontWeight: 'bold' }}>
                                {article.username}
                            </Link>

                            <div style={{
                                fontSize: '0.85rem',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                            }}>
                                <Calendar size={14} />
                                {new Date(article.created_at).toLocaleDateString('fr-FR')}
                            </div>
                        </div>
                    </div>

                    {isOwner && (
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <Link
                                to={`/edit/${id}`}
                                className="btn glass"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            >
                                <Edit size={16} /> Modifier
                            </Link>

                            <button
                                type="button"
                                onClick={handleDelete}
                                className="btn"
                                style={{
                                    background: '#ef4444',
                                    color: 'white',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                }}
                            >
                                <Trash2 size={16} /> Supprimer
                            </button>
                        </div>
                    )}
                </div>

                {deleteError && <p role="alert">{deleteError}</p>}

                <div style={{ fontSize: '1.2rem', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                    {article.content}
                </div>
            </article>

            <CommentsSection articleId={id} />
        </div>
    );
}

export default function ArticleDetail() {
    const { id } = useParams();

    return <ArticleDetailPage key={id} id={id} />;
}