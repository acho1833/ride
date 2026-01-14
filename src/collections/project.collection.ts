import mongoose, { model, Model, Schema } from 'mongoose';
import { Project } from '@/models/project.model';

const projectSchema = new Schema<Project>(
  {
    sid: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    view: {
      type: Schema.Types.Mixed,
      default: {}
    },
    lastOpenedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Compound unique index: project name must be unique per user
projectSchema.index({ sid: 1, name: 1 }, { unique: true });

const ProjectCollection = (mongoose.models.Project ?? model<Project>('Project', projectSchema, 'project')) as Model<Project>;

export default ProjectCollection;
