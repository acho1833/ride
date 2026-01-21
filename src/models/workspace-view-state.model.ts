import { z } from 'zod';

export interface WorkspaceViewState {
  id: string;
  workspaceId: string;
  sid: string;
  scale: number;
  panX: number;
  panY: number;
  entityPositions: Record<string, { x: number; y: number }>;
  updatedAt: Date;
}

export const workspaceViewStateSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  sid: z.string(),
  scale: z.number(),
  panX: z.number(),
  panY: z.number(),
  entityPositions: z.record(z.string(), z.object({ x: z.number(), y: z.number() })),
  updatedAt: z.date()
});

/** Input schema for saving view state (excludes id, sid, updatedAt - set by server) */
export const workspaceViewStateInputSchema = z.object({
  workspaceId: z.string(),
  scale: z.number(),
  panX: z.number(),
  panY: z.number(),
  entityPositions: z.record(z.string(), z.object({ x: z.number(), y: z.number() }))
});

export interface WorkspaceViewStateInput {
  workspaceId: string;
  scale: number;
  panX: number;
  panY: number;
  entityPositions: Record<string, { x: number; y: number }>;
}
