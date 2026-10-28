import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { rateLimit } from './rateLimit';
import { linkGoogleAccount } from './google-account';
import { findUserByEmail, normalizeEmail } from './user-email';

// Default to the production origin only in production. In dev, leaving this
// unset lets NextAuth infer the URL from the request host (localhost), so the
// Google OAuth callback doesn't wrongly redirect to the prod domain. Set
// NEXTAUTH_URL in .env.local to be explicit when testing Google locally.
if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV === 'production') {
  process.env.NEXTAUTH_URL = 'https://futureline.ai';
}

// Google is optional: the button on the get-started sign-in page always
// renders, but the provider only lights up when both OAuth secrets are
// present. Without them we simply don't register the provider, so builds
// and the existing email/password login are unaffected.
const providers: NextAuthOptions['providers'] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Always show Google's account-chooser screen (like the reference)
      // instead of silently reusing an existing Google session.
      authorization: { params: { prompt: 'select_account' } },
    }),
  );
}

providers.push(
  CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = normalizeEmail(credentials.email);
        const rl = await rateLimit(`login:${email}`, 5, 60 * 1000);
        if (!rl.success) {
          console.warn(`[AUTH] Rate limit exceeded for ${email}`);
          return null;
        }

        try {
          const user = await findUserByEmail(email);

          if (!user) return null;
          if (!user.isActive) return null;

          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            console.warn(`[AUTH] Failed login attempt for ${credentials.email}`);
            return null;
          }

          console.info(`[AUTH] Successful login for ${credentials.email}`);
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`.trim(),
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            sessionVersion: user.sessionVersion,
          };
        } catch (error) {
          console.error('[AUTH DEBUG] Error in authorize:', error);
          return null;
        }
      },
    }),
);

export const authOptions: NextAuthOptions = {
  providers,
  session: {
    strategy: 'jwt',
    // 2 hours of inactivity. Not absolute: each session read re-issues the
    // cookie, so an active user stays signed in.
    maxAge: 60 * 60 * 2,
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
    // OAuth failures (including a cancelled Google consent) are routed here.
    // Google is the only OAuth provider and it's used solely by the
    // get-started flow, so we send errors back to that Welcome page, which
    // reads ?error and shows a friendly message. Credentials sign-in uses
    // redirect:false and surfaces its own inline errors, so admin/instructor
    // login is unaffected by this.
    error: '/get-started/signin',
  },
  callbacks: {
    // Google (OAuth) sign-ins are tied to a real User row; see
    // linkGoogleAccount for how an existing account with that email is handled.
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'google') return true;
      return linkGoogleAccount({
        email: user.email,
        name: user.name,
        image: (user as any).image,
        emailVerifiedByGoogle: (profile as { email_verified?: boolean } | undefined)?.email_verified === true,
      });
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Google: resolve the token to the real DB row (created/linked in the
        // signIn callback) so session.user.id is a valid User id, not the
        // Google `sub`.
        if (account?.provider === 'google' && user.email) {
          const dbUser = await findUserByEmail(user.email);
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.firstName = dbUser.firstName;
            token.lastName = dbUser.lastName;
            token.sessionVersion = dbUser.sessionVersion;
            return token;
          }
        }
        // Credentials sign-in carries role/firstName/lastName.
        const nameParts = (user.name ?? '').trim().split(/\s+/).filter(Boolean);
        token.id = user.id;
        token.role = (user as any).role ?? token.role ?? 'CUSTOMER';
        token.firstName = (user as any).firstName ?? nameParts[0] ?? '';
        token.lastName = (user as any).lastName ?? nameParts.slice(1).join(' ') ?? '';
        token.sessionVersion = user.sessionVersion ?? 0;
      } else if (token.id) {
        // Re-check the account on every session read, so role changes apply
        // at once and revoked sessions end at once.
        let dbUser;
        try {
          dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, isActive: true, sessionVersion: true },
          });
        } catch (error) {
          // Database unreachable: keep the session rather than sign everyone out.
          console.error('[AUTH] Failed to refresh token:', error);
          return token;
        }
        // Deactivated, deleted, or password reset/changed since this token was
        // issued. Throwing makes NextAuth clear the cookie and report no session.
        if (!dbUser || !dbUser.isActive || dbUser.sessionVersion !== (token.sessionVersion ?? 0)) {
          throw new Error('Session revoked');
        }
        token.role = dbUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).firstName = token.firstName;
        (session.user as any).lastName = token.lastName;
        session.user.name = `${token.firstName} ${token.lastName}`.trim();
      }
      return session;
    },
  },
};
