'use client';

import { useMemo } from 'react';

import { useWorkspaceQuery } from '@/features/workspace/hooks/useWorkspaceQuery';

import DashboardAvgDegreeByTypeComponent from './dashboard-avg-degree-by-type.component';
import DashboardDegreeDistributionComponent from './dashboard-degree-distribution.component';
import DashboardDiverseEntitiesComponent from './dashboard-diverse-entities.component';
import DashboardEntityTypesComponent from './dashboard-entity-types.component';
import DashboardGraphComponentsComponent from './dashboard-graph-components.component';
import DashboardIsolatedComponent from './dashboard-isolated.component';
import DashboardKpiCardsComponent from './dashboard-kpi-cards.component';
import DashboardLeafComponent from './dashboard-leaf.component';
import DashboardMultiEdgeComponent from './dashboard-multi-edge.component';
import DashboardPredicateByTypeComponent from './dashboard-predicate-by-type.component';
import DashboardPredicateExclusivityComponent from './dashboard-predicate-exclusivity.component';
import DashboardPredicatesComponent from './dashboard-predicates.component';
import DashboardReciprocalPairsComponent from './dashboard-reciprocal-pairs.component';
import DashboardRelationshipPathsComponent from './dashboard-relationship-paths.component';
import DashboardTopHubsComponent from './dashboard-top-hubs.component';
import DashboardTypeMatrixComponent from './dashboard-type-matrix.component';

import {
  computeAvgDegreeByType,
  computeDegreeDistribution,
  computeDiverseEntities,
  computeEntityTypeDistribution,
  computeGraphComponents,
  computeIsolatedEntities,
  computeKpiStats,
  computeLeafEntities,
  computeMultiEdgePairs,
  computePredicateByType,
  computePredicateDistribution,
  computePredicateExclusivity,
  computeReciprocalPairs,
  computeRelationshipPaths,
  computeTopHubs,
  computeTypeMatrix
} from '../utils/dashboard.utils';

interface Props {
  workspaceId: string;
  workspaceName: string;
}

const DashboardComponent = ({ workspaceId }: Props) => {
  const { data: workspace, isPending, isError } = useWorkspaceQuery(workspaceId);

  const analytics = useMemo(() => {
    if (!workspace) return null;
    const { entityList, relationshipList } = workspace;

    return {
      kpiStats: computeKpiStats(entityList, relationshipList),
      entityTypes: computeEntityTypeDistribution(entityList),
      predicates: computePredicateDistribution(relationshipList),
      typeMatrix: computeTypeMatrix(entityList, relationshipList),
      topHubs: computeTopHubs(entityList, relationshipList),
      degreeDistribution: computeDegreeDistribution(entityList, relationshipList),
      relationshipPaths: computeRelationshipPaths(entityList, relationshipList),
      predicateByType: computePredicateByType(entityList, relationshipList),
      multiEdgePairs: computeMultiEdgePairs(entityList, relationshipList),
      avgDegreeByType: computeAvgDegreeByType(entityList, relationshipList),
      diverseEntities: computeDiverseEntities(entityList, relationshipList),
      graphComponents: computeGraphComponents(entityList, relationshipList),
      predicateExclusivity: computePredicateExclusivity(entityList, relationshipList),
      reciprocalPairs: computeReciprocalPairs(entityList, relationshipList),
      isolatedEntities: computeIsolatedEntities(entityList, relationshipList),
      leafEntities: computeLeafEntities(entityList, relationshipList)
    };
  }, [workspace]);

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-muted-foreground">Loading dashboard...</span>
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-destructive">Failed to load dashboard</span>
      </div>
    );
  }

  // Compute median and max degree from bucket data
  const degreeBuckets = analytics.degreeDistribution;
  const maxDegree = analytics.topHubs[0]?.degree ?? 0;
  const totalForMedian = degreeBuckets.reduce((sum, b) => sum + b.count, 0);
  let medianDegree = 0;
  let cumulative = 0;
  for (const bucket of degreeBuckets) {
    cumulative += bucket.count;
    if (cumulative >= totalForMedian / 2) {
      medianDegree = bucket.min;
      break;
    }
  }

  return (
    <div className="space-y-4 p-4">
      {/* KPI Cards - full width */}
      <DashboardKpiCardsComponent stats={analytics.kpiStats} />

      {/* 2-column grid */}
      <div className="grid grid-cols-2 gap-4">
        <DashboardEntityTypesComponent data={analytics.entityTypes} />
        <DashboardPredicatesComponent data={analytics.predicates} />

        <DashboardTypeMatrixComponent data={analytics.typeMatrix} />
        <DashboardTopHubsComponent data={analytics.topHubs} />

        <DashboardRelationshipPathsComponent data={analytics.relationshipPaths} />
        <DashboardDegreeDistributionComponent data={analytics.degreeDistribution} median={medianDegree} max={maxDegree} />
      </div>

      {/* Predicate by Type - full width */}
      <DashboardPredicateByTypeComponent data={analytics.predicateByType} />

      {/* 2-column grid continued */}
      <div className="grid grid-cols-2 gap-4">
        <DashboardMultiEdgeComponent data={analytics.multiEdgePairs} />
        <DashboardAvgDegreeByTypeComponent data={analytics.avgDegreeByType} overallAvg={analytics.kpiStats.avgDegree} />

        <DashboardDiverseEntitiesComponent data={analytics.diverseEntities} />
        <DashboardGraphComponentsComponent data={analytics.graphComponents} />

        <DashboardPredicateExclusivityComponent data={analytics.predicateExclusivity} />
        <DashboardReciprocalPairsComponent data={analytics.reciprocalPairs} />
      </div>

      {/* Data quality - full width */}
      <DashboardIsolatedComponent data={analytics.isolatedEntities} />
      <DashboardLeafComponent data={analytics.leafEntities} />
    </div>
  );
};

export default DashboardComponent;
