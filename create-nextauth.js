const fs = require('fs');
const path = require('path');

const authDir = path.join('C:\\Users\\RISHITA SEAL\\OneDrive\\Documents\\hackathon\\ONYX\\web\\app\\api\\auth', '[...nextauth]');
const routeFile = path.join(authDir, 'route.ts');

// Create directory recursively
fs.mkdirSync(authDir, { recursive: true });

// Create the route.ts file
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

fs.writeFileSync(routeFile, routeContent, 'utf-8');
console.log('Created:', routeFile);
