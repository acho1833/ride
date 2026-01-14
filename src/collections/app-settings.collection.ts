import mongoose, { model, Model, Schema } from 'mongoose';
import { AppSettings } from '@/models/app-settings.model';

const appSettingsSchema = new Schema<AppSettings>(
  {
    sid: {
      type: String,
      required: true,
      unique: true
    },
    activeProjectId: {
      type: String,
      default: null
    }
  },
  {
    timestamps: { createdAt: false, updatedAt: true }
  }
);

const AppSettingsCollection = (mongoose.models.AppSettings ??
  model<AppSettings>('AppSettings', appSettingsSchema, 'appSettings')) as Model<AppSettings>;

export default AppSettingsCollection;
