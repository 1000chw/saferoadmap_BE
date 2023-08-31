require('dotenv').config();
import axios from 'axios';
import pool from "../../config/database";
import pathfindingDao from './pathfindingDao';

const headers = {
    "appKey": process.env.TMAP_APP_KEY2
};

const pathfindingProvider = {
    getPedestrainPath: async (startX, startY, endX, endY, startName, endName, passList) =>{
        try{
            //모든 횡단보도가 음향신호기라면 true 아니면 false
            let clear = false;
            let result = {};
            let finalResult = {};
            let j = 0; 
            let passLists = passList;
            const connection = await pool.getConnection();
            const pass=[];
            let clearStep = 0; 
            let selectSignalGeneratorListResult = {};
            let selectsignalGeneratorMoreListResult = {};
            //처음 경로를 찾았을 때 걸린 시간
            let originTotalTime = 0;
            let originTotalDistance = 0; 
            let originFalseCount = -1;
            let currentTotalTime = 0; 
            let currentTotalDistance = 0; 
            
            //API 요청 횟수
            let count = 0; 
            // 음향신호기가 아닌 횡단보도의 개수
            let falseCount = 0; 
            let exfalseCount = 110; 
            //
            let stop = 0; 

            let z = 0 ;
           
            while(clear!=true&&clearStep<4){

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
                    });
         

                    if(result.type==undefined){
 
                        result = result.replace(/ /g,'').replace(/\s/g,'').replace(/\r/g,"").replace(/\n/g,"").replace(/\t/g,"").replace(/\f/g,"")
                        result = result.split(String.fromCharCode(0)).join("");
                        result = JSON.parse(result)
                        
                    }

                    passLists=""
                    //passList가 넘어 오지 않았을 때는 empty string으로 변경해준다. 
                    if(passLists==undefined){
                        passLists = "";
                        }

                    //정상적으로 T-map API가 도착했을 경우 
                    if (!result.error){
                
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
                                    //횡단보도 전 분기점의 x,y 좌표를 가지고 온다. 
                                    const [x_point,y_point] = result.features[i].geometry.coordinates;
                                    //위의 좌표를 가지고 가장 가까운 10개의 음향신호기 위치를 가지고 온다. 
                                    selectSignalGeneratorListResult = await pathfindingDao.selectListSignalGenrator(connection,x_point,y_point);
                                
                                }
                                else if(clearStep==0&&i<2){
                                    //횡단보도 전 분기점의 x,y 좌표를 가지고 온다. 
                                    const [x_point,y_point] = result.features[i].geometry.coordinates;
                                    //위의 좌표를 가지고 가장 가까운 10개의 음향신호기 위치를 가지고 온다. 
                                    selectSignalGeneratorListResult = await pathfindingDao.selectListSignalGenrator(connection,x_point,y_point);
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
                                    console.log("falsecount가 5가 넘어갑니다.")
                                    stop =1;
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
                    }
                    if(exfalseCount>falseCount){
                        finalResult = result;
                        exfalseCount = falseCount;
                    }
                
                }

                if(originFalseCount ==-1){
                    originFalseCount = falseCount;
                }
                j++;        

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

            }
            currentTotalDistance = finalResult.features[0].properties.totalDistance;
            currentTotalTime =  finalResult.features[0].properties.totalTime;
            console.log("originTime: ",originTotalTime, "current:", currentTotalTime);
            console.log("originDistance: ", originTotalDistance, "current:", currentTotalDistance);
            console.log("originFalseCount: ", originFalseCount, "currnet: ", falseCount);

            if(clear == true)
                console.log("전부 음향신호기로 대체되었습니다!!!")
            else{
                console.log("유감스럽지만 마음의 준비를..");
            }
            connection.release();
            return finalResult;
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