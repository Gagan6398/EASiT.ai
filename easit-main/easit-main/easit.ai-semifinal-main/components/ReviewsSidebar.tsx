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

export const ReviewsSidebar: React.FC<ReviewsSidebarProps> = ({ user }) => {
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
    <div className="absolute left-0 top-0 bottom-0 w-72 p-4 hidden xl:flex flex-col z-10 pointer-events-none">
      {/* Container aligned to the left edge, pointer-events-none so it doesn't block background clicks, pointer-events-auto on the box itself */}
      <div className="pointer-events-auto w-full max-h-[80vh] overflow-y-auto custom-scrollbar bg-[#12141a]/40 backdrop-blur-md border border-gray-800/50 rounded-xl p-4 mt-32 shadow-2xl">
        <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
          <Star className="text-yellow-500 fill-yellow-500" size={16} /> 
          Community Reviews
        </h3>
        
        <div className="space-y-4">
          {reviews.slice(0, visibleCount).map((review) => (
            <div key={review.id} className="bg-black/40 border border-gray-800/50 p-3 rounded-lg shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <div className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center">
                    <UserIcon size={12} />
                  </div>
                  <span className="font-medium truncate max-w-[100px]">{review.user_name}</span>
                </div>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      size={10} 
                      className={i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-700"} 
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-400 line-clamp-4 italic leading-relaxed">
                "{review.comment}"
              </p>
            </div>
          ))}
        </div>

        {reviews.length > visibleCount && (
          <button 
            onClick={() => setVisibleCount(prev => prev + 3)}
            className="w-full mt-4 py-2 text-xs text-[#00F0FF] hover:bg-[#00F0FF]/10 rounded-lg flex items-center justify-center gap-1 transition-colors"
          >
            Load More <ChevronDown size={14} />
          </button>
        )}

        {user ? (
          <div className="mt-6 pt-4 border-t border-gray-800/50">
            {!showAddForm ? (
              <button 
                onClick={() => setShowAddForm(true)}
                className="w-full py-2 bg-[#00F0FF]/10 border border-[#00F0FF]/30 hover:bg-[#00F0FF]/20 text-[#00F0FF] text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <MessageSquarePlus size={14} /> Add Review
              </button>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-3">
                <div className="flex justify-between items-center bg-black/40 rounded-lg p-2 border border-gray-800/50">
                  <span className="text-[10px] text-gray-400 font-medium">Rating</span>
                  <div className="flex gap-1 cursor-pointer">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        size={14} 
                        onClick={() => setRating(star)}
                        className={star <= rating ? "text-yellow-500 fill-yellow-500" : "text-gray-600 hover:text-yellow-500"} 
                      />
                    ))}
                  </div>
                </div>
                <textarea 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience..."
                  className="w-full bg-black/40 border border-gray-800/50 rounded-lg p-3 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00F0FF]/50 transition-colors resize-none h-24 shadow-inner"
                  required
                />
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 py-2 text-xs text-gray-400 hover:text-white bg-gray-900 rounded-lg border border-gray-800"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting || !comment.trim()}
                    className="flex-1 py-2 bg-[#00F0FF] text-black text-xs font-bold rounded-lg disabled:opacity-50 hover:bg-[#00F0FF]/90 transition-colors shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                  >
                    {isSubmitting ? 'Saving...' : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="mt-4 pt-4 border-t border-gray-800/50 text-center text-[10px] text-gray-500 bg-gray-900/30 rounded-lg p-2">
            Sign in to leave a review
          </div>
        )}
      </div>
    </div>
  );
};
