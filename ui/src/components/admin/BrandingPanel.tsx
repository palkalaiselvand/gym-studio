import React, { useEffect, useState } from 'react';
import { ArrowLeft, ImageOff, Palette, Save, Upload } from 'lucide-react';
import { apiService } from '../../services/apiService';
import { COUNTRIES, applyBranding, formatMoney, useBranding } from '../../branding/branding';
import type { Branding, LicenseConfig } from '../../types';

interface BrandingPanelProps {
  onBack: () => void;
}

const MAX_LOGO_BYTES = 130 * 1024;

export const BrandingPanel: React.FC<BrandingPanelProps> = ({ onBack }) => {
  const { branding, setBranding } = useBranding();
  const [draft, setDraft] = useState<Branding>(branding);
  const [licenseDraft, setLicenseDraft] = useState<LicenseConfig | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingLicense, setIsSavingLicense] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const nextLicense = await apiService.getLicense();
        setLicenseDraft(nextLicense);
      } catch {
        setLicenseDraft(null);
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

  const saveLicense = async () => {
    if (!licenseDraft) return;
    setIsSavingLicense(true);
    try {
      const updated = await apiService.updateLicense(licenseDraft);
      setLicenseDraft(updated);
      setError('');
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'License settings could not be saved.');
    } finally {
      setIsSavingLicense(false);
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
      {saved && <div role="status" style={{ color: 'var(--accent-primary)', marginBottom: '0.75rem', fontWeight: 600 }}>Branding saved.</div>}

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

      {licenseDraft && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '1.5rem', paddingTop: '1.5rem', maxWidth: '720px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ marginBottom: '0.25rem' }}>License &amp; entitlement</h3>
              <p className="enrollment-muted">Customer deployment settings for supported tiers, feature access, and license expiry.</p>
            </div>
            <button type="button" className="btn-secondary-sm" onClick={saveLicense} disabled={isSavingLicense}>
              <Save size={14} /> {isSavingLicense ? 'Saving...' : 'Save license'}
            </button>
          </div>

          <div className="form-row">
            <label className="form-group">
              <span className="form-label">SKU</span>
              <select className="form-select" value={licenseDraft.sku} onChange={(event) => setLicenseDraft({ ...licenseDraft, sku: event.target.value as LicenseConfig['sku'] })}>
                <option value="STARTER">STARTER</option>
                <option value="GROWTH">GROWTH</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
            </label>
            <label className="form-group">
              <span className="form-label">Status</span>
              <select className="form-select" value={licenseDraft.status} onChange={(event) => setLicenseDraft({ ...licenseDraft, status: event.target.value as LicenseConfig['status'] })}>
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="grace-period">Grace period</option>
                <option value="expired">Expired</option>
              </select>
            </label>
          </div>

          <div className="form-row">
            <label className="form-group">
              <span className="form-label">Customer name</span>
              <input className="form-input" value={licenseDraft.customerName} onChange={(event) => setLicenseDraft({ ...licenseDraft, customerName: event.target.value })} />
            </label>
            <label className="form-group">
              <span className="form-label">Custom domain</span>
              <input className="form-input" value={licenseDraft.customDomain ?? ''} onChange={(event) => setLicenseDraft({ ...licenseDraft, customDomain: event.target.value || null })} placeholder="example.com" />
            </label>
          </div>

          <div className="form-row">
            <label className="form-group">
              <span className="form-label">Expires at</span>
              <input className="form-input" type="datetime-local" value={licenseDraft.expiresAt ? new Date(licenseDraft.expiresAt).toISOString().slice(0, 16) : ''} onChange={(event) => setLicenseDraft({ ...licenseDraft, expiresAt: event.target.value ? new Date(event.target.value).toISOString() : null })} />
            </label>
            <label className="form-group">
              <span className="form-label">Grace period (days)</span>
              <input className="form-input" type="number" min={0} max={30} value={licenseDraft.gracePeriodDays} onChange={(event) => setLicenseDraft({ ...licenseDraft, gracePeriodDays: Number(event.target.value) || 0 })} />
            </label>
          </div>

          <div className="form-row">
            <label className="form-group">
              <span className="form-label">Max studios</span>
              <input className="form-input" type="number" min={1} value={licenseDraft.maxStudios} onChange={(event) => setLicenseDraft({ ...licenseDraft, maxStudios: Number(event.target.value) || 1 })} />
            </label>
            <label className="form-group">
              <span className="form-label">Max members</span>
              <input className="form-input" type="number" min={1} value={licenseDraft.maxMembers} onChange={(event) => setLicenseDraft({ ...licenseDraft, maxMembers: Number(event.target.value) || 1 })} />
            </label>
          </div>

          <div className="form-group">
            <span className="form-label">Feature list</span>
            <textarea
              className="form-input"
              rows={4}
              value={licenseDraft.features.join(', ')}
              onChange={(event) => setLicenseDraft({ ...licenseDraft, features: event.target.value.split(',').map((feature) => feature.trim()).filter(Boolean) })}
            />
          </div>
        </div>
      )}
    </section>
  );
};
