#!/bin/bash
# GitHub OAuth Setup Script for ONYX
# This script handles the critical setup step that cannot be automated from the IDE

set -e

echo "🚀 ONYX GitHub OAuth Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if we're in the web directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from web/ directory"
    echo "Usage: cd web && bash setup.sh"
    exit 1
fi

echo "📁 Creating NextAuth directory structure..."

# Create directories
mkdir -p app/api/auth/[...nextauth]
mkdir -p app/api/github

echo "✅ Directories created:"
echo "   • app/api/auth/[...nextauth]/"
echo "   • app/api/github/"
echo ""

# Run Node setup script
if [ -f "setup-nextauth.js" ]; then
    echo "🔧 Running setup script..."
    node setup-nextauth.js
    echo "✅ Setup script completed"
else
    echo "⚠️  setup-nextauth.js not found, skipping"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ NextAuth Setup Complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Create .env.local:"
echo "   cp .env.example .env.local"
echo ""
echo "2. Edit .env.local with your GitHub OAuth credentials:"
echo "   GITHUB_ID=your-app-id"
echo "   GITHUB_SECRET=your-app-secret"
echo "   NEXTAUTH_SECRET=$(openssl rand -hex 32)"
echo ""
echo "3. Start the development server:"
echo "   npm run dev"
echo ""
echo "4. Test the OAuth flow at:"
echo "   http://localhost:3000"
echo ""
echo "📚 Documentation:"
echo "   • QUICK_START.md - Quick reference"
echo "   • GITHUB_OAUTH_CHECKLIST.md - Complete guide"
echo "   • VERIFICATION_CHECKLIST.md - Verify installation"
echo ""
