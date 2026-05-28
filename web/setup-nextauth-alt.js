#!/usr/bin/env node
/**
 * Alternative NextAuth setup script - use if setup-nextauth.js fails
 * Run with: node setup-nextauth-alt.js
 */
const fs = require('fs');
const path = require('path');

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

try {
  const webRoot = __dirname;
  const apiRoot = path.join(webRoot, 'app', 'api');
  const authRoot = path.join(apiRoot, 'auth');
  const nextAuthRoot = path.join(authRoot, '[...nextauth]');

  console.log('Creating NextAuth directory structure...');
  
  ensureDirExists(apiRoot) && console.log('✓ Created app/api');
  ensureDirExists(authRoot) && console.log('✓ Created app/api/auth');
  ensureDirExists(nextAuthRoot) && console.log('✓ Created app/api/auth/[...nextauth]');

  const routePath = path.join(nextAuthRoot, 'route.ts');
  
  if (!fs.existsSync(routePath)) {
    const routeContent = `import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

const handler = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID || '',
      clientSecret: process.env.GITHUB_SECRET || '',
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
});

export { handler as GET, handler as POST };
`;

    fs.writeFileSync(routePath, routeContent, 'utf-8');
    console.log('✓ Created app/api/auth/[...nextauth]/route.ts');
  } else {
    console.log('✓ app/api/auth/[...nextauth]/route.ts already exists');
  }

  console.log('\n✅ NextAuth setup complete!');
  console.log('\nNext steps:');
  console.log('1. Copy .env.example to .env.local');
  console.log('2. Set GITHUB_ID and GITHUB_SECRET from https://github.com/settings/developers');
  console.log('3. Run: npm run dev');

} catch (err) {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
}
