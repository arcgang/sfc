import 'dotenv/config';
import { app } from './app.js';

const port = process.env['PORT'] ? parseInt(process.env['PORT'], 10) : 3000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
