import photoService from "./photoService";
import photoProvider from "./photoProvider";
import photo from "../../config/s3.js";
import fs from 'fs';
import automl from "@google-cloud/automl";
import  aiplatform from "@google-cloud/aiplatform";
import { param } from "express-validator";
import {PredictionServiceClient} from '@google-cloud/aiplatform';
    
  
const photoController = {
    photoAnalysis: async (req, res) => {
        try{
        const images = fs.readFileSync(req.file.path, 'base64');
 
        const result = 0;//await photo.s3Upload(images, req.file.originalname, req.file.mimetype);
        const filename = "KakaoTalk_20230217_230928064.png";
        const endpointId = "4412755777660387328";
        const project = 'ordinal-door-395311';
        const location = 'us-central1';

        const {instance, params, prediction} =
  aiplatform.protos.google.cloud.aiplatform.v1.schema.predict;

// Imports the Google Cloud Prediction Service Client library
const {PredictionServiceClient} = aiplatform.v1;

// Specifies the location of the api endpoint
const clientOptions = {
  apiEndpoint: 'us-central1-aiplatform.googleapis.com',
};

// Instantiates a client
const predictionServiceClient = new PredictionServiceClient(clientOptions);

async function predictImageClassification() {
  // Configure the endpoint resource
  const endpoint = `projects/${project}/locations/${location}/endpoints/${endpointId}`;

  const parametersObj = new params.ImageClassificationPredictionParams({
    confidenceThreshold: 0.5,
    maxPredictions: 5,
  });
  const parameters = parametersObj.toValue();

  const fs = require('fs');
  const image = fs.readFileSync(filename, 'base64');
  const instanceObj = new instance.ImageClassificationPredictionInstance({
    content: image,
  });
  const instanceValue = instanceObj.toValue();

  const instances = [instanceValue];
  const request = {
    endpoint,
    instances,
    parameters,
  };

  // Predict request
  const [response] = await predictionServiceClient.predict(request);

  console.log('Predict image classification response');
  console.log(`\tDeployed model id : ${response.deployedModelId}`);
  const predictions = response.predictions;
  console.log('\tPredictions :');
  for (const predictionValue of predictions) {
    const predictionResultObj =
      prediction.ClassificationPredictionResult.fromValue(predictionValue);
    for (const [i, label] of predictionResultObj.displayNames.entries()) {
      console.log(`\tDisplay name: ${label}`);
      console.log(`\tConfidences: ${predictionResultObj.confidences[i]}`);
      console.log(`\tIDs: ${predictionResultObj.ids[i]}\n\n`);
    }
  }
}
predictImageClassification();
        
        return res.status(200).json({code: 1005, message: "사진 업로드 성공", result: result});
        }catch(err){
            console.log(err)
        }
    },

    postReport: async (req, res) => {
        try {
            const photoId = req.body.photoId;
            if (!photoId || !(await photoService.checkId(photoId))) {
                return res.status(404).json({code: 2000, message: "photoId가 없습니다."});
            }
            const status = req.body.status;
            if (!status) {
                return res.status(404).json({code: 2001, message: "status가 없습니다."});
            }
            const result = await photoService.report(photoId, status);
            if (result.error)
                return res.status(503).json({code: 3000, message: result.error});
            return res.status(200).json({code: 1004, message: "신고 성공", result: result});
        } catch (err) {
            return res.status(500).json({code: 3004, message: "신고 실패"});
        }
    }
}

export default photoController;