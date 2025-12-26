import { ORPCError } from '@orpc/server';
import { z } from 'zod';
import TodoCollection from '@/collections/todo.collection';
import { appProcedure } from '@/lib/orpc';
import { todoSchema } from '@/models/todo.model';

const API_TODO_PREFIX = '/todos';
const tags = ['Todo'];

export const todoRouter = appProcedure.router({
  getAll: appProcedure
    .route({
      method: 'GET',
      path: API_TODO_PREFIX,
      summary: 'Get all todos',
      tags
    })
    .output(todoSchema.array())
    .handler(async () => {
      return (await TodoCollection.find()).reverse();
    }),
  getById: appProcedure
    .route({
      method: 'GET',
      path: `${API_TODO_PREFIX}/:id`,
      summary: 'Get todo by ID',
      tags
    })
    .input(z.object({ id: z.string() }))
    .output(todoSchema)
    .handler(async ({ input }) => {
      const { id } = input;

      try {
        return await TodoCollection.findById(id).orFail();
      } catch {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Todo Not Found',
          data: {
            id
          }
        });
      }
    }),
  create: appProcedure
    .route({
      method: 'POST',
      path: API_TODO_PREFIX,
      summary: 'Create a todo',
      tags
    })
    .input(z.object({ text: z.string() }))
    .output(todoSchema)
    .handler(async ({ input }) => {
      const { text } = input;

      return new TodoCollection({
        text,
        completed: false
      }).save();
    }),
  update: appProcedure
    .route({
      method: 'PUT',
      path: `${API_TODO_PREFIX}/:id`,
      summary: 'Update a todo',
      tags
    })
    .input(todoSchema)
    .output(todoSchema)
    .handler(async ({ input }) => {
      const { id, ...updates } = input;

      try {
        return await TodoCollection.findByIdAndUpdate(id, updates, { new: true }).orFail();
      } catch {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Todo Not Found',
          data: { id }
        });
      }
    }),
  delete: appProcedure
    .route({
      method: 'DELETE',
      path: `${API_TODO_PREFIX}/:id`,
      summary: 'Delete a todo',
      tags
    })
    .input(z.object({ id: z.string() }))
    .output(z.void())
    .handler(async ({ input }) => {
      const { id } = input;

      try {
        await TodoCollection.findByIdAndDelete(id).orFail();
      } catch {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Todo Not Found',
          data: { id }
        });
      }
    })
});
