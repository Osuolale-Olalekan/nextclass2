import { Schema, model, models, type Model, type Types } from "mongoose";
import { DEFAULT_BRAND_COLOR } from "@/lib/constants";

export interface ISchool {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  classes: string[];
  isOpen: boolean;
  welcomeMessage: string;
  brandColor: string;
  createdAt: Date;
  updatedAt: Date;
}

const schoolSchema = new Schema<ISchool>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 60 },
    classes: { type: [String], default: [] },
    isOpen: { type: Boolean, default: true },
    welcomeMessage: { type: String, default: "", maxlength: 600 },
    brandColor: { type: String, default: DEFAULT_BRAND_COLOR },
  },
  { timestamps: true },
);

export const School: Model<ISchool> =
  (models.School as Model<ISchool> | undefined) ?? model<ISchool>("School", schoolSchema);
