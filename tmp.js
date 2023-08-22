const fs = require('fs');
const proj4 = require('proj4');

const save_file = () => {
    const wgs84 = '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs'
    const epsg5186 = '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs'
    const csv3 = fs.readFileSync('서울시 음향신호기3.csv', 'utf8');
    const csv4 = fs.readFileSync('서울시 음향신호기4.csv', 'utf8');
    const csv5 = fs.readFileSync('서울시 음향신호기5.csv', 'utf8');
    const rows3 = csv3.split('\n')
    const rows4 = csv4.split('\n')
    const rows5 = csv5.split('\n')
    let res3 = new Map();
    let res4 = new Map();
    let res5 = new Map();
    res3.set(1, [1]);
    res3.get(1).push(2);
    console.log(res3.get(1));
    res3.delete(1);

    console.log(rows3[0].split(',')[1]);
    for (let i=0; i<rows3.length; i++) {
        for (let j=0; j<rows3.length; j++) {
            if (rows3[j].split(',')[1] === rows3[i].split(',')[1]) {
                if (res3.has(i+1)) res3.get(i+1).add(j+1);
                else if (!res3.has(j+1)){
                    res3.set(i+1, new Set());
                    res3.get(i+1).add(j+1)
                }
                else break;
            }
        }
    }
    for (let i=0; i<rows4.length; i++) {
        for (let j=0; j<rows4.length; j++) {
            if (rows4[j].split(',')[1] === rows4[i].split(',')[1]) {
                if (res4.has(i+1)) {
                    res4.get(i+1).add(j+1);
                }
                else if (!res4.has(j+1)){
                    res4.set(i+1, new Set());
                    res4.get(i+1).add(j+1)
                }
                else break;
            }
        }
    }
    for (let i=0; i<rows5.length; i++) {
        for (let j=0; j<rows5.length; j++) {
            if (rows5[j].split(',')[1] === rows5[i].split(',')[1]) {
                if (res5.has(i+1)) res5.get(i+1).add(j+1);
                else if (!res5.has(j+1)){
                    res5.set(i+1, new Set());
                    res5.get(i+1).add(j+1)
                }
                else break;
            }
        }
    }
    for (let res of res3.values()){
        fs.appendFileSync('log3-1.txt', String(Array.from(res))+'\n')
    }
    for (let res of res4.values()){
        fs.appendFileSync('log4-1.txt', String(Array.from(res))+'\n')
    }
    for (let res of res5.values()){
        fs.appendFileSync('log5-1.txt', String(Array.from(res))+'\n')
    }
}

save_file();