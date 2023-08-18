import { body, validationResult } from "express-validator";
import arrivalController from "./arrivalController";
import express from "express";
const arrivalRouter = express.Router();

arrivalRouter.get('/bus',[
    body('stationId').notEmpty().withMessage("stationId를 입력해주세요"),
    body("busRouteId").notEmpty().withMessage("busRoute Id를 입력해주세요"),
    body("ord").notEmpty().withMessage("정류소 순번을 입력해주세요.")],arrivalController.getBusArrivalTime);
arrivalRouter.get('/subway', arrivalController.getSubwayArrivalTime);




export default arrivalRouter;