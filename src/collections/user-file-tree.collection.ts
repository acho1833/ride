import mongoose, { model, Model, Schema } from 'mongoose';
import type { UserFileTree } from '@/models/user-file-tree.model';

// Use Mixed type for the entire structure to allow deeply nested updates
// Mongoose doesn't track changes in nested schemas well, so Mixed is simpler
const userFileTreeSchema = new Schema<UserFileTree>({
  sid: { type: String, required: true, unique: true, index: true },
  structure: { type: Schema.Types.Mixed, required: true }
});

const UserFileTreeCollection = (mongoose.models.UserFileTree ??
  model<UserFileTree>('UserFileTree', userFileTreeSchema, 'user-file-tree')) as Model<UserFileTree>;

export default UserFileTreeCollection;
