import type { UserRepository } from "../repositories/user.repository";
import { ConflictError, NotFoundError } from "../domain/error";
import bcrypt from "bcrypt";
import type {
  PaginationInput,
  RegisterInput,
  UserResponse,
} from "../domain/dtos/user.dto";

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async register(data: RegisterInput): Promise<UserResponse> {
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError("This email has registered!");
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    const newUser = await this.userRepository.create({
      fullName: data.fullName,
      email: data.email,
      passwordHash: hashedPassword,
      role: "user",
      balance: 0n,
      departments: [],
      birthdate: null,
    });
    const { passwordHash, ...safeUser } = newUser;
    return safeUser;
  }

  async getById(id: number): Promise<UserResponse> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundError("User");
    }

    const { passwordHash, ...safeUser } = user;
    return {
      ...safeUser,
    } as UserResponse;
  }

  async list(params: PaginationInput): Promise<UserResponse[]> {
    const page = params.page ?? 1;
    const perPage = params.limit ?? 5;

    const users = await this.userRepository.list(page, perPage);

    const safeUsers = users.map((user) => {
      const { passwordHash, ...safeUser } = user;
      return {
        ...safeUser,
      } as UserResponse;
    });

    return safeUsers;
  }
}
