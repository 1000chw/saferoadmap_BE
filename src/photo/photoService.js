import photoDao from "./photoDao";
import pool from "../../config/database";

const photoService = {
    checkId: async (photoId) => {
        try {
            const connection = await pool.getConnection();
            const result = await photoDao.insertReport(connection, photoId);
            connection.release();
            return result;
        } catch (err) {
            return {error: "photoId 확인 중에 문제가 발생했습니다."};
        }
    },

    report: async (photoId, status) => {
        try {
            const connection = await pool.getConnection();
            const result = await photoDao.insertReport(connection, photoId, status);
            connection.release();
            return result.insertId;
        } catch (err) {
            return {error: "DB와 연결 중에 문제가 발생했습니다."}
        }
    }
}

export default photoService;