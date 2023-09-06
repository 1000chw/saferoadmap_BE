import photoDao from "./photoDao";
import pool from "../../config/database"
require('dotenv').config();

const photoProvider = {
    getAiPredictResult: async (image) => {
        try {
            const endpointId = "2339974049163116544";
            const project = '243838512173';
            const location = 'us-central1';

            // Imports the Google Cloud Prediction Service Client library
            const {PredictionServiceClient} = require('@google-cloud/aiplatform').v1;

            const {instance, params, prediction} = require('@google-cloud/aiplatform').protos.google.cloud.aiplatform.v1.schema.predict;

            // Specifies the location of the api endpoint
            const clientOptions = {
            apiEndpoint: 'us-central1-aiplatform.googleapis.com',
            };

            // Instantiates a client
            const predictionServiceClient = new PredictionServiceClient(clientOptions);

            async function predictCustomTrainedModel() {
            // Configure the parent resource
                const endpoint = `projects/${project}/locations/${location}/endpoints/${endpointId}`;

                const instanceObj = new instance.ImageClassificationPredictionInstance({
                    content: image,
                });
                const instances = [instanceObj.toValue()];

                const parametersObj = new params.ImageClassificationPredictionParams({
                    confidenceThreshold: 0.5,
                    maxPredictions: 5,
                });

                const parameters = parametersObj.toValue();
                const request = {
                    endpoint,
                    instances, 
                    parameters
                }

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
                        return {displayName: label, confidence: predictionResultObj.confidences[i]}; // {예측 결과, 정확도}
                    }
                }
            }
           
            return await predictCustomTrainedModel();
        } catch (error) {
            return {error: error.message};
        }
    },

    postPhotoResult: async(result, category,x,y) =>{
        try{

        const connection = await pool.getConnection(async(conn)=>conn);
        const insertPhotoResult = await photoDao.insertPhoto(connection, result, category,x,y);
        const selectPhotoId = await photoDao.selectPhotoId(connection ,result);
        connection.release();
        return selectPhotoId;
        }catch(err){
            console.log(err)
            return {error: "photoProvider에서 문제 발생"}
        } 
    },

    postRepost: async(postPhotoId) =>{

        const connection = await pool.getConnection(async(conn)=> conn)
        const postReportResult = await photoDao.insertReport(connection, postPhotoId, 0);
        connection.release();
        return postReportResult;
    }
}

export default photoProvider;