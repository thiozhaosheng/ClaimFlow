import express from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database';
import apiRoutes from './routes/index';
import { PORT } from './config/constants';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);

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