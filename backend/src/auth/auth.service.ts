import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UsersService } from '../users/users.service.js';
import type { User } from '../users/entities/user.entity.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
}

export interface AuthResult {
  token: string;
  user: { id: string; name: string; email: string };
}

const SALT_ROUNDS = 10;
const TOKEN_TTL = '7d';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  private get jwtSecret(): string {
    return this.config.get<string>('JWT_SECRET', 'dev-secret-change-me');
  }

  private signToken(user: User): string {
    const payload: JwtPayload = { sub: user.id, email: user.email, name: user.name };
    return jwt.sign(payload, this.jwtSecret, { expiresIn: TOKEN_TTL });
  }

  private toAuthResult(user: User): AuthResult {
    return {
      token: this.signToken(user),
      user: { id: user.id, name: user.name, email: user.email },
    };
  }

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese correo.');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.usersService.create({
      name: dto.name.trim(),
      email: dto.email,
      passwordHash,
    });
    return this.toAuthResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }
    return this.toAuthResult(user);
  }

  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, this.jwtSecret) as JwtPayload;
  }
}
