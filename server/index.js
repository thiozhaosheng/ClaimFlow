import express from 'express';
import { connectDatabase } from './src/config/database';
import { PORT } from './src/config/constants';

const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const startServer = async () => {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`ClaimFlow backend listening on port ${PORT}`);
  });
};

startServer();