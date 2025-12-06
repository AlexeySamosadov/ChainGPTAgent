# Security Notice

## Action Required: Revoke Exposed Credentials

If `.env.local` was previously committed to this repository, the following credentials **MUST** be revoked and regenerated:

1. **SPONSOR_PRIVATE_KEY** - Generate a new wallet for Q402 sponsor
2. **CHAINGPT_API_KEY** - Revoke and regenerate from ChainGPT dashboard
3. **BSCSCAN_API_KEY** - Revoke and regenerate from BscScan
4. **NEXT_PUBLIC_SUPABASE_ANON_KEY** - Regenerate from Supabase project settings
5. **NEXT_PUBLIC_SUPABASE_URL** - If using RLS policies, the URL is less sensitive, but review Supabase security settings

## Git History Cleanup

If `.env.local` appears in git history, use one of these tools to purge it:

```bash
# Option 1: Using git filter-repo (recommended)
git filter-repo --path .env.local --invert-paths

# Option 2: Using BFG Repo-Cleaner
bfg --delete-files .env.local
git reflog expire --expire=now --all && git gc --prune=now --aggressive
```

## Deployment Environment Variables

Configure these variables in your deployment platform (Vercel, Netlify, etc.):

- `CHAINGPT_API_KEY`
- `SPONSOR_PRIVATE_KEY`
- `BSCSCAN_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_Q402_DEMO_MODE` (set to 'false' for production)
- `RPC_URL_BSC_TESTNET`
- `RPC_URL_BSC_MAINNET`

**Never commit `.env.local` or any file containing private keys to version control.**
