'use client';

/**
 * Entity Icon Context
 *
 * Provides SVG symbol definitions for entity type icons and a ready state.
 * D3 graphs reference symbols via <use href="#entity-icon-EntityType" />.
 * In the future, icon config will be fetched from API before rendering.
 */

import { createContext, useContext, useState, ReactNode } from 'react';
import { ENTITY_ICON_CONFIG, DEFAULT_ENTITY_ICON } from '@/const';

interface EntityIconContextValue {
  isReady: boolean;
}

const EntityIconContext = createContext<EntityIconContextValue>({ isReady: true });

/** Hook to check if entity icon definitions are ready */
export const useEntityIconsReady = () => useContext(EntityIconContext).isReady;

interface Props {
  children: ReactNode;
}

/**
 * Provides entity icon definitions and ready state.
 * Renders hidden SVG symbols and signals when they're available.
 * When API fetching is added, change useState(true) to useState(false)
 * and call setIsReady(true) after the fetch completes.
 */
export const EntityIconProvider = ({ children }: Props) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isReady, setIsReady] = useState(true);

  return (
    <EntityIconContext.Provider value={{ isReady }}>
      {/* SVG symbol definitions for entity type icons */}
      <svg style={{ display: 'none' }}>
        <defs>
          {Object.entries(ENTITY_ICON_CONFIG).map(([entityType, { unicode }]) => (
            <symbol key={entityType} id={`entity-icon-${entityType}`} viewBox="-12 -12 24 24">
              <text x="0" y="0" fontFamily="remixicon" fontSize="16" textAnchor="middle" dominantBaseline="central" fill="currentColor">
                {String.fromCodePoint(parseInt(unicode, 16))}
              </text>
            </symbol>
          ))}
          {/* Default/unknown icon */}
          <symbol id="entity-icon-unknown" viewBox="-12 -12 24 24">
            <text x="0" y="0" fontFamily="remixicon" fontSize="16" textAnchor="middle" dominantBaseline="central" fill="currentColor">
              {String.fromCodePoint(parseInt(DEFAULT_ENTITY_ICON.unicode, 16))}
            </text>
          </symbol>
        </defs>
      </svg>
      {children}
    </EntityIconContext.Provider>
  );
};
