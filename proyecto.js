const Gpio = require('pigpio').Gpio;
const http = require('http').createServer(handler);
const fs = require('fs');
const io = require('socket.io')(http);
const ledRed = new Gpio(4, { mode: Gpio.OUTPUT });
const ledGreen = new Gpio(17, { mode: Gpio.OUTPUT });
const ledBlue = new Gpio(27, { mode: Gpio.OUTPUT });
const motionSensor = new Gpio(19, { mode: Gpio.INPUT, alert: 
true });
const pushButton = new Gpio(26, { mode: Gpio.INPUT, 
pullUpDown: Gpio.PUD_UP, edge: Gpio.EITHER_EDGE});
const lightSensor = new Gpio(13, { mode: Gpio.INPUT, 
pullUpDown: Gpio.PUD_DOWN });
// Iniciar con el 25% de intensidad
let isMotionDetected = false;
let turnOffTimer;
let blinkInterval= null;
let isSocketEventActive=false ;
let socketEventTimeout;
let isButtonPressed = false;
// Inicializado como true para permitir el control por los sensores 
al principio
// Configurar RGB LED
ledRed.pwmWrite(25);
ledGreen.pwmWrite(25);
ledBlue.pwmWrite(25);
http.listen(8081);
function handler(req, res) {
 fs.readFile(__dirname + '/public/rgb.html', function(err, data) { 
//read file rgb.html in public folder
 if (err) {
 res.writeHead(404, {'Content-Type': 'text/html'}); //display 404 
on error
 return res.end("404 Not Found");
 }
 res.writeHead(200, {'Content-Type': 'text/html'}); //write HTML
 res.write(data); //write data from rgb.html
 return res.end();
 });
}
io.sockets.on('connection', function (socket) {
 socket.on('rgbLed', function (data) {
 console.log(data);
 
 redRGB=parseInt(data.red);
 greenRGB=parseInt(data.green);
 blueRGB=parseInt(data.blue);
 console.log("rbg: " + redRGB + ", " + greenRGB + ", " + blueRGB); 
//output converted to console
 ledRed.pwmWrite(redRGB); //set RED LED to specified value
 ledGreen.pwmWrite(greenRGB); //set GREEN LED to specified 
value
 ledBlue.pwmWrite(blueRGB); 
 isSocketEventActive = true; // Marcar que el evento del socket 
está activo
 turnOffLed();
 
 if (socketEventTimeout) {
 clearTimeout(socketEventTimeout);
 }
 socketEventTimeout = setTimeout(function () {
 isSocketEventActive = false; // Marcar que el evento del socket 
ha terminado
 }, 10000);
 //io.sockets.emit('updateSliders', { red: redRGB, green: 
greenRGB, blue: blueRGB});
 });
});
function turnOffLed() {
 if (!isSocketEventActive && !isButtonPressed) {
 ledRed.pwmWrite(0);
 ledGreen.pwmWrite(0);
ledBlue.pwmWrite(0);
 // Restaurar la intensidad al 25%
 ledRed.pwmWrite(25);
 ledGreen.pwmWrite(25);
 ledBlue.pwmWrite(25);
 }
 isMotionDetected = false;
 clearInterval(blinkInterval);
} 
// ...
function checkLight() {
 // Leer el valor de la fotoresistencia
 const lightValue = lightSensor.digitalRead();
 if (isButtonPressed) {
 // Parpadear el LED en rojo si el botón está presionado
 blinkRed();
 }
 else if (isMotionDetected || isSocketEventActive) {
 setTimeout(checkLight, 1000);
 return;
 }
 // Si el valor es 1 (Alta luz), apagar el LED
 if (lightValue === 1 && !isMotionDetected) {
 
 ledRed.pwmWrite(0);
 ledGreen.pwmWrite(0);
 ledBlue.pwmWrite(0);
 console.log('Apagado');
 setTimeout (checkLight, 1000);
 
 }else if (lightValue === 0 && !isMotionDetected ) {
 ledRed.pwmWrite(25);
 ledGreen.pwmWrite(25);
 ledBlue.pwmWrite(25);
 console.log('prendido ');
 setTimeout (checkLight, 1000);
 }
 
 
}
 checkLight();
motionSensor.on('alert', function (level,tick) {
//se lee el valor de la fotoresistencia 
 const lightValue = lightSensor.digitalRead();
 if (level === 0 && lightValue === 0) {
 // Movimiento detectado
 console.log('¡Movimiento detectado! Encendido, Luz Maxima');
 isMotionDetected = true;
 clearTimeout(turnOffTimer);
 // Ajustar la intensidad a su máximo valor
 
 ledRed.pwmWrite(255);
 ledGreen.pwmWrite(255);
 ledBlue.pwmWrite(255);
 
 }else if(lightValue === 0) {
 
 console.log('¡No hay movimiento!'); 
 turnOffTimer = setTimeout(turnOffLed, 5000);
 
 } else if (level === 0){
 sMotionDetected = true;
 console.log('¡Movimiento detectado!, apagado'); 
 
 
 } else {
 sMotionDetected = false;
 console.log('¡No hay movimiento!, apagado'); 
 
 }
 
}
);
pushButton.on('interrupt', function (level) {
 if (level === 0) {
 // Botón presionado
 if (blinkInterval === null) {
 // Comienza el parpadeo si no está en curso
 blinkInterval = setInterval(function () {
 // Lógica de parpadeo aquí 
 ledBlue.pwmWrite(0);
 ledGreen.pwmWrite(0);
 ledRed.digitalWrite(ledRed.digitalRead() ^ 1); // Alternar 
entre 0 y 1 (parpadeo)
 }, 500);
 
 } else {
 // Detén el parpadeo si ya está en curso
 clearInterval(blinkInterval);
 blinkInterval = null;
 // Asegúrate de dejar el LED rojo encendido al detener el 
parpadeo
 ledRed.digitalWrite(1);
 }
 }
});
process.on('SIGINT', function () {
 turnOffLed();
 ledRed.digitalWrite(0); // Apagar el LED al salir
 ledGreen.digitalWrite(0);
 ledBlue.digitalWrite(0);
 motionSensor.digitalWrite(0);
 lightSensor.digitalWrite(0);
 
 process.exit();
});