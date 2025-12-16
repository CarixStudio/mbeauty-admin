
import React, { useState, useEffect, useMemo } from 'react';
import { Star, Search, Filter, Calendar, CheckCircle, Trash2, Eye, ThumbsUp, X, Check, MoreVertical, Loader2, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import type { Review } from '../types';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/AlertDialog';
import { supabase } from '../lib/supabase';
import { Skeleton } from '../components/ui/Skeleton';
import { CloudinaryOptimizer } from '../lib/cloudinary';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { DatePicker } from '../components/ui/date-picker';

export const ReviewsPage: React.FC = () => {
  const { addToast } = useToast();
  const { confirm } = useConfirm();

  // ----------------------------------------------------------------------
  // STATE
  // ----------------------------------------------------------------------
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState<Date>();
  
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch Logic
  const fetchReviews = async () => {
      if (!supabase) return;
      setLoading(true);
      try {
          // Complex Join: Get review data + Customer Name/Email + Product Name/Image
          const { data, error } = await supabase
            .from('reviews')
            .select(`
                *,
                customers ( full_name, email ),
                products ( name, image_url )
            `)
            .order('created_at', { ascending: false });

          if (error) throw error;

          // Map to UI Type
          const mappedReviews: Review[] = (data || []).map((r: any) => ({
              id: r.id, 
              product_name: r.products?.name || r.product_name || 'Unknown Product',
              product_image: CloudinaryOptimizer.url(r.products?.image_url || r.product_image_url, { width: 100, crop: 'fill' }),
              customer_name: r.customers?.full_name || 'Guest',
              customer_email: r.customers?.email,
              rating: r.rating,
              title: r.title || 'No Title',
              comment: r.comment || r.body || '',
              status: (r.status || 'pending').charAt(0).toUpperCase() + (r.status || 'pending').slice(1),
              created_at: r.created_at,
              helpful_count: r.helpful_count || 0,
              is_verified: r.is_verified,
              is_incentivized: r.is_incentivized,
              is_recommended: r.is_recommended,
              reviewer_skin_type: r.reviewer_skin_type,
              reviewer_skin_concern: r.reviewer_skin_concern,
              reviewer_age_range: r.reviewer_age_range,
              attribute_ratings: r.attribute_ratings,
              media: r.media
          }));

          setReviews(mappedReviews);
      } catch (error: any) {
          console.error("Reviews Fetch Error:", error);
          addToast('Failed to load reviews', 'error');
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchReviews();
  }, []);

  // ----------------------------------------------------------------------
  // FILTER LOGIC
  // ----------------------------------------------------------------------
  const filteredReviews = useMemo(() => {
    return reviews.filter(review => {
      // Search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        review.product_name.toLowerCase().includes(searchLower) ||
        review.customer_name.toLowerCase().includes(searchLower) ||
        review.comment.toLowerCase().includes(searchLower);

      // Rating
      const matchesRating = ratingFilter === 'All' || review.rating === Number(ratingFilter);

      // Status
      const matchesStatus = statusFilter === 'All' || review.status === statusFilter;

      // Date Range
      let matchesDate = true;
      if (startDate) {
        matchesDate = new Date(review.created_at) >= startDate;
      }

      return matchesSearch && matchesRating && matchesStatus && matchesDate;
    });
  }, [reviews, searchTerm, ratingFilter, statusFilter, startDate]);

  // ----------------------------------------------------------------------
  // HANDLERS
  // ----------------------------------------------------------------------
  const handleUpdateStatus = async (id: number, newStatus: string) => {
      try {
          const { error } = await supabase
            .from('reviews')
            .update({ status: newStatus.toLowerCase() })
            .eq('id', id);

          if (error) throw error;

          const uiStatus = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
          setReviews(prev => prev.map(r => r.id === id ? { ...r, status: uiStatus as any } : r));
          
          if (selectedReview?.id === id) {
              setSelectedReview(prev => prev ? { ...prev, status: uiStatus as any } : null);
          }
          
          addToast(`Review marked as ${newStatus}`, "success");
      } catch (error: any) {
          addToast(error.message, 'error');
      }
  };

  const handleDelete = async (id: number) => {
    if (await confirm({
        title: 'Delete Review',
        description: 'Are you sure you want to delete this review permanently? This action cannot be undone.',
        confirmText: 'Delete',
        variant: 'danger'
    })) {
      try {
          const { error } = await supabase
            .from('reviews')
            .delete()
            .eq('id', id);

          if (error) throw error;

          setReviews(prev => prev.filter(r => r.id !== id));
          setIsModalOpen(false);
          addToast("Review deleted", "success");
      } catch (error: any) {
          addToast(error.message, 'error');
      }
    }
  };

  const openReviewDetail = (review: Review) => {
    setSelectedReview(review);
    setIsModalOpen(true);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex text-yellow-400">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={14} fill={i < rating ? "currentColor" : "none"} className={i < rating ? "text-yellow-400" : "text-gray-300"} />
        ))}
      </div>
    );
  };

  // ----------------------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit">Product Reviews</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Moderate and analyze customer feedback.</p>
          </div>
      </div>
      
      {/* Filters */}
      <Card className="p-4 space-y-4">
         <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input 
                  type="text" 
                  placeholder="Search product or customer..." 
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:border-brand-accent bg-white dark:bg-[#333] text-gray-900 dark:text-white" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <div className="flex gap-2 flex-wrap">
               <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-600 rounded-lg px-3 bg-white dark:bg-[#333]">
                  <Star size={16} className="text-gray-400" />
                  <select 
                     className="bg-transparent text-sm outline-none p-2 text-gray-900 dark:text-white"
                     value={ratingFilter}
                     onChange={(e) => setRatingFilter(e.target.value)}
                  >
                     <option value="All">All Ratings</option>
                     <option value="5">5 Stars</option>
                     <option value="4">4 Stars</option>
                     <option value="3">3 Stars</option>
                     <option value="2">2 Stars</option>
                     <option value="1">1 Star</option>
                  </select>
               </div>
               <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-600 rounded-lg px-3 bg-white dark:bg-[#333]">
                  <Filter size={16} className="text-gray-400" />
                  <select 
                     className="bg-transparent text-sm outline-none p-2 text-gray-900 dark:text-white"
                     value={statusFilter}
                     onChange={(e) => setStatusFilter(e.target.value)}
                  >
                     <option value="All">All Status</option>
                     <option value="Pending">Pending</option>
                     <option value="Approved">Approved</option>
                     <option value="Rejected">Rejected</option>
                  </select>
               </div>
               <div className="w-[180px]">
                   <DatePicker date={startDate} setDate={setStartDate} placeholder="Filter by Date" />
               </div>
            </div>
         </div>
      </Card>

      {/* Review List */}
      <div className="space-y-4">
        {loading ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
        ) : filteredReviews.length > 0 ? (
            filteredReviews.map((review) => (
                <Card key={review.id} className="p-6 transition-all hover:shadow-md dark:hover:border-gray-600">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Product Image */}
                        <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0 overflow-hidden">
                            <img src={review.product_image} alt={review.product_name} className="w-full h-full object-cover" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">{review.title}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        {renderStars(review.rating)}
                                        <span className="text-sm text-gray-500 dark:text-gray-400">• {new Date(review.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <Badge variant={review.status === 'Approved' ? 'success' : review.status === 'Rejected' ? 'error' : 'warning'}>
                                    {review.status}
                                </Badge>
                            </div>

                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                                {review.comment}
                            </p>

                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-2">
                                <span className="font-medium text-gray-900 dark:text-white">{review.customer_name}</span>
                                {review.is_verified && (
                                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><CheckCircle size={12}/> Verified Purchase</span>
                                )}
                                <span className="flex items-center gap-1"><ThumbsUp size={12}/> {review.helpful_count} found helpful</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-row md:flex-col gap-2 justify-end md:justify-start border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700 pt-4 md:pt-0 md:pl-6">
                            <Button size="sm" variant="ghost" onClick={() => openReviewDetail(review)} title="View Details">
                                <Eye size={16} className="text-gray-500 hover:text-brand-primary dark:text-gray-400 dark:hover:text-white"/>
                            </Button>
                            {review.status === 'Pending' && (
                                <>
                                    <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(review.id, 'Approved')} title="Approve">
                                        <Check size={16} className="text-green-500 hover:text-green-600"/>
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(review.id, 'Rejected')} title="Reject">
                                        <X size={16} className="text-red-500 hover:text-red-600"/>
                                    </Button>
                                </>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(review.id)} title="Delete">
                                <Trash2 size={16} className="text-gray-400 hover:text-red-500"/>
                            </Button>
                        </div>
                    </div>
                </Card>
            ))
        ) : (
            <div className="p-12 text-center text-gray-500 bg-white dark:bg-[#262626] rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                No reviews match your filters.
            </div>
        )}
      </div>

      {/* Review Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-[#262626] border-gray-200 dark:border-gray-700">
            <DialogHeader>
                <DialogTitle className="flex justify-between items-center text-gray-900 dark:text-white">
                    Review Details
                    <Badge variant={selectedReview?.status === 'Approved' ? 'success' : selectedReview?.status === 'Rejected' ? 'error' : 'warning'}>
                        {selectedReview?.status}
                    </Badge>
                </DialogTitle>
            </DialogHeader>
            
            {selectedReview && (
                <div className="space-y-6">
                    {/* Product & Customer Info */}
                    <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <img src={selectedReview.product_image} className="w-16 h-16 rounded object-cover" alt="Product" />
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white">{selectedReview.product_name}</h4>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-300">
                                <span>By {selectedReview.customer_name}</span>
                                {selectedReview.is_verified && <Badge variant="secondary" className="scale-90"><CheckCircle size={10} className="mr-1"/> Verified</Badge>}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{selectedReview.customer_email}</div>
                        </div>
                    </div>

                    {/* Review Content */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            {renderStars(selectedReview.rating)}
                            <span className="font-bold text-lg text-gray-900 dark:text-white ml-2">{selectedReview.title}</span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {selectedReview.comment}
                        </p>
                    </div>

                    {/* Attributes */}
                    {(selectedReview.reviewer_skin_type || selectedReview.reviewer_age_range) && (
                        <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-100 dark:border-gray-700 pt-4">
                            {selectedReview.reviewer_skin_type && (
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400 block text-xs uppercase">Skin Type</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{selectedReview.reviewer_skin_type}</span>
                                </div>
                            )}
                            {selectedReview.reviewer_age_range && (
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400 block text-xs uppercase">Age Range</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{selectedReview.reviewer_age_range}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                        {selectedReview.status === 'Pending' ? (
                            <>
                                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/10" onClick={() => handleUpdateStatus(selectedReview.id, 'Rejected')}>
                                    <XCircle size={16} className="mr-2"/> Reject
                                </Button>
                                <Button onClick={() => handleUpdateStatus(selectedReview.id, 'Approved')}>
                                    <Check size={16} className="mr-2"/> Approve
                                </Button>
                            </>
                        ) : (
                            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/10" onClick={() => handleDelete(selectedReview.id)}>
                                <Trash2 size={16} className="mr-2"/> Delete Review
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
