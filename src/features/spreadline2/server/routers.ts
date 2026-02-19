import 'server-only';

import { z } from 'zod';
import { appProcedure } from '@/lib/orpc';
import * as spreadline2DataService from './services/spreadline2-data.service';

const API_SPREADLINE2_PREFIX = '/spreadline2';
const tags = ['Spreadline2'];

const topologyEntrySchema = z.object({
  sourceId: z.string(),
  targetId: z.string(),
  time: z.string(),
  weight: z.number()
});

const entityInfoSchema = z.object({
  name: z.string(),
  category: z.enum(['collaborator']),
  citations: z.record(z.string(), z.number())
});

const spreadline2RawDataResponseSchema = z.object({
  egoId: z.string(),
  egoName: z.string(),
  dataset: z.string(),
  entities: z.record(z.string(), entityInfoSchema),
  topology: topologyEntrySchema.array(),
  groups: z.record(z.string(), z.array(z.array(z.string())))
});

export const spreadline2Router = appProcedure.router({
  getRawData: appProcedure
    .route({
      method: 'GET',
      path: `${API_SPREADLINE2_PREFIX}/raw-data`,
      summary: 'Get SpreadLine 2 raw data for ego network visualization',
      tags
    })
    .input(
      z.object({
        egoId: z.string(),
        relationTypes: z.array(z.string()),
        yearRange: z.tuple([z.number(), z.number()])
      })
    )
    .output(spreadline2RawDataResponseSchema)
    .handler(async ({ input }) => {
      return spreadline2DataService.getSpreadlineRawData(input);
    })
});
