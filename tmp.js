const fs = require('fs');
const proj4 = require('proj4');

const wgs84 = '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs'
const epsg5186 = '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs'

const csv = fs.readFileSync('서울시 음향신호기 관련 정보.csv', 'utf8');
const rows = csv.split('\n')
if (rows[rows.length - 1] === '') rows.pop();

for (const i in rows) {
    const row = rows[i];
    const data = row.split(',');
    if (data[5] === '' || data[6] === '') continue;
    const converted = proj4(epsg5186, wgs84, [Number(data[5]), Number(data[6])]);
    fs.appendFileSync('서울시 음향신호기.csv', `${data[2]}, ST_GeomFromText('POINT(${converted[0]} ${converted[1]})')\n`);
}
