const photoDao = {
    checkId: async (connection, photoId) => {
        const checkSql = `SELECT Count(*) as c FROM photo WHERE id = ${photoId}`
        try {
            await connection.beginTransaction();
            const [[check]] = await connection.query(checkSql);
            await connection.commit();
            return check.c;
        } catch (err) {
            console.log(err);
            return {error: "DB에 데이터를 넣는 중에 에러가 발생했습니다."}
        }
    },

    insertReport: async (connection, photoId, status) => {
        const reportSql = `INSERT INTO report (photo_id, location, status) VALUES (${photoId}, ${status})`
        try {
            await connection.beginTransaction();
            const [result] = await connection.query(reportSql);
            await connection.commit();
            return result;
        } catch (err) {
            console.log(err);
            return {error: "DB에 데이터를 넣는 중에 에러가 발생했습니다."}
        }
    },
}

export default photoDao;