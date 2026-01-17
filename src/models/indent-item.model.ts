import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIndentItem extends Document {
  indentItemId: mongoose.Types.ObjectId;
  indentId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  requestedQty: number;
  issuedQty: number;
  pendingQty: number;
  createdAt: Date;
  updatedAt: Date;
}

const IndentItemSchema = new Schema<IIndentItem>(
  {
    indentId: { type: Schema.Types.ObjectId, ref: 'Indent', required: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    requestedQty: { type: Number, required: true, min: 0.01 },
    issuedQty: { type: Number, min: 0, default: 0 },
    pendingQty: { type: Number, min: 0 },
  },
  {
    timestamps: true,
    collection: 'indent_items',
  }
);

// Auto-calculate pendingQty before saving
IndentItemSchema.pre('save', function (this: any, next: any) {
  const doc = this as IIndentItem;
  doc.pendingQty = Math.max(0, doc.requestedQty - (doc.issuedQty || 0));
  next();
});

IndentItemSchema.virtual('indentItemId').get(function (this: IIndentItem) {
  return this._id;
});

IndentItemSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.indentItemId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

IndentItemSchema.index({ indentId: 1, itemId: 1 });
IndentItemSchema.index({ indentId: 1 });
IndentItemSchema.index({ itemId: 1 });

export const IndentItem: Model<IIndentItem> = mongoose.model<IIndentItem>('IndentItem', IndentItemSchema);
