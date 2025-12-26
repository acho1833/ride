/**
 * Todo Service
 *
 * Business logic for todo operations. Routers delegate to this service.
 */

import { ORPCError } from '@orpc/server';
import TodoCollection from '@/collections/todo.collection';
import type { Todo } from '@/models/todo.model';

/**
 * Get all todos, sorted by newest first
 */
export async function getAllTodos(): Promise<Todo[]> {
  return (await TodoCollection.find()).reverse();
}

/**
 * Get a todo by ID
 * @throws ORPCError if not found
 */
export async function getTodoById(id: string): Promise<Todo> {
  try {
    return await TodoCollection.findById(id).orFail();
  } catch {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Todo Not Found',
      data: { id }
    });
  }
}

/**
 * Create a new todo
 */
export async function createTodo(text: string): Promise<Todo> {
  return new TodoCollection({
    text,
    completed: false
  }).save();
}

/**
 * Update an existing todo
 * @throws ORPCError if not found
 */
export async function updateTodo(id: string, updates: Partial<Omit<Todo, 'id'>>): Promise<Todo> {
  try {
    return await TodoCollection.findByIdAndUpdate(id, updates, { new: true }).orFail();
  } catch {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Todo Not Found',
      data: { id }
    });
  }
}

/**
 * Delete a todo by ID
 * @throws ORPCError if not found
 */
export async function deleteTodo(id: string): Promise<void> {
  try {
    await TodoCollection.findByIdAndDelete(id).orFail();
  } catch {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Todo Not Found',
      data: { id }
    });
  }
}
