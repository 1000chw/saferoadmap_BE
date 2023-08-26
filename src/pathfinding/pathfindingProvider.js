require('dotenv').config();
import axios from 'axios';
import pool from "../../config/database";
import pathfindingDao from './pathfindingDao';

const headers = {
    "appKey": process.env.TMAP_APP_KEY2
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
            if (!result.error){
                for (const i in result.features){
                    const point = result.features[i];
                    if (point.properties.facilityType && point.properties.facilityType === "15" && 211 <= point.properties.turnType && point.properties.turnType <= 217){
                        const [x, y] = point.geometry.coordinates;
                        const connection = await pool.getConnection();
                        const check = await pathfindingDao.checkSignalGenerator(connection, x, y);
                        connection.release();
                        console.log(check); 
                        if (check.error){
                            result = check;
                            break;
                        }
                        if (check.result === -1){
                            result.features[i].signal_generator = false;
                        }
                        else result.features[i].signal_generator = true;
                    }
                }
            }

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