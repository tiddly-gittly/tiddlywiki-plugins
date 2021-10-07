const ignored = ['watch-fs'];

const folders = fs.readdirSync('./src').filter((item) => !ignored.includes(item));
await Promise.all(folders.map((folder) => $`cd ${path.join(__dirname, '..', 'src', folder)} && npm run build`));
