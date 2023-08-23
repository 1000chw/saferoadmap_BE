import app from "../../config/express"
import express from 'express';
import pool from "../../config/database"
import axios from "axios";

const dataRouter = express.Router();
dataRouter.get("/data",  async(req,res) =>{

    //app key 
    const connection = await pool.getConnection();

    console.log(process.env.TMAP_APP_KEY);

    if(process.env.TMAP_APP_KEY){

        for(var i = 0; i < 1; i ++){

            //const db_data = await connection.query('select * from signal_generator order by id asc limit 1;')
            //const db_data_id = db_data[0][0].id;
            //const db_data_x = db_data[0][0].point.x;
            //const db_data_y = db_data[0][0].point.y;
            const db_data_x = 127.09665169654401;
            const db_data_y = 37.50258870140582;
            console.log(db_data_x);
            //T-map 요청
            const t_map_result = await axios({
                method:"post",
                url:"https://apis.openapi.sk.com/tmap/routes/pedestrian",
                headers:{
                    "Accept": "application/json",
                    "Content-Type" : "application/json",
                    "appKey" : `${process.env.TMAP_APP_KEY}`
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

            })
            
            //response 데이터에서 횡단보도 데이터를 찾는다.
            for(var i in t_map_result.data.features){
                if(t_map_result.data.features[i].properties.facilityType ="15"&&(t_map_result.data.features[i].properties.turnType>=211&&t_map_result.data.features[i].properties.turnType<=217)){
                    console.log("횡단보도 횡단보도횡단보도")
                    //횡단보도 좌표
                    console.log(t_map_result.data.features[i].geometry.coordinates);
                    //횡단보도 좌표 저장
                    

                }

            }
            console.log(t_map_result.data);
            return res.send(t_map_result.data);

        }
    }

    return null;

})

export default dataRouter;