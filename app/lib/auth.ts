/**
 * NextAuth Configuration
 * 
 * Provides authentication for admin routes using credentials provider.
 * Works alongside existing Basic Auth middleware protection.
 */

import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        // Verify against environment variables (same as middleware Basic Auth)
        const adminUser = process.env.ADMIN_USER;
        const adminPass = process.env.ADMIN_PASS;

        if (!adminUser || !adminPass) {
          console.error('[NextAuth] Admin credentials not configured');
          return null;
        }

        if (credentials.username === adminUser && credentials.password === adminPass) {
          // Return user object with email
          // Use ADMIN_USER as email or derive from ADMIN_EMAILS
          const adminEmailsEnv = process.env.ADMIN_EMAILS || '';
          const adminEmails = adminEmailsEnv
            .split(',')
            .map(e => e.trim())
            .filter(Boolean);
          
          // Use first admin email as the session email
          const email = adminEmails[0] || `${adminUser}@admin.local`;
          
          return {
            id: adminUser,
            name: adminUser,
            email: email,
          };
        }

        return null;
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/admin/login', // Custom login page if needed
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
