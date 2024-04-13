contract BitPeople {

    uint constant public genesis = 1712988000;
    uint constant public period = 4 weeks;

    function schedule() public view returns(uint) { return ((block.timestamp - genesis) / period); }
    function toSeconds(uint t) public pure returns (uint) { return genesis + t * period; }
    function quarter(uint t) public view returns (uint) { return (block.timestamp-toSeconds(t))/(period/4); }
    function hour(uint t) public pure returns (uint) { return 1 + uint(keccak256(abi.encode(t)))%24; }
    function pseudonymEvent(uint t) public pure returns (uint) { return toSeconds(t) + hour(t)*1 hours; }

    struct Nym { uint id; bool verified; }
    struct Pair { bool[2] verified; bool disputed; }
    struct Court { uint id; bool[2] verified; }

    enum Token { ProofOfUniqueHuman, Nym, Permit, Border }

    struct Data {
        uint seed;
        bytes32 random;

        mapping (address => Nym) nym;
        address[] registry;
        uint shuffled;
        mapping (uint => Pair) pair;
        mapping (address => Court) court;
        uint courts;

        mapping (address => bool) proofOfUniqueHuman;
        uint population;

        uint permits;
        mapping (uint => uint) target;
        uint traverser;

        mapping (address => bytes32) commit;
        mapping (uint => uint) points;

        mapping (Token => mapping (address => uint)) balanceOf;
        mapping (Token => mapping (address => mapping (address => uint))) allowed;
    }
    mapping (uint => Data) data;

    function registered(uint t) public view returns (uint) { return data[t].registry.length; }
    function getPair(uint id) public pure returns (uint) { return (id+1)/2; }
    function getCourt(uint t, uint id) public view returns (uint) { if(id != 0) return 1+(id-1)%(registered(t)/2); return 0; }
    function pairVerified(uint t, uint id) public view returns (bool) { return (data[t].pair[id].verified[0] == true && data[t].pair[id].verified[1] == true); }
    function deductToken(Data storage d, Token token) internal { require(d.balanceOf[token][msg.sender] >= 1); d.balanceOf[token][msg.sender]--; }

    function register(bytes32 _commit) external {
        uint t = schedule();
        require(quarter(t) < 2);
        Data storage d = data[t];
        deductToken(d, Token.Nym);
        d.registry.push(msg.sender);
        d.commit[msg.sender] = _commit;
    }
    function optIn() external {
        uint t = schedule();
        require(quarter(t) < 2);
        Data storage d = data[t];
        deductToken(d, Token.Permit);
        d.courts++;
        d.court[msg.sender].id = d.courts;
    }
    function _shuffle(uint t) internal returns (bool) {
        Data storage d = data[t];
        uint _shuffled = d.shuffled;
        if(_shuffled == 0) d.random = keccak256(abi.encode(d.seed));
        uint unshuffled = registered(t)-_shuffled;
        if(unshuffled == 0) return false;
        uint index = _shuffled + uint(d.random)%unshuffled;
        address randomNym = d.registry[index];
        d.registry[index] = d.registry[_shuffled];
        d.registry[_shuffled] = randomNym;
        d.nym[randomNym].id = _shuffled+1;
        d.shuffled++;
        d.random = keccak256(abi.encode(d.random, randomNym));
        return true;
    }

    function shuffle() external returns (bool)  {
        uint t = schedule();
        require(quarter(t) == 3);
        return _shuffle(t);
    }
    function lateShuffle() external returns (bool) {
        uint t = schedule()-1;
        return _shuffle(t);
    }
    function verify() external {
        uint t = schedule()-1;
        require(block.timestamp > pseudonymEvent(t+1));
        Data storage d = data[t];
        uint id = d.nym[msg.sender].id;
        require(id != 0);
        require(d.pair[getPair(id)].disputed == false);
        d.pair[getPair(id)].verified[id%2] = true;
    }
    function judge(address _court) external {
        uint t = schedule()-1;
        require(block.timestamp > pseudonymEvent(t+1));
        Data storage d = data[t];
        uint signer = d.nym[msg.sender].id;
        require(getCourt(t, d.court[_court].id) == getPair(signer));
        d.court[_court].verified[signer%2] = true;
    }

    function allocateTokens(Data storage d) internal {
        d.balanceOf[Token.Nym][msg.sender]++;
        d.balanceOf[Token.Border][msg.sender]++;
    }
    function nymVerified() external {
        uint t = schedule()-1;
        Data storage d = data[t];
        require(d.nym[msg.sender].verified == false);
        uint id = d.nym[msg.sender].id;
        require(pairVerified(t, getPair(id)));
        allocateTokens(data[t+1]);
        if(id <= d.permits) data[t+1].balanceOf[Token.Permit][msg.sender]++;
        d.nym[msg.sender].verified = true;
    }
    function courtVerified() external {
        uint t = schedule()-1;
        Data storage d = data[t];
        require(pairVerified(t, getCourt(t, d.court[msg.sender].id)));
        require(d.court[msg.sender].verified[0] == true && d.court[msg.sender].verified[1] == true); allocateTokens(data[t+1]);
        delete d.court[msg.sender];
    }
    function revealHash(bytes32 preimage) public {
        uint t = schedule();
        Data storage d = data[t];
        require(quarter(t) == 2 && keccak256(abi.encode(preimage)) == data[t-1].commit[msg.sender]);
        bytes32 mutated = keccak256(abi.encode(preimage, data[t-1].seed));
        uint id = uint(mutated)%registered(t-1);
        d.points[id]++;
        if (d.points[id] > d.points[d.seed]) d.seed = id;
        delete data[t-1].commit[msg.sender];
        d.balanceOf[Token.ProofOfUniqueHuman][msg.sender]++;
    }
    function claimProofOfUniqueHuman() external {
        uint t = schedule();
        deductToken(data[t], Token.ProofOfUniqueHuman);
        data[t+1].proofOfUniqueHuman[msg.sender] = true;
        data[t+1].population++;
    }
    function dispute() external {
        uint t = schedule()-1;
        uint id = getPair(data[t].nym[msg.sender].id);
        require(id != 0);
        require(!pairVerified(t, id));
        data[t].pair[id].disputed = true;
    }
    function reassignNym() external {
        Data storage d = data[schedule()-1];
        uint id = d.nym[msg.sender].id;
        require(d.pair[getPair(id)].disputed == true);
        delete d.nym[msg.sender];
        d.court[msg.sender].id = uint(keccak256(abi.encode(id)));
    }
    function reassignCourt() external {
        uint t = schedule()-1;
        Data storage d = data[t];
        uint id = d.court[msg.sender].id;
        require(d.pair[getCourt(t, id)].disputed == true);
        delete d.court[msg.sender].verified;
        d.court[msg.sender].id = uint(keccak256(abi.encode(0, id)));
    }
    function borderVote(uint target) external {
        Data storage d = data[schedule()];
        deductToken(d, Token.Border);
        d.target[target]+=2;
        if(target > d.permits) {
            if(d.traverser < d.target[d.permits]) d.traverser++;
            else {
                d.permits++;
                d.traverser = 0;
            }
        }
        else if(target < d.permits) {
            if(d.traverser > 0) d.traverser--;
            else {
                d.permits--;
                d.traverser = d.target[d.permits];
            }
        }
        else d.traverser++;
    }

    function _transfer(Data storage d, address from, address to, uint value, Token token) internal {
        require(d.balanceOf[token][from] >= value);
        d.balanceOf[token][from] -= value;
        d.balanceOf[token][to] += value;
    }
    function transfer(address to, uint value, Token token) external {
    _transfer(data[schedule()], msg.sender, to, value, token);
    }
    function approve(address spender, uint value, Token token) external {
        data[schedule()].allowed[token][msg.sender][spender] = value;
    }
    function transferFrom(address from, address to, uint value, Token token) external {
        Data storage d = data[schedule()];
        require(d.allowed[token][from][msg.sender] >= value);
        _transfer(d, from, to, value, token);
        d.allowed[token][from][msg.sender] -= value;
    }

    function seed(uint t) external view returns (uint) { return data[t].seed; }
    function nym(uint t, address account) external view returns (Nym memory) { return data[t].nym[account]; }
    function registry(uint t, uint id) external view returns (address) { return data[t].registry[id]; }
    function pair(uint t, uint id) external view returns (Pair memory) { return data[t].pair[id]; }
    function court(uint t, address account) external view returns (Court memory) { return data[t].court[account]; }
    function population(uint t) external view returns (uint) { return data[t].population; }
    function proofOfUniqueHuman(uint t, address _account) external view returns (bool) { return data[t].proofOfUniqueHuman[_account]; }
    function permits(uint t) external view returns (uint) { return data[t].permits; }
    function commit(uint t, address account) external view returns (bytes32) { return data[t].commit[account]; }
    function balanceOf(uint t, Token token, address account) external view returns (uint) { return data[t].balanceOf[token][account]; }
    function allowed(uint t, Token token, address owner, address spender) external view returns (uint) { return data[t].allowed[token][owner][spender]; }
}
