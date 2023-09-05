import photoService from "./photoService";
import photoProvider from "./photoProvider";
import photo from "../../config/s3.js";
import fs from 'fs';

const photoController = {
    photoAnalysis: async (req, res) => {
        console.log(req.file);
        const image = req.file.buffer;
        const result = await photo.s3Upload(image, req.file.originalname, req.file.mimetype);
        return res.status(200).json({code: 1005, message: "사진 업로드 성공", result: result});
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