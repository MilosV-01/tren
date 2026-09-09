import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Guards organizer-only routes. Guest / gallery routes never use this. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
