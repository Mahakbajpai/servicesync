import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { Search, MapPin, Star, Plus, ShieldAlert, CheckCircle2, ChevronLeft, ChevronRight, X, Compass, Loader2 } from 'lucide-react';

const CATEGORIES = ['All', 'Cleaning', 'Repair', 'Plumbing', 'Electrical', 'Tutoring', 'Wellness', 'Tech Support'];

// Preset Locations for easy simulation
const LOCATIONS = [
  { name: 'Downtown (Center)', lng: 77.5946, lat: 12.9716 },
  { name: 'North Suburb', lng: 77.5800, lat: 13.0300 },
  { name: 'East Tech Hub', lng: 77.6400, lat: 12.9700 },
  { name: 'South Residential', lng: 77.5700, lat: 12.9100 },
];

const LandingPage = () => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [page, setPage] = useState(1);
  const limit = 6;

  // Geospatial State
  const [useGeoSort, setUseGeoSort] = useState(false);
  const [simLocation, setSimLocation] = useState(LOCATIONS[0]);
  const [customLng, setCustomLng] = useState(LOCATIONS[0].lng);
  const [customLat, setCustomLat] = useState(LOCATIONS[0].lat);

  // Listing creation modal state (for Providers)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newService, setNewService] = useState({
    title: '',
    category: 'Cleaning',
    price: '',
    description: '',
    lng: '77.5946',
    lat: '12.9716',
  });

  // Action status message
  const [actionMessage, setActionMessage] = useState(null);

  // 1. Fetching Services Query
  const { data: servicesData, isLoading, isError, refetch } = useQuery({
    queryKey: ['services', selectedCategory, page, useGeoSort, simLocation],
    queryFn: async () => {
      let url = `/services?page=${page}&limit=${limit}`;
      if (selectedCategory !== 'All') {
        url += `&category=${selectedCategory}`;
      }
      if (useGeoSort) {
        url += `&longitude=${simLocation.lng}&latitude=${simLocation.lat}`;
      }
      const response = await API.get(url);
      return response.data.data;
    },
  });

  // 2. Fetching Provider Ratings (in batches or dynamic details)
  const fetchProviderRating = async (providerId) => {
    try {
      const res = await API.get(`/providers/${providerId}/profile`);
      return res.data.data;
    } catch {
      return { averageRating: 0, totalReviews: 0 };
    }
  };

  // We will do inline ratings fetching or show dynamic badges. To avoid multiple request cascades, 
  // we can use a query that maps provider details or let the cards load ratings asynchronously.
  // Actually, we can fetch provider profiles using React Query as well, but since the backend route returns provider ID populated on service,
  // let's create a small sub-component or query hook for the provider rating badge.

  // 3. Create Booking Mutation
  const bookMutation = useMutation({
    mutationFn: async (serviceId) => {
      const response = await API.post('/bookings', { serviceId });
      return response.data;
    },
    onSuccess: (data) => {
      setActionMessage({
        type: 'success',
        text: `Successfully booked service! Initial status recorded on blockchain.`,
      });
      queryClient.invalidateQueries(['bookings']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (error) => {
      setActionMessage({
        type: 'error',
        text: error.response?.data?.message || 'Booking failed. Try again.',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  // 4. Create Service Listing Mutation
  const createServiceMutation = useMutation({
    mutationFn: async (serviceData) => {
      const response = await API.post('/services', serviceData);
      return response.data;
    },
    onSuccess: () => {
      setIsModalOpen(false);
      setActionMessage({
        type: 'success',
        text: 'Successfully listed your service on ServiceSync!',
      });
      queryClient.invalidateQueries(['services']);
      setNewService({
        title: '',
        category: 'Cleaning',
        price: '',
        description: '',
        lng: '77.5946',
        lat: '12.9716',
      });
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Failed to create service listing.');
    },
  });

  const handleBooking = (serviceId) => {
    if (!isAuthenticated) {
      setActionMessage({
        type: 'error',
        text: 'Please log in to book a service.',
      });
      return;
    }
    bookMutation.mutate(serviceId);
  };

  const handleCreateServiceSubmit = (e) => {
    e.preventDefault();
    if (!newService.title || !newService.price || !newService.lng || !newService.lat) {
      alert('Please fill out all fields.');
      return;
    }
    createServiceMutation.mutate({
      title: newService.title,
      category: newService.category,
      price: parseFloat(newService.price),
      description: newService.description,
      coordinates: [parseFloat(newService.lng), parseFloat(newService.lat)],
    });
  };

  const handleSimLocationSelect = (loc) => {
    setSimLocation(loc);
    setCustomLng(loc.lng);
    setCustomLat(loc.lat);
  };

  const handleApplyCustomLocation = () => {
    setSimLocation({
      name: 'Custom Coordinates',
      lng: parseFloat(customLng),
      lat: parseFloat(customLat),
    });
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full dark:text-white">
      {/* Banner / Headline */}
      <div className="mb-10 text-center md:text-left md:flex md:items-center md:justify-between border-b border-slate-200 dark:border-slate-800 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl tracking-tight">
            Find & Book Local Services
          </h1>
          <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">
            Secure booking with on-chain blockchain audit trails.
          </p>
        </div>
        {user?.role === 'Provider' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 md:mt-0 flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold px-5 py-3 rounded-xl shadow-md shadow-primary-500/20 transition-all duration-150"
          >
            <Plus className="h-5 w-5" />
            Add Service Listing
          </button>
        )}
      </div>

      {/* Action Message overlay */}
      {actionMessage && (
        <div className={`mb-6 p-4 rounded-xl flex items-center justify-between border ${
          actionMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400'
            : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-400'
        }`}>
          <div className="flex items-center gap-2.5">
            {actionMessage.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <ShieldAlert className="h-5 w-5 shrink-0" />}
            <span className="text-sm font-semibold">{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Main Grid: Controls + Services */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Side: Category Filters & Geospatial sorting controls */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              Categories
            </h2>
            <div className="flex flex-wrap lg:flex-col gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); setPage(1); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    (cat === 'All' && selectedCategory === 'All') || selectedCategory === cat
                      ? 'bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 font-bold border border-primary-100 dark:border-primary-900/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Geospatial Sort Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                Geospatial Sorting
              </h2>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useGeoSort}
                  onChange={(e) => { setUseGeoSort(e.target.checked); setPage(1); }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {useGeoSort && (
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Select Simulated Location:
                  </span>
                  <div className="space-y-1.5">
                    {LOCATIONS.map((loc) => (
                      <button
                        key={loc.name}
                        onClick={() => handleSimLocationSelect(loc)}
                        className={`w-full text-left text-xs px-3 py-2 border rounded-lg transition-all ${
                          simLocation.name === loc.name
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/10 text-primary-600 dark:text-primary-400 font-semibold'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Custom Coordinates:
                  </span>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Longitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={customLng}
                        onChange={(e) => setCustomLng(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Latitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={customLat}
                        onChange={(e) => setCustomLat(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleApplyCustomLocation}
                    className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-1.5 rounded text-xs font-semibold"
                  >
                    Apply Coordinates
                  </button>
                </div>

                <div className="bg-primary-50 dark:bg-primary-950/10 p-3 rounded-xl border border-primary-100/50 dark:border-primary-900/20 text-[11px] text-slate-600 dark:text-slate-400">
                  Sorting services based on how close they are to: <strong className="text-slate-800 dark:text-white">({simLocation.lng.toFixed(3)}, {simLocation.lat.toFixed(3)})</strong>.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Services Grid */}
        <div className="lg:col-span-3 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 text-primary-600 dark:text-primary-400 animate-spin" />
              <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm">Loading services...</p>
            </div>
          ) : isError ? (
            <div className="bg-red-50 border border-red-200 text-red-600 dark:bg-red-950/20 dark:border-red-900/40 p-6 rounded-2xl text-center">
              <h3 className="font-bold text-lg mb-2">Failed to load services</h3>
              <p className="text-sm">Please verify that the backend API is running and try again.</p>
              <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold">
                Retry Connection
              </button>
            </div>
          ) : servicesData?.services.length === 0 ? (
            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
              <Search className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No services found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Try clearing filters or adding a new service listing if you're logged in as a provider.
              </p>
            </div>
          ) : (
            <>
              {/* Service Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {servicesData?.services.map((service) => (
                  <ServiceCard
                    key={service._id}
                    service={service}
                    onBook={handleBooking}
                    currentLocation={useGeoSort ? simLocation : null}
                    userRole={user?.role}
                    isBookingLoading={bookMutation.isPending && bookMutation.variables === service._id}
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              {servicesData?.totalPages > 1 && (
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 shadow-sm">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Page <strong>{page}</strong> of {servicesData.totalPages}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 border border-slate-200 dark:border-slate-850 rounded bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(servicesData.totalPages, p + 1))}
                      disabled={page === servicesData.totalPages}
                      className="p-1.5 border border-slate-200 dark:border-slate-850 rounded bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Listing creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Create Service Listing
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateServiceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Service Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Premium House Cleaning"
                  value={newService.title}
                  onChange={(e) => setNewService({ ...newService, title: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-805 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={newService.category}
                    onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-805 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {CATEGORIES.slice(1).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Price (USD / hr)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="50"
                    value={newService.price}
                    onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-805 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    placeholder="77.5946"
                    value={newService.lng}
                    onChange={(e) => setNewService({ ...newService, lng: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-805 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    placeholder="12.9716"
                    value={newService.lat}
                    onChange={(e) => setNewService({ ...newService, lat: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-805 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Provide details about your service offerings..."
                  rows="3"
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-805 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={createServiceMutation.isPending}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {createServiceMutation.isPending ? 'Publishing...' : 'Publish Service Listing'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper card subcomponent
const ServiceCard = ({ service, onBook, currentLocation, userRole, isBookingLoading }) => {
  const [ratingData, setRatingData] = useState({ averageRating: 0, totalReviews: 0, loading: true });

  React.useEffect(() => {
    const getRating = async () => {
      try {
        const response = await API.get(`/providers/${service.provider._id}/profile`);
        const { averageRating, totalReviews } = response.data.data;
        setRatingData({ averageRating, totalReviews, loading: false });
      } catch {
        setRatingData({ averageRating: 0, totalReviews: 0, loading: false });
      }
    };
    getRating();
  }, [service.provider._id]);

  // Compute mock distance if geospatial sort is enabled
  const getDistance = () => {
    if (!currentLocation) return null;
    const [lng2, lat2] = service.location.coordinates;
    const lng1 = currentLocation.lng;
    const lat1 = currentLocation.lat;

    // Standard Haversine distance formula approximation (in km)
    const R = 6371; // Earth radius
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return dist.toFixed(1);
  };

  const distance = getDistance();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-150 relative">
      <div>
        {/* Category Header */}
        <div className="flex justify-between items-start mb-3">
          <span className="bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
            {service.category}
          </span>
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs">
            <MapPin className="h-3.5 w-3.5" />
            <span>
              {service.location.coordinates[0].toFixed(3)}, {service.location.coordinates[1].toFixed(3)}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1 mb-1.5">
          {service.title}
        </h3>

        {/* Provider Profile Summary */}
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-primary-600 dark:text-primary-400">
            {service.provider?.name?.charAt(0).toUpperCase() || 'P'}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {service.provider?.name}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            {ratingData.loading ? (
              <span className="text-[10px] text-slate-400">loading rating...</span>
            ) : (
              <div className="flex items-center gap-0.5 text-amber-500 font-bold text-xs">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                <span>{ratingData.averageRating > 0 ? ratingData.averageRating : 'New'}</span>
                {ratingData.totalReviews > 0 && (
                  <span className="text-slate-400 dark:text-slate-500 font-normal">
                    ({ratingData.totalReviews})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 min-h-[3.75rem]">
          {service.description || 'No description provided.'}
        </p>
      </div>

      {/* Pricing & Booking Action */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between mt-auto">
        <div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
            Price Rate
          </span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-white">
            ${service.price}
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">/hr</span>
          </span>
        </div>

        <div className="flex flex-col items-end gap-1">
          {userRole !== 'Provider' && (
            <button
              onClick={() => onBook(service._id)}
              disabled={isBookingLoading}
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isBookingLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Book Service
            </button>
          )}
          {distance && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5 mt-1">
              <Compass className="h-3 w-3 text-slate-400" />
              {distance} km away
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
