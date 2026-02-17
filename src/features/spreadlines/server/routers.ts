import 'server-only';

import { z } from 'zod';
import { appProcedure } from '@/lib/orpc';
import * as spreadlineDataService from './services/spreadline-data.service';

const API_SPREADLINE_PREFIX = '/spreadlines';
const tags = ['Spreadline'];

const topologyEntrySchema = z.object({
  sourceId: z.string(),
  targetId: z.string(),
  time: z.string(),
  weight: z.number()
});

const entityInfoSchema = z.object({
  name: z.string(),
  category: z.enum(['internal', 'external']),
  citations: z.record(z.string(), z.number())
});

const spreadlineRawDataResponseSchema = z.object({
  egoId: z.string(),
  dataset: z.string(),
  entities: z.record(z.string(), entityInfoSchema),
  topology: topologyEntrySchema.array(),
  groups: z.record(z.string(), z.array(z.array(z.string()))),
  config: z.object({
    timeDelta: z.string(),
    timeFormat: z.string(),
    squeezeSameCategory: z.boolean(),
    minimize: z.string()
  })
});

export const spreadlineRouter = appProcedure.router({
  getRawData: appProcedure
    .route({
      method: 'GET',
      path: `${API_SPREADLINE_PREFIX}/raw-data`,
      summary: 'Get SpreadLine raw data for ego network visualization',
      tags
    })
    .input(
      z.object({
        egoId: z.string(),
        relationTypes: z.array(z.string()),
        yearRange: z.tuple([z.number(), z.number()])
      })
    )
    .output(spreadlineRawDataResponseSchema)
    .handler(async ({ input }) => {
      return spreadlineDataService.getSpreadlineRawData(input);
    })
});
