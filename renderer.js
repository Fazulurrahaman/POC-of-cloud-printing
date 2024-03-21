// const button = document.getElementById('printers');


// button.addEventListener('click', () => {
//     console.log(window);
//   const printers = window.getPrinters.getAvailablePrinters();
//   console.log(printers);
//   document.getElementById("name").innerText = printers[0].displayName
//   // Do something with the printer list, e.g., display it in a dropdown
//   // ...
//   window.APIS.getAPI();
//   window.APIS.sendPrinterDetails();
// });



// Initialize state object
let state = {
  username: '',
  password: ''
};

// Select the input fields
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// Function to update state and log it
function updateState(event) {
  const { name, value } = event.target;
  state = {
    ...state,
    [name]: value
  };
  console.log(state);
}
console.log("usernameInput", usernameInput);
// Add event listeners to input fields if they are found
if (usernameInput) {
  usernameInput.addEventListener('input', updateState);
}

if (passwordInput) {
  passwordInput.addEventListener('input', updateState);
}

// Add event listener to form for form submission
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async(event)=> {
    event.preventDefault(); 
    console.log('Form submitted:', state);
    try{
      const authResponseData = await window.APIS.authorizeUser(state)
      window.commonFuntions.setUserSession(authResponseData);
     const userDetail =  await window.commonFuntions.getUserInfo();
     window.APIS.sendPrinterDetails(userDetail);
      const container = document.getElementById('container');
      container.innerHTML = "<h1>Login Successful!</h1>";
      setInterval(()=>{window.APIS.getPrintJob(); console.log("SEtINTERVAl");}, 1 * 60 * 1000); // 3 minutes in milliseconds
    }catch(e){
      console.error(e)
    }
  

  });
}

/*const print = document.getElementById("print");
print.addEventListener('click',(event)=>{
  event.preventDefault();
  window.APIS.getPrintJob();
  // window.print()
  console.log("window", window)
  
});*/


