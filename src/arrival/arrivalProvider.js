import axios from 'axios';
require('dotenv').config();

const arrivalProvider = {
    findBusArrivalTime: async (stationId, busRouteId, ord) => {
        const response = await axios({
            method:'get',
            url: `http://ws.bus.go.kr/api/rest/arrive/getArrInfoByRoute?ServiceKey=${process.env.SERVICE_KEY}&stId=${stationId}&busRouteId=${busRouteId}&ord=${ord}`
        });
        console.log(process.env.SERVICE_KEY)
        console.log(response);
        /*
        const {data} = response;

        if(data){}

        let result = {}; 
        result += data.stNm;

        result += data.rtNm(data.arrmsg1);


        console.log(apiResult);

        return result;*/

    },
    
    getSubwayArrivalTime: async (stationName, subwayCode, way) => {
        let result = {};
        console.log(process.env.SERVICE_KEY)
        await axios.get(`http://swopenAPI.seoul.go.kr/api/subway/${process.env.SUBWAY_API_KEY}/json/realtimeStationArrival/0/10/${stationName}`)
        .then((response) => {
            if (response.data.errorMessage.status !== 200){
                result = {error: response.data.message};
            }
            else {
                const res = response.data.realtimeArrivalList;
                for (let i = 0; i < res.length; i++) {
                    if (subwayCode === res[i].subwayId){
                        if(way === 0 && res[i].updnLine === '상행' || res[i].updnLine === '내선'){
                            result = {trainLineNm: res[i].trainLineNm, arrivalMassag: res[i].arvlMsg2, currentStation: res[i].arvlMsg3, trainNo: res[i].btrainNo}
                        }
                        else if(way === 1 && res[i].updnLine in ['하행', '외선']){
                            result = {trainLineNm: res[i].trainLineNm, arrivalMassag: res[i].arvlMsg2, currentStation: res[i].arvlMsg3, trainNo: res[i].btrainNo}
                        }
                    }
                }
            }
        }).catch(err => {
            return {error: "지하철 도착 시간 확인 도중 문제가 발생했습니다."};
        });
        if (result === {}){
            return {error: "경로에 해당하는 지하철이 존재하지 않습니다."};
        }
        return result;
    },

    subwayCodeMapping: async (subwayCode) => {
        let res = '';
        switch (subwayCode) {
            case '1': res =  '1001'; break;
            case '2': res = '1002'; break;
            case '3': res = '1003'; break;
            case '4': res = '1004'; break;
            case '5': res = '1005'; break;
            case '6': res = '1006'; break;
            case '7': res = '1007'; break;
            case '8': res = '1008'; break;
            case '9': res = '1009'; break;
            case '104': res = '1063'; break;
            case '101': res = '1065'; break;
            case '108': res = '1067'; break;
            case '116': res = '1075'; break;
            case '109': res = '1077'; break;
            case '113': res = '1092'; break;
            case '114': res = '1093'; break;
            case '112': res = '1081'; break;
            default: res = -1; break;
        }
        return res;
    }
}

export default arrivalProvider;