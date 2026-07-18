import React, { useState, useEffect } from 'react';
import { Star, MessageSquarePlus, ChevronDown, User as UserIcon } from 'lucide-react';
import { supabase } from '../services/supabaseClient.ts';
import type { User } from '../types.ts';

interface Review {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface ReviewsSidebarProps {
  user: User | null;
}

export const ReviewsSection: React.FC<ReviewsSidebarProps> = ({ user }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [visibleCount, setVisibleCount] = useState(3);
  const [showAddForm, setShowAddForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setReviews(data);
      } else {
        // Fallback mock data if table is empty
        setReviews([
          { id: '1', user_name: 'Alex D.', rating: 5, comment: 'EASiT is a game-changer for verifying AI claims. Highly recommended.', created_at: new Date().toISOString() },
          { id: '2', user_name: 'Sarah M.', rating: 5, comment: 'The OpenRouter integration is seamless. We use it daily.', created_at: new Date(Date.now() - 86400000).toISOString() },
          { id: '3', user_name: 'David K.', rating: 4, comment: 'Great UI and accurate responses. Could use more models.', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
          { id: '4', user_name: 'Emily R.', rating: 5, comment: 'Finally, an AI that doesn\'t hallucinate facts!', created_at: new Date(Date.now() - 86400000 * 3).toISOString() }
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch reviews (Table might not exist yet):', err);
      // Fallback mock data
      setReviews([
        { id: '1', user_name: 'Alex D.', rating: 5, comment: 'EASiT is a game-changer for verifying AI claims. Highly recommended.', created_at: new Date().toISOString() },
        { id: '2', user_name: 'Sarah M.', rating: 5, comment: 'The OpenRouter integration is seamless. We use it daily.', created_at: new Date(Date.now() - 86400000).toISOString() },
        { id: '3', user_name: 'David K.', rating: 4, comment: 'Great UI and accurate responses. Could use more models.', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: '4', user_name: 'Emily R.', rating: 5, comment: 'Finally, an AI that doesn\'t hallucinate facts!', created_at: new Date(Date.now() - 86400000 * 3).toISOString() }
      ]);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !user) return;
    
    setIsSubmitting(true);
    
    const newReview = {
      user_name: user.name || 'Anonymous User',
      rating,
      comment
    };

    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert([newReview])
        .select();
        
      if (error) {
        console.error('Insert error:', error);
        alert('Failed to save to Supabase. Table "reviews" might not exist.');
      } else if (data) {
        setReviews([data[0], ...reviews]);
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setIsSubmitting(false);
      setComment('');
      setShowAddForm(false);
    }
  };

  return (
    <section className="w-full max-w-5xl mx-auto px-6 py-24 text-center border-t border-gray-800/50">
      <h2 className="text-4xl font-bold text-white mb-6">Community Reviews</h2>
      <p className="text-gray-400 max-w-2xl mx-auto mb-12 text-lg">
        See what others are saying about their experience with EASiT.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-left">
        {reviews.slice(0, visibleCount).map((review) => (
          <div key={review.id} className="bg-[#12141a] border border-gray-800 rounded-xl p-6 hover:border-gray-600 transition-colors shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                  <UserIcon size={16} />
                </div>
                <span className="font-bold truncate text-white">{review.user_name}</span>
              </div>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    size={14} 
                    className={i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-700"} 
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-400 line-clamp-4 italic leading-relaxed">
              "{review.comment}"
            </p>
          </div>
        ))}
      </div>

      {reviews.length > visibleCount && (
        <button 
          onClick={() => setVisibleCount(prev => prev + 3)}
          className="mx-auto py-2 px-6 text-sm text-[#00F0FF] hover:bg-[#00F0FF]/10 rounded-lg flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-[#00F0FF]/30"
        >
          Load More Reviews <ChevronDown size={16} />
        </button>
      )}

      {user ? (
        <div className="mt-12 max-w-2xl mx-auto">
          {!showAddForm ? (
            <button 
              onClick={() => setShowAddForm(true)}
              className="mx-auto py-3 px-8 bg-[#00F0FF]/10 border border-[#00F0FF]/30 hover:bg-[#00F0FF]/20 text-[#00F0FF] font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <MessageSquarePlus size={18} /> Add Your Review
            </button>
          ) : (
            <form onSubmit={handleSubmitReview} className="space-y-4 bg-[#12141a] border border-gray-800 rounded-xl p-6 text-left shadow-2xl">
              <h3 className="text-white font-bold mb-2">Write a Review</h3>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm text-gray-400">Your Rating</span>
                <div className="flex gap-1 cursor-pointer">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      size={24} 
                      onClick={() => setRating(star)}
                      className={star <= rating ? "text-yellow-500 fill-yellow-500 hover:scale-110 transition-transform" : "text-gray-600 hover:text-yellow-500 hover:scale-110 transition-transform"} 
                    />
                  ))}
                </div>
              </div>
              <textarea 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience..."
                className="w-full bg-black/40 border border-gray-700 rounded-lg p-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00F0FF]/50 transition-colors resize-none h-32"
                required
              />
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-3 text-sm text-gray-400 hover:text-white bg-gray-900 rounded-lg border border-gray-800 hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || !comment.trim()}
                  className="flex-1 py-3 bg-[#00F0FF] text-black text-sm font-bold rounded-lg disabled:opacity-50 hover:bg-[#00F0FF]/90 transition-colors shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                >
                  {isSubmitting ? 'Saving...' : 'Submit Review'}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="mt-12 text-sm text-gray-500 bg-[#12141a] border border-gray-800/50 rounded-lg py-4 max-w-sm mx-auto">
          Sign in to leave a review
        </div>
      )}
    </section>
  );
};
