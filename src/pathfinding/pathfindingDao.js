const pathfindingDao = {
    checkSignalGenerator: async (connection, x, y) => {
        const sql = `select ST_X(pp), ST_Y(pp), ST_Distance_Sphere(POINT(${x}, ${y}), pp) as distance from info where ST_Distance_Sphere(POINT(${x}, ${y}), pp) <= 16 order by distance asc LIMIT 1`;
        try {
            const [[result]] = await connection.query(sql);
            if (!result) return {result: -1};
            return result;
        } catch (error) {
            console.log(error);
            return {error: "음향 신호기 여부 확인 중 문제가 발생했습니다."}   
        }
    },
    selectNearSignalGenerator: async (connection, x, y) => {
        console.log(x, y);
        const sql = `select ST_X(pp) as X, ST_Y(pp) as Y from info order by ST_Distance_Sphere(POINT(${x}, ${y}), pp) asc LIMIT 10`;
        try {
            const [result] = await connection.query(sql);
            return result;
        } catch (error) {
            console.log(error);
            return {error: "근처 음향 신호기 위치 확인 중 문제가 발생했습니다."}   
        }
    },

}

export default pathfindingDao;