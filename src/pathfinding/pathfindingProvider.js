require('dotenv').config();
import axios from 'axios';
import pool from "../../config/database";
import pathfindingDao from './pathfindingDao';

const headers = {
    "appKey": process.env.TMAP_APP_KEY
};

const findPath = async (startX, startY, endX, endY, startName, endName, passList) => {
    if (!passList || !passList.length) {
        const path = await axios.post('https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1',{
            "startX": startX,
            "startY": startY,
            "endX": endX,
            "endY": endY,
            "startName": encodeURIComponent(startName),
            "endName": encodeURIComponent(endName)
        }, { headers }).catch((err) => {return {error: err.response}});
        return path.data;
    }
    else{
        const path = await axios.post('https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1',{
            "startX": startX,
            "startY": startY,
            "endX": endX,
            "endY": endY,
            "startName": encodeURIComponent(startName),
            "endName": encodeURIComponent(endName),
            "passList": passList.join("_")
        }, { headers }).catch((err) => {return {error:err.response}});
        return path.data;
    }
}

const pathfindingProvider = {
    getPedestrainPath: async (startX, startY, endX, endY, startName, endName) =>{
        try{
            let chk = false;
            let result = {};
            let passList = [[]];
            let passListLog = [];
            let passListIndex = 0;
            let crossList = [];
            let firstPath = [];
            let lastPath = [];
            let firstCheck = false;
            while (!chk){
                result = await findPath(startX, startY, endX, endY, startName, endName, passList[passListIndex]);
                chk = true;
                if (!result.error){
                    if (!firstCheck) {
                        firstPath = result.features;
                        firstCheck = true;
                        lastPath.push(result.features[0]);
                    }
                    for (const i in result.features){
                        if (!i) continue;
                        if (!chk) break;
                        const point = result.features[i];
                        if (point.properties.pointType && point.properties.pointType.slice(0,2) === "PP"){
                            result.features[i].signal_generator = true;
                            continue;
                        }
                        if (point.properties.facilityType && point.properties.facilityType === "15" && 211 <= point.properties.turnType && point.properties.turnType <= 217){
                            let [x, y] = point.geometry.coordinates;
                            const connection = await pool.getConnection();
                            const check = await pathfindingDao.checkSignalGenerator(connection, x, y);
                            if (check.error){
                                result = check;
                                break;
                            }
                            if (check.result === -1){
                                result.features[i].signal_generator = false;
                                if (passList[passListIndex].length === 5) {
                                    lastPath = lastPath.concat(result.features.slice(1, i))
                                    [startX, startY] = result.features[i-2].geometry.coordinates;
                                    startName = result.features[i-2].properties.name;
                                    chk = false;
                                    passList.push([]);
                                    crossList = [];
                                    passListIndex += 1;
                                    break;
                                }
                                if (i >= 2) [x, y] = result.features[i-2].geometry.coordinates;
                                const nearSignalGenerator = await pathfindingDao.selectNearSignalGenerator(connection, x, y);
                                
                                for(const j in nearSignalGenerator){
                                    const signalGenerator = nearSignalGenerator[j];
                                    const sg = passList[passListIndex].find(element => element === `${signalGenerator.X},${signalGenerator.Y}`);
                                    const c = crossList.find(element => element === `${x},${y}`);
                                    const sgLog = passListLog.find(element => element === `${signalGenerator.X},${signalGenerator.Y}`);
                                    if (!sg && !c) {
                                        passList[passListIndex].push(`${signalGenerator.X},${signalGenerator.Y}`);
                                        passListLog.push(`${signalGenerator.X},${signalGenerator.Y}`);
                                        crossList.push(`${x},${y}`);
                                        chk = false;
                                        break;
                                    }
                                    if (sgLog && c){
                                        break;
                                    }
                                    if (sg && c) {
                                        passList[passListIndex].pop(sg);
                                        crossList.pop(c);
                                    }
                                }
                            }
                            else result.features[i].signal_generator = true;
                            
                            connection.release();
                        }
                        if (Number(i) == result.features.length - 1){
                            lastPath = lastPath.concat(result.features.slice(1, result.features.length));
                        }
                    }
                }
            }
            lastPath[0].properties.totalDistance = 0;
            lastPath[0].properties.totalTime = 0;
            for (const i in lastPath){
                if (lastPath[i].properties.time) lastPath[0].properties.totalTime += lastPath[i].properties.time;
                if (lastPath[i].properties.distance) lastPath[0].properties.totalDistance += lastPath[i].properties.distance;
            }
            return {firstPath: firstPath, lastPath: lastPath};
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