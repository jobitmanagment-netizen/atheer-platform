import React, { useState } from 'react';
import { ccs } from '../api/ccsClient';
import { useTranslate } from '../lib/i18n';

export default function AIAssistant() {
  const { t } = useTranslate();
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [analysis, setAnalysis] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [signals, setSignals] = useState([]);
  const [chatMsg, setChatMsg] = useState('');
  const [chat, setChat] = useState([]);
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState('');

  const analyze = async () => {
    setLoading('analysis');
    try { const { data } = await ccs.get(`/api/ai-assistant/analysis/${symbol}`); setAnalysis(data); } catch {}
    try { const { data } = await ccs.get(`/api/ai-assistant/predictions/${symbol}`); setPrediction(data); } catch {}
    setLoading('');
  };
  const loadSignals = async () => {
    setLoading('signals');
    try { const { data } = await ccs.get('/api/ai-assistant/signals'); setSignals(data.signals || []); } catch {}
    setLoading('');
  };
  const loadAdvice = async () => {
    setLoading('advice');
    try { const { data } = await ccs.get('/api/ai-assistant/portfolio-advice'); setAdvice(data); } catch {}
    setLoading('');
  };
  const sendChat = async () => {
    if (!chatMsg.trim()) return;
    setChat(prev => [...prev, { role: 'user', content: chatMsg }]);
    try {
      const { data } = await ccs.post('/api/ai-assistant/chat', { message: chatMsg, history: chat });
      setChat(prev => [...prev, { role: 'assistant', content: data.response || data.message || 'No response' }]);
    } catch { setChat(prev => [...prev, { role: 'assistant', content: 'Error getting response' }]); }
    setChatMsg('');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">{t('ai.title', 'AI Trading Assistant')}</h1>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h2 className="text-lg font-semibold mb-3">{t('ai.marketAnalysis', 'Market Analysis')}</h2>
            <div className="flex gap-2 mb-4">
              <input value={symbol} onChange={e => setSymbol(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="BTC/USDT" />
              <button onClick={analyze} disabled={loading === 'analysis'} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{loading === 'analysis' ? '...' : t('ai.analyze', 'Analyze')}</button>
            </div>
            {analysis && (
              <div className="space-y-2 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">{analysis.analysis}</div>
                {analysis.indicators && (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(analysis.indicators).map(([k, v]) => (
                      <div key={k} className="p-2 bg-gray-50 rounded-lg"><span className="font-medium capitalize">{k}:</span> {typeof v === 'number' ? v.toFixed(2) : v}</div>
                    ))}
                  </div>
                )}
                <div className={`px-3 py-1.5 rounded-lg text-sm font-medium inline-block ${analysis.signal === 'BUY' ? 'bg-green-100 text-green-700' : analysis.signal === 'SELL' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{analysis.signal}</div>
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h2 className="text-lg font-semibold mb-3">{t('ai.predictions', 'Price Predictions')}</h2>
            {prediction ? (
              <div className="space-y-2 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">{prediction.prediction?.analysis || prediction.prediction}</div>
                {prediction.prediction?.targets && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 bg-green-50 rounded-lg text-center"><div className="text-xs text-gray-500">{t('ai.support', 'Support')}</div><div className="font-medium">{prediction.prediction.targets.support?.toFixed(2) || '—'}</div></div>
                    <div className="p-2 bg-blue-50 rounded-lg text-center"><div className="text-xs text-gray-500">{t('ai.current', 'Current')}</div><div className="font-medium">{prediction.prediction.targets.current?.toFixed(2) || '—'}</div></div>
                    <div className="p-2 bg-red-50 rounded-lg text-center"><div className="text-xs text-gray-500">{t('ai.resistance', 'Resistance')}</div><div className="font-medium">{prediction.prediction.targets.resistance?.toFixed(2) || '—'}</div></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm">{t('ai.analyzeFirst', 'Analyze a market first')}</div>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h2 className="text-lg font-semibold mb-3">{t('ai.signals', 'AI Signals')}</h2>
            <button onClick={loadSignals} disabled={loading === 'signals'} className="mb-3 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">{loading === 'signals' ? '...' : t('ai.generate', 'Generate Signals')}</button>
            {signals.length > 0 && (
              <div className="space-y-2">
                {signals.map((s, i) => (
                  <div key={i} className="border rounded-lg p-3 text-sm">
                    <div className="flex justify-between"><span className="font-medium">{s.symbol}</span><span className={`px-2 py-0.5 rounded text-xs font-medium ${s.direction === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.direction}</span></div>
                    <div className="text-gray-500 mt-1">{s.reason}</div>
                    <div className="text-xs text-gray-400 mt-1">{t('ai.confidence', 'Confidence')}: {s.confidence}%</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h2 className="text-lg font-semibold mb-3">{t('ai.portfolioAdvice', 'Portfolio Advice')}</h2>
            <button onClick={loadAdvice} disabled={loading === 'advice'} className="mb-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">{loading === 'advice' ? '...' : t('ai.getAdvice', 'Get Advice')}</button>
            {advice && (
              <div className="space-y-2 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">{advice.advice}</div>
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-col h-96">
            <h2 className="text-lg font-semibold mb-3">{t('ai.chat', 'AI Chat')}</h2>
            <div className="flex-1 overflow-y-auto space-y-2 mb-3">
              {chat.map((m, i) => (
                <div key={i} className={`p-3 rounded-lg text-sm ${m.role === 'user' ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'}`}>{m.content}</div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder={t('ai.askQuestion', 'Ask about trading...')} />
              <button onClick={sendChat} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{t('ai.send', 'Send')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
