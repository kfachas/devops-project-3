import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email déjà utilisé');
    }
    const passwordHash = await hash(dto.password);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash },
    });
    return this.buildResponse(user.id, user.email, user.createdAt);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    return this.buildResponse(user.id, user.email, user.createdAt);
  }

  private buildResponse(id: string, email: string, createdAt: Date): AuthResponseDto {
    const accessToken = this.jwt.sign({ sub: id, email });
    return { accessToken, user: { id, email, createdAt: createdAt.toISOString() } };
  }
}
