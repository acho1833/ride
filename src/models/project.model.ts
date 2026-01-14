import { z } from 'zod';
import { ViewSettingKey, DEFAULT_VIEW_SETTINGS } from './view-settings.model';

export interface Project {
  id: string;
  sid: string;
  name: string;
  description: string;
  view: Record<ViewSettingKey, boolean>;
  createdAt: Date;
  lastOpenedAt: Date;
}

/** Default project settings for new projects */
export const DEFAULT_PROJECT_SETTINGS = {
  view: DEFAULT_VIEW_SETTINGS
};

export const projectSchema = z.object({
  id: z.string(),
  sid: z.string(),
  name: z.string().min(1, 'Project name is required'),
  description: z.string(),
  view: z.record(z.string(), z.boolean()),
  createdAt: z.date(),
  lastOpenedAt: z.date()
});

/** Input type for creating a project */
export interface ProjectCreate {
  name: string;
  description?: string;
}

/** Input schema for creating a project */
export const projectCreateSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional().default('')
});

/** Input type for updating a project */
export interface ProjectUpdate {
  id: string;
  name?: string;
  description?: string;
  view?: Record<ViewSettingKey, boolean>;
}

/** Input schema for updating a project */
export const projectUpdateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Project name is required').optional(),
  description: z.string().optional(),
  view: z.record(z.string(), z.boolean()).optional()
});
