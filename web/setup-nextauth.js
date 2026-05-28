const fs = require('fs');
const path = require('path');

// Create directories
const dirs = [
  'app/api',
  'app/api/auth',
  'app/api/auth/[...nextauth]',
  'app/api/github',
];

dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✓ Created: ${fullPath}`);
  }
});

// Create NextAuth route handler
const routeContent = `import NextAuth, { type NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';

// Validate required environment variables
if (!process.env.GITHUB_ID) {
  console.warn('[NextAuth] Missing GITHUB_ID environment variable');
}
if (!process.env.GITHUB_SECRET) {
  console.warn('[NextAuth] Missing GITHUB_SECRET environment variable');
}
if (!process.env.NEXTAUTH_SECRET) {
  console.warn('[NextAuth] Missing NEXTAUTH_SECRET environment variable');
}

const config: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.accessToken = account.access_token;
        token.githubLogin = (profile as any).login;
        token.githubId = (profile as any).id;
        token.avatar_url = (profile as any).avatar_url;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).github_access_token = token.accessToken;
        (session.user as any).github_login = token.githubLogin;
        (session.user as any).github_avatar_url = token.avatar_url;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (process.env.NODE_ENV === 'development') {
        console.log(\`[Auth] User signed in: \${user.email} via \${account?.provider}\`);
      }
    },
  },
  debug: process.env.NODE_ENV === 'development',
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};

const handler = NextAuth(config);

export { handler as GET, handler as POST };
`;

const routePath = path.join(__dirname, 'app/api/auth/[...nextauth]/route.ts');
fs.writeFileSync(routePath, routeContent, 'utf-8');
console.log(`✓ Created: ${routePath}`);

console.log('NextAuth directories and route handler created successfully!');
