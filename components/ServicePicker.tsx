'use client';

import { FREE_SERVICES, PAID_SERVICES, type ServiceCatalogItem } from '@/lib/catalog';

interface ServicePickerProps {
  selected: string[];
  onToggle: (id: string) => void;
}

function ServiceGroup({
  label,
  services,
  selected,
  onToggle,
}: {
  label: string;
  services: readonly ServiceCatalogItem[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <fieldset className="service-group">
      <legend className="service-group__legend">
        {label} <span className="service-group__count">({services.length})</span>
      </legend>
      <div className="service-group__items">
        {services.map((service) => (
          <label key={service.id} className="service">
            <input
              type="checkbox"
              name="selectedServiceIds"
              value={service.id}
              checked={selected.includes(service.id)}
              onChange={() => onToggle(service.id)}
            />
            <span>
              <span className="service__name">{service.name}</span>
              <span className="service__description">{service.description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ServicePicker({ selected, onToggle }: ServicePickerProps) {
  return (
    <div className="service-picker">
      <ServiceGroup
        label="Free tools"
        services={FREE_SERVICES}
        selected={selected}
        onToggle={onToggle}
      />
      <ServiceGroup
        label="Paid tools"
        services={PAID_SERVICES}
        selected={selected}
        onToggle={onToggle}
      />
    </div>
  );
}
