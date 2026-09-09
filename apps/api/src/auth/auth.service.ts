import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { AuthResultDto, LoginInput, RegisterInput } from '@tren/shared';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './jwt.strategy';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Creates the organization and its first user in one transaction. */
  async register(input: RegisterInput): Promise<AuthResultDto> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictException('Nalog sa ovom email adresom već postoji');

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        organization: {
          create: { name: input.organizationName, type: input.organizationType },
        },
      },
      include: { organization: true },
    });

    return this.buildResult(user.id, user.email, user.organizationId, user.organization.name);
  }

  async login(input: LoginInput): Promise<AuthResultDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { organization: true },
    });
    if (!user?.passwordHash) throw new UnauthorizedException('Pogrešan email ili lozinka');

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Pogrešan email ili lozinka');

    return this.buildResult(user.id, user.email, user.organizationId, user.organization.name);
  }

  async me(userId: string): Promise<AuthResultDto['user']> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { organization: true },
    });
    return {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
    };
  }

  private buildResult(
    userId: string,
    email: string,
    organizationId: string,
    organizationName: string,
  ): AuthResultDto {
    const payload: JwtPayload = { sub: userId, email, org: organizationId };
    return {
      token: this.jwt.sign(payload),
      user: { id: userId, email, organizationId, organizationName },
    };
  }
}
