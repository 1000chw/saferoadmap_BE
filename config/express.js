import express from 'express';
import swaggerUi from 'swagger-ui-express';
import yaml from 'js-yaml';
import fs from 'fs';
import cors from 'cors';
import pathfindingRouter from '../src/pathfinding/pathfindingRouter';
import photoRouter from '../src/photo/photoRouter';

const app = express();
const swaggerSpec = yaml.load(fs.readFileSync('./swagger/swagger.yaml',  'utf8'));

app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/', (req, res) => res.status(200).send('app start'));
app.use(cors());
app.use(express.json());

app.use('/pathfinding', pathfindingRouter);

app.use('/photo', photoRouter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default app;