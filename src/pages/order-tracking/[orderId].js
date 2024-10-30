import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import axios from 'axios';

const OrderTracking = () => {
  const router = useRouter();
  const { orderId } = router.query;
  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await axios.get(`/api/order/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      setOrderDetails(response.data);
    } catch (error) {
      console.error('Error fetching order details:', error);
    }
  };

  if (!orderDetails) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500"></div>
      </div>
    );
  }

  const statusSteps = [
    { status: 'Order Placed', message: 'We\'ve received your order!' },
    { status: 'Processing', message: 'We\'re preparing your order.' },
    { status: 'Shipped', message: 'Your order is on its way!' },
    { status: 'Delivered', message: 'Enjoy your purchase!' },
    { status: 'Cancelled', message: 'Your order has been cancelled.' }
  ];
  const currentStatusIndex = statusSteps.findIndex(step => step.status === orderDetails.status);

  const getStatusMessage = (status, orderId) => {
    switch (status) {
      case 'Order Placed':
        return `Your order #${orderId} has already been placed and will be with you soon.`;
      case 'Processing':
        return `Your order #${orderId} has already been processed and will be with you soon.`;
      case 'Shipped':
        return `Your order #${orderId} has already shipped and will be with you soon.`;
      case 'Delivered':
        return `Your order #${orderId} has been delivered.`;
      case 'Cancelled':
        return `Your order #${orderId} has been cancelled.`;
      default:
        return `Your order #${orderId} is being processed.`;
    }
  };

  const getStatusStepMessage = () => {
    if (currentStatusIndex !== -1 && statusSteps[currentStatusIndex]) {
      return statusSteps[currentStatusIndex].message;
    }
    return 'Order status unknown';
  };

  const isCancelled = orderDetails.status === 'Cancelled';

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto p-4 sm:p-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden max-w-8xl mx-auto p-6">
          <div className="text-left mb-8">
            {/* Thank You Message */}
            <h1 className={`text-xl font-small mb-2 ${isCancelled ? 'text-gray-500' : 'text-orange-500'}`}>
              {isCancelled ? 'Order Cancelled' : 'Thank You!'}
            </h1>
            
            {/* Status Step Message */}
            <h2 className="text-3xl font-semibold text-gray-800 mb-4">
              {getStatusStepMessage()}
            </h2>
            
            {/* Order Status Message */}
            <p className="text-lg text-gray-600 mb-4">
              {getStatusMessage(orderDetails.status, orderDetails.orderId)}
            </p>
          </div>
          
          {/* Status Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {statusSteps.slice(0, -1).map((step, index) => (
                <div key={index} className="text-center">
                  <div className={`mt-2 text-sm ${index <= currentStatusIndex && !isCancelled ? 'text-orange-500 font-semibold' : 'text-gray-500'}`}>
                    {step.status}
                  </div>
                </div>
              ))}
            </div>
            <div className="relative pt-1">
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                <div 
                  style={{ width: `${isCancelled ? '100%' : (currentStatusIndex + 1) * 25}%` }} 
                  className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                    isCancelled ? 'bg-gray-400' : 'bg-orange-500'
                  } transition-all duration-500 ease-in-out`}
                ></div>
              </div>
            </div>
          </div>

          {/* Tracking Number */}
          <div className="text-left mb-8">
            <p className="text-gray-600">
              <span className="font-semibold">Tracking Number:</span> {orderDetails.trackingNumber}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
            {/* Ordered Items */}
            <div>
              <h3 className="text-xl font-bold mb-4 text-gray-800">Ordered Items</h3>
              <div className="bg-white p-4 rounded-lg max-h-80 overflow-y-auto">
                {orderDetails.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-3 border-b last:border-b-0">
                    <div className="flex items-center">
                      <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover rounded-md mr-4" />
                      <span className="font-semibold text-gray-700">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs mr-2">x{item.quantity}</span>
                      <span className="font-semibold">₱{item.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Billing Information, Payment Method, and Order Summary */}
            <div>
              <h3 className="text-xl font-bold mb-4 text-gray-800">Billing Information</h3>
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <p className="text-gray-600"><span className="font-semibold">Full Name:</span> {orderDetails.billingInfo.fullName}</p>
                <p className="text-gray-600"><span className="font-semibold">Phone Number:</span> {orderDetails.billingInfo.phoneNumber}</p>
                <p className="text-gray-600"><span className="font-semibold">Address:</span> {orderDetails.billingInfo.address}</p>
                <p className="text-gray-600"><span className="font-semibold">City:</span> {orderDetails.billingInfo.city}</p>
                <p className="text-gray-600"><span className="font-semibold">State/Province:</span> {orderDetails.billingInfo.stateProvince}</p>
                <p className="text-gray-600"><span className="font-semibold">Postal Code:</span> {orderDetails.billingInfo.postalCode}</p>
                <p className="text-gray-600"><span className="font-semibold">Delivery Address:</span> {orderDetails.billingInfo.deliveryAddress}</p>
              </div>
              
              <h3 className="text-xl font-bold mb-4 text-gray-800">Payment Method</h3>
              <p className="text-gray-600 mb-6">{orderDetails.paymentMethod}</p>
              
              <h3 className="text-xl font-bold mb-4 text-gray-800">Order Summary</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">₱{orderDetails.subtotal}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Delivery Fee:</span>
                  <span className="font-semibold">₱{orderDetails.delivery}</span>
                </div>
                <div className="flex justify-between text-lg font-bold mt-4 pt-2 border-t border-gray-200">
                  <span>Total:</span>
                  <span className={isCancelled ? 'text-gray-500' : 'text-orange-500'}>₱{orderDetails.total}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/home')}
            className="bg-orange-500 text-white px-8 py-3 rounded-full hover:bg-orange-600 transition duration-300 ease-in-out transform hover:scale-105 shadow-md"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;