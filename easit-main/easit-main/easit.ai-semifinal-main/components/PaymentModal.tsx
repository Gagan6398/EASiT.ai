import React, { useState } from 'react';
import { X, Loader } from 'lucide-react';

interface PaymentModalProps {
    title: string;
    amount: number;
    onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ title, amount, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePayment = async () => {
        setLoading(true);
        setError(null);

        try {
            // Create order
            const orderResponse = await fetch('http://localhost:5000/api/payment/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: amount * 100, // Convert to paisa
                    description: `${title} Plan Subscription`,
                    email: localStorage.getItem('user-email') || 'user@example.com'
                })
            });

            if (!orderResponse.ok) {
                throw new Error('Failed to create order');
            }

            const orderData = await orderResponse.json();

            // Initialize Razorpay
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            document.body.appendChild(script);

            script.onload = () => {
                const options = {
                    key: 'rzp_test_S9ZPrV8qHrQSxp', // Your public key
                    amount: amount * 100,
                    currency: 'INR',
                    name: 'Easit.ai',
                    description: `${title} Plan`,
                    order_id: orderData.order_id,
                    handler: async (response: any) => {
                        try {
                            // Verify payment
                            const verifyResponse = await fetch('http://localhost:5000/api/payment/verify', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    payment_id: response.razorpay_payment_id,
                                    order_id: response.razorpay_order_id,
                                    signature: response.razorpay_signature,
                                    amount: amount * 100
                                })
                            });

                            if (verifyResponse.ok) {
                                alert('Payment successful! Your plan has been upgraded.');
                                onClose();
                            } else {
                                throw new Error('Payment verification failed');
                            }
                        } catch (err: any) {
                            setError(err.message || 'Payment verification failed');
                        }
                    },
                    prefill: {
                        email: localStorage.getItem('user-email') || '',
                        contact: localStorage.getItem('user-phone') || ''
                    },
                    theme: {
                        color: '#3B82F6'
                    }
                };

                const razorpay = new (window as any).Razorpay(options);
                razorpay.open();
            };
        } catch (err: any) {
            setError(err.message || 'Payment failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-deep-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-8 relative shadow-2xl">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold text-white mb-2">Upgrade to {title}</h2>
                <p className="text-gray-400 mb-6">Complete your payment to unlock premium features</p>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-300">Plan:</span>
                        <span className="text-white font-semibold">{title}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-white/10 pt-4">
                        <span className="text-gray-300 text-lg">Amount:</span>
                        <span className="text-white text-2xl font-bold">₹{amount}</span>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <button
                    onClick={handlePayment}
                    disabled={loading}
                    className="w-full bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                    {loading && <Loader size={20} className="animate-spin" />}
                    {loading ? 'Processing...' : 'Pay with Razorpay'}
                </button>

                <p className="text-gray-500 text-xs text-center mt-4">
                    Secure payment powered by Razorpay. Your payment is encrypted and secure.
                </p>
            </div>
        </div>
    );
};
