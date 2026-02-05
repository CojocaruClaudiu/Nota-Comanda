# 🚨 CRITICAL SECURITY ISSUE - ACTION REQUIRED

GitGuardian has detected exposed credentials in your GitHub repository.

## Exposed Credentials

1. **Database password** in `backend/scripts/backup-database.ps1`
2. **User password** in `backend/scripts/createUsers.cjs`

## Immediate Actions Required

### 1. Change Your Database Password NOW

```bash
# Connect to PostgreSQL
psql -U postgres

# Change the password
ALTER USER postgres WITH PASSWORD 'new_secure_password_here';
```

### 2. Remove Sensitive Data from Git History

```bash
cd C:\Users\offic\Desktop\Nota-Comanda

# Install BFG Repo-Cleaner (faster alternative to git-filter-branch)
# Download from: https://rtyley.github.io/bfg-repo-cleaner/

# Or use git-filter-branch (built-in, slower)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/scripts/backup-database.ps1 backend/scripts/createUsers.cjs" \
  --prune-empty --tag-name-filter cat -- --all

# Force push to remote (WARNING: Destructive operation)
git push origin --force --all
git push origin --force --tags
```

### 3. Set Environment Variables

Create `backend/.env` file (already in .gitignore):

```env
# Database
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_new_secure_password_here
PGDATABASE=nota

# User creation
DEFAULT_USER_PASSWORD=your_secure_user_password_here
```

### 4. Update Scripts Usage

**For backup script:**
```powershell
# Set environment variable before running
$env:PGPASSWORD = "your_new_password"
.\backend\scripts\backup-database.ps1
```

**For user creation:**
```bash
# Set environment variable
export DEFAULT_USER_PASSWORD="your_secure_password"
node backend/scripts/createUsers.cjs
```

### 5. Rotate All Exposed Credentials

- ✅ Database password - CHANGE IMMEDIATELY
- ✅ User passwords (Topaz2026!) - CHANGE IMMEDIATELY
- ⚠️  Any API keys or tokens - Check and rotate if exposed

### 6. Notify Your Team

If this is a company repository:
1. Inform your team about the security breach
2. All users created with default passwords must change them immediately
3. Review access logs for suspicious activity

## Files Fixed

The following files have been updated to use environment variables:
- ✅ `backend/scripts/backup-database.ps1`
- ✅ `backend/scripts/createUsers.cjs`

## Prevention

1. **Never commit credentials** - Use .env files (already in .gitignore)
2. **Use git hooks** - Install pre-commit hooks to detect secrets
3. **Scan regularly** - Use tools like:
   - GitGuardian
   - git-secrets
   - truffleHog
   - detect-secrets

### Install Pre-commit Hook

```bash
# Install detect-secrets
pip install detect-secrets

# Initialize
detect-secrets scan > .secrets.baseline

# Add to .git/hooks/pre-commit
#!/bin/sh
detect-secrets-hook --baseline .secrets.baseline
```

## GitGuardian Instructions

1. Go to GitGuardian dashboard
2. Mark the incident as "Fixed"
3. Document the remediation steps taken
4. Set up continuous monitoring

## Contact

For security issues, contact your security team immediately.

---
**Generated:** $(Get-Date)
**Status:** ⚠️  UNRESOLVED - Follow steps above
