import { query, queryOne } from "../db/db";
import { ValidationError } from "../domain/error";
import type { IUser } from "../domain/user";

export interface UserRepository {
  create(user: Omit<IUser, "id" | "createdAt" | "updatedAt">): Promise<IUser>;
  findById(id: number): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  list(page: number, perPage: number): Promise<IUser[]>;
  update(id: number, data: Partial<IUser>): Promise<IUser | null>;
  delete(id: number): Promise<boolean>;
}

interface RawUserRow {
  id: number;
  full_name: string;
  email: string;
  role: string;
  password_hash: string;
  birthdate: Date | null;
  departments: string[];
  balance: string;
  created_at: Date;
  updated_at: Date;
}

function mapRowToUser(row: any): IUser {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    passwordHash: row.password_hash,
    birthdate: row.birthdate,
    departments: row.departments || [],
    balance: row.balance ? BigInt(row.balance) : 0n,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PgUserRepository implements UserRepository {
  async create(
    userData: Omit<IUser, "id" | "createdAt" | "updatedAt">,
  ): Promise<IUser> {
    const sql = `
    INSERT INTO users (full_name, email, password_hash, birthdate, departments, balance, role)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
    `;

    const params = [
      userData.fullName,
      userData.email,
      userData.passwordHash,
      userData.birthdate || null,
      userData.departments,
      userData.balance.toString(),
      userData.role,
    ];

    const row = await queryOne<RawUserRow>(sql, params);
    return mapRowToUser(row);
  }

  async findById(id: number): Promise<IUser | null> {
    const sql = `SELECT * FROM users WHERE id = $1;`;
    const row = await queryOne<RawUserRow>(sql, [id]);
    return row ? mapRowToUser(row) : null;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const sql = `SELECT * FROM users WHERE email = $1;`;
    const row = await queryOne<RawUserRow>(sql, [email]);
    return row ? mapRowToUser(row) : null;
  }

  async list(page: number = 1, perPage: number = 5): Promise<IUser[]> {
    const offset = (page - 1) * perPage;
    const sql = `
      SELECT * FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2  
    `;

    const rows = await query<RawUserRow>(sql, [perPage, offset]);
    return rows.map(mapRowToUser);
  }

  async update(id: number, updates: Partial<IUser>): Promise<IUser | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldsToUpdate: Record<string, unknown> = {
      full_name: updates.fullName,
      role: updates.role,
    };

    for (const [column, value] of Object.entries(fieldsToUpdate)) {
      if (value !== undefined) {
        fields.push(`${column} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new ValidationError({ reason: "No fields to update" });
    }

    values.push(id);

    const sql = `
      UPDATE users 
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *;
    `;

    const row = await queryOne<RawUserRow>(sql, values);
    return row ? mapRowToUser(row) : null;
  }

  async delete(id: number): Promise<boolean> {
    const sql = `DELETE FROM users WHERE id = $1 RETURNING id;`;
    const row = await queryOne<any>(sql, [id]);
    return row !== null;
  }
}
