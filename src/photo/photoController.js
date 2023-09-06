import photoService from "./photoService";
import photoProvider from "./photoProvider";
import photo from "../../config/s3.js";
import Jimp from "jimp";
import sharp from "sharp";
import fs from "fs";
  
const photoController = {
    photoAnalysis: async (req, res) => {
        try{
        

        console.log(req.file);
        const x = req.query.x;
        const y = req.query.y;
        const image = Buffer(req.file.buffer).toString('base64');
        //해야 할 일: 사진 용량이 1.5MB 가 넘으면 에러가 발생함 

        //  -> google cloud에서 설정을 하거나 사진을 압축하거나 해야 할 것 같아요
        
        var predictResult = await photoProvider.getAiPredictResult(image);

        var resizedImage = ""; 
        if(predictResult.error[0]==9){
            const imageBuffer = Buffer(req.file.buffer);
            
            await sharp(imageBuffer).resize({width:300, height:200}).toBuffer().then(newImageBuffer=>{
                resizedImage = newImageBuffer.toString('base64')
            }).catch(error => {
                console.error('이미지 크기 조절 중 오류 발생:', error);
              });     
            
        }

        predictResult = await photoProvider.getAiPredictResult(resizedImage);

        if (predictResult.error) {
            return res.status(422).json({code: 2005, message: "사진 예측 처리 실패", result: predictResult.error});
        }

        const result = await photo.s3Upload(image, req.file.originalname, req.file.mimetype);

        const postPhotoResult = await photoProvider.postPhotoResult(result, predictResult.displayName,x,y);
        console.log(postPhotoResult)
        if(postPhotoResult.error){
            return res.status(422).json({code: 2006, message: "사진 예측 처리 실패", result: postPhotoResult.error});
        }

        return res.status(200).json({code: 1005, message: "사진 업로드 성공", result: predictResult});
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