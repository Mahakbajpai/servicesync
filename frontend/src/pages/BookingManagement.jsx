import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../services/api';
import { Calendar, User, Clock, CheckCircle, Shield, Award, HelpCircle, Loader2, ArrowRight, X, ExternalLink } from 'lucide-react';

const BookingManagement = () => {
  const queryClient = useQueryClient();
  const [selectedBookingForAudit, setSelectedBookingForAudit] = useState(null);

  // 1. Fetch provider bookings
  const { data: bookingsResponse, isLoading, isError, refetch } = useQuery({
    queryKey: ['provider-bookings'],
    queryFn: async () => {
      const res = await API.get('/bookings');
      return res.data.data;
    },
  });

  // 2. Fetch Blockchain Audit logs for selected booking
  const { data: auditResponse, isLoading: auditLoading } = useQuery({
    queryKey: ['booking-audit', selectedBookingForAudit?._id],
    queryFn: async () => {
      if (!selectedBookingForAudit) return null;
      const res = await API.get(`/bookings/${selectedBookingForAudit._id}/audit`);
      return res.data.data;
    },
    enabled: !!selectedBookingForAudit,
  });

  // 3. Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, newStatus }) => {
      const response = await API.patch(`/bookings/${bookingId}/status`, { status: newStatus });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['provider-bookings']);
      // If we are currently viewing this booking's audit log, refresh it too
      if (selectedBookingForAudit) {
        queryClient.invalidateQueries(['booking-audit', selectedBookingForAudit._id]);
      }
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to update booking status.');
    },
  });

  const handleStatusChange = (bookingId, currentStatus) => {
    let newStatus = '';
    if (currentStatus === 'pending') {
      newStatus = 'confirmed';
    } else if (currentStatus === 'confirmed') {
      newStatus = 'completed';
    }

    if (newStatus) {
      updateStatusMutation.mutate({ bookingId, newStatus });
    }
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
          Booking Management Portal
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Review and update status for customer requests. Every update is permanently recorded on-chain.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 text-primary-600 dark:text-primary-400 animate-spin" />
          <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm">Loading incoming bookings...</p>
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 text-red-600 dark:bg-red-950/20 dark:border-red-900/40 p-6 rounded-2xl text-center">
          <h3 className="font-bold text-lg mb-2">Failed to load bookings</h3>
          <p className="text-sm">Please verify backend connectivity.</p>
          <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold">
            Retry Connection
          </button>
        </div>
      ) : bookingsResponse?.length === 0 ? (
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No bookings yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Once customers book your listed services, they will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left">
              <thead className="bg-slate-50 dark:bg-slate-950/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Service details</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Requested date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {bookingsResponse.map((booking) => (
                  <tr key={booking._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                    {/* Service Info */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{booking.service?.title || 'Unknown Service'}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold mt-0.5">{booking.service?.category}</span>
                      </div>
                    </td>
                    {/* Customer Info */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                          {booking.customer?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">{booking.customer?.name}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">{booking.customer?.email}</span>
                        </div>
                      </div>
                    </td>
                    {/* Timestamp */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-sm">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span>{new Date(booking.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                      </div>
                    </td>
                    {/* Status Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusChipStyles(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                    {/* Inline Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2.5">
                      {/* Blockchain Ledger button */}
                      <button
                        onClick={() => setSelectedBookingForAudit(booking)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 transition-all flex inline-flex items-center gap-1"
                      >
                        <Shield className="h-3.5 w-3.5 text-primary-500" />
                        Audit Trail
                      </button>

                      {/* Status Transition buttons */}
                      {booking.status !== 'completed' && (
                        <button
                          onClick={() => handleStatusChange(booking._id, booking.status)}
                          disabled={updateStatusMutation.isPending}
                          className={`text-xs font-bold px-3 py-2 rounded-lg shadow-sm border transition-all inline-flex items-center gap-1 ${
                            booking.status === 'pending'
                              ? 'bg-blue-600 hover:bg-blue-700 text-white border-transparent'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'
                          }`}
                        >
                          {updateStatusMutation.isPending && updateStatusMutation.variables?.bookingId === booking._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : booking.status === 'pending' ? (
                            <>
                              Confirm
                              <ArrowRight className="h-3 w-3" />
                            </>
                          ) : (
                            <>
                              Complete
                              <CheckCircle className="h-3 w-3" />
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Blockchain Audit Dialog */}
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
                    <span className="text-slate-400 block">Customer Name</span>
                    <strong className="text-slate-750 dark:text-white">{selectedBookingForAudit.customer?.name}</strong>
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
                        <div className="flex flex-col gap-0.5 mt-2 font-mono text-[9px] text-slate-400 dark:text-slate-500">
                          <span className="break-all text-slate-500/85">Actor: {log.actor}</span>
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
                <span className="flex items-center gap-0.5">
                  <ExternalLink className="h-3 w-3" />
                  ChainID: 1337
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingManagement;
