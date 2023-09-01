require('dotenv').config();
import axios from 'axios';
import pool from "../../config/database";
import pathfindingDao from './pathfindingDao';

const headers = {
    "appKey": process.env.TMAP_APP_KEY3
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
        }, { headers }).catch((err) => err.response);
        return path.data;
    }
}

const getPedestrainPathLogic= async (startX, startY, endX, endY, startName, endName) =>{
    try{

       
        let stop = 0; 
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
        let boardCount = 0; 
        console.log("두번째 요청이 시작됩니다. ")
        setTimeout(()=>{return stop = 1;},10000)
        while (!chk){
            if(stop ==1){
                break;
            }
            result = await findPath(startx, starty, endx, endy, startname, endname, passList[passListIndex]);
            console.log(passList)

            if (result.error) return result;

            if(result.type==undefined){
                result = result.replace(/ /g,'').replace(/\s/g,'').replace(/\r/g,"").replace(/\n/g,"").replace(/\t/g,"").replace(/\f/g,"")
                result = result.split(String.fromCharCode(0)).join("");
                result = JSON.parse(result)
            }
            chk = true;
            falseCount = 0;
            boardCount  = 0; 
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
                    if(point.properties.facilityType && point.properties.facilityType === "15" ){
                        boardCount++;
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

        if(stop ==1){
            return {error: "함수 진행 중 에러 발생"}
        }
        
        lastPath[0].properties.totalDistance = 0;
        lastPath[0].properties.totalTime = 0;
        for (const i in lastPath){
            if (lastPath[i].properties.time) lastPath[0].properties.totalTime += lastPath[i].properties.time;
            if (lastPath[i].properties.distance) lastPath[0].properties.totalDistance += lastPath[i].properties.distance;
        }
        console.log(boardCount/2)
        return {path: lastPath, falseCount: falseCount, firstTime: firstTime, firstDistance: firstDistance, lastTime: lastPath[0].properties.totalTime, lastDistance: lastPath[0].properties.totalDistance, boardCount: boardCount/2};
    }catch(err){
        console.log(err);
        return {error: true};
    }

}

const pathfindingProvider = {


    getPedestrainPath: async (startX, startY, endX, endY, startName, endName, passList) =>{
        try{
            //모든 횡단보도가 음향신호기라면 true 아니면 false
            let clear = false;
            let result = {};
            let result2 = {};
            let finalResult = {};
            let j = 0; 
            let passLists = passList;
            const connection = await pool.getConnection();
            const pass=[];
            let clearStep = 0; 
            let selectSignalGeneratorListResult = {};
            let selectsignalGeneratorMoreListResult = {};
            //처음 경로를 찾았을 때 && 나중에 갱신되는 값
            let originTotalTime = 0;
            let originTotalDistance = 0; 
            let originFalseCount = -1;
            let currentTotalTime = 0; 
            let currentTotalDistance = 0; 
            let boardCount = 0; 
            let currentBoardCount = 0; 
            let timeout = 0; 
            
            //API 요청 횟수
            let count = 0; 
            // 음향신호기가 아닌 횡단보도의 개수
            let falseCount = 0; 
            let exfalseCount = 110; 
            //
            let stop = 0; 

            let z = 0 ;
            
            while(clear!=true&&clearStep<4){
                setTimeout(()=>{return timeout = 1;},70000)

                z=0;
                while(clear != true&& j < 5){
                    if(stop ==1){
                        break;
                    }
                    console.log("*********new request********")
                    console.log("passLists: ", passLists)
                    clear = true;
                    count++;
                    falseCount = 0; 
                    z++;
                    boardCount = 0; 
                    //axios를 통한 요청
                    await axios.post('https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1',{
                    "startX": startX,
                    "startY": startY,
                    "endX": endX,
                    "endY": endY,
                    "startName": encodeURIComponent(startName),
                    "endName": encodeURIComponent(endName),
                    "passList": passLists
                    }, { headers }).then(response => {
                    result = response.data;
                    }).catch(err => {
                        result = {error: err.response.data};
                        finalResult = {error: err.response.data};
                    });

                    console.log(finalResult.error)

                   if(result.error){
                        console.log(finalResult.error)
                    return result;
                   }               

                        passLists=""
                        //passList가 넘어 오지 않았을 때는 empty string으로 변경해준다. 
                        if(passLists==undefined){
                            passLists = "";
                        }
                
                        if(result.type==undefined){
 
                            result = result.replace(/ /g,'').replace(/\s/g,'').replace(/\r/g,"").replace(/\n/g,"").replace(/\t/g,"").replace(/\f/g,"")
                            result = result.split(String.fromCharCode(0)).join("");
                            result = JSON.parse(result)
                            
                        }


                     //T-map이 보내준 result를 feature단위로 돌면서 확인한다. 
                     for (const i in result.features){
                         const point = result.features[i];
                        //처음 api 요청했을 때 시간을 구한다. 
                        if(originTotalTime ==0){
                            originTotalTime = result.features[i].properties.totalTime;
                        }
                        if(originTotalDistance==0){
                            originTotalDistance = result.features[i].properties.totalDistance
                        }

                        //만약 읽어들인 부분이 횡단보도에 관한 부분일 경우 
                        if (point.properties.facilityType && point.properties.facilityType === "15" && 211 <= point.properties.turnType && point.properties.turnType <= 217){
                            //변수 x,y는 횡단보도 좌표
                            const [x, y] = point.geometry.coordinates;
                            boardCount ++;
                            //해당 좌푝 음향신호기 인지 아닌지 확인한다.
                            const check = await pathfindingDao.checkSignalGenerator(connection, x, y);
                       
                            //음향신호기 여부를 log로 찍어준다.
                            if(check.result!=-1){
                                console.log("음향신호기입니다 ", check); 
                            }

                            //만약 check 과정에서 error가 발생한 경우 err를 return하고 break;
                            if (check.error){
                                result = check;
                                break;
                            }
                            

                            //만약 확인한 횡단보도가 음향신호기가 아닌 경우 
                            if (check.result === -1){
                                 //falsecount를 올려준다.
                                 falseCount++;
                                 //전부 음향신호기가 아니므로 clear는 false
                                 clear = false;
                                 //반환할 result의 signal_generator 정보를 false라고 알려준다. 
                                 result.features[i].signal_generator = false;
                               
                                if(clearStep==0&&i>2){
                                    if(result.features[i-2].geometry.coordinates[0].length){
                                        const [x_point,y_point] = result.features[i-2].geometry.coordinates[0];
                                        selectSignalGeneratorListResult = await pathfindingDao.selectListSignalGenrator(connection,x_point,y_point);
                                    }else{
                                        //횡단보도 전 분기점의 x,y 좌표를 가지고 온다. 
                                        const [x_point,y_point] = result.features[i-2].geometry.coordinates;
                                        //위의 좌표를 가지고 가장 가까운 10개의 음향신호기 위치를 가지고 온다. 
                                        selectSignalGeneratorListResult = await pathfindingDao.selectListSignalGenrator(connection,x_point,y_point);
                                    }
                                
                                }
                                else if(clearStep==0&&i<2){
                                    if(result.features[i-2].geometry.coordinates[0].length){
                                        const [x_point,y_point] = result.features[i-2].geometry.coordinates[0];
                                        selectSignalGeneratorListResult = await pathfindingDao.selectListSignalGenrator(connection,x_point,y_point);
                                    }else{
                                    //횡단보도 전 분기점의 x,y 좌표를 가지고 온다. 
                                    const [x_point,y_point] = result.features[i-2].geometry.coordinates;
                                    //위의 좌표를 가지고 가장 가까운 10개의 음향신호기 위치를 가지고 온다. 
                                    selectSignalGeneratorListResult = await pathfindingDao.selectListSignalGenrator(connection,x_point,y_point);
                                    }
                                }
                                if(j==0){

                                    if(selectsignalGeneratorMoreListResult.length==undefined){

                                        if(i-clearStep>=1){
                                            if(result.features[i-clearStep].geometry.coordinates[0].length){
                                                const [x_point,y_point] = result.features[i-clearStep].geometry.coordinates[0];
                                                selectsignalGeneratorMoreListResult = await pathfindingDao.selectMoreListSignalGenerator(connection,x_point,y_point);
                                             }else{ 
                                                 const [x_point,y_point] = result.features[i-clearStep].geometry.coordinates;
                                                selectsignalGeneratorMoreListResult = await pathfindingDao.selectMoreListSignalGenerator(connection,x_point,y_point);
                                        }}else{
                                            if(result.features[i].geometry.coordinates[0].length){
                                                const [x_point,y_point] = result.features[i-clearStep].geometry.coordinates[0];
                                                selectsignalGeneratorMoreListResult = await pathfindingDao.selectMoreListSignalGenerator(connection,x_point,y_point);
                                            }else{ 
                                                const [x_point,y_point] = result.features[i].geometry.coordinates;
                                                selectsignalGeneratorMoreListResult = await pathfindingDao.selectMoreListSignalGenerator(connection,x_point,y_point);
                                            }
                                        }
                                       
                                      
                                    }

                                }



                                
                                if(falseCount>5){
                                   finalResult.error ="passList 5개 초과"
                                    stop = 1; 
                                    break;
                                }
                               
                                var selectSignalGeneratorResultX = selectSignalGeneratorListResult[z].pp.x;
                                var selectSignalGeneratorResultY = selectSignalGeneratorListResult[z].pp.y;

                                

                                //만약 passList가 비어있지 않다면 
                                if(passLists!=""){
                                    //경유지 리스트에 넣어준다. 
                                    pass.push(selectSignalGeneratorResultX,selectSignalGeneratorResultY);
                                    // 우리가 실제로 사용할 passList를 추가해준다. 
                                    passLists +="_"+selectSignalGeneratorResultX+","+selectSignalGeneratorResultY;
                                }else{ // 만약 passList가 비어있다면
                                    //경유지 리스트에 넣어준다. 
                                    pass.push(selectSignalGeneratorResultX,selectSignalGeneratorResultY);
                                    passLists +=selectSignalGeneratorResultX+","+selectSignalGeneratorResultY;

                                }
                                console.log("음향신호기가 아닙니다. 해당 좌표는 x, y: ", x, y, "\n 변경된 음향신호기의 좌표는 x: ", selectSignalGeneratorResultX, "y: ", selectSignalGeneratorResultY );
                            
                            }

                            else {result.features[i].signal_generator = true;}
                           
                        }

                        if(exfalseCount>falseCount){
                            finalResult = result;
                            exfalseCount = falseCount;
                            currentBoardCount = boardCount; 
    
                        }
                        


                    }
                    
                    console.log("falseCount: ",falseCount)

                    
                

                if(originFalseCount ==-1){
                    originFalseCount = falseCount;
                }
                j++;        

                }      
                if(stop ==1){
                    break;
                }
                if(clear==false){

                    console.log("기존 횡단보도로 근처 음향신호기를 찾았지만 전부를 음향신호기로 대체할 수 없습니다.");
                    //이전에 돌았던 경유지를 빼고 다시 API를 요청해 돌린다. 
                    for(let k in selectsignalGeneratorMoreListResult){
                        //한번 등록한적 있는 경유지 리스트에 있는 목록들을 찾는다. 
                        for(let h in pass){

                            //이미 찍혔던 경유지의 경우 무시한다.
                            //현재는 x좌표만을 이용해 비교하게 되어 있지만 x가 겹칠 혹시 모를 경우의 수를 대비해 y좌표까지 비교하도록 변경해주어야 한다. 
                            if(pass[h]==selectsignalGeneratorMoreListResult[k].pp.x){
                                console.log("이미 찍혔던 경유지 좌표 ", pass[h]);
                                break;
                            }
                            //지나가지 않았던 경유지의 경우 
                            else{
                                if(h  == pass.length-1){
                                    //새로운 경유지로 등록해준다. 
                                    passLists = `${selectsignalGeneratorMoreListResult[k].pp.x},${selectsignalGeneratorMoreListResult[k].pp.y}`;
                                    console.log("**************새로운 경유지 좌표: ", passLists);
                                     j=0;
                                    stop = 1;
                                    
                                    pass.push(selectsignalGeneratorMoreListResult[k].pp.x,selectsignalGeneratorMoreListResult[k].pp.y)
                                    selectsignalGeneratorMoreListResult = {};
                                }

                            }

                        }
                        if(stop ==1){
                            console.log("stop(1)", stop)
                            stop = 0; 
                            break;
                        }
                    }
                clearStep++;
                 }

                 if(timeout==1){
                    return finalResult.error = "TimeOut"};
                 
            }
            //path: lastPath, falseCount: falseCount, firstTime: firstTime, firstDistance: firstDistance, lastTime: lastPath[0].properties.totalTime, lastDistance: lastPath[0].properties.totalDistance, boardCount: boardCount/2};

            currentTotalDistance = finalResult.features[0].properties.totalDistance;
            currentTotalTime =  finalResult.features[0].properties.totalTime;
            console.log("originTime: ",originTotalTime, "current:", currentTotalTime);
            console.log("originDistance: ", originTotalDistance, "current:", currentTotalDistance);
            console.log("originFalseCount: ", originFalseCount, "currnet: ", falseCount);
            console.log("originBoardCount: ",boardCount)
            finalResult = {finalResult: finalResult, originFalseCount: originFalseCount, falseCount:falseCount, originTotalTime:originTotalTime, currentTotalTime:currentTotalTime, originTotalDistance: originTotalDistance, currentTotalDistance: currentTotalDistance, boardCount:boardCount}
            if(clear == true)
                console.log("전부 음향신호기로 대체되었습니다!!!")
            else{
                console.log("첫번째 요청이 마무리되었습니다. ");
            }
            connection.release();
            
            if(clear==true||finalResult.error){
                console.log("첫번째 요청에서 음향신호기로 모두 대체돼 Result1을 반환합니다. ")
                return finalResult;
            }else{

                result2 = await getPedestrainPathLogic(startX, startY, endX, endY, startName, endName);
                console.log("here:",result2.error)
                if(result2.error){
                    if(finalResult.error){
                        return "도보 길찾기 로직 실패 "
                    }

                    return result;
                }
                console.log(result2)
                //음향신호기가 아닌 신호기의 갯수가 같을 때 
                if(falseCount==result2.falseCount){

                    //1. 무조건 result2가 반환되어야 하는 경우
                    //- 시간차이가 많이 나는 경우: 15분
                    //-  distance가 많이 차이나는 경우: 1500m 
                    //- 일반 횡단보도가 더 많은 경우: 4개

                    if(result2.lastTime-currentTotalTime>=900||result2.lastDistance-currentTotalDistance>=1500||result2.boardCount-currentBoardCount>=4){
                        console.log("result2.lastTime-currentTotalTime:", result2.lastTime-currentTotalTime)
                        console.log("result2.lastDistance-currentTotalDistance:", result2.lastDistance-currentTotalDistance)
                        console.log("result2.boardCount-currentBoardCount:", result2.boardCount-currentBoardCount)
                        console.log("기준 상 값의 차이로 인해 Result1이 출력되었습니다.")
                        return finalResult;

                    }else{

                        if(result2.lastTime>currentTotalTime){
                            console.log("시간차이로 인해 Result1이 출력되었습니다.")
                            return finalResult;
                        }
                        else if(result2.boardCount>currentBoardCount){
                            console.log("일반 횡단보도 갯수의 차이로 인해 Result1이 출력되었습니다.")
                            return finalResult;
                        }
                        else if(result2.lastDistance>currentTotalDistance){
                            console.log("거리차이로 인해 Result1이 출력되었습니다.")
                            return finalResult;
                        }else{
                            console.log("Result2가 출력되었습니다. ")
                        return result2;
                        }

                    }

                }else if(result2.falseCount>falseCount){
                    console.log("Result1이 출력되었습니다. ")
                    return finalResult;

                }else{
                    console.log("Result2가 출력되었습니다. ", "falseCount: ", result2.falseCount)
                    return result2;
                }
                

                
            }
        }catch(err){
            console.log(err);
            console.log("err나서 두번째 함수로 돌려버림")
            return await getPedestrainPathLogic(startX, startY, endX, endY, startName, endName);
            return {error: true};
        }
    },

    getTransportPath: async (SX, SY, EX, EY, SName, EName) =>{
        try{
            let result = {};
            await axios.post(`https://api.odsay.com/v1/api/searchPubTransPathT?apiKey=${encodeURIComponent(process.env.ODSAY_API_KEY)}&SX=${SX}&SY=${SY}&EX=${EX}&EY=${EY}&OPT=1`)
            .then(response => {
                console.log(response.data);
                result = response.data;
            }).catch(err => {
                result = {error: err.error.msg};
            });
            if (result.error) {
                return result;
            }
            result = result.result;
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