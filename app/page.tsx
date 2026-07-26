import { ProposalForm } from '@/components/ProposalForm';

export default function Home() {
  return (
    <main className="page">
      <header className="page__header">
        <h1 className="page__title">Whaz Proposal Generator</h1>
        <p className="page__subtitle">
          Fill in the details below to generate a branded proposal PDF. Everything in the document
          comes from what you type or select — nothing is generated for you.
        </p>
      </header>
      <ProposalForm />
    </main>
  );
}
