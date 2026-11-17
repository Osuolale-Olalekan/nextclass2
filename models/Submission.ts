import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  GENDERS,
  MAX_CHILDREN,
  RELATIONSHIPS,
  RELIGIONS,
  STATUSES,
  type Gender,
  type Relationship,
  type Religion,
  type Status,
} from "@/lib/constants";

export interface IGuardian {
  relationship: Relationship;
  lastName: string;
  firstName: string;
  middleName: string;
  phone: string;
  altPhone: string;
  email: string;
  occupation: string;
  residentialAddress: string;
}

export interface IChild {
  _id: Types.ObjectId;
  lastName: string;
  firstName: string;
  middleName: string;
  gender: Gender;
  dateOfBirth: string; // YYYY-MM-DD
  className: string;
  stateOfOrigin: string;
  lga: string;
  religion: Religion;
  email: string;
  phone: string;
}

export interface ISubmission {
  _id: Types.ObjectId;
  school: Types.ObjectId;
  guardians: IGuardian[];
  /** The students' home address (shared by every student on the form). */
  address: string;
  children: IChild[];
  /** Normalised "first|last|dob" keys, used to flag the same child submitted twice. */
  childKeys: string[];
  primaryPhone: string;
  primaryEmail: string;
  consentAt: Date;
  status: Status;
  adminNote: string;
  duplicateOf?: Types.ObjectId;
  duplicateReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const guardianSchema = new Schema<IGuardian>(
  {
    relationship: { type: String, enum: RELATIONSHIPS, required: true },
    lastName: { type: String, required: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, default: "" },
    phone: { type: String, required: true },
    altPhone: { type: String, default: "" },
    email: { type: String, required: true },
    occupation: { type: String, required: true },
    residentialAddress: { type: String, default: "" },
  },
  { _id: false },
);

// Children keep their own _id: it becomes the stable studentId in exports.
const childSchema = new Schema<IChild>({
  lastName: { type: String, required: true, trim: true },
  firstName: { type: String, required: true, trim: true },
  middleName: { type: String, default: "" },
  gender: { type: String, enum: GENDERS, required: true },
  dateOfBirth: { type: String, required: true },
  className: { type: String, required: true },
  stateOfOrigin: { type: String, required: true },
  lga: { type: String, required: true, trim: true },
  religion: { type: String, enum: RELIGIONS, required: true },
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
});

const submissionSchema = new Schema<ISubmission>(
  {
    school: { type: Schema.Types.ObjectId, ref: "School", required: true },
    guardians: {
      type: [guardianSchema],
      validate: {
        validator: (v: unknown[]) => v.length >= 1 && v.length <= 2,
        message: "A submission needs one or two guardians",
      },
    },
    address: { type: String, required: true },
    children: {
      type: [childSchema],
      validate: {
        validator: (v: unknown[]) => v.length >= 1 && v.length <= MAX_CHILDREN,
        message: `A submission needs between 1 and ${MAX_CHILDREN} children`,
      },
    },
    childKeys: { type: [String], default: [] },
    primaryPhone: { type: String, required: true },
    primaryEmail: { type: String, required: true },
    consentAt: { type: Date, required: true },
    status: { type: String, enum: STATUSES, default: "pending" },
    adminNote: { type: String, default: "", maxlength: 1000 },
    duplicateOf: { type: Schema.Types.ObjectId, ref: "Submission" },
    duplicateReason: { type: String },
  },
  { timestamps: true },
);

submissionSchema.index({ school: 1, status: 1, createdAt: -1 });
submissionSchema.index({ school: 1, primaryPhone: 1 });
submissionSchema.index({ school: 1, childKeys: 1 });

export const Submission: Model<ISubmission> =
  (models.Submission as Model<ISubmission> | undefined) ??
  model<ISubmission>("Submission", submissionSchema);
