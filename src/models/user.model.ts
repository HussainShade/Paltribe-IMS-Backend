import mongoose, { Schema, Document, Model } from 'mongoose';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface IUser extends Document {
  userId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId | null;
  roleId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    status: { type: String, enum: Object.values(UserStatus), default: UserStatus.ACTIVE },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

UserSchema.virtual('userId').get(function (this: IUser) {
  return this._id;
});

UserSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.userId = ret._id;
    delete (ret as any)._id;
    delete (ret as any).__v;
    delete (ret as any).passwordHash;
    return ret;
  },
});

UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, status: 1 });
UserSchema.index({ tenantId: 1, branchId: 1 });
UserSchema.index({ tenantId: 1, roleId: 1 });

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
