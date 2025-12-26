import mongoose, { model, Model, Schema } from 'mongoose';
import { Todo } from '@/models/todo.model';

const todoSchema = new Schema<Todo>({
  text: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  }
});

const TodoCollection = (mongoose.models.todoSchema ?? model<Todo>('todoSchema', todoSchema, 'todo')) as Model<Todo>;

export default TodoCollection;
