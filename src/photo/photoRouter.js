import photoController from "./photoController";
import express from 'express';
import photo from "../../config/s3";

const photoRouter = express.Router();

photoRouter.post('/analysis', photo.upload.single('photo'), photoController.photoAnalysis);
photoRouter.post('/report', photoController.postReport);

export default photoRouter;