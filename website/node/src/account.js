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
        const nymID = Number(this.nym.id);
        const pairID = Math.floor((nymID + 1) / 2);
        this.pair = await local.bitpeopleContract.methods.pair(this.schedule.schedule, pairID).call();
        const pairedWith = pairID*2-1+(nymID%2^1);
        const registryLength = Number(await local.bitpeopleContract.methods.registered(this.schedule.schedule).call());
        if(pairedWith != 0 && registryLength >= pairedWith) {
            this.pairedWith = await local.bitpeopleContract.methods.registry(this.schedule.schedule, pairedWith-1).call();
        } else {
            this.pairedWith = '0x0000000000000000000000000000000000000000';
        }
        this.court = await local.bitpeopleContract.methods.court(this.schedule.schedule, address).call();
        const getCourt = Number(await local.bitpeopleContract.methods.getCourt(this.schedule.schedule, this.court.id).call());
        this.courtPair = new Array(2);
        if(getCourt > 0) {
            const courtPairNym1 = getCourt*2-1;
            const courtPairNym2 = getCourt*2;
            if(registryLength >= courtPairNym2) {
                this.courtPair[1] = await local.bitpeopleContract.methods.registry(this.schedule.schedule, courtPairNym2-1).call();
            } else {
                this.courtPair[1] = '0x0000000000000000000000000000000000000000';
            }
            if(registryLength >= courtPairNym1) {
                this.courtPair[0] = await local.bitpeopleContract.methods.registry(this.schedule.schedule, courtPairNym1-1).call();
            } else {
                this.courtPair[0] = '0x0000000000000000000000000000000000000000';
            }
        } else {
            this.courtPair[0] = '0x0000000000000000000000000000000000000000';
            this.courtPair[1] = '0x0000000000000000000000000000000000000000';
        }

        if(registryLength != 0) {
            const lastAddressInRegistry = await local.bitpeopleContract.methods.registry(this.schedule.schedule, registryLength-1).call();
            const lastNymInRegistry = await local.bitpeopleContract.methods.nym(this.schedule.schedule, lastAddressInRegistry).call();
            this.shuffleFinished = Number(lastNymInRegistry.id) != 0;
        } else {
            this.shuffleFinished = false;
        }
        if(Number(this.schedule.schedule) > 0) {
            const previousSchedule = Number(this.schedule.schedule)-1;
            const previousNym = await local.bitpeopleContract.methods.nym(previousSchedule, address).call();
            const previousNymID = Number(previousNym.id);
            this.isVerified = previousNym.verified;
            this.inPseudonymEvent = previousNymID != 0;
            if(this.inPseudonymEvent) {
                const previousPairID = Math.floor((previousNymID + 1) / 2);
                this.pairVerified = await local.bitpeopleContract.methods.pairVerified(previousSchedule, previousPairID).call();
                const previousPair = await local.bitpeopleContract.methods.pair(previousSchedule, previousPairID).call();
                this.hasVerified = previousPair.verified[previousNymID%2];
            } else {
                this.pairVerified = false;
                this.hasVerified = false;
            }
        } else {
            this.isVerified = false;
            this.inPseudonymEvent = false;
            this.pairVerified = false;
            this.hasVerified = false;
        }
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
            pairedWith: this.pairedWith,
            court: {
                id: this.court.id.toString(), // Convert BigInt to string
                verified: this.court.verified
            },
            courtPair: this.courtPair,
            helper: {
                isRegistered: this.isRegistered(),
                isShuffled: this.isShuffled(),
                canRegister: this.canRegister(),
                canOptIn: this.canOptIn(),
                shuffleFinished: this.shuffleFinished,
                isVerified: this.isVerified,
                inPseudonymEvent: this.inPseudonymEvent,
                pairVerified: this.pairVerified,
                hasVerified: this.hasVerified
            }
        };
    }
}
module.exports = Account;
