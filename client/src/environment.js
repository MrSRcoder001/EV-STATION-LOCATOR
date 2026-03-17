// Automatically detect if running on localhost
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const server = isLocal ? "http://localhost:5000" : "https://ev-station-locator-mbxy.onrender.com";

export default server;