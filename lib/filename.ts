/** Builds the download filename: `proposal-<client-company-slug>-<YYYY-MM-DD>.pdf`. */
export function buildFilename(clientCompany: string, proposalDate: string): string {
  const slug = clientCompany
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  // A company name of only non-alphanumeric characters would otherwise yield "proposal--date".
  return `proposal-${slug || 'client'}-${proposalDate}.pdf`;
}
