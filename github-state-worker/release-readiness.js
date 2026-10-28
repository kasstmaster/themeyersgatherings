// No state access, bucket reads, session issuance or secret values in this response.
export function releaseReadiness(env) {
  const ready=env.AUTH_MIGRATION_READY==='verified-backup-v1' &&
    typeof env.HOST_PASSWORD==='string' && env.HOST_PASSWORD.length>=24 &&
    Boolean(env.INVITATION_BACKGROUNDS && env.GITHUB_TOKEN && env.GITHUB_REPOSITORY) &&
    /^[a-f0-9]{40}$/.test(env.RELEASE_COMMIT||'');
  return Response.json({protocol:'state-auth-v1',ready,commit:env.RELEASE_COMMIT||null},
    {status:ready?200:503,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
