const { Web3 } = require('web3');
const bitpeopleABI = require('./bitpeopleABI');

class Local {
    constructor(web3) {
        this.web3 = web3;
        this.bitpeopleAddress = "0x0000000000000000000000000000000000000010";
        this.bitpeopleContract = new this.web3.eth.Contract(bitpeopleABI, this.bitpeopleAddress);
        // Add other contracts here
    }
}

class Account {
    constructor(address) {
        this.local = new Local(new Web3('http://localhost:8545'));
        this.address = this.local.web3.utils.toChecksumAddress(address);
    }
    async initScheduleAndContracts() {
        await this.loadSchedule();
        this.bitpeople = new Bitpeople(this.schedule);
        // Add other contracts here, e.g., this.election = new Election();
    }
    async loadSchedule() {
        this.schedule = {}
        this.schedule.schedule = await this.local.bitpeopleContract.methods.schedule().call();
        this.schedule.toSeconds = await this.local.bitpeopleContract.methods.toSeconds(this.schedule.schedule).call();
        this.schedule.quarter = await this.local.bitpeopleContract.methods.quarter(this.schedule.schedule).call();
        const nextSchedule = Number(this.schedule.schedule) + 1;
        this.schedule.hour = await this.local.bitpeopleContract.methods.hour(nextSchedule).call();
        this.schedule.pseudonymEvent = await this.local.bitpeopleContract.methods.pseudonymEvent(nextSchedule).call();
    }
    async getParameters() {
        await this.bitpeople.loadParameters(this.local, this.address); // Load contract-specific parameters
        return {
            schedule: {
                schedule: this.schedule.schedule.toString(),
                toSeconds: this.schedule.toSeconds.toString(),
                quarter: this.schedule.quarter.toString(),
                hour: this.schedule.hour.toString(),
                pseudonymEvent: this.schedule.pseudonymEvent.toString()
            },
            bitpeople: this.bitpeople.getParameters(),
            // Add other contract parameters here
        };
    }
}

class Bitpeople {

    constructor(schedule) {
        this.schedule = schedule;
    }
    
    canRegister() {
        return !this.isRegistered() && this.nymToken > 0 && this.schedule.quarter < 2;
    }
    canOptIn() {
        return this.court.id !== 0 && this.permitToken > 0 && this.schedule.quarter < 2;
    }
    isRegistered() {
        return this.commit !== '0x0000000000000000000000000000000000000000000000000000000000000000';
    }
    isShuffled() {
        return this.isRegistered() && Number(this.nym.id) !== 0;
    }
    
    async loadParameters(local, address) {
        this.proofOfUniqueHuman = await local.bitpeopleContract.methods.proofOfUniqueHuman(this.schedule.schedule, address).call();
        this.proofOfUniqueHumanToken = await local.bitpeopleContract.methods.balanceOf(this.schedule.schedule, 0, address).call();
        this.nymToken = await local.bitpeopleContract.methods.balanceOf(this.schedule.schedule, 1, address).call();
        this.permitToken = await local.bitpeopleContract.methods.balanceOf(this.schedule.schedule, 2, address).call();
        this.borderToken = await local.bitpeopleContract.methods.balanceOf(this.schedule.schedule, 3, address).call();
        this.commit = await local.bitpeopleContract.methods.commit(this.schedule.schedule, address).call();
        this.nym = await local.bitpeopleContract.methods.nym(this.schedule.schedule, address).call();
        this.pair = await local.bitpeopleContract.methods.pair(this.schedule.schedule, Math.floor((Number(this.nym.id) + 1) / 2)).call();
        this.court = await local.bitpeopleContract.methods.court(this.schedule.schedule, address).call();
    }
    getParameters() {
        return {
            proofOfUniqueHuman: this.proofOfUniqueHuman,
            nymToken: this.nymToken.toString(), // Convert BigInt to string
            proofOfUniqueHumanToken: this.proofOfUniqueHumanToken.toString(), // Convert BigInt to string
            permitToken: this.permitToken.toString(), // Convert BigInt to string
            borderToken: this.borderToken.toString(), // Convert BigInt to string
            commit: this.commit,
            nym: {
                id: this.nym.id.toString(), // Convert BigInt to string
                verified: this.nym.verified
            },
            pair: {
                verified: this.pair.verified
            },
            court: {
                id: this.court.id.toString(), // Convert BigInt to string
                verified: this.court.verified
            },
            helper: {
                isRegistered: this.isRegistered(),
                isShuffled: this.isShuffled(),
                canRegister: this.canRegister(),
                canOptIn: this.canOptIn()
            }
        };
    }
}
module.exports = Account;
