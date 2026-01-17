import mongoose, { Schema, Document, Model } from 'mongoose';

export enum ItemStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface IItem extends Document {
  itemId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  subCategoryId: mongoose.Types.ObjectId;
  itemCode: string;
  itemName: string;
  hsnCode?: string | null;
  inventoryUom: string;
  unitCost: number;
  taxRate: number;
  status: ItemStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ItemSchema = new Schema<IItem>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    categoryId: { type: Schema.Types.ObjectId, required: true }, // No ref defined as per docs
    subCategoryId: { type: Schema.Types.ObjectId, required: true }, // No ref defined as per docs
    itemCode: { type: String, required: true, uppercase: true },
    itemName: { type: String, required: true },
    hsnCode: { type: String, uppercase: true, default: null },
    inventoryUom: { type: String, required: true },
    unitCost: { type: Number, min: 0, default: 0 },
    taxRate: { type: Number, min: 0, max: 100, default: 0 },
    status: { type: String, enum: Object.values(ItemStatus), default: ItemStatus.ACTIVE },
  },
  {
    timestamps: true,
    collection: 'items',
  }
);

ItemSchema.virtual('itemId').get(function (this: IItem) {
  return this._id;
});

ItemSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.itemId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

ItemSchema.index({ tenantId: 1, itemCode: 1 }, { unique: true });
ItemSchema.index({ tenantId: 1, status: 1 });
ItemSchema.index({ tenantId: 1, categoryId: 1 });
ItemSchema.index({ tenantId: 1, subCategoryId: 1 });
ItemSchema.index({ tenantId: 1, itemName: 1 });

export const Item: Model<IItem> = mongoose.model<IItem>('Item', ItemSchema);
