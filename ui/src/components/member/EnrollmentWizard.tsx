import React, { useEffect, useMemo, useState } from 'react';
import { useBranding } from '../../branding/branding';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, CreditCard, Dumbbell, LoaderCircle, ShieldCheck } from 'lucide-react';
import { apiService } from '../../services/apiService';
import type { EnrollmentPlan, EnrollmentResult, EnrollmentSubmission, EnrollmentWaiver } from '../../types';

interface EnrollmentWizardProps {
  onClose: () => void;
  onCompleted: (result: EnrollmentResult) => void;
}

const screeningQuestions = [
  { key: 'heartCondition', question: 'Have you been diagnosed with a heart condition?' },
  { key: 'chestPain', question: 'Do you experience chest pain during physical activity?' },
  { key: 'medicalAdvice', question: 'Has a healthcare provider advised you to exercise only under medical supervision?' },
  { key: 'boneOrJointCondition', question: 'Do you have a bone or joint condition that exercise could worsen?' }
] as const;

type ResponseKey = typeof screeningQuestions[number]['key'];

const today = new Date().toISOString().slice(0, 10);

function calculateAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

function addOneMonth(dateText: string): string {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

export const EnrollmentWizard: React.FC<EnrollmentWizardProps> = ({ onClose, onCompleted }) => {
  const { branding, money } = useBranding();
  const [plans, setPlans] = useState<EnrollmentPlan[]>([]);
  const [waiver, setWaiver] = useState<EnrollmentWaiver | null>(null);
  const [step, setStep] = useState(0);
  const [planId, setPlanId] = useState<EnrollmentPlan['id']>('Gold');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [responses, setResponses] = useState<Record<ResponseKey, boolean | null>>({
    heartCondition: null,
    chestPain: null,
    medicalAdvice: null,
    boneOrJointCondition: null
  });
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [contractAccepted, setContractAccepted] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianSignature, setGuardianSignature] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<EnrollmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const invalidateContractSignature = () => {
    setContractAccepted(false);
    setSignerName('');
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiService.getEnrollmentPlans(), apiService.getEnrollmentWaiver()])
      .then(([loadedPlans, loadedWaiver]) => {
        if (cancelled) return;
        setPlans(loadedPlans);
        setWaiver(loadedWaiver);
        if (loadedPlans.length) {
          setPlanId((current) => loadedPlans.some((plan) => plan.id === current) ? current : loadedPlans[0].id);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Enrollment details could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const selectedPlan = plans.find((plan) => plan.id === planId);
  const age = calculateAge(dateOfBirth);
  const isMinor = age !== null && age < 18;
  const isFlagged = Object.values(responses).some((answer) => answer === true);
  const stepNames = ['Choose a plan', 'Your details', 'Health screening', 'Review & sign'];

  const canContinue = useMemo(() => {
    if (step === 0) return !!selectedPlan;
    if (step === 1) return name.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && phone.trim().length >= 7 && password.length >= 12 && password.length <= 128 && password === confirmPassword && !!dateOfBirth && !!startDate && age !== null && age >= 0 && age <= 120;
    if (step === 2) return Object.values(responses).every((answer) => answer !== null);
    return !!waiver && waiverAccepted && contractAccepted && signerName.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase() &&
      (!isMinor || (guardianName.trim().length >= 2 && guardianSignature.trim().toLocaleLowerCase() === guardianName.trim().toLocaleLowerCase()));
  }, [step, selectedPlan, name, email, phone, password, confirmPassword, dateOfBirth, startDate, age, responses, waiver, waiverAccepted, contractAccepted, signerName, isMinor, guardianName, guardianSignature]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (step < stepNames.length - 1) {
      setError('');
      setStep((current) => current + 1);
      return;
    }
    if (!canContinue) return;
    setIsSubmitting(true);
    setError('');
    const submission: EnrollmentSubmission = {
      name,
      email,
      phone,
      planId,
      startDate,
      dateOfBirth,
      password,
      channel: 'WEB',
      parqResponses: Object.fromEntries(Object.entries(responses).map(([key, value]) => [key, value === true])) as EnrollmentSubmission['parqResponses'],
      waiverAccepted,
      contractAccepted,
      signerName,
      ...(isMinor ? { guardianName, guardianSignature } : {})
    };
    try {
      const saved = await apiService.submitEnrollment(submission);
      setResult(saved);
      onCompleted(saved);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Enrollment could not be saved. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    return (
      <section className="enrollment-shell glass-panel" aria-live="polite">
        <div className="enrollment-success-icon"><CheckCircle2 size={34} /></div>
        <p className="enrollment-eyebrow">Enrollment saved</p>
        <h1>Thanks, {result.member.name}.</h1>
        <p className="enrollment-lead">Your {result.member.membership.tier} plan application is on file as <strong>Pending payment setup</strong>.</p>
        <div className="enrollment-notice"><AlertTriangle size={19} /><p>No payment was collected. Your membership remains inactive and studio access is disabled until payment setup and activation.</p></div>
        <div className="enrollment-notice"><ShieldCheck size={19} /><p>Your sign-in account is ready. A signed in-app pass will be available only after activation; Apple/Google Wallet issuance requires additional issuer credentials.</p></div>
        {result.identityReviewRequired && <div className="enrollment-notice enrollment-notice-warning"><AlertTriangle size={19} /><p>We found a possible duplicate based on matching name and phone. Staff must complete this duplicate review before activation.</p></div>}
        {result.member.healthScreening?.flagged && (
          <div className="enrollment-notice enrollment-notice-warning">
            <ShieldCheck size={19} />
            <p>Your screening indicates that physician clearance is recommended before high-intensity classes. Contact the studio to discuss next steps.</p>
          </div>
        )}
        <p className="enrollment-reference">Enrollment reference: <code>{result.enrollmentId}</code></p>
        <button className="btn-primary" onClick={onClose}>Return to studio</button>
      </section>
    );
  }

  return (
    <section className="enrollment-shell glass-panel">
      <div className="enrollment-heading">
        <div>
          <p className="enrollment-eyebrow">{branding.name} membership</p>
          <h1>Start your membership</h1>
          <p className="enrollment-lead">Choose a plan and complete the enrollment documents. No payment details are collected here.</p>
        </div>
        <button className="btn-secondary-sm" type="button" onClick={onClose}>Back to studio</button>
      </div>

      <ol className="enrollment-steps" aria-label="Enrollment progress">
        {stepNames.map((label, index) => (
          <li key={label} className={index === step ? 'current' : index < step ? 'complete' : ''} aria-current={index === step ? 'step' : undefined}>
            <span>{index < step ? <CheckCircle2 size={16} /> : index + 1}</span>{label}
          </li>
        ))}
      </ol>

      {error && <div className="enrollment-error" role="alert">{error}</div>}
      {isLoading ? (
        <p className="enrollment-loading"><LoaderCircle size={20} className="enrollment-spinner" /> Loading plans and enrollment documents…</p>
      ) : (
        <form onSubmit={submit} noValidate>
          {step === 0 && (
            <div className="enrollment-plan-grid">
              {plans.map((plan) => (
                <button key={plan.id} className={`enrollment-plan-card ${planId === plan.id ? 'selected' : ''}`} type="button" onClick={() => { invalidateContractSignature(); setPlanId(plan.id); }} aria-pressed={planId === plan.id}>
                  <span className="enrollment-plan-top"><Dumbbell size={19} /><strong>{plan.name}</strong></span>
                  <span className="enrollment-price">{money(plan.monthlyPrice)}<small> / month</small></span>
                  <span className="enrollment-plan-description">{plan.description}</span>
                  <span className="enrollment-plan-perks">{plan.perks.slice(0, 4).map((perk) => <span key={perk}>✓ {perk}</span>)}</span>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="enrollment-form-section">
              <h2>Your details</h2>
              <div className="form-row">
                <label className="form-group"><span className="form-label">Full name *</span><input className="form-input" autoComplete="name" value={name} onChange={(event) => { invalidateContractSignature(); setName(event.target.value); }} required /></label>
                <label className="form-group"><span className="form-label">Email address *</span><input className="form-input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
              </div>
              <div className="form-row">
                <label className="form-group"><span className="form-label">Phone number *</span><input className="form-input" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required /></label>
                <label className="form-group"><span className="form-label">Date of birth *</span><input className="form-input" type="date" max={today} value={dateOfBirth} onChange={(event) => { invalidateContractSignature(); setGuardianSignature(''); setDateOfBirth(event.target.value); }} required /></label>
              </div>
              <div className="form-row">
                <label className="form-group"><span className="form-label">Create password * (12+ characters)</span><input className="form-input" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
                <label className="form-group"><span className="form-label">Confirm password *</span><input className="form-input" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />{confirmPassword && password !== confirmPassword && <small className="enrollment-error">Passwords do not match.</small>}</label>
              </div>
              <label className="form-group enrollment-start-date"><span className="form-label">Requested membership start date *</span><input className="form-input" type="date" min={today} value={startDate} onChange={(event) => { invalidateContractSignature(); setStartDate(event.target.value); }} required /></label>
              {isMinor && (
                <div className="enrollment-guardian">
                  <h3>Parent / guardian co-signature required</h3>
                  <p>Members under 18 need a parent or guardian to co-sign before enrollment can be saved.</p>
                  <div className="form-row">
                    <label className="form-group"><span className="form-label">Parent / guardian full name *</span><input className="form-input" value={guardianName} onChange={(event) => { invalidateContractSignature(); setGuardianSignature(''); setGuardianName(event.target.value); }} required /></label>
                    <label className="form-group"><span className="form-label">Type guardian name to co-sign *</span><input className="form-input" value={guardianSignature} onChange={(event) => setGuardianSignature(event.target.value)} required /></label>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="enrollment-form-section">
              <h2>Health screening</h2>
              <p className="enrollment-muted">Please answer each question. Any “Yes” response will recommend physician clearance before high-intensity classes. Your individual answers are evaluated for this enrollment but are not retained; only the clearance flag is recorded.</p>
              <div className="enrollment-question-list">
                {screeningQuestions.map(({ key, question }) => (
                  <fieldset className="enrollment-question" key={key}>
                    <legend>{question}</legend>
                    <label><input type="radio" name={key} checked={responses[key] === true} onChange={() => setResponses((current) => ({ ...current, [key]: true }))} /> Yes</label>
                    <label><input type="radio" name={key} checked={responses[key] === false} onChange={() => setResponses((current) => ({ ...current, [key]: false }))} /> No</label>
                  </fieldset>
                ))}
              </div>
              {isFlagged && <div className="enrollment-notice enrollment-notice-warning"><AlertTriangle size={19} /><p>A “Yes” response recommends that you obtain physician clearance before high-intensity classes. You may still complete basic enrollment.</p></div>}
            </div>
          )}

          {step === 3 && (
            <div className="enrollment-form-section">
              <h2>Review and sign</h2>
              {selectedPlan && <div className="enrollment-summary"><strong>{selectedPlan.name} · {money(selectedPlan.monthlyPrice)}/month</strong><span>Requested start date: {startDate}</span><span>First membership period ends: {addOneMonth(startDate)}</span></div>}
              {waiver && (
                <div className="enrollment-document">
                  <div className="enrollment-document-heading"><ClipboardCheck size={18} /><strong>Sample activity waiver · {waiver.version}</strong></div>
                  <p>{waiver.text}</p>
                  {waiver.legalReviewRequired && <p className="enrollment-legal-note"><AlertTriangle size={16} /> Sample language only. Legal review is required before production use.</p>}
                </div>
              )}
              <label className="form-checkbox-label enrollment-checkbox"><input type="checkbox" checked={waiverAccepted} onChange={(event) => setWaiverAccepted(event.target.checked)} /> I have read and agree to the sample activity waiver.</label>
              <div className="enrollment-document">
                <div className="enrollment-document-heading"><ShieldCheck size={18} /><strong>Membership contract summary</strong></div>
                <p>You selected the {selectedPlan?.name} plan at {selectedPlan ? money(selectedPlan.monthlyPrice) : ""} per month, beginning {startDate}. This is a plan selection only. No payment method has been collected, no charge will be made, and your membership will remain pending until payment setup and studio activation are completed.</p>
              </div>
              <label className="form-checkbox-label enrollment-checkbox"><input type="checkbox" checked={contractAccepted} onChange={(event) => setContractAccepted(event.target.checked)} /> I have reviewed and accept this membership summary.</label>
              <label className="form-group"><span className="form-label">Type your full name as your signature *</span><input className="form-input" autoComplete="name" value={signerName} onChange={(event) => setSignerName(event.target.value)} required /><small className="enrollment-muted">Must match {name || 'your full name'}.</small></label>
            </div>
          )}

          <div className="enrollment-actions">
            {step > 0 ? <button className="btn-secondary" type="button" onClick={() => { setError(''); setStep((current) => current - 1); }}><ArrowLeft size={17} /> Back</button> : <span />}
            <button className="btn-primary" type="submit" disabled={!canContinue || isSubmitting || isLoading}>
              {isSubmitting ? <><LoaderCircle size={17} className="enrollment-spinner" /> Saving…</> : step === stepNames.length - 1 ? <><CreditCard size={17} /> Save enrollment — no payment</> : <>Continue <ArrowRight size={17} /></>}
            </button>
          </div>
        </form>
      )}
    </section>
  );
};
