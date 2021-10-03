const repoDir = path.join(__dirname, '..');
const distDir = path.join(repoDir, '..', '..', 'dist', 'commandpalette');
await $`cp ${repoDir}/src/*.{tid,json,meta,info} ${distDir}`;
