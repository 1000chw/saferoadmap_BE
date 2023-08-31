import pathfindingProvider from './pathfindingProvider';

const pathfindingController = {
    getPedestrainPath: async (req, res) => {
        try{
            const startX = req.query.startX;
            const startY = req.query.startY;
            const endX = req.query.endX;
            const endY = req.query.endY;
            const startName = req.query.startName;
            const endName = req.query.endName;
            const result = await pathfindingProvider.getPedestrainPath(startX, startY, endX, endY,startName, endName);
            if (result.error)
                return res.status(503).json({code: 3000, message: "도보 길찾기 경로 탐색 실패", result: result.error});
            return res.status(200).json({code: 1000, message: "도보 길찾기 경로 탐색 완료", result: result});
        } catch(err){
            console.log(err);
            return res.status(500).json({code: 3000, message: "도보 길찾기 경로 탐색 실패"});
        }
    },
 
    getTransportPath: async (req, res) => {
        try{
            const SX = req.query.SX;
            const SY = req.query.SY;
            const EX = req.query.EX;
            const EY = req.query.EY;;
            const result = await pathfindingProvider.getTransportPath(SX, SY, EX, EY);

            if (result.error)
                return res.status(503).json({code: 3001, message: result.error});
            return res.status(200).json({code: 1001, message: "대중교통 길찾기 경로 탐색 완료", result: result});
        } catch(err){
            console.log(err);
            return res.status(500).json({code: 3001, message: "대중교통 길찾기 경로 탐색 실패"});
        }
    },
}

export default pathfindingController;