import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";

const s3client = new S3Client({
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  region: "ap-northeast-2",
});

const photo = {
    s3Upload: async (file, filename, mimetype) => {
      try{
        const key = `${Date.now()}_${filename}`;
        const params = {
          Bucket: "safe-roadmap",
          Key: key,
          Body: file,
          ContentType: mimetype
        };
        await s3client.send(new PutObjectCommand(params));
        return `https://safe-roadmap.s3.ap-northeast-2.amazonaws.com/${key}`;
      }catch (err){
        return {error: "S3 업로드 중 문제가 발생했습니다."}
      }
    }, 
    upload: multer(),
}

export default photo;
