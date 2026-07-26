'use client';

import { useState } from 'react';
import { proposalInputSchema, collectFieldErrors, type FieldErrors } from '@/lib/schema';
import { ServicePicker } from './ServicePicker';
import { FieldError } from './FieldError';

function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// The document's prose and structure are fixed (lib/copy.ts); only the recipient block and
// the service selection vary, so these are the only fields the rep fills in.
const EMPTY = {
  recipientName: '',
  recipientRoleLine1: '',
  recipientRoleLine2: '',
  clientCompany: '',
};

export function ProposalForm() {
  const [values, setValues] = useState(EMPTY);
  const [proposalDate, setProposalDate] = useState(today);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const set = (field: keyof typeof EMPTY) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((prev) => ({ ...prev, [field]: event.target.value }));

  const toggleService = (id: string) =>
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isGenerating) return;

    const payload = { ...values, proposalDate, selectedServiceIds };

    // Validate with the same schema the server uses, so messages never drift apart.
    // The server re-validates regardless — this is UX, not a trust boundary.
    const parsed = proposalInputSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(collectFieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const problem = await response.json().catch(() => null);
        setErrors(
          problem?.fields ?? {
            _form: problem?.message ?? "We couldn't generate the proposal. Please try again.",
          }
        );
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') ?? '';
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'proposal.pdf';

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErrors({ _form: 'Could not reach the server. Please check your connection and retry.' });
    } finally {
      // Always clear the indicator, including on every failure path.
      setIsGenerating(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="card grid">
        <label className="field field--wide">
          <span className="field__label">Recipient name</span>
          <input value={values.recipientName} onChange={set('recipientName')} maxLength={120} />
          <FieldError message={errors.recipientName} />
        </label>

        <label className="field">
          <span className="field__label">Role line 1</span>
          <input
            value={values.recipientRoleLine1}
            onChange={set('recipientRoleLine1')}
            maxLength={160}
            placeholder="Senior Advisor, The Omidyar Group"
          />
          <FieldError message={errors.recipientRoleLine1} />
        </label>

        <label className="field">
          <span className="field__label">
            Role line 2 <span className="field__optional">(optional)</span>
          </span>
          <input
            value={values.recipientRoleLine2}
            onChange={set('recipientRoleLine2')}
            maxLength={160}
            placeholder="Founding President &amp; CEO, Humanity United"
          />
          <FieldError message={errors.recipientRoleLine2} />
        </label>

        <label className="field">
          <span className="field__label">Client company</span>
          <input value={values.clientCompany} onChange={set('clientCompany')} maxLength={160} />
          <FieldError message={errors.clientCompany} />
          <span className="field__hint">Used for the download filename only.</span>
        </label>

        <label className="field">
          <span className="field__label">Proposal date</span>
          <input
            type="date"
            value={proposalDate}
            onChange={(e) => setProposalDate(e.target.value)}
          />
          <FieldError message={errors.proposalDate} />
        </label>
      </div>

      <section className="section">
        <h2 className="section__title">Services offered</h2>
        <ServicePicker selected={selectedServiceIds} onToggle={toggleService} />
        <FieldError message={errors.selectedServiceIds} />
      </section>

      <FieldError message={errors._form} />

      <div className="form__actions">
        <button type="submit" className="submit" disabled={isGenerating}>
          {isGenerating ? 'Generating proposal…' : 'Generate proposal PDF'}
        </button>

        {isGenerating && (
          <p className="pending" role="status">
            Building your branded PDF. This can take a few seconds on the first run.
          </p>
        )}
      </div>
    </form>
  );
}
