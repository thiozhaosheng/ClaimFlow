# How to Start the Server Locally

Follow these three simple steps to get the Auth Gateway running.

## 1: Install Dependencies
Open your terminal in the `auth_gate` folder and run:
```bash
npm install
```

## 2. Environment Configuration
The gateway uses a `.env` file for local settings.

- Create a `.env` file in the `auth_gate` root for your local testing (overriding the cloud defaults).

**Example `.env` values:**
```env
PORT=3001
GATEWAY_LISTEN_IP=localhost
BASE_SERVICE_HOST=localhost
BASE_SERVICE_PORT=3000
```

## 3. Running the Server

There are three primary ways to start the Auth Gateway:

### Standard Start
Runs the server normally using Node.js.
```bash
npm start
```

### Development Mode
Runs the server using `nodemon`, which automatically restarts the server when file changes are detected.
```bash
npm run dev
```
```
