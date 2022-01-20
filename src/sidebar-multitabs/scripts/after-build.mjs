const repoDir = path.join(__dirname, '..');
const distDir = path.join(repoDir, '..', '..', 'dist', 'plugins', 'linonetwo', 'markdown-transformer');
// cross platform cp -r ${repoDir}/src/ ${distDir}/
fs.copy(path.join(repoDir, 'src'), distDir)
