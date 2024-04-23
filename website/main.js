import { Bitpeople } from './bitpeople.js';

const apiURL = '/node/account/';
const metamaskAccount = document.getElementById('metamaskAccount');
const accountInput = document.getElementById('accountInput');
const responseDisplay = document.getElementById('response');
const addressInput = document.getElementById('addressInput');
const loadAddressButton = document.getElementById('loadAddressButton');

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

async function fromAndGasPrice(account, web3) {
	const gasPrice = await web3.eth.getGasPrice();
	return {
            from: account,
            gasPrice: gasPrice
        };
}

function userStringForLoggedInOrNot(isMetamask, address, secondWordForYou = '', secondWordForAddress = '') {
    return isMetamask ? `You${secondWordForYou}` : `${address}${secondWordForAddress}`;
}

async function fetchAccountInfo(address, isMetamask) {
    try {
        const web3 = new Web3(window.ethereum);
        const txObj = await fromAndGasPrice(address, web3);
        const bitpeople = new Bitpeople(web3, txObj);

        const response = await fetch(apiURL + address);
        const data = await response.json();

        responseDisplay.style.display = 'block';
	    
        if (data.bitpeople.proofOfUniqueHuman) {
            responseDisplay.innerText = userStringForLoggedInOrNot(isMetamask, address, ' have', ' has') + ' a proof-of-unique-human';
        } else if (data.bitpeople.inPseudonymEvent) {
            handlePseudonymEvent(data, isMetamask, bitpeople);
        } else if (data.bitpeople.helper.isRegistered) {
            handleRegistrationStatus(data, isMetamask, bitpeople);
        } else {
            handleOtherScenarios(address, data, isMetamask, bitpeople);
        }
    } catch (error) {
        console.error('Error fetching account info:', error);
    }
}

function validateCourtAddressInput() {
    const input = document.getElementById('courtAddressInput');
    const judgeButton = document.getElementById('judgeButton');
    judgeButton.disabled = !isValidAddress(input.value.trim());
}

function handlePseudonymEvent(address, data, isMetamask, bitpeople) {
    responseDisplay.innerText = userStringForLoggedInOrNot(isMetamask, address, ' have', ' has') + ' participated in the pseudonym event';

    if (!data.bitpeople.hasVerified) {
	if (isMetamask) {
	    responseDisplay.innerHTML += '<p>Verify the other person in your pair</p>';
	    const verifyBtn = document.createElement('button');
	    verifyBtn.textContent = 'Verify';
	    verifyBtn.addEventListener('click', () => bitpeople.verify());
	    responseDisplay.appendChild(verifyBtn);
	} else {
	    responseDisplay.innerHTML += '<p>Log in with Metamask to verify the other person in the pair</p>';
	}
    } else if (data.bitpeople.pairVerified) {
	if (isMetamask) {
	    responseDisplay.innerHTML = '<p>Your pair is verified. Collect your tokens</p>';
	    const collectTokensBtn = document.createElement('button');
	    collectTokensBtn.textContent = 'Collect tokens';
	    collectTokensBtn.addEventListener('click', () => bitpeople.nymVerified());
	    responseDisplay.appendChild(collectTokensBtn);
	} else {
	    responseDisplay.innerHTML = '<p>The pair the account is in is verified. Log in with Metamask to collect the tokens</p>';
	}
    } else if (data.bitpeople.isVerified) {
	if (isMetamask) {
	    responseDisplay.innerHTML += [
		'<p>You are verified and have collected your tokens</p>',
		'<p>If you were assigned to judge a "court", input their address and press judge</p>'
	    ].join('');
	    const inputField = document.createElement('input');
	    inputField.type = 'text';
	    inputField.id = 'courtAddressInput';
	    inputField.placeholder = 'Enter "court" address here';
	    inputField.size = '42';
	    responseDisplay.appendChild(inputField);

	    const judgeButton = document.createElement('button');
	    judgeButton.id = 'judgeButton';
	    judgeButton.textContent = 'Judge';
	    judgeButton.disabled = true;
	    judgeButton.addEventListener('click', () => judge(document.getElementById('courtAddressInput').value));
	    responseDisplay.appendChild(judgeButton);

	    inputField.oninput = validateCourtAddressInput;
	} else {
	    responseDisplay.innerHTML += [
		'<p>The account is verified and has collected its tokens</p>',
		'<p>To judge any "courts" it was assigned to judge, log in with Metamask</p>'
	    ].join('');
	}
    }
}

function handleRegistrationStatus(address, data, isMetamask, bitpeople) {
    responseDisplay.innerText = userStringForLoggedInOrNot(isMetamask, address, ' are', ' is') + ' registered for the upcoming event on ' + pseudonymEventString(data);
    
    if (data.schedule.quarter === 3) {
        if (data.bitpeople.pairedWith !== '0x0000000000000000000000000000000000000000') {
            if (isMetamask) {
                const baseUrl = "https://chat.blockscan.com/";
                const path = "index";
                const url = new URL(path, baseUrl);
                url.searchParams.append('a', data.bitpeople.pairedWith);
		responseDisplay.innerHTML += [
		    '<p>Contact the person in your pair to agree on a video channel: ' + '<a href="' + url.href + '">' + url.href + '</a></p>',
                    '<p>If you have been assigned to judge a "court" they may contact you on ' + baseUrl + ' too</p>'
		].join('');
            } else {
                responseDisplay.innerHTML += '<p>Log in with Metamask to contact the person in the pair.</p>';
            }
        } else if (isMetamask) {
            const shuffleBtn = document.createElement('button');
            shuffleBtn.textContent = 'Shuffle';
            shuffleBtn.addEventListener('click', () => bitpeople.shuffle());
            responseDisplay.appendChild(shuffleBtn);
        }
    } else if (data.bitpeople.court.id > 0) {
        responseDisplay.innerText += ' opted-in for the upcoming event on ' + pseudonymEventString(data);
        if (data.schedule.quarter === 3 && (data.bitpeople.courtPair[0] !== '0x0000000000000000000000000000000000000000' || data.bitpeople.courtPair[1] !== '0x0000000000000000000000000000000000000000')) {
            if (isMetamask) {
                responseDisplay.innerHTML += '<p>Contact your "court" to agree on a video channel:</p>';
                const baseUrl = "https://chat.blockscan.com/";
                const path = "index";
                
                data.bitpeople.courtPair.forEach(pair => {
                    if (pair !== '0x0000000000000000000000000000000000000000') {
                        const url = new URL(path, baseUrl);
                        url.searchParams.append('a', pair);
                        responseDisplay.innerHTML += `<p><a href="${url.href}">${url.href}</a></p>`;
                    }
                });
            } else {
                responseDisplay.innerHTML += '<p>Log in with Metamask to contact the "court" the account is assigned to.</p>';
            }
        }
    }
}

function generateRandomNumber() {
    let randomNumber = "";
    for (let i = 0; i < 64; i++) {
        const randomHexDigit = Math.floor(Math.random() * 16).toString(16);
        randomNumber += randomHexDigit;
    }
    return randomNumber;
}

function handleOtherScenarios(address, data, isMetamask, bitpeople) {
    if (data.bitpeople.nymToken > 0) {
        if (data.schedule.quarter < 2) {
            responseDisplay.innerText = userStringForLoggedInOrNot(isMetamask, address) + ' can register for the event';
            if (isMetamask) {
                const randomNumber = generateRandomNumber();

                responseDisplay.innerHTML += [
                    '<p>To register, you need to contribute a random number to the random number generator.</p>',
                    `<p>This site has generated one for you: <input type="text" value="${randomNumber}" size="64" readonly></p>`,
                    '<p>Write it down, you will need it to claim your proof-of-unique-human later.</p>'
                ].join('');
		    
                const registerBtn = document.createElement('button');
                registerBtn.textContent = 'Register';
                registerBtn.addEventListener('click', () => bitpeople.register(randomNumber));
                responseDisplay.appendChild(registerBtn);
            } else {
		responseDisplay.innerHTML += [
		    '<p>Registration closes ' + halftimeString(data) + '</p>',
		    '<p>Log in with Metamask to register</p>'
		].join('');
            }
        } else {
            responseDisplay.innerText = 'The next registration period opens on: ' + nextPeriodString(data);
        }
    } else if (data.bitpeople.permitToken > 0) {
        if (data.schedule.quarter < 2) {
            responseDisplay.innerHTML = userStringForLoggedInOrNot(isMetamask, address, ' have', ' has') + ' a permit token and can opt-in to the network';
            if (isMetamask) {
                const optInDiv = document.createElement('div');
                optInDiv.className = 'opt-in-btn';
                
                const optInBtn = document.createElement('button');
                optInBtn.textContent = 'Opt-in';
                optInBtn.addEventListener('click', () => bitpeople.optIn());
                optInDiv.appendChild(optInBtn);
                
                responseDisplay.appendChild(optInDiv);
            } else {
		responseDisplay.innerHTML += [
		    '<p>The opt-in period closes ' + halftimeString(data) + '</p>',
                    '<p>Log in with Metamask to opt-in</p>'
		].join('');
            }
        } else {
            responseDisplay.innerText = 'The next opt-in period opens on: ' + nextPeriodString(data);
        }
    } else {
        responseDisplay.innerText = userStringForLoggedInOrNot(isMetamask, address, ' need', ' needs') + ' a nym token to register or a permit token to opt-in';
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
    return /^(0x)?[0-9a-fA-F]{40}$/.test(address);
}

function updateAddress(newAddress) {
    let newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`
    if (newAddress) {
        newUrl += `?address=${newAddress}`;
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

function setupEventListeners() {
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
}

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
    setupEventListeners();
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
