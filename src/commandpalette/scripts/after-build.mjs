const repoDir = path.join(__dirname, '..');
const distDir = path.join(repoDir, '..', '..', 'dist', 'plugins', 'linonetwo', 'commandpalette');
await $`cp -r ${repoDir}/src/ ${distDir}/`;
