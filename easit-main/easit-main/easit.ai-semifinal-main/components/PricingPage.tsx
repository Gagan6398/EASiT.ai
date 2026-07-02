import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { FooterAssistant } from './FooterAssistant.tsx';
import { PaymentModal } from './PaymentModal.tsx';

export const PricingPage: React.FC = () => {
    const navigate = useNavigate();
    const [paymentModal, setPaymentModal] = useState<{ title: string; amount: number } | null>(null);

    return (
        <div className="bg-cream-bg text-text-dark font-sans min-h-screen flex flex-col">
            <header className="border-b border-gray-100 py-5 bg-cream-bg/90 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-6 flex items-center">
                    <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-text-dark transition flex items-center gap-2">
                        <ArrowLeft size={20} /> Back
                    </button>
                    <h1 className="ml-8 text-xl font-bold tracking-tight text-text-dark">Pricing</h1>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-6 py-20 max-w-5xl">
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold text-text-dark mb-6">Simple, fair pricing.</h2>
                    <p className="text-gray-600 text-lg">Choose the plan that fits your research needs.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20">
                    <PricingCard 
                        title="Free User" 
                        price="$0"
                        highlight 
                        buttonText="Get Started"
                        features={["25 Verified Searches/day", "Unlimited standard voice", "History syncing", "All persona settings", "Community support"]}
                        onSelect={() => navigate('/auth')}
                    />
                    <PricingCard 
                        title="Pro Account" 
                        price="$20"
                        priceInINR={1999}
                        buttonText="Upgrade Now"
                        features={["Unlimited Verified Searches", "Priority server access", "Custom persona templates", "API Access (Early)", "Direct support"]}
                        onSelect={() => setPaymentModal({ title: "Pro Account", amount: 1999 })}
                    />
                </div>
            </main>
            <FooterAssistant />
            {paymentModal && <PaymentModal title={paymentModal.title} amount={paymentModal.amount} onClose={() => setPaymentModal(null)} />}
        </div>
    );
};

const PricingCard = ({ title, price, features, highlight, buttonText, onSelect, priceInINR }: { title: string; price: string; features: string[]; highlight?: boolean; buttonText: string; onSelect: () => void; priceInINR?: number }) => (
    <div className={`p-10 rounded-3xl border flex flex-col h-full transition-all ${highlight ? 'border-[#CFA54D] bg-gold-gradient/5 shadow-[0_0_50px_rgba(59,130,246,0.1)]' : 'border-gray-100 bg-white shadow-sm hover:border-gray-200'}`}>
        <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-600 mb-2">{title}</h3>
            <div className="text-5xl font-bold text-text-dark tracking-tighter">{price}<span className="text-sm text-gray-500 font-normal">/mo</span></div>
            {priceInINR && <div className="text-sm text-gray-500 mt-1">₹{priceInINR}/month</div>}
        </div>
        <ul className="flex-1 space-y-4 mb-10">
            {features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                    <Check size={16} className="text-[#CFA54D]" />
                    {f}
                </li>
            ))}
        </ul>
        <button onClick={onSelect} className={`w-full py-4 rounded-full font-bold transition-all ${highlight ? 'bg-gold-gradient text-white hover:bg-gold-gradient/90' : 'bg-white text-black hover:bg-gray-200'}`}>
            {buttonText}
        </button>
    </div>
);
