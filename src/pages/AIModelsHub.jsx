import { useState, useEffect } from 'react';
import { ccs } from '@/api/ccsClient';
import { logger } from '@/lib/logger';
import {
  Brain, Zap, RefreshCw, Network, Shield, Activity, Target, Globe, Lock, XCircle, Sparkles
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip
} from 'recharts';

// ── Icon map ────────────────────────────────────────────────────────────────────
const MODEL_ICONS = { Shield, Brain, Target, Network, Globe, Activity, Sparkles, Zap };

const UTILITY_TOOLS = [
  { name: 'AI Hash Verifier',          desc: 'Cryptographic integrity check using SHA-256 + AI anomaly detection',         icon: Lock,     color: '#F0B90B', link: '/security' },
  { name: 'Behavioral Profiler',       desc: 'Run AI behavioral analysis on any wallet address',                           icon: Brain,    color: '#627EEA', link: '/security' },
  { name: 'Risk Score API',            desc: 'Real-time transaction risk scoring via REST API (v5.1)',                     icon: Target,   color: '#CF304A', link: '/swap'     },
  { name: 'Threat Intelligence Feed',  desc: 'Aggregated IOC feed from ThreatFox, dark web monitors, and chain analytics', icon: Globe,    color: '#8247E5', link: '/alerts'   },
  { name: 'AML Compliance Engine',     desc: 'Automated AML checks against 5 global sanction databases',                  icon: Shield,   color: '#03A66D', link: '/admin'    },
  { name: 'Pattern Simulator',         desc: 'Test AI model responses against known attack patterns in sandbox mode',     icon: Activity, color: '#FF7A00', link: '/security' },
];

// ── Model Card ────────────────────────────────────────────────────────────────
function ModelCard({ model, onSelect }) {
  const Icon = model.icon;
  const statusConfig = {
    active:   { color: '#03A66D', label: '● ACTIVE',   bg: 'rgba(3,166,109,0.1)'   },
    training: { color: '#F0B90B', label: '⟳ TRAINING', bg: 'rgba(240,185,11,0.1)' },
    planned:  { color: '#627EEA', label: '◈ PLANNED',  bg: 'rgba(98,126,234,0.1)'  },
  }[model.status];

  return (
    <div className="rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.02]"
         style={{ background: '#1E2329', border: `1px solid ${model.color}30` }}
         onClick={() => onSelect(model)}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: `${model.color}18` }}>
            <Icon className="w-5 h-5" style={{ color: model.color }} />
          </div>
          <div>
            <div className="text-sm font-black" style={{ color: '#EAECEF' }}>{model.name}</div>
            <div className="text-xs" style={{ color: '#4B5563' }}>{model.type}</div>
          </div>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: statusConfig.bg, color: statusConfig.color }}>
          {statusConfig.label}
        </span>
      </div>

      <p className="text-xs leading-relaxed mb-4" style={{ color: '#848E9C' }}>{model.desc}</p>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Accuracy', value: model.accuracy ? `${model.accuracy}%` : 'Pending release' },
          { label: 'Latency',  value: model.latency },
          { label: 'Version',  value: `v${model.version.split('.')[0]}` },
        ].map(s => (
          <div key={s.label} className="text-center p-2 rounded-lg" style={{ background: '#0D1117' }}>
            <div className="text-sm font-black" style={{ color: model.color }}>{s.value}</div>
            <div className="text-xs" style={{ color: '#4B5563' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        {model.capabilities.map(c => (
          <span key={c} className="text-xs px-2 py-0.5 rounded-lg"
                style={{ background: `${model.color}10`, color: model.color, border: `1px solid ${model.color}20` }}>
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Model Detail Modal ────────────────────────────────────────────────────────
function ModelDetailModal({ model, onClose }) {
  const [querying, setQuerying] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [queryResult, setQueryResult] = useState('');
  const Icon = model.icon;

  const runQuery = async () => {
    if (!queryInput.trim()) return;
    setQuerying(true);
    try {
      const result = await ccs.integrations.Core.InvokeLLM({
        prompt: `You are the ${model.name} AI model on ATHEER Global DeFi Platform. A security analyst is querying you.

Model Type: ${model.type}
Capabilities: ${model.capabilities.join(', ')}
Training Data: ${model.trainingData}
Accuracy: ${model.accuracy ? model.accuracy + '%' : 'In training'}

Analyst Query: "${queryInput}"

Respond as this specific AI model would — technical, concise, and actionable. If asked to analyze something, provide a realistic AI model response with confidence scores and findings. 2-3 sentences max.`,
      });
      setQueryResult(typeof result === 'string' ? result : JSON.stringify(result));
    } catch (e) {
      setQueryResult('Query failed: ' + (e?.message || 'unknown error'));
    } finally {
      setQuerying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.92)' }}>
      <div className="w-full max-w-xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
           style={{ background: '#0D1117', border: `1px solid ${model.color}40` }}>
        <div className="px-5 py-4 flex items-center justify-between flex-shrink-0"
             style={{ background: '#1E2329', borderBottom: `1px solid ${model.color}30` }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${model.color}18` }}>
              <Icon className="w-4 h-4" style={{ color: model.color }} />
            </div>
            <div>
              <div className="text-sm font-black" style={{ color: '#EAECEF' }}>{model.name}</div>
              <div className="text-xs font-mono" style={{ color: model.color }}>{model.type} · v{model.version}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ color: '#848E9C' }}><XCircle className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {/* Radar */}
          {model.accuracy && (
            <div className="rounded-xl p-4" style={{ background: '#151A1F', border: '1px solid #2B3139' }}>
              <h4 className="text-xs font-bold mb-3" style={{ color: '#848E9C' }}>Performance Metrics</h4>
              <ResponsiveContainer width="100%" height={160}>
                <RadarChart data={model.metrics}>
                  <PolarGrid stroke="#2B3139" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#4B5563', fontSize: 8 }} />
                  <Radar dataKey="score" stroke={model.color} fill={model.color} fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Training trend */}
          {model.trend.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: '#151A1F', border: '1px solid #2B3139' }}>
              <h4 className="text-xs font-bold mb-3" style={{ color: '#848E9C' }}>Training Accuracy Curve</h4>
              <ResponsiveContainer width="100%" height={80}>
                <AreaChart data={model.trend} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={`mGrad${model.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={model.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={model.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="epoch" tick={{ fill: '#3B4149', fontSize: 8 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[70, 100]} tick={{ fill: '#3B4149', fontSize: 8 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#1E2329', border: '1px solid #2B3139', borderRadius: 8, fontSize: 10 }} />
                  <Area type="monotone" dataKey="acc" stroke={model.color} strokeWidth={2} fill={`url(#mGrad${model.id})`} name="Accuracy %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* AI Query interface */}
          {model.status !== 'planned' && (
            <div className="rounded-xl p-4" style={{ background: '#151A1F', border: `1px solid rgba(98,126,234,0.3)` }}>
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-3.5 h-3.5" style={{ color: '#627EEA' }} />
                <span className="text-xs font-bold" style={{ color: '#627EEA' }}>Query This Model</span>
              </div>
              <input value={queryInput} onChange={e => setQueryInput(e.target.value)}
                     placeholder={`Ask ${model.name} anything...`}
                     className="w-full px-3 py-2 rounded-lg text-xs outline-none mb-2"
                     style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' }}
                     onKeyDown={e => e.key === 'Enter' && runQuery()} />
              <button onClick={runQuery} disabled={querying || !queryInput.trim()}
                      className="w-full py-2 rounded-lg text-xs font-bold text-black transition-all disabled:opacity-50"
                      style={{ background: `linear-gradient(135deg, ${model.color}, ${model.color}CC)` }}>
                {querying ? <><RefreshCw className="w-3 h-3 inline animate-spin mr-1" />Processing...</> : 'Run Query'}
              </button>
              {queryResult && (
                <div className="mt-3 p-3 rounded-lg text-xs leading-relaxed" style={{ background: '#0B0E11', border: `1px solid ${model.color}30`, color: '#EAECEF' }}>
                  <span className="font-bold" style={{ color: model.color }}>{model.name}: </span>
                  {queryResult}
                </div>
              )}
            </div>
          )}

          {model.status === 'planned' && (
            <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(3,166,109,0.06)', border: '1px solid rgba(3,166,109,0.2)' }}>
              <Sparkles className="w-8 h-8 mx-auto mb-2" style={{ color: '#03A66D' }} />
              <div className="text-sm font-bold mb-1" style={{ color: '#03A66D' }}>Coming Q3 2026</div>
              <p className="text-xs" style={{ color: '#848E9C' }}>This model is in the research & planning phase. Training will begin with the next data pipeline update.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AIModelsHub() {
  const [models, setModels]       = useState([]);
  const [selected, setSelected]   = useState(null);
  const [activeTab, setActiveTab] = useState('models');

  useEffect(() => {
    ccs.request('/api/ai-models').then(res => {
      if (res?.models) setModels(res.models);
    }).catch(e => logger.warn('AIModels', 'Failed to load models', { error: e?.message }));
  }, []);

  const active   = models.filter(m => m.status === 'active').length;
  const training = models.filter(m => m.status === 'training').length;
  const avgAcc   = (models.filter(m => m.accuracy).reduce((s, m) => s + m.accuracy, 0) / models.filter(m => m.accuracy).length).toFixed(1);

  return (
    <div className="p-5 space-y-5" style={{ background: '#0B0E11', minHeight: '100vh' }}>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: 'rgba(3,166,109,0.12)', border: '1px solid rgba(3,166,109,0.25)' }}>
          <Brain className="w-5 h-5" style={{ color: '#03A66D' }} />
        </div>
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#EAECEF' }}>AI Models & Utilities</h1>
          <p className="text-xs" style={{ color: '#4B5563' }}>Future models · Active AI engines · Security utilities · Query interface</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Active Models',    value: active,   color: '#03A66D' },
          { label: 'In Training',      value: training, color: '#F0B90B' },
          { label: 'Avg Accuracy',     value: `${avgAcc}%`, color: '#627EEA' },
          { label: 'Total Models',     value: models.length, color: '#F0B90B' },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-4 text-center"
               style={{ background: '#1E2329', border: '1px solid #2B3139', borderTop: `2px solid ${c.color}` }}>
            <div className="text-2xl font-black" style={{ color: c.color }}>{c.value}</div>
            <div className="text-xs mt-0.5" style={{ color: '#848E9C' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#151A1F' }}>
        {['models', 'utilities'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
                  className="flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all"
                  style={{
                    background: activeTab === t ? '#1E2329' : 'transparent',
                    color: activeTab === t ? '#F0B90B' : '#848E9C',
                    border: activeTab === t ? '1px solid #2B3139' : '1px solid transparent',
                  }}>
            {t === 'models' ? '🤖 AI Models' : '🔧 Utilities'}
          </button>
        ))}
      </div>

      {activeTab === 'models' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {models.map(m => <ModelCard key={m.id} model={m} onSelect={setSelected} />)}
        </div>
      )}

      {activeTab === 'utilities' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {UTILITY_TOOLS.map(t => {
            const Icon = t.icon;
            return (
              <div key={t.name} className="rounded-2xl p-5 transition-all hover:scale-[1.02]"
                   style={{ background: '#1E2329', border: `1px solid ${t.color}30` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                       style={{ background: `${t.color}18` }}>
                    <Icon className="w-5 h-5" style={{ color: t.color }} />
                  </div>
                  <div className="text-sm font-black" style={{ color: '#EAECEF' }}>{t.name}</div>
                </div>
                <p className="text-xs leading-relaxed mb-4" style={{ color: '#848E9C' }}>{t.desc}</p>
                <a href={t.link}
                   className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                   style={{ background: `${t.color}15`, color: t.color, border: `1px solid ${t.color}30` }}>
                  <Zap className="w-3.5 h-3.5" />
                  Open Tool
                </a>
              </div>
            );
          })}
        </div>
      )}

      {selected && <ModelDetailModal model={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}