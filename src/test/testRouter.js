import express from "express"
import {getAverage} from "../test/testController"

const testRouter = express.Router();

testRouter.get("/",getAverage);

export default testRouter;