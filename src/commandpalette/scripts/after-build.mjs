const repoDir = path.join(__dirname, '..');
const distDir = path.join(repoDir, '..', '..', 'dist', 'linonetwo', 'commandpalette');
await $`cp ${repoDir}/src/*.{tid,json,meta,info} ${distDir}`;
