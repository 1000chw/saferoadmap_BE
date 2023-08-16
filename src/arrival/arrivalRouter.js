import arrivalController from "./arrivalController";
import express from "express";
const arrivalRouter = express.Router();

arrivalRouter.get('/bus');
arrivalRouter.get('/subway', arrivalController.getSubwayArrivalTime);

export default arrivalRouter;