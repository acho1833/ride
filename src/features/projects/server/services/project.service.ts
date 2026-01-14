import 'server-only';

import { ORPCError } from '@orpc/server';
import ProjectCollection from '@/collections/project.collection';
import UserFileTreeCollection from '@/collections/user-file-tree.collection';
import AppSettingsCollection from '@/collections/app-settings.collection';
import type { Project, ProjectCreate, ProjectUpdate } from '@/models/project.model';
import { DEFAULT_PROJECT_SETTINGS } from '@/models/project.model';
import type { FolderNode } from '@/models/user-file-tree.model';
import defaultFileTree from '@/features/files/server/default-file-tree.json';

/**
 * Get all projects for a user, sorted by lastOpenedAt descending
 */
export async function getAllProjects(sid: string): Promise<Project[]> {
  return ProjectCollection.find({ sid }).sort({ lastOpenedAt: -1 });
}

/**
 * Get a project by ID
 */
export async function getProjectById(sid: string, id: string): Promise<Project> {
  const project = await ProjectCollection.findOne({ _id: id, sid });

  if (!project) {
    throw new ORPCError('NOT_FOUND', { message: 'Project not found' });
  }

  return project;
}

/**
 * Create a new project with default file tree
 */
export async function createProject(sid: string, input: ProjectCreate): Promise<Project> {
  // Check for duplicate name
  const existing = await ProjectCollection.findOne({ sid, name: input.name });
  if (existing) {
    throw new ORPCError('CONFLICT', { message: 'A project with this name already exists' });
  }

  // Create project
  const project = await new ProjectCollection({
    sid,
    name: input.name,
    description: input.description ?? '',
    ...DEFAULT_PROJECT_SETTINGS,
    lastOpenedAt: new Date()
  }).save();

  // Create file tree for project with default content
  await new UserFileTreeCollection({
    sid,
    projectId: project.id,
    structure: defaultFileTree as FolderNode
  }).save();

  return project;
}

/**
 * Update a project
 */
export async function updateProject(sid: string, input: ProjectUpdate): Promise<Project> {
  const { id, ...updates } = input;

  // If updating name, check for duplicate
  if (updates.name) {
    const existing = await ProjectCollection.findOne({ sid, name: updates.name, _id: { $ne: id } });
    if (existing) {
      throw new ORPCError('CONFLICT', { message: 'A project with this name already exists' });
    }
  }

  const project = await ProjectCollection.findOneAndUpdate({ _id: id, sid }, { $set: updates }, { new: true });

  if (!project) {
    throw new ORPCError('NOT_FOUND', { message: 'Project not found' });
  }

  return project;
}

/**
 * Delete a project and its file tree
 */
export async function deleteProject(sid: string, id: string): Promise<void> {
  const project = await ProjectCollection.findOne({ _id: id, sid });

  if (!project) {
    throw new ORPCError('NOT_FOUND', { message: 'Project not found' });
  }

  // Delete file tree
  await UserFileTreeCollection.deleteOne({ sid, projectId: id });

  // Delete project
  await ProjectCollection.deleteOne({ _id: id, sid });

  // Clear activeProjectId if this was the active project
  await AppSettingsCollection.updateOne({ sid, activeProjectId: id }, { $set: { activeProjectId: null } });
}

/**
 * Open a project (update lastOpenedAt and set as active)
 */
export async function openProject(sid: string, id: string): Promise<Project> {
  const project = await ProjectCollection.findOneAndUpdate({ _id: id, sid }, { $set: { lastOpenedAt: new Date() } }, { new: true });

  if (!project) {
    throw new ORPCError('NOT_FOUND', { message: 'Project not found' });
  }

  // Update active project in app settings
  await AppSettingsCollection.findOneAndUpdate({ sid }, { $set: { activeProjectId: id } }, { upsert: true });

  return project;
}
