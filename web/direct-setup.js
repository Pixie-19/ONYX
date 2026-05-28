#!/usr/bin/env node
/**
 * ONYX NextAuth Setup - Direct Execution
 * Usage: node direct-setup.js
 * 
 * This script:
 * 1. Creates the NextAuth directory structure
 * 2. Generates the route handler
 * 3. Sets up environment template
 */

const fs = require('fs');
const path = require('path');

console.log('\n🚀 ONYX NextAuth Setup\n');

try {
  // Create directories
  const dirs = [
    'app/api',
    'app/api/auth',
    'app/api/auth/[...nextauth]',
    'app/api/github',
  ];

  console.log('📁 Creating directories...');
  dirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`   ✅ ${dir}/`);
    } else {
      console.log(`   ℹ️  ${dir}/ (exists)`);
    }
  });

  // Create NextAuth route handler
  const routePath = path.join(__dirname, 'app/api/auth/[...nextauth]/route.ts');
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

  if (!fs.existsSync(routePath)) {
    fs.writeFileSync(routePath, routeContent, 'utf-8');
    console.log('\n📄 Creating route handler...');
    console.log('   ✅ app/api/auth/[...nextauth]/route.ts');
  } else {
    console.log('\n📄 Route handler...');
    console.log('   ℹ️  app/api/auth/[...nextauth]/route.ts (exists)');
  }

  console.log('\n✅ Setup complete!\n');
  console.log('📋 Next steps:\n');
  console.log('   1. Create .env.local:');
  console.log('      cp .env.example .env.local\n');
  console.log('   2. Edit .env.local with GitHub OAuth credentials:\n');
  console.log('      GITHUB_ID=your-client-id');
  console.log('      GITHUB_SECRET=your-client-secret');
  console.log('      NEXTAUTH_SECRET=your-secret-key\n');
  console.log('   3. Install dependencies:');
  console.log('      npm install\n');
  console.log('   4. Start dev server:');
  console.log('      npm run dev\n');
  console.log('   5. Test at: http://localhost:3000\n');

} catch (error) {
  console.error('\n❌ Setup failed:', error.message);
  process.exit(1);
}
