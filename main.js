const { app, BrowserWindow, ipcMain } = require('electron');
const fetch = require('node-fetch');
const express = require('express');
const cors = require('cors');
const appServer = express();
const { Printer } = require('ipp');

appServer.use(cors());
appServer.get('/', (req, res) => {
  res.send('Hello from Electron!');
});



const port = 3300; // Choose your desired port number
appServer.listen(port, () => {
  console.log(`Express server running on port ${port}`);
});


const path = require('node:path');
const { API_AUTORIZATION_USERNAME, API_AUTORIZATION_PASSWORD, API_URL } = require('./Constants');
// const { callGET } = require('./APIUtils');
// const { getUserInfoFromSession } = require('./CommonFuntions');
let printers;
const createWindow = async() => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      devTools: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    },
    // show:false
  });

  win.loadFile('index.html');
  // win.loadURL(`http://localhost:${port}`);
 // win.openDevTools();

  // Get printer list in the main process and send it to the renderer securely
 const allprinter = await win.webContents.getPrintersAsync()
//  .then((printer) => {
//     win.webContents.send('printer-list', printer);
//   });
win.webContents.send('printer-list', allprinter);
printers = allprinter;
// console.log(printer);

};
// Handle the 'printer-list' message from the renderer
// ipcMain.on('get-printer', () => {
//   // You can optionally perform additional actions here in the main process
//   // before sending the printer list.
//   const win = BrowserWindow.getFocusedWindow(); // Get the focused window
//   win.webContents.send('printer-list', printer); // Send the list to the renderer
// });

app.whenReady().then(() => {
  createWindow();
});

appServer.get('/printers', (req, res) => {
//   const payload = createPayload(printers);
// console.log('payload', JSON.stringify(printers));
  res.send(printers);
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// app.activate(() => {
//   if (BrowserWindow.getAllWindows().length === 0) {
//     createWindow();
//   }
// });

ipcMain.handle("getAPI", async () => {
  try {
    // console.log(printers);
    // console.log(getIPAddress());
    // Make an HTTP GET request to the API endpoint
    const response = await fetch("https://dummy.restapiexample.com/api/v1/employees");

    // Check if the response is OK
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Parse the JSON response
    const data = await response.json();
    // Return the data
    return data;
  } catch (error) {
    // Handle errors
    console.error('Error fetching API:', error.message);
    throw error; // Rethrow the error to be caught elsewhere if needed
  }
});
ipcMain.handle('printJob', async()=>{

  // const user = getUserInfoFromSession();
  // console.log('user', user);
  // return ;
  const response  = await callGET('printer/get-jobs/')//fetch('http://localhost:8080/printer/get-jobs/b4ec49de-7d40-41d3-a711-724d375e5fcb/cdbd0fe3-f10a-40d4-a211-02b4b0c65ff8')
 
  const printJobs = await response.json();

  return printJobs;
  if(printJobs.code == 200){
    // console.log("printJobs", printJobs.data);
    const reponseData = printJobs.data;
    reponseData.forEach(async (item, index) =>{
      const printerName = item.printer_name;
      const printerUrl = 'ipp://192.168.1.93/printers/HP-LaserJet-M1005';
      var buf = Buffer.from('HELLO WORLD!', 'utf8');
      const pdfData = Buffer.from(item.print_data, 'base64');
      console.log('item.print_data', pdfData,"\n buf", buf)

      const printer = new Printer(printerUrl);
console.log("printer", printer);
      printer.execute('Print-Job', {
        'operation-attributes-tag': {
          'requesting-user-name': 'system28',
          "job-name": "My Test Job",
          'document-format': 'text/plain'//'application/pdf'
        },
        data: buf
      }, (err, res) => {
        if (err) {
          console.error('Error printing:', err);
          return;
        }
      
        console.log('Print job sent successfully:', res.statusCode);
      });
  /*const win = BrowserWindow.getFocusedWindow();
  // console.log("win", win)
  const options = {
    silent: false,
    // deviceName: printerName,
     landscape: false, 
    pagesPerSheet: 1, 
    collate: false, 
    copies: 1, 
    header: 'Header of the Page', 
    footer: 'Footer of the Page',
    printBackground: true
  }
  // win.webContents.print();
  //  const allprinter = await win.webContents.getPrintersAsync()

  console.log("options", options, "allprinter")
  win.webContents.print(options, (success, errorType) => {
    if (!success) {
      console.log("errorType",errorType);
      // Optionally, show an error dialog to the user
      // dialog.showErrorBox('Print Error', `Failed to print: ${errorType}`);
    }
  });*/
    })

  }
 
})
ipcMain.handle('oauth', async(event, userDetail)=>{

  const { username, password } = userDetail;
  const usernameT= API_AUTORIZATION_USERNAME;
  const passwordT = API_AUTORIZATION_PASSWORD;
  const token = Buffer.from(`${usernameT}:${passwordT}`, 'utf8').toString('base64');

  // const payload = new FormData();
  // payload.append('username',username);
  // payload.append('password', password);
  // payload.append('grant_type', 'password')
  const payload = new URLSearchParams();
payload.append('username', username);
payload.append('password', password);
payload.append('grant_type', 'password');
  const response = await fetch(`${API_URL}oauth/token`,{
    method: 'POST',
    headers : {
      'Authorization': `Basic ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString()
  });  

    const data = await response.json();
    return data;
});


ipcMain.handle("sendPrinterDetails", async(event, userDetail)=>{
  try {

    // Make an HTTP GET request to the API endpoint
    const win = BrowserWindow.getFocusedWindow();
    const allPrinters = await win.webContents.getPrintersAsync()
    const payload = createPayload(allPrinters, userDetail);
    // console.log('payload', payload)
    const response = await fetch(`${API_URL}printer/receive`,{
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
// console.log("JSON.stringify(printer)", response);
    // Check if the response is OK
    // if (!response.ok) {
    //   throw new Error(`HTTP error! Status: ${response.status}`);
    // }else{
    //   app.quit();
    // }

    // Parse the JSON response
    const data = await response.json();
    // console.log(data);
    if(data.code === 200){
      // app.quit();
    }
    // Return the data
    return data;
  } catch (error) {
    // Handle errors
    console.error('Error fetching API:', error.message);
    throw error; // Rethrow the error to be caught elsewhere if needed
  }
})


const getIPAddress = () =>{
  const interfaces = require('os').networkInterfaces();
  for (let devName in interfaces) {
    const iface = interfaces[devName];

    for (let i = 0; i < iface.length; i++) {
      let alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
        return alias.address;
    }
  }
  return '0.0.0.0';
}

const createPayload = (printers, userDetail) => {
  let payload = [];
  console.log("userDetail", userDetail);
  const {id, org_id} = userDetail.data;
  printers.forEach(printer => {
    let printerObject = {
      "name": printer.name,
      "displayName": printer.displayName,
      "description": printer.description,
      "status": printer.status,
      "isDefault": printer.isDefault,
      "printer_uri_supported": printer.options['printer-uri-supported'] ,//ippAddress,
      "ip_address": getIPAddress(),
      "admin_id": id,
      "org_id" : org_id
    };
    
    payload.push(printerObject);
  });
console.log("payload", payload);
  return payload;
}
