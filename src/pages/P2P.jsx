import React, { useState, useEffect } from 'react';
import { ccs } from '../api/ccsClient';
import { useTranslate } from '../lib/i18n';

export default function P2P() {
  const { t } = useTranslate();
  const [ads, setAds] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [tab, setTab] = useState('buy');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadAds(); loadOrders(); }, [tab]);
  const loadAds = async () => {
    setLoading(true);
    try { const { data } = await ccs.get('/api/p2p/advertisements', { params: { type: tab } }); setAds(data || []); } catch { }
    setLoading(false);
  };
  const loadOrders = async () => {
    try { const { data } = await ccs.get('/api/p2p/orders'); setMyOrders(data || []); } catch { }
  };
  const createOrder = async (ad) => {
    try {
      const { data } = await ccs.post('/api/p2p/orders', { adId: ad.id, amount: ad.min_amount });
      if (data?.id) loadOrders();
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">{t('p2p.title', 'P2P Trading')}</h1>
      <div className="flex gap-2 mb-6">
        {['buy', 'sell'].map(type => (
          <button key={type} onClick={() => setTab(type)} className={`px-6 py-2 rounded-lg font-medium ${tab === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{t(`p2p.${type}`, type)}</button>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h2 className="text-lg font-semibold mb-4">{tab === 'buy' ? t('p2p.advertisements', 'Advertisements') : t('p2p.advertisements', 'Advertisements')}</h2>
            {loading ? <div className="text-center py-8 text-gray-400">{t('common.loading', 'Loading...')}</div> : ads.length === 0 ? (
              <div className="text-center py-8 text-gray-400">{t('p2p.noAds', 'No advertisements available')}</div>
            ) : (
              <div className="space-y-3">
                {ads.map(ad => (
                  <div key={ad.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${ad.type === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{ad.type === 'buy' ? t('p2p.buy', 'Buy') : t('p2p.sell', 'Sell')}</span>
                          <span className="font-medium">{ad.currency}/{ad.fiat}</span>
                          <span className="text-sm text-gray-500">{ad.payment_methods ? JSON.parse(ad.payment_methods).join(', ') : ''}</span>
                        </div>
                        <div className="text-sm text-gray-500">{t('p2p.available', 'Available')}: {ad.remaining} {ad.currency}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-blue-600">{ad.price}</div>
                        <div className="text-xs text-gray-400">{t('p2p.perUnit', 'per unit')}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => createOrder(ad)} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{tab === 'buy' ? t('p2p.buyNow', 'Buy Now') : t('p2p.sellNow', 'Sell Now')}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h2 className="text-lg font-semibold mb-4">{t('p2p.myOrders', 'My Orders')}</h2>
            {myOrders.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">{t('p2p.noOrders', 'No active orders')}</div>
            ) : (
              <div className="space-y-2">
                {myOrders.map(order => (
                  <div key={order.id} className="border rounded-lg p-3 text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{order.currency}/{order.fiat}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : order.status === 'paid' ? 'bg-blue-100 text-blue-700' : order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{order.status}</span>
                    </div>
                    <div className="text-gray-500">{order.amount} {order.currency} @ {order.price}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
