import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Package, DollarSign, Wallet } from 'lucide-react';

const COLORS = ['#d4a574', '#9ca3af', '#f1f0ed', '#67645e'];

const data = [
  { name: 'Lipstick', value: 4500.45 },
  { name: 'Gloss', value: 2000 },
  { name: 'Liner', value: 1000 },
];

export const VisualPanel: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 4);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-full w-full bg-brand-primary text-white relative overflow-hidden flex flex-col">
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none z-10"></div>
      
      {/* Enhanced Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[20%] w-[140%] h-[140%] bg-gradient-to-br from-brand-accent/5 via-transparent to-transparent rounded-full blur-[100px] animate-blob-spin"></div>
        <div className="absolute top-[20%] -right-[10%] w-[600px] h-[600px] bg-brand-accent/10 rounded-full blur-[120px] animate-blob-float"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[700px] h-[700px] bg-[#4a4742] rounded-full blur-[100px] opacity-50 animate-blob-float-reverse"></div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-20 flex-1 flex flex-col p-8 lg:p-12 h-full">
        
        {/* Illustration Stage - Centered in available space */}
        <div className="flex-1 flex items-center justify-center min-h-0 py-4">
            <div className="relative w-full max-w-[420px] aspect-square lg:max-w-[480px]">
                
                {/* Card 1: Revenue (Back - Top Left) */}
                <div className="glass-card absolute top-0 left-0 w-64 p-4 rounded-2xl z-10 transform -rotate-6 animate-float-slow origin-bottom-right">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-xs font-semibold text-gray-200">Revenue Mix</h3>
                      <span className="text-[10px] text-gray-400">This Month</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                     <div className="h-20 w-20 relative flex items-center justify-center">
                       <PieChart width={80} height={80}>
                         <Pie
                           data={data}
                           innerRadius={25}
                           outerRadius={35}
                           paddingAngle={5}
                           dataKey="value"
                           stroke="none"
                         >
                           {data.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                         </Pie>
                       </PieChart>
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <DollarSign size={12} className="text-brand-accent" />
                       </div>
                     </div>
                     <div>
                        <div className="text-lg font-bold">$7,500.45</div>
                        <div className="text-[10px] text-brand-accent flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-accent"></span>
                          <span>Available</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">
                           <div>• Sales Goal</div>
                           <div>• Marketing</div>
                        </div>
                     </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
                     <span className="text-[10px] text-gray-400">Target Reached</span>
                     <span className="text-xs font-bold text-brand-accent">85%</span>
                  </div>
                </div>

                {/* Card 2: Orders (Middle - Right) */}
                <div className="glass-card absolute top-[25%] right-[-10px] lg:right-[-30px] w-72 p-5 rounded-2xl z-20 transform animate-float-medium">
                   <div className="flex justify-between items-center mb-4">
                     <h3 className="text-sm font-semibold">Recent Orders</h3>
                     <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-brand-accent">Live</span>
                   </div>

                   <div className="space-y-3">
                      <div className="flex justify-between items-center">
                         <div>
                            <div className="text-xs font-medium">Matte Lip Kit #204</div>
                            <div className="text-[10px] text-gray-400">Due: Apr 09, 2025</div>
                         </div>
                         <div className="text-right">
                            <div className="text-xs font-bold">$1,900</div>
                            <div className="text-[10px] text-green-400">Paid</div>
                         </div>
                      </div>
                      
                      <div className="w-full bg-gray-700/50 h-1.5 rounded-full overflow-hidden">
                         <div className="bg-brand-accent h-full w-[82%] rounded-full"></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400">
                         <span>Processing</span>
                         <span>82%</span>
                      </div>
                   </div>

                   <div className="mt-4 pt-3 border-t border-white/10 space-y-3 opacity-60">
                      <div className="flex justify-between items-center">
                         <div>
                            <div className="text-xs font-medium">Velvet Gloss #11</div>
                            <div className="text-[10px] text-gray-400">Apr 18, 2025</div>
                         </div>
                         <div className="text-xs font-bold">$420.00</div>
                      </div>
                      <div className="w-full bg-gray-700/50 h-1.5 rounded-full">
                         <div className="bg-brand-accent h-full w-[30%] rounded-full"></div>
                      </div>
                   </div>
                </div>

                {/* Card 3: Inventory (Front - Bottom Left) */}
                <div className="glass-card absolute bottom-[2%] left-[10px] w-64 p-5 rounded-2xl z-30 transform animate-float-fast">
                   <div className="flex justify-between items-center mb-4">
                     <h3 className="text-sm font-semibold">Inventory Status</h3>
                     <span className="text-[10px] text-gray-400 flex items-center gap-1">
                       <TrendingUp size={10} className="text-green-400" /> +12%
                     </span>
                   </div>

                   <div className="space-y-4">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                         <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-brand-accent/20 rounded text-brand-accent">
                              <Package size={14} />
                            </div>
                            <div>
                              <div className="text-xs font-medium">Silk Foundation</div>
                              <div className="text-[10px] text-gray-400">40 units</div>
                            </div>
                         </div>
                         <div className="text-right">
                            <div className="text-xs font-bold">$1,300</div>
                            <div className="text-[10px] text-green-400">+3.8%</div>
                         </div>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                         <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-gray-500/20 rounded text-gray-300">
                              <Wallet size={14} />
                            </div>
                            <div>
                              <div className="text-xs font-medium">Glow Serum</div>
                              <div className="text-[10px] text-gray-400">25 units</div>
                            </div>
                         </div>
                         <div className="text-right">
                            <div className="text-xs font-bold">$700</div>
                            <div className="text-[10px] text-red-400">-2.5%</div>
                         </div>
                      </div>

                      <button className="w-full py-2 bg-brand-primary border border-white/20 rounded-lg text-xs font-medium hover:bg-brand-accent hover:text-brand-primary transition-colors">
                         Review Inventory
                      </button>
                   </div>
                </div>

            </div>
        </div>

        {/* Text Content - Fixed Bottom */}
        <div className="mt-auto text-center shrink-0 relative z-30">
             <div className="mb-6 flex justify-center">
                <div className="w-12 h-12 bg-[#5d5a55] rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                    <span className="text-brand-accent font-bold text-2xl">M</span>
                </div>
             </div>

             <h2 className="text-2xl font-bold mb-3 tracking-wide">
               A Unified Hub for Smarter <br/>
               <span className="text-brand-accent">Beauty Intelligence</span>
             </h2>
             
             <p className="text-sm text-gray-300 max-w-md mx-auto mb-8 leading-relaxed opacity-80">
               Momoh Beauty empowers you with a unified command center—delivering deep insights and a 360° view of your entire economic world.
             </p>

             {/* Slider Indicators */}
             <div className="flex items-center justify-center gap-2 h-2">
               {[0, 1, 2, 3].map((index) => (
                 <div 
                   key={index}
                   onClick={() => setActiveSlide(index)}
                   className={`h-1.5 rounded-full cursor-pointer transition-all duration-500 ease-out ${
                     activeSlide === index ? 'w-12 bg-white' : 'w-12 bg-white/20 hover:bg-white/40'
                   }`}
                 ></div>
               ))}
            </div>
        </div>

      </div>

      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(-6deg); }
          50% { transform: translateY(-10px) rotate(-6deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-15px) translateX(5px); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-8px) translateX(-5px); }
        }
        @keyframes blob-spin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes blob-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes blob-float-reverse {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 50px) scale(1.2); }
          66% { transform: translate(20px, -20px) scale(0.8); }
        }
        
        .animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
        .animate-float-medium { animation: float-medium 5s ease-in-out infinite; }
        .animate-float-fast { animation: float-fast 7s ease-in-out infinite; }
        .animate-blob-spin { animation: blob-spin 20s linear infinite; }
        .animate-blob-float { animation: blob-float 15s ease-in-out infinite; }
        .animate-blob-float-reverse { animation: blob-float-reverse 18s ease-in-out infinite; }
      `}</style>
    </div>
  );
};