import mongoose, { Schema, Document, Model } from 'mongoose';

export enum IndentStatus {
  OPEN = 'OPEN',
  APPROVED = 'APPROVED',
  ISSUED = 'ISSUED',
}

export interface IIndent extends Document {
  indentId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  workAreaId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  indentDate: Date;
  status: IndentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const IndentSchema = new Schema<IIndent>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    workAreaId: { type: Schema.Types.ObjectId, ref: 'WorkArea', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    indentDate: { type: Date, default: Date.now },
    status: { type: String, enum: Object.values(IndentStatus), default: IndentStatus.OPEN },
  },
  {
    timestamps: true,
    collection: 'indents',
  }
);

IndentSchema.virtual('indentId').get(function (this: IIndent) {
  return this._id;
});

IndentSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.indentId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

IndentSchema.index({ tenantId: 1, branchId: 1, status: 1 });
IndentSchema.index({ tenantId: 1, workAreaId: 1 });
IndentSchema.index({ tenantId: 1, indentDate: -1 });
IndentSchema.index({ tenantId: 1, createdBy: 1 });

export const Indent: Model<IIndent> = mongoose.model<IIndent>('Indent', IndentSchema);
