import React, { useState, useEffect } from 'react';
import { ccs } from '../api/ccsClient';
import { useTranslate } from '../lib/i18n';

export default function Marketplace() {
  const { t } = useTranslate();
  const [strategies, setStrategies] = useState([]);
  const [myStrategies, setMyStrategies] = useState({ created: [], subscribed: [] });
  const [tab, setTab] = useState('browse');
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ name: '', description: '', type: 'grid', code: '', price: 0, avg_monthly_return: 0, max_drawdown: 0, risk_level: 'medium' });

  useEffect(() => { loadStrategies(); if (tab === 'mine') loadMyStrategies(); }, [tab]);
  const loadStrategies = async () => {
    try { const { data } = await ccs.get('/api/marketplace/strategies', { params: { search: filter } }); setStrategies(data || []); } catch {}
  };
  const loadMyStrategies = async () => {
    try { const { data } = await ccs.get('/api/marketplace/user-strategies'); setMyStrategies(data || { created: [], subscribed: [] }); } catch {}
  };
  const createStrategy = async () => {
    try {
      await ccs.post('/api/marketplace/strategies', form);
      setShowCreate(false);
      loadStrategies();
      setForm({ name: '', description: '', type: 'grid', code: '', price: 0, avg_monthly_return: 0, max_drawdown: 0, risk_level: 'medium' });
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };
  const purchase = async (id) => {
    try { await ccs.post(`/api/marketplace/strategies/${id}/purchase`); alert(t('marketplace.purchased', 'Purchased!')); } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">{t('marketplace.title', 'Strategy Marketplace')}</h1>
      <div className="flex gap-2 mb-6 items-center">
        {['browse', 'mine'].map(type => (
          <button key={type} onClick={() => setTab(type)} className={`px-6 py-2 rounded-lg font-medium ${tab === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{t(`marketplace.${type}`, type)}</button>
        ))}
        <button onClick={() => setShowCreate(!showCreate)} className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">{t('marketplace.publish', 'Publish Strategy')}</button>
      </div>
      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">{t('marketplace.create', 'Create Strategy')}</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" placeholder={t('marketplace.name', 'Strategy name')} />
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
              <option value="grid">Grid Trading</option><option value="momentum">Momentum</option><option value="arbitrage">Arbitrage</option><option value="dca">DCA</option><option value="custom">Custom</option>
            </select>
            <select value={form.risk_level} onChange={e => setForm(f => ({ ...f, risk_level: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
              <option value="low">Low Risk</option><option value="medium">Medium Risk</option><option value="high">High Risk</option>
            </select>
            <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" type="number" step="0.01" placeholder={t('marketplace.price', 'Price (USDT)')} />
            <input value={form.avg_monthly_return} onChange={e => setForm(f => ({ ...f, avg_monthly_return: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" type="number" step="0.1" placeholder={t('marketplace.avgReturn', 'Avg monthly return %')} />
            <input value={form.max_drawdown} onChange={e => setForm(f => ({ ...f, max_drawdown: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" type="number" step="0.1" placeholder={t('marketplace.maxDrawdown', 'Max drawdown %')} />
          </div>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm w-full mb-4" rows="2" placeholder={t('marketplace.description', 'Description')} />
          <textarea value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm w-full mb-4 font-mono" rows="6" placeholder={t('marketplace.code', 'Strategy code (JavaScript)')} />
          <button onClick={createStrategy} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('marketplace.publish', 'Publish')}</button>
        </div>
      )}
      <div className="grid lg:grid-cols-3 gap-4">
        {(tab === 'browse' ? strategies : [...(myStrategies.subscribed || []), ...(myStrategies.created || [])]).map(s => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold">{s.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{s.type}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.risk_level === 'low' ? 'bg-green-100 text-green-700' : s.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{s.risk_level}</span>
            </div>
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{s.description}</p>
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div><span className="text-gray-400">{t('marketplace.return', 'Return')}:</span> <span className="font-medium text-green-600">+{s.avg_monthly_return}%</span></div>
              <div><span className="text-gray-400">{t('marketplace.drawdown', 'Drawdown')}:</span> <span className="font-medium text-red-600">{s.max_drawdown}%</span></div>
              <div><span className="text-gray-400">{t('marketplace.copies', 'Copies')}:</span> <span className="font-medium">{s.copies}</span></div>
              <div><span className="text-gray-400">{t('marketplace.rating', 'Rating')}:</span> <span className="font-medium">{s.rating ? s.rating.toFixed(1) : '—'}/5</span></div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-blue-600">{s.price > 0 ? `${s.price} USDT` : t('marketplace.free', 'Free')}</span>
              {tab === 'browse' && <button onClick={() => purchase(s.id)} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{s.price > 0 ? t('marketplace.purchase', 'Purchase') : t('marketplace.get', 'Get')}</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
