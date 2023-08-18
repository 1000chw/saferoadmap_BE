require('dotenv').config();
import axios from 'axios';

const headers = {
    "appKey": process.env.TMAP_APP_KEY
};

const pathfindingProvider = {
    getPedestrainPath: async (startX, startY, endX, endY, startName, endName) =>{
        try{
            let result = {};
            await axios.post('https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1',{
                "startX": startX,
                "startY": startY,
                "endX": endX,
                "endY": endY,
                "startName": encodeURIComponent(startName),
                "endName": encodeURIComponent(endName)
            }, { headers }).then(response => {
                result = response.data;
            }).catch(err => {
                result = {error: err.response.data};
            });
            return result;
        }catch(err){
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