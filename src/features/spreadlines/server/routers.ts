import 'server-only';

import { z } from 'zod';
import { appProcedure } from '@/lib/orpc';
import * as spreadlineDataService from './services/spreadline-data.service';

const API_SPREADLINE_PREFIX = '/spreadlines';
const tags = ['Spreadline'];

const topologyEntrySchema = z.object({
  source: z.string(),
  target: z.string(),
  time: z.string(),
  weight: z.number()
});

const lineColorEntrySchema = z.object({
  entity: z.string(),
  color: z.string()
});

const nodeContextEntrySchema = z.object({
  entity: z.string(),
  time: z.string(),
  context: z.number()
});

const spreadlineRawDataResponseSchema = z.object({
  ego: z.string(),
  dataset: z.string(),
  topology: topologyEntrySchema.array(),
  lineColor: lineColorEntrySchema.array(),
  groups: z.record(z.string(), z.array(z.array(z.string()))),
  nodeContext: nodeContextEntrySchema.array(),
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
    .input(z.object({ ego: z.string().optional() }))
    .output(spreadlineRawDataResponseSchema)
    .handler(async ({ input }) => {
      return spreadlineDataService.getSpreadlineRawData(input.ego);
    })
});
