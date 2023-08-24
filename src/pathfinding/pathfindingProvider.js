require('dotenv').config();
import axios from 'axios';
import pool from "../../config/database";

const headers = {
    "appKey": process.env.TMAP_APP_KEY
};

const pathfindingProvider = {
    getPedestrainPath: async (startX, startY, endX, endY, startName, endName, passList, x, y) =>{
        try{
            let result = {};
            await axios.post('https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1',{
                "startX": startX,
                "startY": startY,
                "endX": endX,
                "endY": endY,
                "startName": encodeURIComponent(startName),
                "endName": encodeURIComponent(endName),
                "passList": passList
            }, { headers }).then(response => {
                result = response.data;
            }).catch(err => {
                result = {error: err.response.data};
            });
            console.log(result);
            const features = result.features;
            const connection = await pool.getConnection();
            const sql = 
            `SELECT ST_Distance_Sphere(POINT(?,?), POINT(?,?)) AS distance
            FROM photo`;
            for (let i of features) {
                if (i.geometry.type === "LineString"){
                    if (i.properties.facilityType === '15') {
                        const tmp1 = i.geometry.coordinates[0];
                        const tmp2 = i.geometry.coordinates[1];
                        const [dist1] = await connection.query(sql, [x, y, tmp1[0], tmp1[1]]);
                        const [dist2] = await connection.query(sql, [x, y, tmp2[0], tmp2[1]]);
                        console.log(dist1, dist2);
                    }
                }
            }
            connection.release();

            return result;
        }catch(err){
            console.log(err);
            return {error: true};
        }
    },

    getTransportPath: async (SX, SY, EX, EY) =>{
        try{
            let result = {};
            await axios.post(`https://api.odsay.com/v1/api/searchPubTransPathT?apiKey=${encodeURIComponent(process.env.ODSAY_API_KEY)}&SX=${SX}&SY=${SY}&EX=${EX}&EY=${EY}&OPT=1`)
            .then(response => {
                console.log(response);
                result = response.data;
                console.log(result);
            }).catch(err => {
                return {error: err.error.msg};
            });
            return result;
        }catch(err){
            return {error: true};
        }
    }
}

export default pathfindingProvider;