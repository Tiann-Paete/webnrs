import React, { useState, useEffect } from 'react';
import { useCart } from '../CartContext';
import axios from 'axios';
import Image from 'next/image';
import { useRouter } from 'next/router';
import GCashModal from '../components/GCashModal';
import { CheckCircle, Loader } from 'lucide-react';
import CheckoutReceipt from '../components/CheckoutReceipt';

const MINDANAO_CITIES = {
  "Davao City": "Davao del Sur",
  "Panabo City": "Davao del Norte",
  "Tagum City": "Davao del Norte",
  "Samal City": "Davao del Norte",
  "Digos City": "Davao del Sur",
  "Mati City": "Davao Oriental",
  "Cagayan de Oro City": "Misamis Oriental",
  "Iligan City": "Lanao del Norte",
  "Malaybalay City": "Bukidnon",
  "Valencia City": "Bukidnon",
  "Oroquieta City": "Misamis Occidental",
  "Ozamis City": "Misamis Occidental",
  "Tangub City": "Misamis Occidental",
  "Zamboanga City": "Zamboanga del Sur",
  "Pagadian City": "Zamboanga del Sur",
  "Dipolog City": "Zamboanga del Norte",
  "Dapitan City": "Zamboanga del Norte",
  "General Santos City": "South Cotabato",
  "Koronadal City": "South Cotabato",
  "Tacurong City": "Sultan Kudarat",
  "Kidapawan City": "Cotabato",
  "Butuan City": "Agusan del Norte",
  "Cabadbaran City": "Agusan del Norte",
  "Bayugan City": "Agusan del Sur",
  "Surigao City": "Surigao del Norte",
  "Tandag City": "Surigao del Sur",
  "Bislig City": "Surigao del Sur",
  "Cotabato City": "Maguindanao",
  "Marawi City": "Lanao del Sur"
};

const Cart = () => {
  const router = useRouter();
  const { cartItems, removeFromCart, updateQuantity, clearCart } = useCart();
  const [billingInfo, setBillingInfo] = useState({
    fullName: '',
    phoneNumber: '',
    address: '',
    city: '',
    stateProvince: '',
    postalCode: '',
    deliveryAddress: 'Home'
  });
  const [paymentMethod, setPaymentMethod] = useState('GCash');
  const [formErrors, setFormErrors] = useState({});
  const [showAlert, setShowAlert] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [showGCashModal, setShowGCashModal] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [productStock, setProductStock] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showCheckoutReceipt, setShowCheckoutReceipt] = useState(false);

  useEffect(() => {
    const fetchProductStock = async () => {
      try {
        const response = await axios.get('/api/products');
        const stockMap = {};
        response.data.forEach(product => {
          // Using the stock_quantity from the API response which now comes from product_stocks
          stockMap[product.id] = product.stock_quantity;
        });
        setProductStock(stockMap);
      } catch (error) {
        console.error('Error fetching product stock:', error);
      }
    };

    fetchProductStock();
  }, []);

  const handleQuantityChange = (itemId, newQuantity) => {
    const availableStock = productStock[itemId] || 0;
    if (newQuantity > 0 && newQuantity <= availableStock) {
      updateQuantity(itemId, newQuantity, availableStock);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'city') {
      setBillingInfo({
        ...billingInfo,
        city: value,
        stateProvince: MINDANAO_CITIES[value] || ''
      });
    } else {
      setBillingInfo({ ...billingInfo, [name]: value });
    }
    
    setFormErrors({ ...formErrors, [name]: '' });
  };

  const handleCitySelect = (city) => {
    setBillingInfo({
      ...billingInfo,
      city,
      stateProvince: MINDANAO_CITIES[city]
    });
    setIsDropdownOpen(false);
    setFormErrors({ ...formErrors, city: '' });
  };

  const calculateDelivery = () => {
    return 60.00;
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = calculateDelivery();
  const total = subtotal + delivery;

  const validateForm = () => {
    const errors = {};
    Object.keys(billingInfo).forEach(key => {
      if (!billingInfo[key]) {
        errors[key] = 'This field is required';
      }
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const placeOrder = async () => {
    if (!validateForm()) {
      return;
    }
  
    setIsLoading(true);
  
    if (paymentMethod === 'GCash') {
      setShowGCashModal(true);
      setShowCheckoutReceipt(false); // Close the checkout receipt modal
      setIsLoading(false);
    } else if (paymentMethod === 'COD') {
      await processOrder();
    }
  };

  const processOrder = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post('/api/place-order', {
        billingInfo,
        paymentMethod,
        cartItems,
        subtotal,
        delivery,
        total
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setOrderId(response.data.orderId);
        setShowAlert(true);
        clearCart();
        setOrderPlaced(true);
      }
    } catch (error) {
      console.error('Error placing order:', error.response ? error.response.data : error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGCashPayment = async (fullName, gcashNumber) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post('/api/place-order', {
        billingInfo,
        paymentMethod: 'GCash',
        paymentDetails: { fullName, gcashNumber },
        cartItems,
        subtotal,
        delivery,
        total
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.data.success) {
        setOrderId(response.data.orderId);
        setShowAlert(true);
        clearCart();
        setShowGCashModal(false);
        setOrderPlaced(true);
      }
    } catch (error) {
      console.error('Error placing order:', error.response ? error.response.data : error.message);
    }
  };
  
  const Alert = ({ onClose, orderId }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white p-8 rounded-lg max-w-md w-full ${orderPlaced ? 'animate-[tada_1s_ease-in-out]' : ''}`}>
        <div className="flex items-center mb-4">
          <CheckCircle className="text-green-500 w-8 h-8 mr-3 animate-[pulse_1s_infinite]" />
          <h2 className="text-2xl font-bold text-orange-500">Your order is confirmed!</h2>
        </div>
        <p className="mb-4">Your order has been placed. Order ID: {orderId}</p>
        <div className="flex justify-between">
          <button
            onClick={() => {
              router.push('/home');
              onClose();
            }}
            className="bg-orange-300 text-white px-4 py-2 rounded hover:bg-orange-400"
          >
            Order Again
          </button>
          <button
            onClick={() => {
              router.push(`/order-tracking/${orderId}`);
              onClose();
            }}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
          >
            Check Your Order
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto p-8">
        <button 
          onClick={() => router.push('/home')} 
          className="mb-6 text-orange-500 hover:text-orange-600 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Products
        </button>
        
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="w-full md:w-1/2">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">Billing Address</h2>
              <form className="space-y-4">
                <div className="flex flex-col">
                  <label htmlFor="fullName" className="text-sm font-medium text-gray-700 mb-1"></label>
                  <input 
                    id="fullName"
                    name="fullName" 
                    value={billingInfo.fullName} 
                    onChange={handleInputChange} 
                    placeholder="Fullname" 
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  {formErrors.fullName && <p className="text-red-500 text-sm mt-1">{formErrors.fullName}</p>}
                </div>
                
                <div className="flex flex-col">
                  <label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700 mb-1"></label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md">
                      +63
                    </span>
                    <input 
                      id="phoneNumber"
                      name="phoneNumber" 
                      value={billingInfo.phoneNumber} 
                      onChange={handleInputChange} 
                      placeholder="Phone Number" 
                      className="flex-1 p-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  {formErrors.phoneNumber && <p className="text-red-500 text-sm mt-1">{formErrors.phoneNumber}</p>}
                </div>
                
                <div className="flex flex-col">
                  <label htmlFor="address" className="text-sm font-medium text-gray-700 mb-1"></label>
                  <input 
                    id="address"
                    name="address" 
                    value={billingInfo.address} 
                    onChange={handleInputChange} 
                    placeholder="Address" 
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  {formErrors.address && <p className="text-red-500 text-sm mt-1">{formErrors.address}</p>}
                </div>
                
                  <div className="flex gap-4">
        <div className="flex flex-col flex-1">
          <label htmlFor="city" className="text-sm font-medium text-gray-700 mb-1">City</label>
          <div className="relative">
            <button
            id="city"
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="inline-flex w-full justify-between items-center rounded-md bg-white px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {billingInfo.city || 'Select a city'}
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </button>

            {isDropdownOpen && (
  <div className="absolute left-0 z-10 mt-2 w-full max-h-[30vh] overflow-y-auto origin-top-right rounded-md bg-gray-100 shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
    style={{
      scrollbarWidth: 'thin',
      scrollbarColor: '#CBD5E1 #F3F4F6',
    }}>
    <style jsx>{`
      .absolute::-webkit-scrollbar {
        width: 6px;
      }
      .absolute::-webkit-scrollbar-track {
        background: #F3F4F6;
        border-radius: 10px;
      }
      .absolute::-webkit-scrollbar-thumb {
        background: #CBD5E1;
        border-radius: 10px;
      }
      .absolute::-webkit-scrollbar-thumb:hover {
        background: #94A3B8;
      }
    `}</style>
    <div className="py-1">
      <div className="px-3 py-2 text-xs font-semibold text-gray-600">Davao Region</div>
      {["Davao City", "Panabo City", "Tagum City", "Samal City", "Digos City", "Mati City"].map((city) => (
        <button
          key={city}
          onClick={() => handleCitySelect(city)}
          className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-200 transition-colors duration-150"
        >
          {city}
        </button>
      ))}
    </div>
    <div className="py-1">
      <div className="px-3 py-2 text-xs font-semibold text-gray-600">Northern Mindanao</div>
      {["Cagayan de Oro City", "Iligan City", "Malaybalay City", "Valencia City", "Oroquieta City", "Ozamis City", "Tangub City"].map((city) => (
        <button
          key={city}
          onClick={() => handleCitySelect(city)}
          className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-200 transition-colors duration-150"
        >
          {city}
        </button>
      ))}
    </div>
    <div className="py-1">
      <div className="px-3 py-2 text-xs font-semibold text-gray-600">Zamboanga Peninsula</div>
      {["Zamboanga City", "Pagadian City", "Dipolog City", "Dapitan City"].map((city) => (
        <button
          key={city}
          onClick={() => handleCitySelect(city)}
          className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-200 transition-colors duration-150"
        >
          {city}
        </button>
      ))}
    </div>
    <div className="py-1">
      <div className="px-3 py-2 text-xs font-semibold text-gray-600">SOCCSKSARGEN</div>
      {["General Santos City", "Koronadal City", "Tacurong City", "Kidapawan City"].map((city) => (
        <button
          key={city}
          onClick={() => handleCitySelect(city)}
          className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-200 transition-colors duration-150"
        >
          {city}
        </button>
      ))}
    </div>
    <div className="py-1">
      <div className="px-3 py-2 text-xs font-semibold text-gray-600">CARAGA Region</div>
      {["Butuan City", "Cabadbaran City", "Bayugan City", "Surigao City", "Tandag City", "Bislig City"].map((city) => (
        <button
          key={city}
          onClick={() => handleCitySelect(city)}
          className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-200 transition-colors duration-150"
        >
          {city}
        </button>
      ))}
    </div>
    <div className="py-1">
      <div className="px-3 py-2 text-xs font-semibold text-gray-600">BARMM</div>
      {["Cotabato City", "Marawi City"].map((city) => (
        <button
          key={city}
          onClick={() => handleCitySelect(city)}
          className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-200 transition-colors duration-150"
        >
          {city}
        </button>
      ))}
    </div>
  </div>
)}
          </div>
          {formErrors.city && <p className="text-red-500 text-sm mt-1">{formErrors.city}</p>}
        </div>

        <div className="flex flex-col flex-1">
          <label htmlFor="stateProvince" className="text-sm font-medium text-gray-700 mb-1">State/Province</label>
          <input
            id="stateProvince"
            name="stateProvince"
            value={billingInfo.stateProvince}
            readOnly
            className="w-full p-2 border border-gray-300 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Auto-filled based on city"
          />
        </div>
      </div>
                
                <div className="flex flex-col">
                  <label htmlFor="postalCode" className="text-sm font-medium text-gray-700 mb-1"></label>
                  <input 
                    id="postalCode"
                    name="postalCode" 
                    value={billingInfo.postalCode} 
                    onChange={handleInputChange} 
                    placeholder="Postal Code" 
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  {formErrors.postalCode && <p className="text-red-500 text-sm mt-1">{formErrors.postalCode}</p>}
                </div>
                
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-3 mt-4">Label as:</label>
                  <div className="flex gap-4">
                    <label className="inline-flex items-center cursor-pointer">
                      <span className="relative">
                        <input
                          type="radio"
                          name="deliveryAddress"
                          value="Home"
                          checked={billingInfo.deliveryAddress === 'Home'}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <span className="block w-6 h-6 bg-white border border-gray-300 rounded-full"></span>
                        <span className={`absolute inset-0 rounded-full ${billingInfo.deliveryAddress === 'Home' ? 'bg-orange-500' : ''} transition-all duration-200 ease-in-out`} style={{ transform: billingInfo.deliveryAddress === 'Home' ? 'scale(0.5)' : 'scale(0)', opacity: billingInfo.deliveryAddress === 'Home' ? '1' : '0' }}></span>
                      </span>
                      <span className="ml-2">Home</span>
                    </label>
                    <label className="inline-flex items-center cursor-pointer">
                      <span className="relative">
                        <input
                          type="radio"
                          name="deliveryAddress"
                          value="Work"
                          checked={billingInfo.deliveryAddress === 'Work'}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <span className="block w-6 h-6 bg-white border border-gray-300 rounded-full"></span>
                        <span className={`absolute inset-0 rounded-full ${billingInfo.deliveryAddress === 'Work' ? 'bg-orange-500' : ''} transition-all duration-200 ease-in-out`} style={{ transform: billingInfo.deliveryAddress === 'Work' ? 'scale(0.5)' : 'scale(0)', opacity: billingInfo.deliveryAddress === 'Work' ? '1' : '0' }}></span>
                      </span>
                      <span className="ml-2">Work</span>
                    </label>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">Payment Method</h2>
        <div className="space-y-4 md:space-y-0 md:flex md:items-center md:space-x-4">
          <label className="flex items-center cursor-pointer w-full md:w-auto">
            <span className="relative ml-20">
              <input
                type="radio"
                name="paymentMethod"
                value="GCash"
                checked={paymentMethod === 'GCash'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="sr-only"
              />
              <span className="block w-6 h-6 bg-white border border-gray-300 rounded-full"></span>
              <span className={`absolute inset-0 rounded-full ${paymentMethod === 'GCash' ? 'bg-orange-500' : ''} transition-all duration-200 ease-in-out`} style={{ transform: paymentMethod === 'GCash' ? 'scale(0.5)' : 'scale(0)', opacity: paymentMethod === 'GCash' ? '1' : '0' }}></span>
            </span>
            <Image
              src="/ImageLogo/Gcash.png"
              alt="GCash"
              width={60}
              height={25}
              className="ml-2 object-contain"
            />
          </label>
          <label className="flex items-center cursor-pointer w-full md:w-auto">
            <span className="relative ml-20">
              <input
                type="radio"
                name="paymentMethod"
                value="COD"
                checked={paymentMethod === 'COD'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="sr-only"
              />
              <span className="block w-6 h-6 bg-white border border-gray-300 rounded-full"></span>
              <span className={`absolute inset-0 rounded-full ${paymentMethod === 'COD' ? 'bg-orange-500' : ''} transition-all duration-200 ease-in-out`} style={{ transform: paymentMethod === 'COD' ? 'scale(0.5)' : 'scale(0)', opacity: paymentMethod === 'COD' ? '1' : '0' }}></span>
            </span>
            <Image
              src="/ImageLogo/COD.png"
              alt="Cash on Delivery"
              width={120}
              height={120}
              className="ml-2 object-contain"
            />
          </label>
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-1/2">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-orange-500 border-b pb-2">Your Order</h2>
            {cartItems.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center mb-4 pb-4 border-b">
                    <Image src={item.image_url} alt={item.name} width={64} height={64} className="object-cover rounded-md" />
                    <div className="ml-4 flex-grow">
                      <h3 className="font-bold text-gray-800">{item.name}</h3>
                      <p className="text-orange-600">₱ {Number(item.price).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center">
          <button 
            onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))} 
            className={`px-2 py-1 border rounded-l ${item.quantity > 1 ? 'bg-gray-200 hover:bg-gray-300' : 'bg-gray-100 text-gray-400 cursor-not-allowed'} transition`}
            disabled={item.quantity <= 1}
          >
            -
          </button>
          <span className="px-4 py-1 border-t border-b">
            {isNaN(item.quantity) ? 0 : item.quantity}
          </span>
          <button 
            onClick={() => handleQuantityChange(item.id, Math.min(item.quantity + 1, productStock[item.id] || 0))} 
            className={`px-2 py-1 border rounded-r ${item.quantity < (productStock[item.id] || 0) ? 'bg-gray-200 hover:bg-gray-300' : 'bg-gray-100 text-gray-400 cursor-not-allowed'} transition`}
            disabled={item.quantity >= (productStock[item.id] || 0)}
          >
            +
          </button>
        </div>
                    <button 
                      onClick={() => removeFromCart(item.id)} 
                      className="ml-4 text-red-500 hover:text-red-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-lg">You have not added any items to your cart yet.</p>
                <button 
                  onClick={() => router.push('/home')} 
                  className="mt-4 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition duration-300"
                >
                  Start Shopping
                </button>
              </div>
            )}
              
              {cartItems.length > 0 && (
                <>
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between"><span>Subtotal:</span><span>₱ {subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Delivery:</span><span>₱ {delivery.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                      <span>Total:</span><span className="text-orange-600">₱ {total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <button 
  onClick={() => {
    if (validateForm()) {
      setShowCheckoutReceipt(true);
    }
  }}
  disabled={isLoading}
  className={`w-full bg-orange-500 text-white py-3 rounded-lg mt-6 hover:bg-orange-600 transition duration-300 font-semibold text-lg flex items-center justify-center ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
>
  {isLoading ? (
    <>
      <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
      Processing...
    </>
  ) : (
    'Proceed Checkout'
  )}
</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {showAlert && <Alert onClose={() => setShowAlert(false)} orderId={orderId} orderPlaced={orderPlaced} />}      <GCashModal
        isOpen={showGCashModal}
        onClose={() => setShowGCashModal(false)}
        onConfirm={handleGCashPayment}
        amount={total}
      />
      <CheckoutReceipt
  isOpen={showCheckoutReceipt}
  onClose={() => setShowCheckoutReceipt(false)}
  cartItems={cartItems}
  billingInfo={billingInfo}
  paymentMethod={paymentMethod}
  subtotal={subtotal}
  delivery={delivery}
  total={total}
  onPlaceOrder={placeOrder}
  isLoading={isLoading}
/>
    </div>
  );
};

export default Cart;