const repoDir = path.join(__dirname, '..');
const distDir = path.join(repoDir, '..', '..', 'dist', 'linonetwo', 'pinyin-fuzzy-search');
await $`cp ${repoDir}/src/*.{tid,meta,info} ${distDir}`;
