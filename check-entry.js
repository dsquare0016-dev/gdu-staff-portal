import('@tanstack/react-start/server-entry').then(m => {
  console.log('Keys:', Object.keys(m));
  console.log('Default type:', typeof m.default);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
