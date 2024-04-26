contract BitPeople {
    function proofOfUniqueHuman(uint t, address account) external view returns (bool) {}
    function population(uint t) external view returns (uint) {}
}
contract PAN { function setTaxRate(uint tax) external {} }
contract Schedule {
    uint constant public genesis = 1712988000;
    uint constant public period = 4 weeks;
    function schedule() public view returns(uint) { return ((block.timestamp - genesis) / period); }
}

contract TaxVote is Schedule {

    BitPeople bitPeople = BitPeople(0x0000000000000000000000000000000000000010);
    PAN pan = PAN(0x0000000000000000000000000000000000000012);

    uint public constant MAX_LENGTH = 60;

    struct Label {
        uint data;
        uint length;
    }

    struct Node {
        uint votes;
        Label label;
        uint[2] branches;
    }

    struct SmartNode {
        Node node;
        uint highestPathVotes;
        uint highestPathBranch;
        uint parentIndex;
    }

    struct VoterNode {
        Node node;
        uint votedOnPath;
    }

    struct Data {
        SmartNode[] nodes;
        mapping (address => VoterNode[]) voterNodes;
        mapping (address => uint) votes;
        mapping (address => uint) balanceOf;
        mapping (address => mapping (address => uint)) allowance;
        mapping (address => bool) claimedVoteToken;
    }
    mapping(uint => Data) data;

    event Transfer(uint indexed schedule, address indexed from, address indexed to, uint256 value);
    event Approval(uint indexed schedule, address indexed owner, address indexed spender, uint256 value);

    function direction(Label memory label) internal pure returns (uint) {
        return label.data >> label.length - 1;
    }
    function removePrefix(Label memory label, uint prefixLength) internal pure returns (Label memory suffix) {
        suffix.data = label.data & (1 << label.length - prefixLength) - 1;
        suffix.length = label.length - prefixLength;
    }
    function splitLabel(Label memory label, uint commonLength) internal pure returns (Label memory prefix, Label memory suffix) {
        prefix.data = label.data >> label.length - commonLength;
        prefix.length = commonLength;
        suffix = removePrefix(label, commonLength);
    }

    function splitSmartNode(uint smartNodeIndex, uint commonLength, SmartNode[] storage nodes) internal {
        SmartNode storage smartNode = nodes[smartNodeIndex];
        (Label memory prefix, Label memory suffix) = splitLabel(smartNode.node.label, commonLength);
        nodes.push(smartNode);
        nodes[nodes.length-1].node.label = suffix;
        nodes[nodes.length-1].parentIndex = smartNodeIndex;
        delete smartNode.node;
        smartNode.node.label = prefix;
        smartNode.node.branches[direction(suffix)] = nodes.length - 1;
        smartNode.highestPathBranch = direction(suffix);
    }

    function splitVoterNode(VoterNode storage voterNode, uint commonLength, VoterNode[] storage voterNodes) internal {
        (Label memory prefix, Label memory suffix) = splitLabel(voterNode.node.label, commonLength);
        voterNodes.push(voterNode);
        VoterNode storage suffixVoterNode = voterNodes[voterNodes.length - 1];
        suffixVoterNode.node.label = suffix;
        delete voterNode.node;
        voterNode.node.label = prefix;
        voterNode.votedOnPath += suffixVoterNode.node.votes;
        voterNode.node.branches[direction(suffix)] = voterNodes.length - 1;
    }

    function commonPrefix(Label memory self, Label memory other) internal pure returns (uint prefixLength) {
        uint length = self.length < other.length ? self.length : other.length;
        while(prefixLength < length) {
            if(self.data>>self.length-1-prefixLength != other.data>>other.length-1-prefixLength) break;
            prefixLength++;
        }
    }

    function newVoterNode(VoterNode[] storage voterNodes, VoterNode storage voterNode, Label memory label) internal returns (uint) {
        voterNodes.push(VoterNode(Node(0, label, [uint(0), 0]), 0));
        voterNode.node.branches[direction(label)] = voterNodes.length - 1;
        return voterNodes.length - 1;
    }

    function processVoterNode(VoterNode storage voterNode, uint votesRemaining, uint votes) internal returns (uint) {
        if(voterNode.votedOnPath < votes) voterNode.votedOnPath = votes;
        if(voterNode.node.votes > 0) votesRemaining -= voterNode.node.votes;
        return votesRemaining;
    }

    function processVoterTrie(Label memory label, uint votes, Data storage currentData) internal returns (uint votesRemaining) {
        VoterNode storage voterNode;
        VoterNode[] storage voterNodes = currentData.voterNodes[msg.sender];
        uint nodeIndex;
        votesRemaining = votes;
        if (voterNodes.length > 0) {
            while(true) {
                voterNode = voterNodes[nodeIndex];
                uint commonLength = commonPrefix(label, voterNode.node.label);
                if(commonLength == voterNode.node.label.length) {
                    if(label.length == commonLength) {
                        break;
                    }
                    votesRemaining = processVoterNode(voterNode, votesRemaining, votes);
                    label = removePrefix(label, commonLength);
                    nodeIndex = voterNode.node.branches[direction(label)];
                    if(nodeIndex != 0) {
                        continue;
                    }
                    nodeIndex = newVoterNode(voterNodes, voterNode, label);
                    break;
                } else {
                    splitVoterNode(voterNode, commonLength, voterNodes);
                    if(commonLength < label.length) {
                        votesRemaining = processVoterNode(voterNode, votesRemaining, votes);
                        label = removePrefix(label, commonLength);
                        nodeIndex = newVoterNode(voterNodes, voterNode, label);
                    }
                    break;
                }
            }
        } else {
            voterNodes.push(VoterNode(Node(0, label, [uint(0), 0]), 0));
        }
        voterNode = voterNodes[nodeIndex];
        if(voterNode.votedOnPath > 0) votesRemaining -= voterNode.votedOnPath;
        if(voterNode.node.votes > 0) votesRemaining -= voterNode.node.votes;
        voterNode.node.votes += votesRemaining;
    }

    function newSmartNode(SmartNode[] storage nodes, SmartNode storage smartNode, Label memory label, uint parentIndex) internal returns (uint) {
        nodes.push(SmartNode(Node(0, label, [uint(0), 0]), 0, 0, parentIndex));
        smartNode.node.branches[direction(label)] = nodes.length - 1;
        return nodes.length - 1;
    }

    function vote(uint taxrate, uint length, uint votes) external {
        require(length <= MAX_LENGTH, "Error: length exceeds MAX_LENGTH");
        Data storage currentData = data[schedule()];
        if (votes == 0) votes = currentData.votes[msg.sender];
        require(votes > 0, "Error: No available votes to cast.");
        require(votes <= currentData.votes[msg.sender], "Error: votes exceed available balance");
        taxrate &= (1 << length) - 1;
        Label memory label = Label(taxrate, length);
        votes = processVoterTrie(label, votes, currentData);
        require(votes > 0, "Error: No votes remaining after processing.");
        uint nodeIndex;
        uint highestPathVotes;
        SmartNode storage smartNode;
        SmartNode[] storage nodes = currentData.nodes;
        if (nodes.length > 0) {
            while (true) {
                smartNode = nodes[nodeIndex];
                uint commonLength = commonPrefix(label, smartNode.node.label);
                if(commonLength == smartNode.node.label.length) {
                    if(label.length == commonLength) {
                        break;
                    }
                    if(smartNode.node.votes != 0) highestPathVotes += smartNode.node.votes;
                    label = removePrefix(label, commonLength);
                    nodeIndex = smartNode.node.branches[direction(label)];
                    if(nodeIndex != 0) {
                        continue;
                    }
                    nodeIndex = newSmartNode(nodes, smartNode, label, nodeIndex);
                    break;
                } else {
                    splitSmartNode(nodeIndex, commonLength, nodes);
                    if(commonLength < label.length) {
                        if(smartNode.node.votes != 0) highestPathVotes += smartNode.node.votes;
                        nodeIndex = newSmartNode(nodes, smartNode, removePrefix(label, commonLength), nodeIndex);
                    }
                    break;
                }
            }
        } else {
            nodes.push(SmartNode(Node(0, label, [uint(0), 0]), 0, 0, 0));
        }
        smartNode = nodes[nodeIndex];
        smartNode.node.votes += votes;
        while (smartNode.node.branches[0] != 0 || smartNode.node.branches[1] != 0) {
            if(smartNode.node.votes != 0) highestPathVotes += smartNode.node.votes;
            nodeIndex = smartNode.node.branches[smartNode.highestPathBranch];
            smartNode = nodes[nodeIndex];
        }
        if(smartNode.node.votes != 0) highestPathVotes += smartNode.node.votes;
        smartNode.highestPathVotes = highestPathVotes;
        while(nodeIndex != 0) {
            uint childBranch = direction(smartNode.node.label);
            nodeIndex = smartNode.parentIndex;
            smartNode = nodes[nodeIndex];
            if(highestPathVotes <= smartNode.highestPathVotes) {
                return;
            }
            smartNode.highestPathVotes = highestPathVotes;
            smartNode.highestPathBranch = childBranch;
        }
    }
    function setTaxRate() external {
        uint t = schedule()-1;
        SmartNode storage smartNode = data[t].nodes[0];
        Label memory label = smartNode.node.label;
        while (smartNode.node.branches[0] != 0 || smartNode.node.branches[1] != 0) {
            uint nodeIndex = smartNode.node.branches[smartNode.highestPathBranch];
            smartNode = data[t].nodes[nodeIndex];
            label.data = label.data << smartNode.node.label.length | smartNode.node.label.data;
            label.length += smartNode.node.label.length;
        }
        require(smartNode.highestPathVotes > bitPeople.population(t)/2, "Error: insufficient votes for tax rate change");
        uint segmentAverage;
        if(label.length < MAX_LENGTH) segmentAverage = (1 << MAX_LENGTH - label.length - 1) - 1;
        pan.setTaxRate(label.data << MAX_LENGTH - label.length | segmentAverage);
        smartNode.highestPathVotes = 0;
    }

    function claimVotes() external {
        uint t = schedule();
        data[t].votes[msg.sender] += data[t].balanceOf[msg.sender];
        data[t].balanceOf[msg.sender] = 0;
    }
    function allocateVoteToken() external {
        uint t = schedule();
        require(bitPeople.proofOfUniqueHuman(t, msg.sender), "Failed to verify proof-of-unique-human.");
        require(!data[t].claimedVoteToken[msg.sender], "Error: Vote token already claimed for this period");
        data[t].balanceOf[msg.sender]++;
        data[t].claimedVoteToken[msg.sender] = true;
    }
    
    function _transfer(uint t, address from, address to, uint value) internal {
        require(data[t].balanceOf[from] >= value, "Error: Insufficient balance to transfer");
        data[t].balanceOf[from] -= value;
        data[t].balanceOf[to] += value;
        emit Transfer(t, from, to, value);
    }
    function transfer(address to, uint value) external {
        _transfer(schedule(), msg.sender, to, value);
    }
    function approve(address spender, uint value) external {
        uint t = schedule();
        data[t].allowance[msg.sender][spender] = value;
        emit Approval(t, msg.sender, spender, value);
    }
    function transferFrom(address from, address to, uint value) external {
        uint t = schedule();
        require(data[t].allowance[from][msg.sender] >= value, "Error: Insufficient allowance for transfer");
        _transfer(t, from, to, value);
        data[t].allowance[from][msg.sender] -= value;
    }

    function getNode(uint t, uint i) external view returns (SmartNode memory) { return data[t].nodes[i]; }
    function getNodeCount(uint t) external view returns (uint) { return data[t].nodes.length; }
    function getNodes(uint t) external view returns (SmartNode[] memory) { return data[t].nodes; }
    function getVoterNode(uint t, address account, uint i) external view returns (VoterNode memory) { return data[t].voterNodes[account][i]; }
    function getVoterNodeCount(uint t, address account) external view returns (uint) { return data[t].voterNodes[account].length; }
    function getVoterNodes(uint t, address account) external view returns (VoterNode[] memory) { return data[t].voterNodes[account]; }
    function getVotes(uint t, address account) external view returns (uint) { return data[t].votes[account]; }
    function balanceOf(uint t, address account) external view returns (uint) { return data[t].balanceOf[account]; }
    function allowance(uint t, address owner, address spender) external view returns (uint) { return data[t].allowance[owner][spender]; }
    function getClaimedVoteToken(uint t, address account) external view returns (bool) { return data[t].claimedVoteToken[account]; }
}
