import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import ReviewPopup from '../../components/ReviewPopup';
import { submitReview } from '../../utils/api';
import '../../styles/MoviePage.css';

const serverUrl = process.env.REACT_APP_API_URL;
// const serverUrl = 'http://localhost:3001';


function MoviePage() {
    const { movieName } = useParams();
    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPopupOpen, setPopupOpen] = useState(false);
    const [isFavorite, setFavorite] = useState(false);
    const [favoriteMovies, setFavoriteMovies] = useState([]); // State for user's favorite movies
    const [reviews, setReviews] = useState([]); // State for reviews
    const { user, isAuthenticated, loginWithRedirect } = useAuth0();

    useEffect(() => {
        const fetchMovie = async () => {
            setLoading(true);
            try {
                const response = await fetch(
                    `${serverUrl}/movies/search-movies?query=${encodeURIComponent(movieName)}`
                );

                if (!response.ok) {
                    throw new Error("Movie not found");
                }

                const data = await response.json();
                if (data && data.length > 0) {
                    setMovie(data[0]);
                    checkIfFavorite(data[0].id);
                    fetchReviews(data[0].id); // Fetch reviews for the movie
                } else {
                    setMovie(null);
                }
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        const checkIfFavorite = async (movieId) => {
            if (!isAuthenticated || !user?.sub) return;

            try {
                const response = await fetch(
                    `${serverUrl}/favorites/${movieId}?userId=${encodeURIComponent(user.sub)}`);

                if (response.ok) {
                    const { isFavorite } = await response.json();
                    setFavorite(isFavorite);
                } else {
                    throw new Error('Failed to fetch favorite status.');
                }
            } catch (error) {
                console.error('Error fetching favorite status:', error);
                setFavorite(false);
            }
        };

        const fetchFavoriteMovies = async () => {
            if (!isAuthenticated || !user?.sub) return;

            try {
                const response = await fetch(`${serverUrl}/favorites?userId=${encodeURIComponent(user.sub)}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch favorite movies.');
                }

                const data = await response.json();
                setFavoriteMovies(data);
            } catch (error) {
                console.error('Error fetching favorite movies:', error);
            }
        };

        const fetchReviews = async (movieId) => {
            try {
                const response = await fetch(`${serverUrl}/reviews/movie/${movieId}`);
                if (response.ok) {
                    const data = await response.json();
                    setReviews(data);
                } else {
                    console.error('Failed to fetch reviews');
                }
            } catch (error) {
                console.error('Error fetching reviews:', error);
            }
        };

        fetchMovie();
        fetchFavoriteMovies(); // Fetch user's favorite movies
    }, [movieName, serverUrl]);

    const handleAddReviewClick = () => {
        if (isAuthenticated) {
            setPopupOpen(true);
        } else {
            loginWithRedirect();
        }
    };

    const handleReviewSubmit = async (review) => {
        if (!user?.sub) {
            alert('Failed to get user ID. Please try again.');
            return;
        }

        try {
            const newReview = await submitReview({
                ...review,
                movie_id: movie.id,
                user_id: user.sub,
            });
            setReviews((prevReviews) => [newReview, ...prevReviews]); // Add new review to the reviews list            
        } catch (error) {
            alert('Failed to submit review. Please try again.');
        }
    };

    const toggleFavorite = async () => {
        if (!isAuthenticated) {
            loginWithRedirect();
            return;
        }

        if (!user?.sub) {
            alert('Failed to identify user. Please log in and try again.');
            return;
        }

        try {
            const response = await fetch(`${serverUrl}/favorites`, {
                method: isFavorite ? 'DELETE' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: user.sub, movieId: movie.id }),
            });

            if (response.ok) {
                setFavorite(!isFavorite);
                alert(
                    isFavorite
                        ? 'Movie removed from favorites.'
                        : 'Movie added to favorites.'
                );
            } else {
                alert('Failed to update favorite status. Please try again.');
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            alert('An error occurred. Please try again later.');
        }
    };

    return (
        <div className="home-container">
            <Navbar />
            <div className="moviepage-main">
                {loading && <div className="moviepage-loading-message">Loading...</div>}
                {error && <div className="moviepage-error-message">Error: {error}</div>}
                {!loading && !error && !movie && (
                    <div className="moviepage-error-message">Movie not found</div>
                )}
                {movie && (
                    <div className="moviepage-container">
                        <div className="moviepage-details">
                            <div className="moviepage-image-container">
                                <img
                                    src={movie.poster_path || '/assets/sample_image.jpg'}
                                    alt={movie.title || "Sample Movie"}
                                    className="moviepage-poster"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = '/assets/sample_image.jpg';
                                    }}
                                />
                                <div className="favorite-button-container">
                                    <button
                                        className={`favorite-button ${isFavorite ? 'favorited' : ''}`}
                                        onClick={toggleFavorite}
                                    >
                                        {isFavorite ? 'Remove Favorite' : 'Add to Favorite'}
                                    </button>
                                </div>
                            </div>
                            <div className="moviepage-info">
                                <h1>{movie.title}</h1>
                                <p><strong>Overview:</strong> {movie.overview}</p>
                                <p><strong>Release Year:</strong> {movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</p>
                                <p><strong>Duration:</strong> {movie.duration} minutes</p>
                                <p><strong>Genres:</strong> {movie.genres || 'N/A'}</p>
                                <p><strong>Rating:</strong> {movie.rating}</p>
                                <p><strong>Cast:</strong> {movie.cast}</p>

                                {/* Review Link */}
                                <button onClick={handleAddReviewClick} className="review-link">
                                    Add Review
                                </button>
                            </div>
                        </div>

                        {/* Reviews Section */}
                        <div className="moviepage-reviews">
                            <h3>Reviews</h3>
                            {reviews.length === 0 ? (
                                <p>No reviews yet. Be the first to add one!</p>
                            ) : (
                                reviews.map((review, index) => (
                                    <div key={index} className="review-item">
                                        <div className="review-header">
                                            <span className="reviewer-name">
                                                <span className="reviewer-label">Reviewed By:</span> {review.reviewerName || "Anonymous"}
                                            </span>
                                            <span className="review-rating">
                                                <span className="rating-label">Rating:</span> {review.rating}/5
                                            </span>
                                        </div>
                                        <p className="review-description">{review.description}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

            </div>
            <Footer />

            {isPopupOpen && (
                <ReviewPopup
                    movie_id={movie?.id}
                    onClose={() => setPopupOpen(false)}
                    onSubmit={handleReviewSubmit}
                />
            )}
        </div>
    );
}

export default MoviePage;
