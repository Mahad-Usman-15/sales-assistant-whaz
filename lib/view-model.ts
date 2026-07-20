import { escapeHtmlWithBreaks } from './escape';
import type { ProposalInput } from './schema';
import { SERVICE_CATALOG, type ServiceCatalogItem } from './catalog';

/**
 * The template's input: a pure projection of validated rep input with every derived value
 * already resolved, so lib/template.ts stays a pure function and is trivially testable
 * (data-model.md §3).
 */
export interface ProposalViewModel {
  recipientName: string;
  clientCompany: string;
  proposalTitle: string;
  preparedBy: string;
  formattedDate: string;
  services: ServiceCatalogItem[];
  notesHtml: string;
  hasServices: boolean;
  hasNotes: boolean;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Formats YYYY-MM-DD as "19 July 2026".
 *
 * Hand-rolled rather than using toLocaleDateString: the output must not vary with the server's
 * locale or timezone, or identical input would produce differing PDFs (FR-007).
 */
function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function toViewModel(input: ProposalInput): ProposalViewModel {
  const selected = new Set(input.selectedServiceIds);
  // Iterate the catalog rather than the input so services always appear in canonical
  // catalog order, never the order the rep happened to click them (FR-007).
  const services = SERVICE_CATALOG.filter((service) => selected.has(service.id));

  const notes = input.notes.trim();

  return {
    recipientName: input.recipientName,
    clientCompany: input.clientCompany,
    proposalTitle: input.proposalTitle,
    preparedBy: input.preparedBy,
    formattedDate: formatDate(input.proposalDate),
    services,
    notesHtml: notes ? escapeHtmlWithBreaks(notes) : '',
    hasServices: services.length > 0,
    hasNotes: notes.length > 0,
  };
}
