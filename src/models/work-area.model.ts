import mongoose, { Schema, Document, Model } from 'mongoose';

export enum WorkAreaStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface IWorkArea extends Document {
  workAreaId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  name: string;
  status: WorkAreaStatus;
  createdAt: Date;
  updatedAt: Date;
}

const WorkAreaSchema = new Schema<IWorkArea>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, required: true },
    status: { type: String, enum: Object.values(WorkAreaStatus), default: WorkAreaStatus.ACTIVE },
  },
  {
    timestamps: true,
    collection: 'work_areas',
  }
);

WorkAreaSchema.virtual('workAreaId').get(function (this: IWorkArea) {
  return this._id;
});

WorkAreaSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.workAreaId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

WorkAreaSchema.index({ tenantId: 1, branchId: 1, status: 1 });
WorkAreaSchema.index({ tenantId: 1, branchId: 1, name: 1 });

export const WorkArea: Model<IWorkArea> = mongoose.model<IWorkArea>('WorkArea', WorkAreaSchema);
