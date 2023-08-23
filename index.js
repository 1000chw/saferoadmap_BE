import { scheduleJob } from 'node-schedule';
import app from './config/express';

app.listen(3000, () => {
    /*scheduleJob('* * 1 * * *', function() {

    });*/
    console.log('Server is running on port 3000')});
