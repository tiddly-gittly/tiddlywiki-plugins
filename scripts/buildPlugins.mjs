const ignored = ['watch-fs', 'google-calendar-import'];

const folders = fs.readdirSync('./src').filter((item) => !ignored.includes(item));
await Promise.all(folders.filter((pathName) => !pathName.startsWith('.')).map((folder) => $`cd ${path.join(__dirname, '..', 'src', folder)} && npm run build`));
