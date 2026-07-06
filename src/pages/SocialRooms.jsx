import React, { useState, useEffect, useRef } from 'react';
import { ccs } from '../api/ccsClient';
import { useTranslate } from '../lib/i18n';

export default function SocialRooms() {
  const { t } = useTranslate();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [signals, setSignals] = useState([]);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('rooms');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', type: 'trading', max_members: 100 });
  const messagesEnd = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => { loadRooms(); loadSignals(); }, []);
  useEffect(() => { if (activeRoom) { loadMessages(); loadMembers(); connectWS(); } }, [activeRoom]);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const connectWS = () => {
    if (wsRef.current) wsRef.current.close();
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    ws.onmessage = e => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'room_message' && data.payload.roomId === activeRoom?.id) setMessages(prev => [...prev, data.payload]);
        if (data.type === 'new_signal') setSignals(prev => [data.payload, ...prev]);
      } catch {}
    };
    wsRef.current = ws;
    return () => ws.close();
  };

  const loadRooms = async () => { try { const { data } = await ccs.get('/api/social/rooms'); setRooms(data || []); } catch {} };
  const loadMessages = async () => { try { if (activeRoom) { const { data } = await ccs.get(`/api/social/rooms/${activeRoom.id}/messages`); setMessages(data || []); } } catch {} };
  const loadMembers = async () => { try { if (activeRoom) { const { data } = await ccs.get(`/api/social/rooms/${activeRoom.id}/members`); setMembers(data || []); } } catch {} };
  const loadSignals = async () => { try { const { data } = await ccs.get('/api/social/signals'); setSignals(data || []); } catch {} };

  const createRoom = async () => {
    try { await ccs.post('/api/social/rooms', form); setShowCreate(false); loadRooms(); } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };
  const joinRoom = async (id) => {
    try { await ccs.post(`/api/social/rooms/${id}/join`); loadRooms(); } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };
  const sendMsg = async () => {
    if (!msg.trim() || !activeRoom) return;
    try {
      const { data } = await ccs.post(`/api/social/rooms/${activeRoom.id}/messages`, { content: msg });
      if (data) setMessages(prev => [...prev, data]);
      setMsg('');
    } catch {}
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">{t('social.title', 'Social Trading')}</h1>
      <div className="flex gap-2 mb-6">
        {['rooms', 'signals'].map(type => (
          <button key={type} onClick={() => setTab(type)} className={`px-6 py-2 rounded-lg font-medium ${tab === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{t(`social.${type}`, type)}</button>
        ))}
        <button onClick={() => setShowCreate(!showCreate)} className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">{t('social.createRoom', 'Create Room')}</button>
      </div>
      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="border rounded-lg px-3 py-2 w-full mb-2 text-sm" placeholder={t('social.roomName', 'Room name')} />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="border rounded-lg px-3 py-2 w-full mb-2 text-sm" rows="2" placeholder={t('social.roomDesc', 'Description')} />
          <button onClick={createRoom} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{t('social.create', 'Create')}</button>
        </div>
      )}
      {tab === 'rooms' ? (
        <div className="flex gap-6">
          <div className="w-80 shrink-0 space-y-2">
            {rooms.map(r => (
              <div key={r.id} onClick={() => setActiveRoom(r)} className={`bg-white rounded-xl shadow-sm border p-3 cursor-pointer hover:shadow-md transition ${activeRoom?.id === r.id ? 'ring-2 ring-blue-500' : ''}`}>
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-gray-400">{r.type} · {r.member_count} members</div>
              </div>
            ))}
          </div>
          {activeRoom ? (
            <div className="flex-1 bg-white rounded-xl shadow-sm border flex flex-col h-[600px]">
              <div className="p-3 border-b flex justify-between items-center">
                <div><span className="font-semibold">{activeRoom.name}</span><span className="text-sm text-gray-400 ml-2">{members.length} members</span></div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map(m => (
                  <div key={m.id} className="p-2 rounded-lg bg-gray-50"><span className="font-medium text-sm">{m.userName}:</span><span className="text-sm ml-2">{m.content}</span></div>
                ))}
                <div ref={messagesEnd} />
              </div>
              <div className="p-3 border-t flex gap-2">
                <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()} className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder={t('social.typeMessage', 'Type a message...')} />
                <button onClick={sendMsg} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{t('social.send', 'Send')}</button>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-white rounded-xl shadow-sm border flex items-center justify-center text-gray-400">{t('social.selectRoom', 'Select a room to join the conversation')}</div>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {signals.map(s => (
            <div key={s.id} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex justify-between items-start mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.direction === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.direction}</span>
                <span className="text-xs text-gray-400">{s.hitRate || 0}% hit rate</span>
              </div>
              <div className="font-medium text-lg">{s.symbol}</div>
              <div className="text-sm text-gray-500 mb-2">{t('social.entry', 'Entry')}: {s.entry}{s.target ? ` | ${t('social.target', 'Target')}: ${s.target}` : ''}{s.stoploss ? ` | SL: ${s.stoploss}` : ''}</div>
              {s.analysis && <div className="text-xs text-gray-400">{s.analysis}</div>}
              <div className="text-xs text-gray-400 mt-2">{t('social.by', 'By')} {s.creator?.full_name || 'Trader'} · {t('social.confidence', 'Confidence')}: {s.confidence}%</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
