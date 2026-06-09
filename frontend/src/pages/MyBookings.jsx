import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../services/api';
import { Calendar, User, Clock, Star, MessageSquare, Shield, HelpCircle, Loader2, ArrowRight, X, Check } from 'lucide-react';

const MyBookings = () => {
  const queryClient = useQueryClient();
  
  // Modals state
  const [ratingBooking, setRatingBooking] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  const [selectedBookingForAudit, setSelectedBookingForAudit] = useState(null);

  // 1. Fetch bookings
  const { data: bookingsResponse, isLoading, isError, refetch } = useQuery({
    queryKey: ['customer-bookings'],
    queryFn: async () => {
      const res = await API.get('/bookings');
      return res.data.data;
    },
  });

  // 2. Fetch Blockchain Audit logs
  const { data: auditResponse, isLoading: auditLoading } = useQuery({
    queryKey: ['booking-audit', selectedBookingForAudit?._id],
    queryFn: async () => {
      if (!selectedBookingForAudit) return null;
      const res = await API.get(`/bookings/${selectedBookingForAudit._id}/audit`);
      return res.data.data;
    },
    enabled: !!selectedBookingForAudit,
  });

  // 3. Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async ({ bookingId, rating, comment }) => {
      const response = await API.post(`/bookings/${bookingId}/rate`, { rating, comment });
      return response.data;
    },
    onSuccess: () => {
      setRatingBooking(null);
      setReviewComment('');
      setRatingValue(5);
      queryClient.invalidateQueries(['customer-bookings']);
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to submit review.');
    },
  });

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!ratingBooking) return;
    submitReviewMutation.mutate({
      bookingId: ratingBooking._id,
      rating: ratingValue,
      comment: reviewComment,
    });
  };

  const getStatusChipStyles = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
      case 'confirmed':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30';
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-905 dark:text-slate-400';
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full dark:text-white">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          My Booked Services
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Monitor your service orders, verify status logs on the blockchain, and rate completed providers.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 text-primary-600 dark:text-primary-400 animate-spin" />
          <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm">Loading your bookings history...</p>
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 text-red-600 dark:bg-red-950/20 dark:border-red-900/40 p-6 rounded-2xl text-center">
          <h3 className="font-bold text-lg mb-2">Failed to load bookings</h3>
          <p className="text-sm">Please verify connection parameters and try again.</p>
          <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold">
            Retry Connection
          </button>
        </div>
      ) : bookingsResponse?.length === 0 ? (
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No service bookings</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Browse our catalog on the homepage to place your first booking!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookingsResponse.map((booking) => (
            <div
              key={booking._id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-150"
            >
              <div>
                {/* Header: Service Category & Status */}
                <div className="flex justify-between items-center mb-3">
                  <span className="bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                    {booking.service?.category || 'Service'}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusChipStyles(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>

                {/* Service Title */}
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">
                  {booking.service?.title || 'Unknown Service'}
                </h3>

                {/* Details list */}
                <div className="space-y-2 mb-4 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <User className="h-4 w-4 text-slate-400" />
                    <span>Provider: <strong className="text-slate-800 dark:text-slate-300">{booking.provider?.name}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span>Booked: {new Date(booking.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                </div>
              </div>

              {/* Submitted Review Info (if exists) */}
              {booking.review && (
                <div className="mb-4 bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800/40 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Your Review</span>
                    <div className="flex text-amber-500 font-bold items-center gap-0.5">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      <span>{booking.review.rating} / 5</span>
                    </div>
                  </div>
                  <p className="text-slate-500 dark:text-slate-450 italic">
                    "{booking.review.comment || 'No comment provided.'}"
                  </p>
                </div>
              )}

              {/* Actions Footer */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between mt-auto">
                <div className="text-slate-900 dark:text-white">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Hourly Rate</span>
                  <span className="text-lg font-extrabold">${booking.service?.price || '0'}</span>
                </div>

                <div className="flex space-x-2">
                  {/* Blockchain Audit button */}
                  <button
                    onClick={() => setSelectedBookingForAudit(booking)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 transition-all flex items-center gap-1"
                  >
                    <Shield className="h-3.5 w-3.5 text-primary-500" />
                    Audit Trail
                  </button>

                  {/* Rating trigger */}
                  {booking.status === 'completed' && !booking.review && (
                    <button
                      onClick={() => setRatingBooking(booking)}
                      className="text-xs bg-primary-600 hover:bg-primary-700 text-white font-bold px-3 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1"
                    >
                      <Star className="h-3.5 w-3.5" />
                      Rate Service
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {ratingBooking && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Submit Review
              </h2>
              <button
                onClick={() => setRatingBooking(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-sm bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl mb-2">
              <p className="text-slate-500 dark:text-slate-400 text-xs">Rating service for:</p>
              <strong className="text-slate-800 dark:text-white text-base block mt-0.5">{ratingBooking.service?.title}</strong>
              <span className="text-xs text-slate-500">Provider: {ratingBooking.provider?.name}</span>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              {/* Star Rating Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Star Rating
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRatingValue(val)}
                      onMouseEnter={() => setHoverRating(val)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          val <= (hoverRating || ratingValue)
                            ? 'fill-amber-500 text-amber-500'
                            : 'text-slate-350 dark:text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Comment */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Comments / Review
                </label>
                <textarea
                  required
                  placeholder="Share your experience working with this service provider..."
                  rows="4"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-805 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitReviewMutation.isPending}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review & Rating'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Blockchain Audit Dialog (Same as Provider View) */}
      {selectedBookingForAudit && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-xl w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Blockchain Audit Trail
                </h3>
              </div>
              <button
                onClick={() => setSelectedBookingForAudit(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-sm bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                <span className="text-xs text-slate-400 uppercase font-semibold">Booking ID</span>
                <p className="font-mono text-slate-700 dark:text-slate-300 break-all select-all text-xs">{selectedBookingForAudit._id}</p>
                <div className="grid grid-cols-2 gap-4 mt-2 border-t border-slate-200/30 dark:border-slate-800/30 pt-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">Service Name</span>
                    <strong className="text-slate-750 dark:text-white">{selectedBookingForAudit.service?.title}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Provider Name</span>
                    <strong className="text-slate-750 dark:text-white">{selectedBookingForAudit.provider?.name}</strong>
                  </div>
                </div>
              </div>

              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-4 mb-2">
                Ledger Logs:
              </h4>

              {auditLoading ? (
                <div className="flex justify-center items-center py-6">
                  <Loader2 className="h-6 w-6 text-primary-600 dark:text-primary-400 animate-spin" />
                  <span className="text-xs text-slate-500 ml-2">Reading from ledger...</span>
                </div>
              ) : auditResponse?.logs.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No records stored on-chain for this booking yet.
                </div>
              ) : (
                <div className="space-y-4 max-h-[16rem] overflow-y-auto pr-1">
                  {auditResponse?.logs.map((log, idx) => (
                    <div key={idx} className="flex gap-3 relative select-none">
                      {/* Timeline separator */}
                      {idx !== auditResponse.logs.length - 1 && (
                        <span className="absolute left-4 top-8 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800" />
                      )}
                      
                      {/* Left icon badge */}
                      <div className="h-8.5 w-8.5 shrink-0 rounded-full bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold font-mono">
                        {idx + 1}
                      </div>

                      {/* Log Body */}
                      <div className="flex-1 bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200/30 dark:border-slate-800/40 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold flex items-center gap-1">
                            <span className="capitalize text-slate-500 dark:text-slate-400">{log.oldStatus === 'none' ? 'Initiated' : log.oldStatus}</span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <span className="text-primary-600 dark:text-primary-400 capitalize">{log.newStatus}</span>
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {new Date(log.timestamp * 1000).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5 mt-2 font-mono text-[9px] text-slate-400 dark:text-slate-505">
                          <span className="break-all text-slate-500/85 font-semibold">Actor: {log.actor}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Network Indicator */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-between items-center text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${auditResponse?.mode === 'blockchain' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  Mode: {auditResponse?.mode === 'blockchain' ? 'Local Hardhat Network' : 'Mock Fallback Store'}
                </span>
                <span>ChainID: 1337</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;
