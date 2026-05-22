import express from 'express';
import { connectDatabase } from './config/database';

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'ClaimFlow backend is running' });
});

const startServer = async () => {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`ClaimFlow backend listening on port ${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start the ClaimFlow server:', err);
  process.exit(1);
});
