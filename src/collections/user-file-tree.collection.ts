import mongoose, { model, Model, Schema } from 'mongoose';
import type { UserFileTree } from '@/models/user-file-tree.model';

// Use Mixed type for the entire structure to allow deeply nested updates
// Mongoose doesn't track changes in nested schemas well, so Mixed is simpler
const userFileTreeSchema = new Schema<UserFileTree>({
  sid: { type: String, required: true, index: true },
  projectId: { type: String, required: true, index: true },
  structure: { type: Schema.Types.Mixed, required: true }
});

// Compound index for unique file tree per project per user
userFileTreeSchema.index({ sid: 1, projectId: 1 }, { unique: true });

const UserFileTreeCollection = (mongoose.models.UserFileTree ??
  model<UserFileTree>('UserFileTree', userFileTreeSchema, 'user-file-tree')) as Model<UserFileTree>;

export default UserFileTreeCollection;
