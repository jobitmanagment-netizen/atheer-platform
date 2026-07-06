import { useState } from 'react';
import { Download, FileText, X, CheckCircle, Shield, Users, Activity, AlertTriangle, BarChart3, Zap } from 'lucide-react';
import { formatUSD } from '@/lib/ai-risk-engine';

// ── Helpers ──────────────────────────────────────────────
function toCSV(rows, headers) {
  const esc  = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = headers.map(h => esc(h.label)).join(',');
  const body = rows.map(r => headers.map(h => esc(r[h.key] ?? '')).join(',')).join('\n');
  return `\uFEFF${head}\n${body}`; // BOM → Arabic Excel
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── Report definitions ───────────────────────────────────
const REPORTS = [
  {
    id: 'swaps', icon: Activity, color: '#F0B90B',
    label: 'تقرير صفقات التحويل',
    desc:  'جميع الصفقات مع درجات المخاطر والمبالغ والحالة',
    csvHeaders: [
      { label: 'التاريخ',       key: '_date'       },
      { label: 'من عملة',       key: 'from_token'  },
      { label: 'إلى عملة',      key: 'to_token'    },
      { label: 'من شبكة',       key: 'from_chain'  },
      { label: 'إلى شبكة',      key: 'to_chain'    },
      { label: 'الكمية',        key: 'amount_in'   },
      { label: 'المبلغ USD',     key: '_amount_usd' },
      { label: 'الرسوم USD',     key: '_fee_usd'    },
      { label: 'الحالة',        key: 'status'      },
      { label: 'مستوى المخاطر', key: 'risk_level'  },
      { label: 'درجة المخاطر',  key: 'risk_score'  },
      { label: 'TX Hash',        key: 'tx_hash'     },
    ],
  },
  {
    id: 'trc20', icon: Zap, color: '#FF0013',
    label: 'تقرير USDT TRC20',
    desc:  'جميع تحويلات USDT-TRC20 وTRX على شبكة TRON',
    csvHeaders: [
      { label: 'التاريخ',       key: '_date'       },
      { label: 'من عملة',       key: 'from_token'  },
      { label: 'إلى عملة',      key: 'to_token'    },
      { label: 'الكمية',        key: 'amount_in'   },
      { label: 'المبلغ USD',     key: '_amount_usd' },
      { label: 'الرسوم USD',     key: '_fee_usd'    },
      { label: 'مستوى المخاطر', key: 'risk_level'  },
      { label: 'درجة المخاطر',  key: 'risk_score'  },
      { label: 'الحالة',        key: 'status'      },
      { label: 'TX Hash',        key: 'tx_hash'     },
    ],
  },
  {
    id: 'users', icon: Users, color: '#627EEA',
    label: 'تقرير المستخدمين',
    desc:  'جميع المستخدمين مع حالة KYC والحجم ودرجات المخاطر',
    csvHeaders: [
      { label: 'الاسم',         key: 'full_name'         },
      { label: 'حالة KYC',      key: 'kyc_status'        },
      { label: 'الدور',         key: 'role'              },
      { label: 'إجمالي الحجم',  key: '_volume'           },
      { label: 'عدد الصفقات',   key: 'swaps_count'       },
      { label: 'متوسط المخاطر', key: 'ai_risk_score_avg' },
      { label: 'تاريخ التسجيل', key: '_joined'           },
    ],
  },
  {
    id: 'audit', icon: Shield, color: '#03A66D',
    label: 'سجل المراجعة الكامل',
    desc:  'السجل الكامل لجميع الإجراءات على المنصة',
    csvHeaders: [
      { label: 'التاريخ',       key: '_date'       },
      { label: 'الإجراء',       key: 'action'      },
      { label: 'نوع الكيان',    key: 'entity_type' },
      { label: 'مستوى المخاطر', key: 'risk_level'  },
      { label: 'التفاصيل',      key: 'details'     },
    ],
  },
  {
    id: 'risk_summary', icon: AlertTriangle, color: '#CF304A',
    label: 'تقرير ملخص المخاطر',
    desc:  'الصفقات ذات المخاطر العالية والحرجة فقط',
    csvHeaders: [
      { label: 'التاريخ',       key: '_date'        },
      { label: 'من عملة',       key: 'from_token'   },
      { label: 'إلى عملة',      key: 'to_token'     },
      { label: 'المبلغ USD',     key: '_amount_usd'  },
      { label: 'مستوى المخاطر', key: 'risk_level'   },
      { label: 'درجة المخاطر',  key: 'risk_score'   },
      { label: 'أسباب المخاطر', key: 'risk_reasons' },
      { label: 'الحالة',        key: 'status'       },
    ],
  },
  {
    id: 'summary', icon: BarChart3, color: '#8247E5',
    label: 'الملخص التنفيذي',
    desc:  'ملخص شامل لأداء المنصة والإحصائيات الرئيسية',
    csvHeaders: [
      { label: 'المؤشر', key: 'metric' },
      { label: 'القيمة', key: 'value'  },
    ],
  },
];

// ── Data preparers ───────────────────────────────────────
function prepareData(reportId, { swaps, users, auditLogs }) {
  if (reportId === 'swaps') {
    return swaps.map(s => ({
      ...s,
      _date:       new Date(s.created_date).toLocaleString('ar'),
      _amount_usd: formatUSD(s.amount_in_usd || 0),
      _fee_usd:    formatUSD(s.fee_usd || 0),
    }));
  }
  if (reportId === 'trc20') {
    return swaps
      .filter(s => s.from_chain === 'TRON' || s.to_chain === 'TRON' || s.from_token === 'USDT-TRC20' || s.to_token === 'USDT-TRC20' || s.from_token === 'TRX' || s.to_token === 'TRX')
      .map(s => ({
        ...s,
        _date:       new Date(s.created_date).toLocaleString('ar'),
        _amount_usd: formatUSD(s.amount_in_usd || 0),
        _fee_usd:    formatUSD(s.fee_usd || 0),
      }));
  }
  if (reportId === 'users') {
    return users.map(u => ({
      ...u,
      _volume: formatUSD(u.total_volume_usd || 0),
      _joined: new Date(u.created_date).toLocaleDateString('ar'),
    }));
  }
  if (reportId === 'audit') {
    return auditLogs.map(l => ({ ...l, _date: new Date(l.created_date).toLocaleString('ar') }));
  }
  if (reportId === 'risk_summary') {
    return swaps.filter(s => s.risk_level === 'HIGH' || s.risk_level === 'CRITICAL').map(s => ({
      ...s,
      _date:       new Date(s.created_date).toLocaleString('ar'),
      _amount_usd: formatUSD(s.amount_in_usd || 0),
    }));
  }
  if (reportId === 'summary') {
    const totalVol   = swaps.reduce((a, b) => a + (b.amount_in_usd || 0), 0);
    const totalFees  = swaps.reduce((a, b) => a + (b.fee_usd || 0), 0);
    const avgRisk    = swaps.length ? (swaps.reduce((a, b) => a + (b.risk_score || 0), 0) / swaps.length).toFixed(1) : 0;
    const success    = swaps.length ? ((swaps.filter(s => s.status === 'completed').length / swaps.length) * 100).toFixed(1) : 0;
    const trc20Swaps = swaps.filter(s => s.from_chain === 'TRON' || s.to_chain === 'TRON' || s.from_token === 'USDT-TRC20' || s.to_token === 'USDT-TRC20');
    const trc20Vol   = trc20Swaps.reduce((a, b) => a + (b.amount_in_usd || 0), 0);
    return [
      { metric: 'تاريخ التقرير',             value: new Date().toLocaleString('ar') },
      { metric: 'إجمالي الصفقات',             value: swaps.length },
      { metric: 'إجمالي الحجم (USD)',          value: formatUSD(totalVol) },
      { metric: 'حجم USDT-TRC20 (USD)',        value: formatUSD(trc20Vol) },
      { metric: 'نسبة TRC20 من الحجم',        value: `${totalVol > 0 ? ((trc20Vol / totalVol) * 100).toFixed(1) : 0}%` },
      { metric: 'إجمالي الرسوم (USD)',         value: formatUSD(totalFees) },
      { metric: 'متوسط درجة المخاطر',          value: `${avgRisk}/100` },
      { metric: 'معدل نجاح الصفقات',           value: `${success}%` },
      { metric: 'صفقات عالية/حرجة المخاطر',   value: swaps.filter(s => s.risk_level === 'HIGH' || s.risk_level === 'CRITICAL').length },
      { metric: 'إجمالي المستخدمين',           value: users.length },
      { metric: 'مستخدمون KYC موثقون',         value: users.filter(u => u.kyc_status === 'verified').length },
      { metric: 'إجمالي سجلات المراجعة',       value: auditLogs.length },
    ];
  }
  return [];
}

// ── Component ─────────────────────────────────────────────
export default function ReportExporter({ swaps = [], users = [], auditLogs = [], onClose }) {
  const [exported, setExported] = useState(null);
  const flash = (key) => { setExported(key); setTimeout(() => setExported(null), 2500); };

  const handleCSV = (report) => {
    const data = prepareData(report.id, { swaps, users, auditLogs });
    if (!data.length) return;
    downloadBlob(toCSV(data, report.csvHeaders), `atheer_${report.id}_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    flash(report.id + '_csv');
  };

  const handleJSON = (report) => {
    const data = prepareData(report.id, { swaps, users, auditLogs });
    if (!data.length) return;
    downloadBlob(
      JSON.stringify({ report: report.label, exported_at: new Date().toISOString(), total: data.length, platform: 'ATHEER Global Platform', data }, null, 2),
      `atheer_${report.id}_${new Date().toISOString().slice(0, 10)}.json`,
      'application/json'
    );
    flash(report.id + '_json');
  };

  const totalVol    = swaps.reduce((a, b) => a + (b.amount_in_usd || 0), 0);
  const totalFees   = swaps.reduce((a, b) => a + (b.fee_usd || 0), 0);
  const trc20Count  = swaps.filter(s => s.from_chain === 'TRON' || s.to_chain === 'TRON' || s.from_token === 'USDT-TRC20' || s.to_token === 'USDT-TRC20').length;
  const highRiskCnt = swaps.filter(s => s.risk_level === 'HIGH' || s.risk_level === 'CRITICAL').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.88)' }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139', boxShadow: '0 30px 80px rgba(0,0,0,0.7)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #2B3139', background: '#151A1F' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(240,185,11,0.1)' }}>
              <Download className="w-4 h-4" style={{ color: '#F0B90B' }} />
            </div>
            <div>
              <h3 className="font-black text-sm" style={{ color: '#EAECEF' }}>تصدير التقارير</h3>
              <p className="text-xs" style={{ color: '#848E9C' }}>تنزيل بيانات المنصة — CSV / JSON مع دعم Excel العربي</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-80" style={{ color: '#848E9C', background: '#0B0E11', border: '1px solid #2B3139' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-4 text-center" style={{ borderBottom: '1px solid #2B3139', background: '#0D1117' }}>
          {[
            { label: 'الصفقات',        val: swaps.length,        color: '#F0B90B' },
            { label: 'TRC20',          val: trc20Count,           color: '#FF0013' },
            { label: 'الحجم الكلي',    val: formatUSD(totalVol),  color: '#03A66D' },
            { label: 'عالية المخاطر',  val: highRiskCnt,          color: '#CF304A' },
          ].map(s => (
            <div key={s.label} className="py-3">
              <div className="text-sm font-black" style={{ color: s.color }}>{s.val}</div>
              <div className="text-xs" style={{ color: '#3B4149' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Reports list */}
        <div className="p-4 space-y-2 max-h-[55vh] overflow-y-auto">
          {REPORTS.map(report => {
            const data    = prepareData(report.id, { swaps, users, auditLogs });
            const csvDone = exported === report.id + '_csv';
            const jsDone  = exported === report.id + '_json';
            return (
              <div key={report.id} className="flex items-center gap-3 p-4 rounded-xl"
                   style={{ background: '#0B0E11', border: `1px solid ${report.id === 'trc20' ? 'rgba(255,0,19,0.15)' : '#1A1F26'}` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${report.color}12` }}>
                  <report.icon className="w-4 h-4" style={{ color: report.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: '#EAECEF' }}>{report.label}</p>
                  <p className="text-xs" style={{ color: '#4B5563' }}>{report.desc}</p>
                  <p className="text-xs mt-0.5 font-bold" style={{ color: report.color }}>{data.length} سجل</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleCSV(report)} disabled={!data.length}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
                          style={{ background: csvDone ? 'rgba(3,166,109,0.12)' : `${report.color}10`, color: csvDone ? '#03A66D' : report.color, border: `1px solid ${csvDone ? 'rgba(3,166,109,0.25)' : `${report.color}25`}` }}>
                    {csvDone ? <CheckCircle className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                    CSV
                  </button>
                  <button onClick={() => handleJSON(report)} disabled={!data.length}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
                          style={{ background: jsDone ? 'rgba(3,166,109,0.12)' : 'rgba(98,126,234,0.08)', color: jsDone ? '#03A66D' : '#627EEA', border: `1px solid ${jsDone ? 'rgba(3,166,109,0.25)' : 'rgba(98,126,234,0.2)'}` }}>
                    {jsDone ? <CheckCircle className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                    JSON
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 flex items-center justify-between text-xs" style={{ borderTop: '1px solid #2B3139', background: '#0F1318' }}>
          <span style={{ color: '#3B4149' }}>صادر: {new Date().toLocaleString('ar')}</span>
          <span style={{ color: '#3B4149' }}>ATHEER Global Platform · ملفات CSV مع BOM لـ Excel العربي</span>
        </div>
      </div>
    </div>
  );
}