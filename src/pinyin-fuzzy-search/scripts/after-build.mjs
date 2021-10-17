const repoDir = path.join(__dirname, '..');
const distDir = path.join(repoDir, '..', '..', 'dist', 'plugins', 'linonetwo', 'pinyin-fuzzy-search');
await $`cp -r ${repoDir}/src/ ${distDir}/`;
