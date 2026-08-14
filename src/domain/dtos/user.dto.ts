export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  fullName: string;
  email: string;
  role: string;
  balance: bigint;
  departments: string[];
  birthdate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationInput {
  page: number;
  limit: number;
}
