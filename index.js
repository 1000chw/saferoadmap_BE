import { scheduleJob} from 'node-schedule';
import { dataTransfer } from './src/scheduler/DataSchedule';
import app from './config/express';

app.listen(3000, () => {

    scheduleJob('0 23 200 * * *', function() {
        dataTransfer();
        console.log("finish")

    });

    console.log('Server is running on port 3000')});
