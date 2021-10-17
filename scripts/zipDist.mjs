import archiver from 'archiver';

/**
 * @param {String} source
 * @param {String} out
 * @returns {Promise}
 */
function zipDirectory(source, out) {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const stream = fs.createWriteStream(out);

  return new Promise((resolve, reject) => {
    archive
      .directory(source, false)
      .on('error', (err) => reject(err))
      .pipe(stream);

    stream.on('close', () => resolve());
    archive.finalize();
  });
}

void zipDirectory(path.join(__dirname, '..', 'dist', 'plugins'), path.join(__dirname, '..', 'dist', 'plugins.zip'));
void zipDirectory(path.join(__dirname, '..', 'dist', 'themes'), path.join(__dirname, '..', 'dist', 'themes.zip'));
