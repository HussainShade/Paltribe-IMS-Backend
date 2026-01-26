import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRTV extends Document {
  rtvId: mongoose.Types.ObjectId;
  tenantId: string;
  branchId: mongoose.Types.ObjectId;
  grnId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  returnedQty: number;
  reason?: string;
  processedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RTVSchema = new Schema<IRTV>(
  {
    tenantId: { type: String, ref: 'Tenant', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    grnId: { type: Schema.Types.ObjectId, ref: 'GRN', required: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    returnedQty: { type: Number, required: true, min: 0.01 },
    reason: { type: String },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    collection: 'rtvs',
  }
);

RTVSchema.virtual('rtvId').get(function (this: IRTV) {
  return this._id;
});

RTVSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.rtvId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

RTVSchema.index({ tenantId: 1, branchId: 1 });
RTVSchema.index({ tenantId: 1, grnId: 1 });
RTVSchema.index({ tenantId: 1, itemId: 1 });
RTVSchema.index({ tenantId: 1, createdAt: -1 });

export const RTV: Model<IRTV> = mongoose.model<IRTV>('RTV', RTVSchema);
