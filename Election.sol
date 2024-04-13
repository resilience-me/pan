contract BitPeople { function proofOfUniqueHuman(uint t, address account) external view returns (bool) {} }

contract Schedule {

    uint constant public genesis = 1712988000;
    uint constant public period = 4 weeks;

    function schedule() public view returns(uint) { return ((block.timestamp - genesis) / period); }
    function toSeconds(uint t) public pure returns (uint) { return genesis + t * period; }
    function halftime(uint t) public view returns (bool) { return((block.timestamp > toSeconds(t)+period/2)); }
}

contract Election is Schedule {

    BitPeople bitPeople = BitPeople(0x0000000000000000000000000000000000000010);

    struct Data {
        address[] election;
        mapping (address => uint) balanceOf;
        mapping (address => mapping (address => uint)) allowed;
        mapping (address => bool) claimedSuffrageToken;
    }

    mapping (uint => Data) data;

    function vote(address validator) public {
        uint t = schedule();
        require(!halftime(t) && data[t].balanceOf[msg.sender] >= 1);
        data[t].balanceOf[msg.sender]--;
        data[t+1].election.push(validator);
    }

    function allocateSuffrageToken() public {
        uint t = schedule();
        require(bitPeople.proofOfUniqueHuman(t, msg.sender));
        require(!data[t].claimedSuffrageToken[msg.sender]);
        data[t].balanceOf[msg.sender]++;
        data[t].claimedSuffrageToken[msg.sender] = true;
    }

    function _transfer(uint t, address from, address to, uint value) internal {
        require(data[t].balanceOf[from] >= value);
        data[t].balanceOf[from] -= value;
        data[t].balanceOf[to] += value;
    }
    function transfer(address to, uint value) external {
        _transfer(schedule(), msg.sender, to, value);
    }
    function approve(address spender, uint value) external {
        data[schedule()].allowed[msg.sender][spender] = value;
    }
    function transferFrom(address from, address to, uint value) external {
        uint t = schedule();
        require(data[t].allowed[from][msg.sender] >= value);
        _transfer(t, from, to, value);
        data[t].allowed[from][msg.sender] -= value;
    }

    function election(uint t, uint i) external view returns (address) { return data[t].election[i]; }
    function electionLength(uint t) external view returns (uint) { return data[t].election.length; }
    function balanceOf(uint t, address account) external view returns (uint) { return data[t].balanceOf[account]; }
    function allowed(uint t, address owner, address spender) external view returns (uint) { return data[t].allowed[owner][spender]; }
}
