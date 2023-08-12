import pathfindingController from './pathfindingController';
import express from 'express';

const pathfindingRouter = express.Router();

pathfindingRouter.get('/pedestrain', pathfindingController.getPedestrainPath);
pathfindingRouter.get('/transport', pathfindingController.getTransportPath);

export default pathfindingRouter;