import type { ProposalInput } from './schema';
import { SERVICE_CATALOG, type ServiceCatalogItem } from './catalog';

/**
 * The template's input: a pure projection of validated rep input with every derived value
 * already resolved, so lib/template.ts stays a pure function and is trivially testable
 * (data-model.md §3).
 */
export interface ProposalViewModel {
  recipientName: string;
  /** Zero, one, or two bold role lines beneath the recipient's name. */
  recipientRoles: string[];
  services: ServiceCatalogItem[];
  hasServices: boolean;
}

export function toViewModel(input: ProposalInput): ProposalViewModel {
  const selected = new Set(input.selectedServiceIds);
  // Iterate the catalog rather than the input so services always appear in canonical
  // catalog order, never the order the rep happened to click them (FR-007).
  const services = SERVICE_CATALOG.filter((service) => selected.has(service.id));

  const recipientRoles = [input.recipientRoleLine1, input.recipientRoleLine2]
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return {
    recipientName: input.recipientName,
    recipientRoles,
    services,
    hasServices: services.length > 0,
  };
}
