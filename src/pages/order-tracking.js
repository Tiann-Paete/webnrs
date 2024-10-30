import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { AlertTriangle, X, Eye, ShoppingBag, Loader } from 'lucide-react';

const CancelConfirmationModal = ({ isOpen, onClose, onConfirm, orderId }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Cancel Order</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <div className="flex items-center mb-4 text-amber-600">
          <AlertTriangle size={24} className="mr-2" />
          <p className="font-semibold">Are you sure you want to cancel this order?</p>
        </div>
        <p className="mb-6 text-gray-600">This action cannot be undone. Order ID: {orderId}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-orange-200 text-white rounded hover:bg-orange-300 transition-colors"
          >
            No, Keep Order
          </button>
          <button
            onClick={() => {
              onConfirm(orderId);
              onClose();
            }}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Yes, Cancel Order
          </button>
        </div>
      </div>
    </div>
  );
};

const OrderTracking = () => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }
      const response = await axios.get('/api/all-orders', {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (error.response?.status === 401) {
        setError('You are not authorized to view this page. Please log in again.');
      } else {
        setError(error.response?.data?.error || 'An error occurred while fetching orders');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    setSelectedOrderId(orderId);
    setIsModalOpen(true);
  };

  const confirmCancelOrder = async (orderId) => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(`/api/cancel-order/${orderId}`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      fetchOrders(); // Refresh the order list
    } catch (error) {
      console.error('Error cancelling order:', error);
      setError(error.response?.data?.error || 'An error occurred while cancelling the order');
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Delivered':
        return 'bg-green-100 text-green-600';
      case 'Processed':
        return 'bg-orange-50 text-orange-500';
      case 'Shipped':
        return 'bg-orange-100 text-orange-600';
      case 'Cancelled':
        return 'bg-red-100 text-red-500';
      default:
        return 'bg-orange-50 text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-8 flex flex-col items-center justify-center">
        <Loader className="w-12 h-12 text-orange-500 animate-spin" />
        <p className="mt-4 text-lg text-gray-600">Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button 
        onClick={() => router.back()} 
        className="mb-4 text-orange-500 hover:text-orange-600"
      >
         ← Back
      </button>
      <h1 className="text-2xl font-bold mb-6">Order Tracking</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {orders.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">You haven't ordered yet</h2>
          <p className="text-gray-600 mb-4">Explore our products and place your first order!</p>
          <button 
            onClick={() => router.push('/home')}
            className="bg-orange-500 text-white px-6 py-2 rounded-full hover:bg-orange-600 transition-colors"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {orders.map((order) => (
            <li key={order.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-2">
                <p className="font-bold text-lg">Order ID: {order.id}</p>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusStyle(order.status)}`}>
                  {order.status}
                </span>
              </div>
              <p className="mb-1">Tracking Number: {order.tracking_number}</p>
              <p className="mb-1">Date: {new Date(order.order_date).toLocaleDateString()}</p>
              <p className="mb-3">Total: ₱{(Number(order.total) || 0).toFixed(2)}</p>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => router.push(`/order-tracking/${order.id}`)}
                  className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 flex items-center"
                >
                  <Eye size={18} className="mr-2" />
                  View Details
                </button>
                {order.status === 'Order Placed' && (
                  <button 
                    onClick={() => handleCancelOrder(order.id)}
                    className="border border-red-500 text-red-500 hover:bg-red-100 px-4 py-2 rounded"
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <CancelConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmCancelOrder}
        orderId={selectedOrderId}
      />
    </div>
  );
};

export default OrderTracking;