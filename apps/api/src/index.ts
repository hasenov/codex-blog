import { createApp } from './app/create-app.js';

const { app, config } = createApp();

app.listen(config.PORT, () => {
    console.info(`${config.APP_NAME} listening on port ${config.PORT}`);
});
