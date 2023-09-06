import arrivalProvider from "./arrivalProvider";
import {body, validationResult} from "express-validator";


const arrivalController = {
    
    getSubwayArrivalTime: async (req, res) => {
        try {
            const stationName = req.query.station;
            const subwayCode = await arrivalProvider.subwayCodeMapping(req.query.subwayCode);
            if (subwayCode === -1) {
                return res.status(404).json({ code: 2000, message: "지하철 도착 시간 기능을 사용할 수 없는 노선입니다."});
            }
            const way = req.query.way;
            const result = await arrivalProvider.getSubwayArrivalTime(stationName, subwayCode, way);
            if (result.error) {
                return res.status(503).json({code: 3002, message: result.error})
            }
            return res.status(200).json({code: 1002, message: "지하철 도착 시간 확인 완료.", result: result});
        } catch (error) {
            return res.status(500).json({code: 3003, message: "서버 에러"})
        }
    },

    getBusArrivalTime: async (req,res) =>{

        try{
            const errors = validationResult(req);
            let result = []; 
            if(!errors.isEmpty()){
                return res.status(400).json({code: 3006, errors: errors.array()})
            }
            const {
                      query: {stationId, busRouteId, stationName} 
            } = req;
            //validation

            var busId=0;
            

            if(Array.isArray(req.query.busRouteId)==false){

                busId = req.query.busRouteId;
                const ord = await arrivalProvider.findBusOrd(busRouteId, stationName, stationId);
                if(ord.isEmpty){

                }
                const getBusArrivalTimeResult = await arrivalProvider.findBusArrivalTime(stationId,busId , ord);
                result.push({busId:busId, result: getBusArrivalTimeResult});  
                
                if(result.error!=null){
                    return res.status(500).json({code: 3004, messgae: "서버 에러", result})
                }
            }
            else{
         
            for(let i = 0; i<req.query.busRouteId.length; i++){
                busId = req.query.busRouteId[i];

                const ord = await arrivalProvider.findBusOrd(busId , stationName, stationId);

                const getBusArrivalTimeResult = await arrivalProvider.findBusArrivalTime(stationId,busId , ord);
                
                result.push({busId:busId, result: getBusArrivalTimeResult});         

                if(result[i].result.error!=null){
                    return res.status(500).json({code: 3004, messgae: "서버 에러", result})
                }

            }
        }
            console.log("버스 도착 시간 완료", result)
            return res.status(200).json({code: 1003, message: "버스 도착 시간 확인 완료", result: result})

        }catch(err){
            console.log(err);
            return res.status(500).json({code: 3004, message: "서버 에러"})
        }
    }



}

export default arrivalController;