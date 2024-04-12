contract BitPeople {
    function proofOfUniqueHuman(uint t, address account) external view returns (bool) {}
    function population(uint t) external view returns (uint) {}
}

contract Schedule {
    uint constant public genesis = 1710568800;
    uint constant public period = 4 weeks;
    function schedule() public view returns(uint) { return ((block.timestamp - genesis) / period); }
    function toSeconds(uint t) public pure returns (uint) { return genesis + t * period; }
}

contract Exp {

    uint256 internal constant EXP = 60;
    uint256 internal constant SCALE = 2**EXP;

    function pow(uint256 x, uint256 y) internal pure returns (uint256 result) {
        result = y & 1 == 1 ? x : SCALE;
        for (y >>= 1; y > 0; y >>= 1) {
            x = (x * x + (SCALE >> 1)) >> EXP;
            if (y & 1 == 1) {
                result = (result * x + (SCALE >> 1)) >> EXP;
            }
        }
    }
}

contract PAN is Schedule, Exp {

    BitPeople bitPeople = BitPeople(0x0000000000000000000000000000000000000010);
    address taxVoteContract = 0x0000000000000000000000000000000000000013;

    string constant public symbol = "PAN";
    uint constant public totalSupply = 10**27;
    uint8 constant public decimals = 18;

    mapping (address => uint) public balanceOf;
    mapping (address => mapping (address => uint)) public allowed;

    mapping (uint => mapping (address => bool)) public claimedUBI;

    struct Legislature {
        uint tax_rate;
        uint enacted;
    }

    Legislature[] public legislature;

    struct Log {
        uint timestamp;
        uint legislature;
    }
    mapping (address => Log) log;

    function setTaxRate(uint tax) external {
        require(msg.sender == taxVoteContract);
        legislature.push(Legislature(tax, schedule()+1));
    }

    function withdrawUBI() external {
        uint t = schedule();
        require(bitPeople.proofOfUniqueHuman(t, msg.sender));
        require(!claimedUBI[t][msg.sender]);
        uint index = legislature.length-1;
        while(legislature[index].enacted >= t) { index--; }
        uint tax_per_period = pow(legislature[index].tax_rate, period);
        uint ubi = totalSupply*(SCALE-tax_per_period)/bitPeople.population(t)>>EXP;
        uint seconds_into_period = block.timestamp - toSeconds(t);
        uint tax_during_period = pow(legislature[index].tax_rate, seconds_into_period);
        ubi *= tax_during_period;
        ubi >>= EXP;
        while(!taxation(msg.sender)) {}
        balanceOf[msg.sender] += ubi;
        claimedUBI[t][msg.sender] = true;
    }

    function taxation(address account) public returns (bool result) {
        uint t = schedule();
        if(log[account].timestamp == 0) {
            log[account].timestamp = block.timestamp;
            uint current = legislature.length-1;
            while(legislature[current].enacted > t) { current--; }
            log[account].legislature = current;
            return true;
        }
        uint index = log[account].legislature;
        uint timestamp;
        if(legislature.length-1 == index || legislature[index+1].enacted > t) {
            timestamp = block.timestamp;
            result = true;
        }
        else {
            timestamp = toSeconds(legislature[index+1].enacted);
            log[account].legislature++;
            result = false;
        }
        uint seconds_since_last_time = timestamp - log[account].timestamp;
        uint tax = pow(legislature[index].tax_rate, seconds_since_last_time);
        balanceOf[account] *= tax;
        balanceOf[account] >>= EXP;
        log[account].timestamp = timestamp;
    }

    function _transfer(address from, address to, uint value) internal {
        while(!taxation(from)) {}
        require(balanceOf[from] >= value);
        while(!taxation(to)) {}
        balanceOf[from] -= value;
        balanceOf[to] += value;
    }
    function transfer(address to, uint value) external {
        _transfer(msg.sender, to, value);
    }
    function approve(address spender, uint value) external {
        allowed[msg.sender][spender] = value;
    }
    function transferFrom(address from, address to, uint value) external {
        require(allowed[from][msg.sender] >= value);
        _transfer(from, to, value);
        allowed[from][msg.sender] -= value;
    }
}