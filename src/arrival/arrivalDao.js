export const selectOrd = async(connection, route_id, station_name, stationId)=>{

    const selectOrdQuery = `select ord from bus_info where station_name = "${station_name}" and route_id = ${route_id} and node_id = ${stationId};`;
    const [selectOrdRow] = await connection.query(selectOrdQuery);
    
    return selectOrdRow[0].ord;


};