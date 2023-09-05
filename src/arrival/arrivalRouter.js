import { query, body, validationResult } from "express-validator";
import arrivalController from "./arrivalController";
import express from "express";
const arrivalRouter = express.Router();

arrivalRouter.get('/bus',[
    query('stationId').notEmpty().withMessage("stationId를 입력해주세요"),
    query("busRouteId").notEmpty().withMessage("busRouteId를 입력해주세요")],arrivalController.getBusArrivalTime);
arrivalRouter.get('/subway', arrivalController.getSubwayArrivalTime);




export default arrivalRouter;