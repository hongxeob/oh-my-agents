import express from 'express';
import cors from 'cors';
import { TaskStore } from './store';
import { createRouter } from './routes';
import { createSseRouter } from './sse';
import { seedTasks } from './seed';

const app = express();
const PORT = 3001;
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());

const store = new TaskStore();

app.use(createRouter(store));
app.use(createSseRouter(store));

seedTasks(store);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
