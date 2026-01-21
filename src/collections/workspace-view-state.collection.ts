import mongoose, { model, Model, Schema } from 'mongoose';
import type { WorkspaceViewState } from '@/models/workspace-view-state.model';

const workspaceViewStateSchema = new Schema<WorkspaceViewState>(
  {
    workspaceId: {
      type: String,
      required: true,
      unique: true
    },
    sid: {
      type: String,
      required: true
    },
    scale: {
      type: Number,
      required: true
    },
    panX: {
      type: Number,
      required: true
    },
    panY: {
      type: Number,
      required: true
    },
    entityPositions: {
      type: Schema.Types.Mixed,
      required: true,
      default: {}
    }
  },
  {
    timestamps: { createdAt: false, updatedAt: true }
  }
);

const WorkspaceViewStateCollection = (mongoose.models.WorkspaceViewState ??
  model<WorkspaceViewState>('WorkspaceViewState', workspaceViewStateSchema, 'workspaceViewState')) as Model<WorkspaceViewState>;

export default WorkspaceViewStateCollection;
