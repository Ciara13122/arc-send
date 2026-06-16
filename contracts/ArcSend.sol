// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
// arc-send: send USDC by @username. Hides blockchain — register a handle, pay handles or addresses with a note.
contract ArcSend {
    mapping(bytes32 => address) public nameToAddr; // keccak(lowercase name) => wallet
    mapping(address => string) public addrToName;  // wallet => display name
    uint256 public totalUsers;
    uint256 public totalSent;
    uint256 public txCount;
    struct Payment { address from; address to; uint256 amount; string note; uint256 at; }
    Payment[] public payments;
    mapping(address => uint256[]) private sentBy;
    mapping(address => uint256[]) private recvBy;
    event Registered(address indexed user, string name);
    event Sent(address indexed from, address indexed to, uint256 amount, string note);

    function register(string calldata name) external {
        bytes32 key = keccak256(bytes(_lower(name)));
        require(nameToAddr[key] == address(0), "Name taken");
        require(bytes(addrToName[msg.sender]).length == 0, "Already registered");
        uint256 n = bytes(name).length;
        require(n >= 3 && n <= 20, "3-20 chars");
        nameToAddr[key] = msg.sender;
        addrToName[msg.sender] = name;
        totalUsers++;
        emit Registered(msg.sender, name);
    }
    function resolve(string calldata name) public view returns (address) {
        return nameToAddr[keccak256(bytes(_lower(name)))];
    }
    function sendByName(string calldata name, string calldata note) external payable {
        address to = resolve(name);
        require(to != address(0), "Name not found");
        _send(to, note);
    }
    function sendTo(address to, string calldata note) external payable {
        require(to != address(0), "Bad address");
        _send(to, note);
    }
    function _send(address to, string calldata note) internal {
        require(msg.value > 0, "Zero amount");
        (bool ok,) = payable(to).call{value: msg.value}(""); require(ok, "transfer failed");
        uint256 id = payments.length;
        payments.push(Payment(msg.sender, to, msg.value, note, block.timestamp));
        sentBy[msg.sender].push(id); recvBy[to].push(id);
        totalSent += msg.value; txCount++;
        emit Sent(msg.sender, to, msg.value, note);
    }
    function _lower(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] >= 0x41 && b[i] <= 0x5A) b[i] = bytes1(uint8(b[i]) + 32);
        }
        return string(b);
    }
    function getSent(address u) external view returns (uint256[] memory) { return sentBy[u]; }
    function getRecv(address u) external view returns (uint256[] memory) { return recvBy[u]; }
    function getPayment(uint256 id) external view returns (Payment memory) { return payments[id]; }
}
