import express from 'express';
import swaggerUi from 'swagger-ui-express';
import yaml from 'js-yaml';
import fs from 'fs';
import cors from 'cors';

const app = express();
const swaggerSpec = yaml.load(fs.readFileSync('./swagger/openapi.yaml',  'utf8'));
console.info(swaggerSpec);

app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/', (req, res) => res.status(200).send('app start'));
app.use(cors());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default app;