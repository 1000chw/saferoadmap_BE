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
        const reportSql = `INSERT INTO report (photo_id, status) VALUES (${photoId}, ${status})`
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

    insertPhoto: async (connection, result, category,x,y)=>{
        const insertPhotoSql = `insert photo(url, location, created_at, updated_at, category, status ) values("${result}",ST_GeomFromText('POINT(${x} ${y})') ,current_timestamp, current_timestamp,  "${category}", 0);`;
        try {
            await connection.beginTransaction();
            const [insertPhotoresult] = await connection.query(insertPhotoSql);
            await connection.commit();
            return insertPhotoresult;
        } catch (err) {
            console.log(err);
            return {error: "DB에 데이터를 넣는 중에 에러가 발생했습니다."}
        }
    },

    selectPhotoId: async(connection ,result)=>{

        const selectPhotoIdQuery = `select id from photo where url = "${result}"`;
        const [selectPhotoIdRow] = await connection.query(selectPhotoIdQuery);
        return selectPhotoIdRow[0].id;
    }

}

export default photoDao;