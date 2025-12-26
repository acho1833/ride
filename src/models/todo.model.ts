import { z } from 'zod';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export const todoSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean()
});
