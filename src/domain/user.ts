export interface IUser {
  id: number;
  fullName: string;
  email: string;
  passwordHash: string;
  birthdate?: Date | null;
  departments: string[];
  balance: bigint;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
}
