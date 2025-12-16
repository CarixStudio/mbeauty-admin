
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { 
  Smile, 
  Frown, 
  Meh, 
  ThumbsUp,
  ThumbsDown,
  Loader2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

export const SentimentAnalysisPage: React.FC = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
      overallScore: number;
      trend: any[];
      wordCloud: any[];
      recentFeedback: any[];
  }>({
      overallScore: 0,
      trend: [],
      wordCloud: [],
      recentFeedback: []
  });

  const getSentimentColor = (score: number) => {
    if (score >= 70) return 'text-green-500 dark:text-green-400';
    if (score >= 40) return 'text-amber-500 dark:text-amber-400';
    return 'text-red-500 dark:text-red-400';
  };

  const getSentimentBg = (score: number) => {
    if (score >= 70) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 40) return 'bg-amber-100 dark:bg-amber-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  useEffect(() => {
      fetchSentiment();
  }, []);

  const fetchSentiment = async () => {
      if (!supabase) return;
      setLoading(true);
      try {
          // Fetch raw reviews
          const { data: reviews, error } = await supabase
            .from('reviews')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

          if (error) throw error;

          if (!reviews || reviews.length === 0) {
              setLoading(false);
              return;
          }

          // 1. Calculate Overall Score (0-100) based on Rating (1-5)
          const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
          const avgRating = totalRating / reviews.length;
          const overallScore = Math.round(avgRating * 20);

          // 2. Trend (Group by day)
          const trendMap: Record<string, { pos: number, neg: number, total: number }> = {};
          reviews.forEach(r => {
              const date = new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              if (!trendMap[date]) trendMap[date] = { pos: 0, neg: 0, total: 0 };
              
              if (r.rating >= 4) trendMap[date].pos++;
              else if (r.rating <= 2) trendMap[date].neg++;
              trendMap[date].total++;
          });

          // Sort and normalize trend
          const trend = Object.entries(trendMap)
            .map(([date, counts]) => ({
                date,
                positive: Math.round((counts.pos / counts.total) * 100),
                negative: Math.round((counts.neg / counts.total) * 100)
            }))
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          // 3. Word Cloud (Simple Frequency)
          const allText = reviews.map(r => r.comment + ' ' + (r.title || '')).join(' ').toLowerCase();
          const words = allText.match(/\b(\w+)\b/g) || [];
          const stopWords = new Set(['the','and','is','a','to','of','in','it','for','with','on','my','this','was','but','very','so','are']);
          const freqMap: Record<string, number> = {};
          
          words.forEach(w => {
              if (w.length > 3 && !stopWords.has(w)) {
                  freqMap[w] = (freqMap[w] || 0) + 1;
              }
          });

          const wordCloud = Object.entries(freqMap)
            .sort((a,b) => b[1] - a[1])
            .slice(0, 15)
            .map(([text, value]) => ({
                text,
                value: value * 10, // Scale for UI
                sentiment: ['love','great','good','best','perfect','amazing'].includes(text) ? 'positive' : ['bad','worst','broken','hate','poor'].includes(text) ? 'negative' : 'neutral'
            }));

          // 4. Recent Feedback List
          const recentFeedback = reviews.slice(0, 6).map(r => ({
              id: r.review_id,
              text: r.comment,
              score: r.rating * 20,
              sentiment: r.rating >= 4 ? 'Positive' : r.rating <= 2 ? 'Negative' : 'Neutral',
              date: new Date(r.created_at).toLocaleDateString(),
              source: 'Review'
          }));

          setData({ overallScore, trend, wordCloud, recentFeedback });

      } catch (error: any) {
          console.error("Sentiment fetch error", error);
          addToast(error.message, 'error');
      } finally {
          setLoading(false);
      }
  };

  if (loading) {
      return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-accent w-fit flex items-center gap-2">
          <Smile size={24} className="text-brand-accent"/> Customer Sentiment AI
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">AI-powered analysis of reviews and support tickets.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Score */}
        <Card className="flex flex-col justify-center items-center p-8">
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* SVG Gauge */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="#f3f4f6"
                strokeWidth="8"
                fill="none"
                className="dark:stroke-gray-700"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke={data.overallScore >= 70 ? '#10b981' : data.overallScore >= 40 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8"
                fill="none"
                strokeDasharray="283" /* 2 * pi * 45 */
                strokeDashoffset={283 - (283 * data.overallScore) / 100}
                className="transition-all duration-1000 ease-out"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-5xl font-bold ${getSentimentColor(data.overallScore)}`}>{data.overallScore}</span>
              <span className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wider font-medium mt-1">Sentiment Score</span>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-300">
              Customers are mostly <span className={`font-bold ${getSentimentColor(data.overallScore)}`}>
                {data.overallScore >= 70 ? 'Happy' : data.overallScore >= 40 ? 'Neutral' : 'Unhappy'}
              </span> this period.
            </p>
          </div>
        </Card>

        {/* Word Cloud */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Key Topics & Keywords</CardTitle></CardHeader>
          <CardContent>
            {data.wordCloud.length > 0 ? (
                <div className="min-h-[250px] flex flex-wrap content-center justify-center gap-3 md:gap-4 p-2 md:p-4">
                {data.wordCloud.map((item, idx) => (
                    <span
                    key={idx}
                    className={`
                        inline-block transition-all hover:scale-110 cursor-default
                        ${item.sentiment === 'positive' ? 'text-green-600 dark:text-green-400' : item.sentiment === 'negative' ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}
                    `}
                    style={{ 
                        fontSize: `${Math.max(0.8, Math.min(2.5, item.value / 10))}rem`,
                        fontWeight: item.value > 20 ? 700 : 400,
                        opacity: Math.max(0.6, item.value / 50)
                    }}
                    >
                    {item.text}
                    </span>
                ))}
                </div>
            ) : (
                <div className="min-h-[250px] flex items-center justify-center text-gray-400">Not enough data for cloud.</div>
            )}
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-4 text-xs text-gray-400">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Positive</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-400"></div> Neutral</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Negative</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Trend */}
        <Card>
          <CardHeader><CardTitle>Sentiment Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px] w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend}>
                  <defs>
                    <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" strokeOpacity={0.2} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                  />
                  <Area type="monotone" dataKey="positive" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPos)" name="Positive %" />
                  <Area type="monotone" dataKey="negative" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorNeg)" name="Negative %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Analysis */}
        <Card>
          <CardHeader><CardTitle>Recent Feedback Analysis</CardTitle></CardHeader>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[350px] overflow-y-auto">
            {data.recentFeedback.map((item, i) => (
              <div key={i} className="p-4 flex gap-4 items-start hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-col sm:flex-row">
                <div className="flex items-center gap-3 sm:block">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${getSentimentBg(item.score)}`}>
                     {item.sentiment === 'Positive' ? <ThumbsUp size={14} className="text-green-700 dark:text-green-400"/> : item.sentiment === 'Negative' ? <ThumbsDown size={14} className="text-red-700 dark:text-red-400"/> : <Meh size={14} className="text-amber-700 dark:text-amber-400"/>}
                   </div>
                   <span className={`text-xs font-bold uppercase tracking-wider sm:hidden ${getSentimentColor(item.score)}`}>
                      {item.sentiment}
                   </span>
                </div>
                
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex justify-between items-start mb-1 hidden sm:flex">
                    <span className={`text-xs font-bold uppercase tracking-wider ${getSentimentColor(item.score)}`}>
                      {item.sentiment} ({item.score}%)
                    </span>
                    <span className="text-xs text-gray-400">{item.date}</span>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">"{item.text}"</p>
                  <div className="mt-2 flex items-center justify-between sm:justify-start gap-2">
                    <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 uppercase">{item.source}</span>
                    <span className="text-xs text-gray-400 sm:hidden">{item.date}</span>
                  </div>
                </div>
              </div>
            ))}
            {data.recentFeedback.length === 0 && <div className="p-8 text-center text-gray-500">No recent feedback data available.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
};
