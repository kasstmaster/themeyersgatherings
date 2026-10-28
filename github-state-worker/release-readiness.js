// No state access, bucket reads, session issuance or secret values in this response.
export function releaseReadiness(env) {
  const checks={
    activationReady:env.AUTH_MIGRATION_READY==='verified-backup-v1',
    hostPasswordReady:typeof env.HOST_PASSWORD==='string'&&env.HOST_PASSWORD.length>=24,
    storageReady:Boolean(env.INVITATION_BACKGROUNDS),
    githubReady:Boolean(env.GITHUB_TOKEN&&env.GITHUB_REPOSITORY),
    releaseCommitReady:/^[a-f0-9]{40}$/.test(env.RELEASE_COMMIT||'')
  };
  const ready=Object.values(checks).every(Boolean);
  // Booleans only: no credential contents, lengths, hashes or private records.
  return Response.json({protocol:'state-auth-v1',ready,commit:checks.releaseCommitReady?env.RELEASE_COMMIT:null,checks},
    {status:ready?200:503,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
