const pathfindingDao = {
    checkSignalGenerator: async (connection, x, y) => {
        const sql = `select ST_X(pp), ST_Y(pp), ST_Distance_Sphere(POINT(${x}, ${y}), pp) as distance from info where ST_Distance_Sphere(POINT(${x}, ${y}), pp) <= 16 order by distance asc LIMIT 1`;
        try {
            const [[result]] = await connection.query(sql);
            console.log(x,y);
            if (!result) return {result: -1};
            return result;
        } catch (error) {
            console.log(error);
            return {error: "음향 신호기 여부 확인 중 문제가 발생했습니다."}   
        }
    },
    selectSignalGenrator: async(connection,x,y)=>{

        const selectSignalGenratorSql = `select * , ST_Distance_Sphere(point(${x},${y}), pp) as distance from info order by st_distance(point(${x},${y}), pp) limit 1;`
        const [[selectSignalGenratorResult]] = await connection.query(selectSignalGenratorSql);
        return selectSignalGenratorResult;
    },

    selectListSignalGenrator: async(connection,x,y)=>{

        const selectSignalGenratorSql = `select * , ST_Distance_Sphere(point(${x},${y}), pp) as distance from info order by st_distance(point(${x},${y}), pp) limit 10;`
        const [selectSignalGenratorResult] = await connection.query(selectSignalGenratorSql);
        return selectSignalGenratorResult;
    },

    selectMoreListSignalGenerator: async(connection,x,y)=>{

        const selectMoreListSignalGenratorSql = `select * , ST_Distance_Sphere(point(${x},${y}), pp) as distance from info order by st_distance(point(${x},${y}), pp) limit 10 offset 10;`
        const [selectMoreListSignalGenratorResult] = await connection.query(selectMoreListSignalGenratorSql);
        return selectMoreListSignalGenratorResult;

    }

}

export default pathfindingDao;