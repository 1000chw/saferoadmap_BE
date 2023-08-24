import app from "../../config/express"
import express from 'express';
import pool from "../../config/database"
import axios from "axios";

export const dataTransfer= async() =>{
    try{
    
    const connection = await pool.getConnection();

    //app key List 
    const keyList = [];
    keyList.push(process.env.TMAP_APP_KEY);
    keyList.push(process.env.TMAP_APP_KEY2);

    //등록된 T-MAP KEY의 개수만큼 반복한다.
    for(var i = 0; i<keyList.length;i++){
        console.log(i , "번째 KEY : ", keyList[i]);
        //각 T-MAP KEY마다 999번 반복한다. 테스트 과정에서 임시로 10개로 사용
        for(var j = 0; j < 10; j ++){
            console.log(j,"번째 데이터 변환");
            //기존의 데이터 정보를 가지고 온다.
            const db_data = await connection.query('select * from info order by id asc limit 1;')
            const db_data_id = db_data[0][0].id;
            const db_data_x = db_data[0][0].pp.x;
            const db_data_y = db_data[0][0].pp.y;
            //const db_data_x = 127.09665169654401;
            //const db_data_y = 37.50258870140582;
           
            var t_result=true;
            //T-map 요청
            const t_map_result = await axios({
                method:"post",
                url:"https://apis.openapi.sk.com/tmap/routes/pedestrian",
                headers:{
                    "Accept": "application/json",
                    "Content-Type" : "application/json",
                    "appKey" : keyList[i]
                },
                params:{
                    "startX":db_data_x,
                    "startY":db_data_y,
                    "endX":db_data_x+0.001,
                    "endY":db_data_y+0.001,
                    "startName":"start",
                    "endName":"end",
                    "passList":`${db_data_x},${db_data_y+0.0001}_
                                ${db_data_x},${db_data_y-0.0001}_
                                ${db_data_x+0.0001},${db_data_y}_
                                ${db_data_x-0.0001},${db_data_y}`
                    
                }

            }).catch(function(error){
                if(error.response.data.error.code=="QUOTA_EXCEEDED")
                {
                    t_result = false; 
                }
                console.log(error.response.data)

            })

            if(!t_result){
                console.log("break");
                break;
            }
            var n=0;

            //T-map API 요청 ERR Handlering
            if(t_map_result.status==(204||400||500)){
                console.log("T-map API 요청 실패");
                connection.query(`delete from info where id = ${db_data_id};`);
                connection.query(`insert into info(pp) value(ST_GeomFromText('POINT(${db_data_x} ${db_data_y}'));`);
                //return res.status(t_map_result.status).json({code: 3000, message: "데이터 변경 실패", result: t_map_result.statusText});
            }

            //response 데이터에서 횡단보도 데이터를 찾는다.
            for(var k in t_map_result.data.features){
            
                if(t_map_result.data.features[k].properties.facilityType ="15"&&t_map_result.data.features[k].properties.turnType>=211&&t_map_result.data.features[k].properties.turnType<=217){
                    //횡단보도 좌표
                    n++;
                    const t_map_x =t_map_result.data.features[k].geometry.coordinates[0];
                    const t_map_y = t_map_result.data.features[k].geometry.coordinates[1];
                    console.log("데이터 변환 성공",db_data_y ,db_data_x, ": ",t_map_y,t_map_x);
                    //횡단보도 좌표 저장
                    connection.query(`insert into signal_generator(t_map, seoul) values( ST_GeomFromText('POINT(${t_map_x} ${t_map_y})'),ST_GeomFromText('POINT(${db_data_x} ${db_data_y})'));`)
                    //기존 횡단보도 데이터 삭제
                    connection.query(`delete from info where id = ${db_data_id};`);
                    
                    //for문 탈출
                    break;
                }

            }
            k = 0; 
      
            //횡단보도 데이터가 없을 경우 
            //아직 확인된 경우가 있지 않아 일단 데이터베이스 마지막에 넣어놓기로 했다. 후에 수작업 등 처리
            if(n==0){
                console.log("횡단보도 데이터가 존재하지 않습니다."+"\n"+db_data_x,db_data_y);
                connection.query(`delete from info where id = ${db_data_id};`);
                connection.query(`insert into info(pp) value(ST_GeomFromText('POINT(${db_data_x} ${db_data_y})'));`);
            }



        }
        j = 0; 
        
    }

    //method 최종 반환
    i = 0; 
    connection.release();
    return 0;
}catch(err){
    console.log(err);

}
}
