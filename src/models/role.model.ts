import mongoose, { Schema, Document, Model } from 'mongoose';

export enum RoleCode {
  SA = 'SA',
  BM = 'BM',
  PE = 'PE',
  SM = 'SM',
  IR = 'IR',
}

export interface IRole extends Document {
  roleId: mongoose.Types.ObjectId;
  roleCode: RoleCode;
  roleName: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    roleCode: { type: String, enum: Object.values(RoleCode), required: true, unique: true },
    roleName: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: 'roles',
  }
);

RoleSchema.virtual('roleId').get(function (this: IRole) {
  return this._id;
});

RoleSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.roleId = ret._id;
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});



export const Role: Model<IRole> = mongoose.model<IRole>('Role', RoleSchema);
