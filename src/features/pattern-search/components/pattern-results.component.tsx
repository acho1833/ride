'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import PatternMatchRowComponent from './pattern-match-row.component';
import type { PatternSearchResponse, PatternMatch } from '../types';

/**
 * Mock data for UI experimentation - uses real entity IDs from dummyData.json
 * Each match is a linear chain of entities connected by relationships.
 */
const MOCK_MATCHES: PatternMatch[] = [
  {
    entities: [
      { id: 'person-1', labelNormalized: 'Erick Doyle', type: 'Person' },
      { id: 'org-1', labelNormalized: 'Olson - Hane', type: 'Organization' },
      { id: 'person-2', labelNormalized: 'Wallace Rohan', type: 'Person' }
    ],
    relationships: [
      { relationshipId: 'r1', predicate: 'works_for', sourceEntityId: 'person-1', relatedEntityId: 'org-1' },
      { relationshipId: 'r2', predicate: 'employs', sourceEntityId: 'org-1', relatedEntityId: 'person-2' }
    ]
  },
  {
    entities: [
      { id: 'person-3', labelNormalized: 'Virgil Breitenberg', type: 'Person' },
      { id: 'org-2', labelNormalized: 'Dibbert - Dickinson', type: 'Organization' },
      { id: 'person-4', labelNormalized: 'Rodney Wintheiser', type: 'Person' },
      { id: 'org-3', labelNormalized: 'Gerhold - Schoen', type: 'Organization' }
    ],
    relationships: [
      { relationshipId: 'r3', predicate: 'works_for', sourceEntityId: 'person-3', relatedEntityId: 'org-2' },
      { relationshipId: 'r4', predicate: 'partners_with', sourceEntityId: 'org-2', relatedEntityId: 'person-4' },
      { relationshipId: 'r5', predicate: 'works_for', sourceEntityId: 'person-4', relatedEntityId: 'org-3' }
    ]
  },
  {
    entities: [
      { id: 'person-5', labelNormalized: 'Noah Hansen', type: 'Person' },
      { id: 'org-4', labelNormalized: 'Nolan, Nitzsche and Cruickshank', type: 'Organization' },
      { id: 'person-6', labelNormalized: 'Wm Schiller', type: 'Person' },
      { id: 'person-7', labelNormalized: 'Ramona Bailey', type: 'Person' },
      { id: 'org-5', labelNormalized: 'Hoeger LLC', type: 'Organization' }
    ],
    relationships: [
      { relationshipId: 'r6', predicate: 'works_for', sourceEntityId: 'person-5', relatedEntityId: 'org-4' },
      { relationshipId: 'r7', predicate: 'knows', sourceEntityId: 'org-4', relatedEntityId: 'person-6' },
      { relationshipId: 'r8', predicate: 'reports_to', sourceEntityId: 'person-6', relatedEntityId: 'person-7' },
      { relationshipId: 'r9', predicate: 'manages', sourceEntityId: 'person-7', relatedEntityId: 'org-5' }
    ]
  },
  {
    entities: [
      { id: 'person-8', labelNormalized: 'Leo Tremblay', type: 'Person' },
      { id: 'org-6', labelNormalized: 'Effertz, Gerhold and Morar', type: 'Organization' },
      { id: 'person-9', labelNormalized: 'Jesus Boyer', type: 'Person' }
    ],
    relationships: [
      { relationshipId: 'r10', predicate: 'works_for', sourceEntityId: 'person-8', relatedEntityId: 'org-6' },
      { relationshipId: 'r11', predicate: 'employs', sourceEntityId: 'org-6', relatedEntityId: 'person-9' }
    ]
  },
  {
    entities: [
      { id: 'person-10', labelNormalized: 'Juana Quitzon', type: 'Person' },
      { id: 'org-7', labelNormalized: 'Hirthe Group', type: 'Organization' },
      { id: 'person-11', labelNormalized: 'Clay Ward', type: 'Person' },
      { id: 'person-12', labelNormalized: 'Karla Stanton III', type: 'Person' }
    ],
    relationships: [
      { relationshipId: 'r12', predicate: 'works_for', sourceEntityId: 'person-10', relatedEntityId: 'org-7' },
      { relationshipId: 'r13', predicate: 'employs', sourceEntityId: 'org-7', relatedEntityId: 'person-11' },
      { relationshipId: 'r14', predicate: 'knows', sourceEntityId: 'person-11', relatedEntityId: 'person-12' }
    ]
  },
  {
    entities: [
      { id: 'person-13', labelNormalized: 'Leticia Cassin', type: 'Person' },
      { id: 'org-8', labelNormalized: 'Stroman - Schultz', type: 'Organization' },
      { id: 'person-14', labelNormalized: 'Kim Nader-Towne', type: 'Person' }
    ],
    relationships: [
      { relationshipId: 'r15', predicate: 'manages', sourceEntityId: 'person-13', relatedEntityId: 'org-8' },
      { relationshipId: 'r16', predicate: 'employs', sourceEntityId: 'org-8', relatedEntityId: 'person-14' }
    ]
  },
  {
    entities: [
      { id: 'person-15', labelNormalized: 'Misty Fahey', type: 'Person' },
      { id: 'org-9', labelNormalized: 'Strosin and Sons', type: 'Organization' },
      { id: 'person-16', labelNormalized: 'Jerry West', type: 'Person' },
      { id: 'person-17', labelNormalized: 'Monica Kuphal', type: 'Person' }
    ],
    relationships: [
      { relationshipId: 'r17', predicate: 'works_for', sourceEntityId: 'person-15', relatedEntityId: 'org-9' },
      { relationshipId: 'r18', predicate: 'employs', sourceEntityId: 'org-9', relatedEntityId: 'person-16' },
      { relationshipId: 'r19', predicate: 'collaborates_with', sourceEntityId: 'person-16', relatedEntityId: 'person-17' }
    ]
  },
  {
    entities: [
      { id: 'person-18', labelNormalized: 'Ms. Marian Runte', type: 'Person' },
      { id: 'org-10', labelNormalized: 'Lockman - Gislason', type: 'Organization' },
      { id: 'person-19', labelNormalized: 'Mr. Brendan Harvey', type: 'Person' },
      { id: 'org-11', labelNormalized: 'Kuhn - Rempel', type: 'Organization' },
      { id: 'person-20', labelNormalized: 'Daisy Murazik', type: 'Person' }
    ],
    relationships: [
      { relationshipId: 'r20', predicate: 'works_for', sourceEntityId: 'person-18', relatedEntityId: 'org-10' },
      { relationshipId: 'r21', predicate: 'collaborates_with', sourceEntityId: 'org-10', relatedEntityId: 'person-19' },
      { relationshipId: 'r22', predicate: 'works_for', sourceEntityId: 'person-19', relatedEntityId: 'org-11' },
      { relationshipId: 'r23', predicate: 'employs', sourceEntityId: 'org-11', relatedEntityId: 'person-20' }
    ]
  },
  {
    entities: [
      { id: 'person-21', labelNormalized: 'Greg Cassin', type: 'Person' },
      { id: 'org-12', labelNormalized: 'Hyatt - Roberts', type: 'Organization' },
      { id: 'person-22', labelNormalized: 'Jamie Collins', type: 'Person' }
    ],
    relationships: [
      { relationshipId: 'r24', predicate: 'works_for', sourceEntityId: 'person-21', relatedEntityId: 'org-12' },
      { relationshipId: 'r25', predicate: 'employs', sourceEntityId: 'org-12', relatedEntityId: 'person-22' }
    ]
  },
  {
    entities: [
      { id: 'person-23', labelNormalized: 'Taylor Smith', type: 'Person' },
      { id: 'org-13', labelNormalized: 'Anderson Inc', type: 'Organization' },
      { id: 'person-24', labelNormalized: 'Jordan Lee', type: 'Person' },
      { id: 'person-25', labelNormalized: 'Casey Brown', type: 'Person' }
    ],
    relationships: [
      { relationshipId: 'r26', predicate: 'works_for', sourceEntityId: 'person-23', relatedEntityId: 'org-13' },
      { relationshipId: 'r27', predicate: 'employs', sourceEntityId: 'org-13', relatedEntityId: 'person-24' },
      { relationshipId: 'r28', predicate: 'reports_to', sourceEntityId: 'person-24', relatedEntityId: 'person-25' }
    ]
  }
];

const MOCK_RESPONSE: PatternSearchResponse = {
  matches: MOCK_MATCHES,
  totalCount: 10,
  pageNumber: 1,
  pageSize: 50
};

interface Props {
  data: PatternSearchResponse | null;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

/**
 * Displays pattern search results with pagination.
 * Each result is a linear chain of matched entities.
 * Currently shows mock data for UI experimentation.
 */
const PatternResultsComponent = ({ data, isLoading, onPageChange }: Props) => {
  // Use mock data for now (for UI experimentation)
  const displayData = data ?? MOCK_RESPONSE;

  // Loading state
  if (isLoading) {
    return <div className="text-muted-foreground flex items-center justify-center py-8 text-sm">Searching...</div>;
  }

  // Calculate pagination
  const totalPages = Math.ceil(displayData.totalCount / displayData.pageSize);
  const hasPrev = displayData.pageNumber > 1;
  const hasNext = displayData.pageNumber < totalPages;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-y-2">
      {/* Header with count */}
      <div className="text-muted-foreground text-xs">Results ({displayData.totalCount} matches)</div>

      {/* Results list */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-y-2 pr-2">
          {displayData.matches.map((match, index) => (
            <PatternMatchRowComponent key={index} match={match} />
          ))}
        </div>
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Page {displayData.pageNumber} of {totalPages}
          </span>
          <div className="flex gap-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={!hasPrev}
              onClick={() => onPageChange(displayData.pageNumber - 1)}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={!hasNext}
              onClick={() => onPageChange(displayData.pageNumber + 1)}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatternResultsComponent;
