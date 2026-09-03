import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route as reachable without a valid JWT (used for /auth/register and /auth/login). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
