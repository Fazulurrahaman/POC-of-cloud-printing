const { contextBridge, ipcRenderer } = require('electron');
const axios = require('axios');
const { API_URL, API_STATUS_SUCCESS } = require('./Constants');
const { Printer } = require('ipp');

// const { callGET } = require('./APIUtils');
// const { setUserSession, getUserInfo, getUserInfoFromSession } = require('./CommonFuntions');

// Receive the printer list from the main process and expose it to the renderer
ipcRenderer.on('printer-list', (event, printers) => {
  contextBridge.exposeInMainWorld('getPrinters', {
    getAvailablePrinters: () => printers,
  });
});


const callPOST = (url, body, header) => {
	return axios.post(parameterizedURLAccessToken(url), body, {
	  headers: header
	});
}

const callPUT = (url, body, header) => {
	return axios.put(parameterizedURLAccessToken(url), body, {
	  headers: header
	});
}

const callDELETE = (url,body={}) => {
	return axios.delete(parameterizedURLAccessToken(url),{ data: body });
}

const callGET = (url) => {
    return axios.get(parameterizedURLAccessToken(url));
}

const fetchPrintJobs = async () => {
  const userDetails = getUserInfoFromSession();
  const { id, org_id } = userDetails.data;
  const res = await callGET(`printer/get-jobs/${id}/${org_id}`);
  let jobDatas = [];

  if (res.status === API_STATUS_SUCCESS) {
    const responseData = res.data;

    if (responseData.code === API_STATUS_SUCCESS) {
      for (let item of responseData.data) {
        const printerUrl = item.printer_address;
        const pdfData = Buffer.from(item.print_data, 'base64');

        const printer = new Printer(printerUrl);
        console.log("printer", printer);

        try {
          await new Promise((resolve, reject) => {
            printer.execute('Print-Job', {
              'operation-attributes-tag': {
                'requesting-user-name': 'rahaman',
                "job-name": 'ShipCRM',
                'document-format': 'application/pdf'
              },
              data: pdfData
            }, (err, res) => {
              if (err) {
                let job = {
                  ...item,
                  job_status: 2,
                  job_failure_description: err.message
                };
                jobDatas.push(job);
                console.error('Error printing:', err, "\n job", job);
                reject(err);
              } else {
                let job = {
                  ...item,
                  job_status: 1
                };
                jobDatas.push(job);
                console.log('Print job sent successfully:', res, "\n job", job);
                resolve(res);
              }
            });
          });
        } catch (error) {
          console.error('Failed to execute print job:', error);
        }
      }

      console.log("jobDatas", jobDatas);

      if (jobDatas.length > 0) {
        try {
          const response = await callPUT("printer/update/job-status", jobDatas);
          console.log("Update job status response", response);
        } catch (error) {
          console.error('Failed to update job status:', error);
        }
      }
    }
  }
};

/*const fetchPrintJobs =async ()=>{
  const userDetails = getUserInfoFromSession();
  const {id, org_id}= userDetails.data;
 const res = await callGET(`printer/get-jobs/${id}/${org_id}`)
 let jobDatas =[]
    if(res.status === API_STATUS_SUCCESS){
      const responseData = res.data;
      if(responseData.code === API_STATUS_SUCCESS){
       
        // responseData.data.forEach(async (item, index) =>{
          for(let item of responseData.data){
          const printerName = item.printer_name;
          const printerUrl = item.printer_address;//'ipp://192.168.1.93/printers/HP-LaserJet-M1005';
          var buf = Buffer.from('HELLO WORLD!', 'utf8');
          const pdfData = Buffer.from(item.print_data, 'base64');
          console.log("item", item);

          const printer = new Printer(printerUrl);
    console.log("printer", printer);
          printer.execute('Print-Job', {
            'operation-attributes-tag': {
              'requesting-user-name':'rahaman',
              "job-name": 'ShipCRM',
              'document-format': 'application/pdf'//'text/plain'
            },
            data: pdfData
          }, (err, res) => {
            if (err) {
              let job = {
                ...item,
                job_status: 2,
                job_failure_description:err.message
              }
              jobDatas.push(job)
              console.error('Error printing:', err,"\n job", job);

              return;
            }else{
              let job = {
                ...item,
                job_status: 1
              }
              jobDatas.push(job)
              console.log('Print job sent successfully:', res,"\n job", job);

            }     


          });
        }
        // })
      }
    }
console.log("jobDatas", jobDatas);
    if(jobDatas.length >0){

      callPUT("printer/update/job-status", jobDatas)
      .then(response =>{
        console.log("response", response);
      })
    }
   
}*/
const APIS ={

  getAPI: async()=>{
    const result = await ipcRenderer.invoke("getAPI");
    return result
  },
  sendPrinterDetails: async(userDetail)=> {
    const result = await ipcRenderer.invoke("sendPrinterDetails", userDetail);
    return result;
  },
  authorizeUser: async (userDetail)=>{
    const result = await ipcRenderer.invoke('oauth', userDetail);
    return result;
  },
  getPrintJob: fetchPrintJobs
  
}
contextBridge.exposeInMainWorld("APIS", APIS)


const setUserSession = (userAccessData) => {
  localStorage.setItem('access_token', userAccessData.access_token);
  localStorage.setItem('refresh_token', userAccessData.refresh_token);

}

const getToken = () => {
  return localStorage.getItem('access_token') || null;
}

const parameterizedURLAccessToken = (url) => {
const accessToken = getToken();
let tokenParameter = "";
var pattern = new RegExp(/\?.+=.*/g);
let paramsOperator = "?";
  if(pattern.test(url)) {
    paramsOperator = "&";
    
  }
if(accessToken) {
  tokenParameter = paramsOperator+'access_token='+accessToken;
}

return API_URL+url+tokenParameter;
}

getUserInfo = async () => {
  try {
      const response = await callGET('users/info');
      const responseData = response.data;
      if (responseData.code === API_STATUS_SUCCESS) {
          setUserInfoSession(responseData);
          return responseData;
      } else {
          // Handle unsuccessful response
          // this.props.Loader(false);
      }
  } catch (err) {
      console.log(err);
      // Handle error
      // this.props.Loader(false);
  }
}


const setUserInfoSession = (userDetailsData) => {
  localStorage.setItem('user_info', JSON.stringify(userDetailsData));  
}

const getUserInfoFromSession = () => {  
  const userInfo = localStorage.getItem('user_info'); 
  if (userInfo) return JSON.parse(userInfo);
  else return null;  
}
const commonFuntions ={
  setUserSession: setUserSession,
  getUserInfo:()=> getUserInfo(),
  getUserInfoFromSession: getUserInfoFromSession
}

contextBridge.exposeInMainWorld("commonFuntions", commonFuntions);
// Additional setup (if needed) for the contextBridge...
