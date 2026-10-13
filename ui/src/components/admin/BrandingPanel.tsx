import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download, ImageOff, Palette, Save, Upload } from 'lucide-react';
import { apiService } from '../../services/apiService';
import { COUNTRIES, applyBranding, formatMoney, useBranding } from '../../branding/branding';
import type { Branding, LicenseConfig, SignedLicenseFile } from '../../types';

interface BrandingPanelProps {
  onBack: () => void;
  onLicenseUpdated: (license: LicenseConfig) => void;
}

const MAX_LOGO_BYTES = 130 * 1024;
const MAX_LICENSE_BYTES = 64 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSignedLicenseFile(value: unknown): value is SignedLicenseFile {
  if (!isRecord(value) || !isRecord(value.payload) || typeof value.signature !== 'string') return false;
  const payload = value.payload;
  return typeof payload.licenseId === 'string' &&
    typeof payload.customerName === 'string' &&
    (payload.sku === 'STARTER' || payload.sku === 'GROWTH' || payload.sku === 'ENTERPRISE') &&
    typeof payload.issuedAt === 'string' &&
    typeof payload.expiresAt === 'string' &&
    typeof payload.gracePeriodDays === 'number' &&
    typeof payload.maxStudios === 'number' &&
    typeof payload.maxMembers === 'number' &&
    Array.isArray(payload.features) &&
    payload.features.every((feature) => typeof feature === 'string') &&
    (typeof payload.customDomain === 'string' || payload.customDomain === null) &&
    (typeof payload.emailFrom === 'string' || payload.emailFrom === null);
}

export const BrandingPanel: React.FC<BrandingPanelProps> = ({ onBack, onLicenseUpdated }) => {
  const { branding, setBranding } = useBranding();
  const [draft, setDraft] = useState<Branding>(branding);
  const [licenseDraft, setLicenseDraft] = useState<LicenseConfig | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [licenseError, setLicenseError] = useState('');
  const [isImportingLicense, setIsImportingLicense] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const nextLicense = await apiService.getLicense();
        setLicenseDraft(nextLicense);
      } catch (loadError) {
        setLicenseDraft(null);
        setLicenseError(loadError instanceof Error ? loadError.message : 'License status could not be loaded.');
      }
    })();
  }, []);

  const update = (changes: Partial<Branding>) => {
    setDraft((current) => ({ ...current, ...changes }));
    setSaved(false);
  };

  const changeCountry = (code: string) => {
    const country = COUNTRIES.find((entry) => entry.code === code);
    if (country) update({ countryCode: country.code, currency: country.currency, locale: country.locale });
  };

  const chooseLogo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      setError('Logo must be a PNG, JPEG, WebP or SVG image.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError('Logo must be 130 KB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setError('');
      update({ logo: String(reader.result) });
    };
    reader.readAsDataURL(file);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const updated = await apiService.updateBranding(draft);
      setBranding(updated);
      setDraft(updated);
      setError('');
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Branding could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const importLicense = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_LICENSE_BYTES) {
      setLicenseError('License file must be 64 KB or smaller.');
      return;
    }

    setIsImportingLicense(true);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isSignedLicenseFile(parsed)) throw new Error('The selected file is not a signed license document.');
      const updated = await apiService.importLicense(parsed);
      setLicenseDraft(updated);
      onLicenseUpdated(updated);
      setLicenseError('');
      setSaved(true);
    } catch (importError) {
      setLicenseError(importError instanceof Error ? importError.message : 'Signed license could not be imported.');
    } finally {
      setIsImportingLicense(false);
    }
  };

  const downloadAdminFile = async (kind: 'export' | 'diagnostics') => {
    setIsDownloading(true);
    try {
      const blob = kind === 'export'
        ? await apiService.downloadCustomerExport()
        : await apiService.downloadSupportDiagnostics();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = kind === 'export' ? 'gym-studio-data-export.json' : 'gym-studio-support-diagnostics.json';
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Admin download could not be generated.');
    } finally {
      setIsDownloading(false);
    }
  };

  const onBackClick = () => {
    applyBranding(branding);
    onBack();
  };

  return (
    <section className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Palette size={20} /> Branding &amp; localization</h2>
          <p className="enrollment-muted">Changes apply to every screen, including sign-in and enrollment. Currency changes formatting only; existing prices are not converted.</p>
        </div>
        <button className="btn-secondary-sm" onClick={onBackClick}><ArrowLeft size={14} /> Back to directory</button>
      </div>

      {error && <div className="enrollment-error" role="alert">{error}</div>}
      {saved && <div role="status" style={{ color: 'var(--accent-primary)', marginBottom: '0.75rem', fontWeight: 600 }}>Configuration saved.</div>}

      <form onSubmit={save} className="login-form" style={{ maxWidth: '720px' }}>
        <div className="form-row">
          <label className="form-group"><span className="form-label">Studio name</span><input className="form-input" value={draft.name} onChange={(event) => update({ name: event.target.value })} minLength={2} maxLength={60} required /></label>
          <label className="form-group"><span className="form-label">Tagline</span><input className="form-input" value={draft.tagline} onChange={(event) => update({ tagline: event.target.value })} maxLength={80} /></label>
        </div>

        <div className="form-row">
          <label className="form-group">
            <span className="form-label">Country (sets currency and number format)</span>
            <select className="form-select" value={draft.countryCode} onChange={(event) => changeCountry(event.target.value)}>
              {COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.name} ({country.currency})</option>)}
            </select>
          </label>
          <label className="form-group">
            <span className="form-label">Primary color</span>
            <input
              type="color"
              className="form-input"
              style={{ height: '2.6rem', padding: '0.2rem' }}
              value={draft.primaryColor}
              onChange={(event) => { update({ primaryColor: event.target.value }); applyBranding({ ...draft, primaryColor: event.target.value }); }}
            />
          </label>
        </div>

        <div className="form-group">
          <span className="form-label">Logo (PNG, JPEG, WebP or SVG, up to 130 KB)</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="brand-logo-icon" style={{ overflow: 'hidden' }}>
              {draft.logo ? <img src={draft.logo} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <ImageOff size={20} />}
            </div>
            <label className="btn-secondary-sm" style={{ cursor: 'pointer' }}>
              <Upload size={14} /> Upload logo
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={chooseLogo} style={{ display: 'none' }} />
            </label>
            {draft.logo && <button type="button" className="btn-secondary-sm" onClick={() => update({ logo: null })}>Use default icon</button>}
          </div>
        </div>

        <p className="enrollment-muted">Preview: <strong>{draft.name}</strong> · {draft.tagline} · a $49 plan displays as {formatMoney(49, draft)}</p>

        <button className="btn-primary" type="submit" disabled={isSaving}><Save size={16} /><span>Save branding</span></button>
      </form>

      <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '1.5rem', paddingTop: '1.5rem', maxWidth: '720px' }}>
        <h3 style={{ marginBottom: '0.25rem' }}>License &amp; customer support</h3>
        <p className="enrollment-muted">Entitlements are verified offline using the vendor public key. Member access and safety-critical operations remain available if a license expires.</p>
        {licenseDraft ? (
          <div role="status" style={{ margin: '1rem 0' }}>
            <strong>{licenseDraft.status.replace('-', ' ').toUpperCase()}</strong>
            {' · '}{licenseDraft.sku}{' · '}{licenseDraft.customerName}
            {licenseDraft.expiresAt && ` · Expires ${new Date(licenseDraft.expiresAt).toLocaleDateString()}`}
          </div>
        ) : (
          <div className="enrollment-muted" role="status">License status unavailable.</div>
        )}
        {licenseError && <div className="enrollment-error" role="alert">{licenseError}</div>}
        <label className="btn-secondary-sm" style={{ cursor: 'pointer', display: 'inline-flex', margin: '0.5rem 0 1rem' }}>
          <Upload size={14} /> {isImportingLicense ? 'Verifying...' : 'Import signed license'}
          <input type="file" accept="application/json,.json" onChange={importLicense} disabled={isImportingLicense} style={{ display: 'none' }} />
        </label>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary-sm" onClick={() => void downloadAdminFile('diagnostics')} disabled={isDownloading}>
            <Download size={14} /> Download support diagnostics
          </button>
          <button type="button" className="btn-secondary-sm" onClick={() => void downloadAdminFile('export')} disabled={isDownloading}>
            <Download size={14} /> Export customer data
          </button>
        </div>
      </div>
    </section>
  );
};
