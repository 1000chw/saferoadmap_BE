require('dotenv').config();
import axios from 'axios';
import pool from "../../config/database";
import pathfindingDao from './pathfindingDao';

const headers = {
    "appKey": process.env.TMAP_APP_KEY2
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
        }, { headers }).catch((err) => err.response)
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
        }, { headers }).catch((err) => err);
        return path.data;
    }
}

const pathfindingProvider = {
    getPedestrainPathLogic: async (startX, startY, endX, endY, startName, endName) =>{
        try{
            let chk = false;
            let result = {};
            let passList = [[]];
            let passListLog = [];
            let passListIndex = 0;
            let crossList = [];
            let excessList = [];
            let lastPath = [];
            let firstCheck = false;
            let startx = startX;
            let starty = startY;
            let endx = endX;
            let endy = endY;
            let startname = startName;
            let endname = endName;
            let x = 0;
            let y = 0;
            let falseCount = 0;
            let firstTime = 0;
            let firstDistance = 0;
            while (!chk){
                result = await findPath(startx, starty, endx, endy, startname, endname, passList[passListIndex]);
                chk = true;
                falseCount = 0;
                if (!result.error){
                    if (!firstCheck) {
                        lastPath.push(result.features[0]);
                        firstTime = result.features[0].properties.totalTime;
                        firstDistance = result.features[0].properties.totalDistance;
                        firstCheck = true;
                    }
                    for (const i in result.features){
                        if (!Number(i)) continue;
                        if (!chk) break;
                        const point = result.features[i];
                        if (point.properties.pointType && point.properties.pointType.slice(0,2) === "PP"){
                            result.features[i].signal_generator = true;
                            continue;
                        }
                        if (point.properties.facilityType && point.properties.facilityType === "15" && 211 <= point.properties.turnType && point.properties.turnType <= 217){
                            [x, y] = point.geometry.coordinates;
                            if (excessList.find(element => element === `${x},${y}`)) continue;
                            const connection = await pool.getConnection();
                            const check = await pathfindingDao.checkSignalGenerator(connection, x, y);
                            if (check.error){
                                result = check;
                                break;
                            }
                            if (check.result === -1){                                
                                result.features[i].signal_generator = false;
                                falseCount++;
                                if (excessList.find(element => element === `${x},${y}`)) continue;
                                if (passList[passListIndex].length === 5) {
                                    if (startX !== x && startY !== y){
                                        lastPath = lastPath.concat(result.features.slice(1, Number(i)-1))
                                        startx = x;
                                        starty = y;
                                        startname = result.features[Number(i)].properties.name;
                                    }
                                    else{
                                        lastPath = lastPath.concat(result.features.slice(1, Number(i)+2))
                                        if (result.features[Number(i)+2].geometry.coordinates[0].length){
                                            startx = result.features[Number(i)+2].properties.geometry.coordinates[-1][0];
                                            starty = result.features[Number(i)+2].properties.geometry.coordinates[-1][1];
                                        }
                                        else{
                                            startx = result.features[Number(i)+2].properties.geometry.coordinates[0];
                                            starty = result.features[Number(i)+2].properties.geometry.coordinates[1];
                                        }
                                        startname = result.features[Number(i+2)].properties.name;
                                    }
                                    chk = false;
                                    passList.push([]);
                                    crossList = [];
                                    passListIndex += 1;
                                    excessList.push(`${x},${y}`);
                                    break;
                                }
                                let [nsgX, nsgY] = [0, 0];
                                if (Number(i) >= 2) {
                                    if (result.features[Number(i)-2].geometry.coordinates[0].length)
                                        [nsgX, nsgY] = result.features[Number(i)-2].geometry.coordinates[0];
                                    else [nsgX, nsgY] = result.features[Number(i)-2].geometry.coordinates;
                                }
                                const chkNsg = excessList.find(element => element === `${nsgX},${nsgY}`);
                                if (chkNsg) continue;
                                const nearSignalGenerator = await pathfindingDao.selectNearSignalGenerator(connection, nsgX, nsgY);
                                
                                for(const j in nearSignalGenerator){
                                    if (chkNsg) break;
                                    if (Number(j) === nearSignalGenerator.length - 1) {
                                        excessList.push(`${x},${y}`);
                                        excessList.push(`${nsgX},${nsgY}`);
                                        break;
                                    }
                                    const signalGenerator = nearSignalGenerator[j];
                                    const sg = passList[passListIndex].find(element => element === `${signalGenerator.X},${signalGenerator.Y}`);
                                    const c = crossList.find(element => element === `${x},${y}`);
                                    const usedSg = excessList.find(element => element === `${signalGenerator.X},${signalGenerator.Y}`);
                                    if (usedSg) continue;
                                    if (sg && c) {
                                        excessList.push(`${signalGenerator.X},${signalGenerator.Y}`);
                                        passList[passListIndex].pop(sg);
                                        crossList.pop(c);
                                        if (Number(j) === nearSignalGenerator.length - 1) {
                                            excessList.push(`${x},${y}`);
                                            excessList.push(`${nsgX},${nsgY}`);

                                            break;
                                        }
                                        continue;
                                    };
                                    if (!sg) {
                                        passList[passListIndex].push(`${signalGenerator.X},${signalGenerator.Y}`);
                                        passListLog.push(`${signalGenerator.X},${signalGenerator.Y}`);
                                        crossList.push(`${x},${y}`);
                                        chk = false;
                                        break;
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
            return {path: lastPath, falseCount: falseCount, firstTime: firstTime, firstDistance: firstDistance, lastTime: lastPath[0].properties.totalTime, lastDistance: lastPath[0].properties.totalDistance};
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