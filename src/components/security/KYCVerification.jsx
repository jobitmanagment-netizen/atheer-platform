import { useState } from 'react';
import { ccs } from '@/api/ccsClient';
import { Shield, Upload, User, FileText, MapPin, CheckCircle, XCircle, Loader2, ChevronRight, ChevronLeft, AlertTriangle, Fingerprint, Clock, X } from 'lucide-react';

const STEPS = [
  { id: 0, label: 'Personal', icon: User },
  { id: 1, label: 'Document', icon: FileText },
  { id: 2, label: 'Upload',   icon: Upload },
  { id: 3, label: 'Address',  icon: MapPin },
  { id: 4, label: 'Review',   icon: Shield },
];

const DOC_TYPES = [
  { value: 'passport',          label: 'Passport' },
  { value: 'national_id',       label: 'National ID' },
  { value: 'drivers_license',   label: "Driver's License" },
];

export default function KYCVerification({ userProfile, onClose }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Form data
  const [data, setData] = useState({
    full_name: userProfile?.full_name || '',
    date_of_birth: '',
    nationality: '',
    document_type: 'passport',
    document_number: '',
    document_front_url: '',
    document_back_url: '',
    selfie_url: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    phone_number: '',
  });

  const update = (field, value) => setData(d => ({ ...d, [field]: value }));

  // File upload helper
  const [uploadingField, setUploadingField] = useState(null);
  const handleUpload = async (field, file) => {
    if (!file) return;
    setUploadingField(field);
    try {
      const { file_url } = await ccs.integrations.Core.UploadFile({ file });
      update(field, file_url);
    } catch (e) {
      setError('Upload failed: ' + e.message);
    }
    setUploadingField(null);
  };

  const canProceed = () => {
    if (step === 0) return data.full_name && data.date_of_birth && data.nationality;
    if (step === 1) return data.document_type && data.document_number;
    if (step === 2) return data.document_front_url && data.selfie_url;
    if (step === 3) return data.address_line_1 && data.city && data.country;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await ccs.functions.invoke('submitKYC', data);
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setResult(d);
    } catch (e) {
      setError(e.message);
    }
    setSubmitting(false);
  };

  // ── Result Screen ────────────────────────────────────────
  if (result) {
    const isApproved = result.status === 'approved';
    const isReview = result.status === 'under_review';
    const color = isApproved ? '#03A66D' : isReview ? '#F0B90B' : '#CF304A';
    const Icon = isApproved ? CheckCircle : isReview ? Clock : XCircle;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.88)' }}>
        <div className="w-full max-w-md rounded-2xl p-6 text-center" style={{ background: '#1E2329', border: `1px solid ${color}40` }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${color}15` }}>
            <Icon className="w-8 h-8" style={{ color }} />
          </div>
          <h2 className="text-xl font-black mb-2" style={{ color }}>
            {isApproved ? 'KYC Verified!' : isReview ? 'Under Review' : 'KYC Rejected'}
          </h2>
          <p className="text-sm mb-4" style={{ color: '#848E9C' }}>{result.summary}</p>

          {/* AML Score */}
          <div className="rounded-xl p-4 mb-4" style={{ background: '#0B0E11', border: '1px solid #2B3139' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: '#848E9C' }}>AML Risk Score</span>
              <span className="text-lg font-black" style={{ color: result.aml_risk_score >= 60 ? '#CF304A' : result.aml_risk_score >= 40 ? '#F0B90B' : '#03A66D' }}>
                {result.aml_risk_score}/100
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#2B3139' }}>
              <div className="h-full rounded-full" style={{ width: `${result.aml_risk_score}%`, background: color }} />
            </div>
          </div>

          {/* AML Flags */}
          {result.aml_flags?.length > 0 && (
            <div className="rounded-xl p-3 mb-4 text-left" style={{ background: '#151A1F', border: '1px solid #2B3139' }}>
              <p className="text-xs font-bold mb-2" style={{ color: '#848E9C' }}>Risk Factors:</p>
              {result.aml_flags.map((flag, i) => (
                <div key={i} className="flex items-center gap-2 text-xs mb-1" style={{ color: '#CF304A' }}>
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  {flag}
                </div>
              ))}
            </div>
          )}

          <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-bold text-black gold-gradient">
            Done
          </button>
        </div>
      </div>
    );
  }

  // ── Loading overlay ───────────────────────────────────────
  if (submitting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.88)' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(98,126,234,0.12)' }}>
            <Fingerprint className="w-8 h-8 animate-pulse" style={{ color: '#627EEA' }} />
          </div>
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" style={{ color: '#627EEA' }} />
          <p className="text-sm font-bold" style={{ color: '#EAECEF' }}>AI Verifying Your Documents...</p>
          <p className="text-xs mt-1" style={{ color: '#848E9C' }}>Running AML screening and document authentication</p>
        </div>
      </div>
    );
  }

  const inputStyle = { background: '#0B0E11', border: '1px solid #2B3139', color: '#EAECEF' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.88)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: '#1E2329', border: '1px solid #2B3139' }}>
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #2B3139', background: '#151A1F' }}>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: '#627EEA' }} />
            <h3 className="text-base font-black" style={{ color: '#EAECEF' }}>Identity Verification (KYC/AML)</h3>
          </div>
          <button onClick={onClose} style={{ color: '#848E9C' }}><X className="w-5 h-5" /></button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center px-6 py-3" style={{ borderBottom: '1px solid #2B3139' }}>
          {STEPS.map((s, i) => {
            const StepIcon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                       style={{ background: isDone ? 'rgba(3,166,109,0.15)' : isActive ? 'rgba(98,126,234,0.15)' : '#0B0E11',
                                border: `2px solid ${isDone ? '#03A66D' : isActive ? '#627EEA' : '#2B3139'}`,
                                color: isDone ? '#03A66D' : isActive ? '#627EEA' : '#4B5563' }}>
                    {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : <StepIcon className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs font-medium" style={{ color: isActive ? '#EAECEF' : '#4B5563', fontSize: 9 }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 mx-1" style={{ background: isDone ? '#03A66D' : '#2B3139' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: 'rgba(207,48,74,0.08)', border: '1px solid rgba(207,48,74,0.25)' }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#CF304A' }} />
              <p className="text-xs" style={{ color: '#CF304A' }}>{error}</p>
            </div>
          )}

          {/* Step 0: Personal Info */}
          {step === 0 && (
            <>
              <Field label="Full Legal Name" value={data.full_name} onChange={v => update('full_name', v)} placeholder="John Doe" style={inputStyle} />
              <Field label="Date of Birth" type="date" value={data.date_of_birth} onChange={v => update('date_of_birth', v)} style={inputStyle} />
              <Field label="Nationality" value={data.nationality} onChange={v => update('nationality', v)} placeholder="e.g. Lebanese" style={inputStyle} />
              <Field label="Phone Number" value={data.phone_number} onChange={v => update('phone_number', v)} placeholder="+961..." style={inputStyle} />
            </>
          )}

          {/* Step 1: Document Info */}
          {step === 1 && (
            <>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#848E9C' }}>Document Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {DOC_TYPES.map(doc => (
                    <button key={doc.value} onClick={() => update('document_type', doc.value)}
                            className="py-2.5 rounded-xl text-xs font-bold transition-all"
                            style={{ background: data.document_type === doc.value ? 'rgba(98,126,234,0.12)' : '#0B0E11',
                                     color: data.document_type === doc.value ? '#627EEA' : '#848E9C',
                                     border: `1px solid ${data.document_type === doc.value ? 'rgba(98,126,234,0.3)' : '#2B3139'}` }}>
                      {doc.label}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Document Number" value={data.document_number} onChange={v => update('document_number', v)} placeholder="e.g. A12345678" style={inputStyle} />
              <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: '#151A1F', border: '1px solid #2B3139' }}>
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#F0B90B' }} />
                <p className="text-xs leading-relaxed" style={{ color: '#848E9C' }}>
                  Ensure the document is valid and not expired. AI will verify authenticity and cross-check your name.
                </p>
              </div>
            </>
          )}

          {/* Step 2: Upload Documents */}
          {step === 2 && (
            <>
              <UploadField label="Document Front" field="document_front_url" value={data.document_front_url} onUpload={handleUpload} uploading={uploadingField === 'document_front_url'} />
              <UploadField label="Document Back (optional)" field="document_back_url" value={data.document_back_url} onUpload={handleUpload} uploading={uploadingField === 'document_back_url'} />
              <UploadField label="Selfie (holding document)" field="selfie_url" value={data.selfie_url} onUpload={handleUpload} uploading={uploadingField === 'selfie_url'} />
            </>
          )}

          {/* Step 3: Address */}
          {step === 3 && (
            <>
              <Field label="Address Line 1" value={data.address_line_1} onChange={v => update('address_line_1', v)} placeholder="Street address" style={inputStyle} />
              <Field label="Address Line 2 (optional)" value={data.address_line_2} onChange={v => update('address_line_2', v)} placeholder="Apt, suite, etc." style={inputStyle} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="City" value={data.city} onChange={v => update('city', v)} placeholder="Beirut" style={inputStyle} />
                <Field label="State/Province" value={data.state} onChange={v => update('state', v)} placeholder="Beirut" style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Postal Code" value={data.postal_code} onChange={v => update('postal_code', v)} placeholder="1100" style={inputStyle} />
                <Field label="Country" value={data.country} onChange={v => update('country', v)} placeholder="Lebanon" style={inputStyle} />
              </div>
            </>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-2">
              <div className="rounded-xl p-3" style={{ background: '#151A1F', border: '1px solid #2B3139' }}>
                {[
                  ['Name', data.full_name], ['DOB', data.date_of_birth], ['Nationality', data.nationality],
                  ['Document', `${DOC_TYPES.find(d => d.value === data.document_type)?.label} — ${data.document_number}`],
                  ['Address', `${data.address_line_1}, ${data.city}, ${data.country}`],
                  ['Phone', data.phone_number],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1.5 text-xs" style={{ borderBottom: '1px solid #1A1F26' }}>
                    <span style={{ color: '#4B5563' }}>{label}</span>
                    <span className="font-semibold text-right" style={{ color: '#EAECEF' }}>{value || '—'}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: 'rgba(98,126,234,0.06)', border: '1px solid rgba(98,126,234,0.2)' }}>
                <Fingerprint className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#627EEA' }} />
                <p className="text-xs leading-relaxed" style={{ color: '#848E9C' }}>
                  AI will verify your documents, check name consistency, and perform AML screening. Results are typically instant.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid #2B3139', background: '#151A1F' }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={{ background: '#0B0E11', border: '1px solid #2B3139', color: '#848E9C' }}>
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => canProceed() && setStep(s => s + 1)} disabled={!canProceed()}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-30"
                    style={{ background: 'rgba(98,126,234,0.15)', color: '#627EEA', border: '1px solid rgba(98,126,234,0.3)' }}>
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-black gold-gradient">
              <Shield className="w-4 h-4" /> Submit for Verification
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helper Components ───────────────────────────────────────
function Field({ label, value, onChange, placeholder, type = 'text', style }) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#848E9C' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
             className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={style} />
    </div>
  );
}

function UploadField({ label, field, value, onUpload, uploading }) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#848E9C' }}>{label}</label>
      {value ? (
        <div className="flex items-center gap-2">
          <img src={value} alt={label} className="w-16 h-16 rounded-lg object-cover" style={{ border: '1px solid #2B3139' }} />
          <div className="flex-1">
            <p className="text-xs font-bold" style={{ color: '#03A66D' }}>✓ Uploaded</p>
            <p className="text-xs truncate" style={{ color: '#4B5563' }}>{value.split('/').pop()}</p>
          </div>
          <button onClick={() => onUpload(field, null)} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(207,48,74,0.1)', color: '#CF304A' }}>Replace</button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl cursor-pointer transition-all hover:opacity-80"
               style={{ background: '#0B0E11', border: '2px dashed #2B3139' }}>
          {uploading ? <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#627EEA' }} /> : <Upload className="w-6 h-6" style={{ color: '#4B5563' }} />}
          <span className="text-xs" style={{ color: '#848E9C' }}>{uploading ? 'Uploading...' : 'Click to upload'}</span>
          <input type="file" accept="image/*" className="hidden"
                 onChange={e => e.target.files[0] && onUpload(field, e.target.files[0])} />
        </label>
      )}
    </div>
  );
}