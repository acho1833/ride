import mongoose, { model, Model, Schema } from 'mongoose';
import type { UserFileTree } from '@/models/user-file-tree.model';

// Recursive schema for tree nodes
const treeNodeSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['file', 'folder'], required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    children: { type: [Schema.Types.Mixed], default: undefined }
  },
  { _id: false }
);

const userFileTreeSchema = new Schema<UserFileTree>({
  userId: { type: String, required: true, unique: true, index: true },
  structure: { type: treeNodeSchema, required: true }
});

const UserFileTreeCollection = (mongoose.models.UserFileTree ??
  model<UserFileTree>('UserFileTree', userFileTreeSchema, 'user-file-tree')) as Model<UserFileTree>;

export default UserFileTreeCollection;
