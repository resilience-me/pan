const apiURL = '/node/account/';
const metamaskAccount = document.getElementById('metamaskAccount');
const accountInput = document.getElementById('accountInput');
const responseDisplay = document.getElementById('response');
const addressInput = document.getElementById('addressInput');
const loadAddressButton = document.getElementById('loadAddressButton');

const bitpeopleABI = [
	{
		"inputs": [],
		"name": "optIn",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "_commit",
				"type": "bytes32"
			}
		],
		"name": "register",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "shuffle",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	}
]

const bitpeopleAddress = "0x0000000000000000000000000000000000000010";

async function register(randomNumber) {
    try {
        const web3 = new Web3(window.ethereum);
        bitpeopleContract = new web3.eth.Contract(bitpeopleABI, bitpeopleAddress);
        const randomHash = web3.utils.sha3('0x' + randomNumber);
        const result = await bitpeopleContract.methods.register(randomHash).send({ from: accounts[0] });
        console.log('Registration successful:', result);
        responseDisplay.innerText = `You are registered for the upcoming pseudonym event. Remember to write down your random number ${randomNumber}, you will need it to claim your proof of unique human later.`;
    } catch (error) {
        responseDisplay.innerText = 'error';
        console.error('Error registering:', error);
    }
}

async function optIn() {
    try {
        const web3 = new Web3(window.ethereum);
        bitpeopleContract = new web3.eth.Contract(bitpeopleABI, bitpeopleAddress);
        const result = await bitpeopleContract.methods.optIn().send({ from: accounts[0] });
        console.log('Opt-in successful:', result);
        responseDisplay.innerText = `You have opted-in to BitPeople for the upcoming pseudonym event. `;
    } catch (error) {
        responseDisplay.innerText = 'error';
        console.error('Error shuffling:', error);
    }
}

async function shuffle() {
    try {
        const web3 = new Web3(window.ethereum);
        bitpeopleContract = new web3.eth.Contract(bitpeopleABI, bitpeopleAddress);
        const result = await bitpeopleContract.methods.shuffle().send({ from: accounts[0] });
        console.log('Shuffle successful:', result);
        responseDisplay.innerText = `Shuffled one person in the population`;
    } catch (error) {
        responseDisplay.innerText = 'error';
        console.error('Error opting in:', error);
    }
}

function userStringForLoggedInOrNot(isMetamask, address, secondWordForYou = '', secondWordForAddress = '') {
	if(isMetamask) {
		return 'You' + secondWordForYou;
	}
	return address + secondWordForAddress;
}

function dateAndTimeString(eventDate) {
	const dateString = eventDate.toLocaleDateString("en-US", {
	    weekday: 'long',
	    year: 'numeric',
	    month: 'long',
	    day: 'numeric'
	});
	
	const timeString = eventDate.toLocaleTimeString("en-US", {
	    hour: '2-digit',
	    minute: '2-digit',
	    second: '2-digit',
	    timeZoneName: 'short'
	});
	return dateString + ', ' + timeString;
}

function pseudonymEventString(data) {
	const time = parseInt(data.schedule.pseudonymEvent, 10);
	return dateAndTimeString(new Date(time * 1000));
}
function timeString(data, weeksFromSchedule) {
	const time = parseInt(data.schedule.toSeconds, 10) + 60 * 60 * 24 * 7 * weeksFromSchedule;
	return dateAndTimeString(new Date(time * 1000));
}
function nextPeriodString(data) {
	return timeString(data, 4);
}
function halftimeString(data) {
	return timeString(data, 2);
}

async function fetchAccountInfo(address, isMetamask) {
    try {
        const response = await fetch(apiURL + address);
        const data = await response.json();
        if(data.bitpeople.proofOfUniqueHuman == true) {
            responseDisplay.innerText = userStringForLoggedInOrNot(isMetamask, address) + ' have a proof-of-unique-human';
        } else if (data.bitpeople.helper.isRegistered == true) {
            responseDisplay.innerText = userStringForLoggedInOrNot(isMetamask, address, ' are', ' is') + ' registered for the upcoming event on ' + pseudonymEventString(data);
	    if(data.bitpeople.pairedWith != '0x0000000000000000000000000000000000000000') {
		if(isMetamask) {
		    const baseUrl = "https://chat.blockscan.com/";
		    const path = "index";
		    const url = new URL(path, baseUrl);
		    url.searchParams.append('a', data.bitpeople.pairedWith);
		    responseDisplay.innerHTML += '<p>Contact the person in your pair to agree on a video channel: ' + '<a href="' + url.href + '">' + url.href + '</a></p>';
		} else {
		    responseDisplay.innerHTML += '<p>Log in with Metamask to contact the person in your pair';
		}
	    } else if(data.schedule.quarter == 3 && !data.bitpeople.shuffleFinished && isMetamask) {
		    responseDisplay.innerHTML += '<p>Contribute to shuffling the population</p>';
		    responseDisplay.innerHTML += '<button onclick="shuffle()">Shuffle</button>';
	    }
        } else if (data.bitpeople.court.id > 0) {
            responseDisplay.innerText = userStringForLoggedInOrNot(isMetamask, address, ' have', ' has') + ' opted-in for the upcoming event on ' + pseudonymEventString(data);
	} else if(data.bitpeople.nymToken > 0) {
            if(data.schedule.quarter < 2) {
		responseDisplay.innerText = userStringForLoggedInOrNot(isMetamask, address) + ' can register for the event';
		if(isMetamask) {
                    let randomNumber = "";
                    for (let i = 0; i < 64; i++) {
                            const randomHexDigit = Math.floor(Math.random() * 16).toString(16);
                            randomNumber += randomHexDigit;
                    }
                    responseDisplay.innerHTML += '<p>To register, you need to contribute a random number to the random number generator.</p>'
                    responseDisplay.innerHTML += `<p>This site has generated one for you: <input type="text" value="${randomNumber}" size="64" readonly></p>`
                    responseDisplay.innerHTML += '<p>Write it down, you will need it to claim your proof-of-unique-human later.</p>'
                    responseDisplay.innerHTML += `<button onclick="register('${randomNumber}')">Register</button>`;
                } else {
                    responseDisplay.innerHTML += '<p>Registration closes ' +  halftimeString(data)+'</p>';
                    responseDisplay.innerHTML += '<p>Log in with Metamask to register</p>';
                }
            } else {
                responseDisplay.innerText = 'The next registration period opens on: ' +  nextPeriodString(data);
            }
        } else if (data.bitpeople.permitToken > 0) {
            if(data.schedule.quarter < 2) {
                responseDisplay.innerHTML = userStringForLoggedInOrNot(isMetamask, address, ' have', ' has') + ' a permit token and can opt-in to the network';
                if(isMetamask) {
		    responseDisplay.innerHTML += '<div class="opt-in-btn"><button onclick="optIn()">Opt-in</button></div>';
                } else {
                    responseDisplay.innerHTML += '<p>The opt-in period closes ' +  halftimeString(data)+'</p>';
                    responseDisplay.innerHTML += '<p>Log in with Metamask to opt-in</p>';
                }
            } else {
                responseDisplay.innerText = 'The next registration period opens on: ' + nextPeriodString(data);
            }
        } else {
            responseDisplay.innerText = userStringForLoggedInOrNot(isMetamask, address, ' need', ' needs') + ' a nym token to register or a permit token to opt-in';
        }
        responseDisplay.style.display = 'block'
    } catch (error) {
        console.error('Error fetching account info:', error);
    }
}

function updateAddress(newAddress) {
    let newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`
    if (newAddress) {
        newUrl +=`?address=${newAddress}`;
    }
    history.pushState({address: newAddress}, "", newUrl);
}

function handleAccountChange(accounts) {
    if (accounts.length > 0) {
        metamaskAccount.style.display = 'block';
        metamaskAccount.innerText = `Logged in with MetaMask. Account: ${accounts[0]}`;
        accountInput.style.display = 'none';
        fetchAccountInfo(accounts[0], true);
	updateAddress();
    }
}

function resetDisplay() {
    metamaskAccount.innerText = '';
    metamaskAccount.style.display = 'none'
    accountInput.style.display = 'block';
    responseDisplay.innerText = '';
    responseDisplay.style.display = 'none'
}

function isValidAddress(address) {
    const regex = /^(0x)?[0-9a-fA-F]{40}$/;
    return regex.test(address);
}

addressInput.addEventListener('input', () => {
    loadAddressButton.disabled = !isValidAddress(addressInput.value.trim());
});

loadAddressButton.addEventListener('click', () => {
    const address = addressInput.value.trim();
    if (isValidAddress(address)) {
        fetchAccountInfo(address, false);
	updateAddress(address);
    } else {
        console.error('Invalid address:', address);
    }
});

document.getElementById('loginButton').addEventListener('click', async () => {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            handleAccountChange(accounts);
        } catch (error) {
            console.error('User denied account access:', error);
        }
    } else {
        console.log('MetaMask is not installed!');
    }
});

window.ethereum?.on('accountsChanged', (accounts) => {
    resetDisplay();
    handleAccountChange(accounts);
});

function readAddressFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const address = urlParams.get('address');
    if (isValidAddress(address)) {
        document.getElementById('addressInput').value = address;
        loadAddressButton.disabled = false;
        fetchAccountInfo(address, false);
        return true;
    }
    return false;
}

window.addEventListener('load', async () => {
    resetDisplay();
    if(!readAddressFromURL()) {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                handleAccountChange(accounts);
            } catch (error) {
                console.error('Error fetching accounts:', error);
            }
        } else {
            console.log('MetaMask is not available.');
        }
    }
});
