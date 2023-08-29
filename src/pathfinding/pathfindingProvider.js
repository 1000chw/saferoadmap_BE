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
                                if (i >= 2) {
                                    if (typeof(result.features[i-2].geometry.coordinates) === typeof(result.features[i-2].geometry.coordinates[0]))
                                        [x, y] = result.features[i-2].geometry.coordinates[0];
                                    else [x, y] = result.features[i-2].geometry.coordinates;
                                }
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

    getTransportPath: async (SX, SY, EX, EY, SName, EName) =>{
        try{
            let result = {};
            await axios.post(`https://api.odsay.com/v1/api/searchPubTransPathT?apiKey=${encodeURIComponent(process.env.ODSAY_API_KEY)}&SX=${SX}&SY=${SY}&EX=${EX}&EY=${EY}&OPT=1`)
            .then(response => {
                result = response.data.result;
            }).catch(err => {
                result = {error: err.error.msg};
            });
            if (result.error) return result;
            for (const p in result.path){
                let pedestrianPath = [];
                for(const i in result.path[p].subPath) {
                    const current = result.path[p].subPath[i];
                    let [startX, startY, endX, endY, startName, endName] = [0, 0, 0, 0, 0, 0];
                    if (current.trafficType === 3){
                        if (current.distance !== 0){
                            if (Number(i) === 0){
                                [startX, startY, endX, endY, startName, endName] = [SX, SY, result.path[p].subPath[Number(i)+1].startX, result.path[p].subPath[Number(i)+1].startY, SName, result.path[p].subPath[Number(i)+1].startName];
                            }
                            else if (Number(i) === result.path[p].subPath.length-1)  [startX, startY, endX, endY, startName, endName] = [result.path[p].subPath[Number(i)-1].endX, result.path[p].subPath[Number(i)-1].endY, EX, EY, result.path[p].subPath[Number(i)-1].endName, EName];
                            else [startX, startY, endX, endY, startName, endName] = [result.path[p].subPath[Number(i)-1].endX, result.path[p].subPath[Number(i)-1].endY, result.path[p].subPath[Number(i)+1].startX, result.path[p].subPath[Number(i)+1].startY, result.path[p].subPath[Number(i)-1].endName, result.path[p].subPath[Number(i)+1].startName];
                            const ped = await pathfindingProvider.getPedestrainPath(startX, startY, endX, endY, startName, endName);
                            pedestrianPath.push(ped); 
                        }
                        else pedestrianPath.push([]);   
                    }
                }
                result.path[p].ped = pedestrianPath;
            }
            return result;
        }catch(err){
            console.log(err);
            return {error: "대중교통 이용 경로 확인 중 문제가 발생했습니다."};
        }
    }
}

export default pathfindingProvider;