import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Clock } from 'lucide-react';
import { FooterAssistant } from './FooterAssistant.tsx';

export const PricingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-[#0f1115] text-gray-200 font-sans min-h-screen flex flex-col selection:bg-[#00F0FF] selection:text-black">
            <header className="border-b border-gray-800 py-5 bg-[#0a0b0e]/90 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-6 flex items-center">
                    <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white transition flex items-center gap-2">
                        <ArrowLeft size={20} /> Back
                    </button>
                    <h1 className="ml-8 text-xl font-bold tracking-tight text-white">Pricing</h1>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-6 py-20 max-w-5xl">
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Simple, fair pricing.</h2>
                    <p className="text-gray-400 text-lg">Choose the plan that fits your research needs.</p>
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
                        buttonText="Coming Soon"
                        comingSoon
                        features={["Unlimited Verified Searches", "Priority server access", "Custom persona templates", "API Access (Early)", "Direct support"]}
                        onSelect={() => {}}
                    />
                </div>
            </main>
            <FooterAssistant />
        </div>
    );
};

const PricingCard = ({ title, price, features, highlight, buttonText, onSelect, priceInINR, comingSoon }: { title: string; price: string; features: string[]; highlight?: boolean; buttonText: string; onSelect: () => void; priceInINR?: number; comingSoon?: boolean }) => (
    <div className={`p-10 rounded-3xl border flex flex-col h-full transition-all ${highlight ? 'border-[#00F0FF]/50 bg-[#00F0FF]/5 shadow-[0_0_30px_rgba(0,240,255,0.1)]' : 'border-gray-800 bg-[#12141a] shadow-sm hover:border-gray-600'}`}>
        <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-400 mb-2">{title}</h3>
            <div className="text-5xl font-bold text-white tracking-tighter">{price}<span className="text-sm text-gray-500 font-normal">/mo</span></div>
            {priceInINR && <div className="text-sm text-gray-500 mt-1">₹{priceInINR}/month</div>}
        </div>
        <ul className="flex-1 space-y-4 mb-10">
            {features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                    <Check size={16} className="text-[#00F0FF]" />
                    {f}
                </li>
            ))}
        </ul>
        <button 
            onClick={onSelect}
            className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                highlight 
                    ? 'bg-[#00F0FF] text-black shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.5)]' 
                    : 'bg-gray-800 text-white hover:bg-gray-700'
            } ${comingSoon ? 'opacity-75 cursor-not-allowed hover:bg-gray-800' : ''}`}
            disabled={comingSoon}
        >
            {comingSoon && <Clock size={18} />}
            {buttonText}
        </button>
    </div>
);
