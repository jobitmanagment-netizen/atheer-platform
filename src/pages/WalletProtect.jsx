import React, { useState, useEffect } from 'react';
import { ccs } from '../api/ccsClient';
import { useTranslate } from '../lib/i18n';

export default function WalletProtect() {
  const { t } = useTranslate();
  const [whitelist, setWhitelist] = useState([]);
  const [limits, setLimits] = useState(null);
  const [tab, setTab] = useState('overview');
  const [newAddr, setNewAddr] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [dailyLimit, setDailyLimit] = useState(50000);
  const [txLimit, setTxLimit] = useState(10000);
  const [scanResult, setScanResult] = useState(null);

  useEffect(() => { loadWhitelist(); loadLimits(); }, []);
  const loadWhitelist = async () => {
    try { const { data } = await ccs.get('/api/wallet-protect/whitelist'); setWhitelist(data || []); } catch {}
  };
  const loadLimits = async () => {
    try { const { data } = await ccs.get('/api/wallet-protect/limits');
      if (data && data.dailyLimit) { setLimits(data); setDailyLimit(data.dailyLimit); setTxLimit(data.txLimit); }
    } catch {}
  };
  const addAddress = async () => {
    if (!newAddr.trim()) return;
    try { await ccs.post('/api/wallet-protect/whitelist', { address: newAddr, label: newLabel }); setNewAddr(''); setNewLabel(''); loadWhitelist(); } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };
  const removeAddress = async (id) => {
    try { await ccs.delete(`/api/wallet-protect/whitelist/${id}`); loadWhitelist(); } catch {}
  };
  const saveLimits = async () => {
    try { await ccs.post('/api/wallet-protect/limits', { daily: dailyLimit, tx: txLimit }); alert(t('walletProtect.saved', 'Limits saved')); } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };
  const generateCold = async () => {
    try { const { data } = await ccs.post('/api/wallet-protect/cold-wallet'); setScanResult(data); } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">{t('walletProtect.title', 'Wallet Protection')}</h1>
      <div className="flex gap-2 mb-6">
        {['overview', 'whitelist', 'limits', 'cold'].map(type => (
          <button key={type} onClick={() => setTab(type)} className={`px-6 py-2 rounded-lg font-medium ${tab === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{t(`walletProtect.${type}`, type)}</button>
        ))}
      </div>
      {tab === 'overview' && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">{whitelist.length}</div>
            <div className="text-sm text-gray-500">{t('walletProtect.whitelisted', 'Whitelisted Addresses')}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">{limits ? limits.remainingDaily?.toLocaleString() || '—' : '—'}</div>
            <div className="text-sm text-gray-500">{t('walletProtect.remainingDaily', 'Remaining Daily Limit')}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">{limits ? limits.totalBalance?.toFixed(2) || '0.00' : '—'}</div>
            <div className="text-sm text-gray-500">{t('walletProtect.totalBalance', 'Total Wallet Balance')}</div>
          </div>
          <div className="md:col-span-3 bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-3">{t('walletProtect.securityScore', 'Security Overview')}</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-green-50 rounded-lg flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500" /> {t('walletProtect.anomalyDetection', 'Anomaly Detection')}: {t('walletProtect.active', 'Active')}</div>
              <div className="p-3 bg-green-50 rounded-lg flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500" /> {t('walletProtect.withdrawLimits', 'Withdrawal Limits')}: {limits ? `${t('walletProtect.active', 'Active')} (${limits.dailyLimit} USDT/day)` : t('walletProtect.notSet', 'Not set')}</div>
              <div className={`p-3 rounded-lg flex items-center gap-2 ${whitelist.length > 0 ? 'bg-green-50' : 'bg-yellow-50'}`}><span className={`w-2 h-2 rounded-full ${whitelist.length > 0 ? 'bg-green-500' : 'bg-yellow-500'}`} /> {t('walletProtect.addressWhitelist', 'Address Whitelist')}: {whitelist.length > 0 ? `${whitelist.length} ${t('walletProtect.addresses', 'addresses')}` : t('walletProtect.notConfigured', 'Not configured')}</div>
              <div className="p-3 bg-yellow-50 rounded-lg flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500" /> {t('walletProtect.coldWallet', 'Cold Wallet')}: {t('walletProtect.notGenerated', 'Not generated')}</div>
            </div>
          </div>
        </div>
      )}
      {tab === 'whitelist' && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">{t('walletProtect.whitelistTitle', 'Address Whitelist')}</h2>
          <div className="flex gap-2 mb-6">
            <input value={newAddr} onChange={e => setNewAddr(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono" placeholder={t('walletProtect.addressPlaceholder', 'Wallet address')} />
            <input value={newLabel} onChange={e => setNewLabel(e.target.value)} className="w-40 border rounded-lg px-3 py-2 text-sm" placeholder={t('walletProtect.label', 'Label')} />
            <button onClick={addAddress} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{t('walletProtect.add', 'Add')}</button>
          </div>
          <div className="space-y-2">
            {whitelist.map(w => (
              <div key={w.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div><div className="font-mono text-sm">{w.address.slice(0, 20)}...{w.address.slice(-8)}</div><div className="text-xs text-gray-400">{w.label || t('walletProtect.trusted', 'Trusted')}</div></div>
                <button onClick={() => removeAddress(w.id)} className="text-red-500 hover:text-red-700 text-sm">{t('walletProtect.remove', 'Remove')}</button>
              </div>
            ))}
            {whitelist.length === 0 && <div className="text-center py-6 text-gray-400 text-sm">{t('walletProtect.noAddresses', 'No whitelisted addresses')}</div>}
          </div>
        </div>
      )}
      {tab === 'limits' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 max-w-md">
          <h2 className="text-lg font-semibold mb-4">{t('walletProtect.limitsTitle', 'Withdrawal Limits')}</h2>
          <div className="space-y-4">
            <div><label className="block text-sm text-gray-500 mb-1">{t('walletProtect.dailyLimit', 'Daily Limit (USDT)')}</label><input value={dailyLimit} onChange={e => setDailyLimit(e.target.value)} className="border rounded-lg px-3 py-2 w-full" type="number" /></div>
            <div><label className="block text-sm text-gray-500 mb-1">{t('walletProtect.txLimit', 'Per Transaction Limit (USDT)')}</label><input value={txLimit} onChange={e => setTxLimit(e.target.value)} className="border rounded-lg px-3 py-2 w-full" type="number" /></div>
            <button onClick={saveLimits} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('walletProtect.save', 'Save Limits')}</button>
          </div>
        </div>
      )}
      {tab === 'cold' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 max-w-lg">
          <h2 className="text-lg font-semibold mb-4">{t('walletProtect.coldTitle', 'Cold Wallet Generator')}</h2>
          <p className="text-sm text-gray-500 mb-4">{t('walletProtect.coldDesc', 'Generate a cold storage wallet with elliptic curve cryptography (secp256k1). Store the private key offline.')}</p>
          <button onClick={generateCold} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">{t('walletProtect.generate', 'Generate Cold Wallet')}</button>
          {scanResult && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium mb-1">{t('walletProtect.publicKey', 'Public Key')}:</div>
              <div className="text-xs font-mono bg-gray-100 p-2 rounded break-all">{scanResult.publicKey}</div>
              <div className="mt-2 text-yellow-600 text-sm font-medium">⚠ {t('walletProtect.storeOffline', 'Store your private key offline! This is the only time it is displayed.')}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
