const repoDir = path.join(__dirname, '..');
const distDir = path.join(repoDir, '..', '..', 'dist', 'plugins', 'linonetwo', 'pinyin-fuzzy-search');
// cross platform cp -r ${repoDir}/src/ ${distDir}/
fs.copy(path.join(repoDir, 'src'), distDir)
