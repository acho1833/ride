import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import EntityCardContentComponent from './entity-card-content.component';
import type { Entity } from '@/models/entity.model';

const baseEntity: Entity = { id: 'e1', labelNormalized: 'Alice', type: 'Person' };

describe('EntityCardContentComponent', () => {
  it('renders nothing when entity has no attributes', () => {
    const { container } = render(<EntityCardContentComponent entity={baseEntity} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when attributes is an empty object', () => {
    const { container } = render(<EntityCardContentComponent entity={{ ...baseEntity, attributes: {} }} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders a row for each attribute', () => {
    render(<EntityCardContentComponent entity={{ ...baseEntity, attributes: { dateOfBirth: '1985-03-12', nationality: 'US' } }} />);

    expect(screen.getByText('dateOfBirth:')).toBeInTheDocument();
    expect(screen.getByText('1985-03-12')).toBeInTheDocument();
    expect(screen.getByText('nationality:')).toBeInTheDocument();
    expect(screen.getByText('US')).toBeInTheDocument();
  });

  it('converts non-string attribute values to strings', () => {
    render(<EntityCardContentComponent entity={{ ...baseEntity, attributes: { count: 42, active: true } }} />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
  });
});
