// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVerifier {
    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool);
}

contract Whirlwind {
    address public depositVerifier;
    address public withdrawVerifier;

    // Deposit index to track the number of deposits
    uint256 public depositIndex;
    // Maximum allowed deposits computed from the Merkle tree depth
    uint256 public maxDeposits;

    mapping(bytes32 => bool) public usedNullifiers;
    bytes32 public currentRoot;

    event Deposit(bytes32 newRoot, bytes32 commitment, uint256 index);
    event Withdraw(address indexed recipient, bytes32 nullifier);

    address public owner;

    // Constructor sets verifier addresses, owner, and computes the maximum number of leaves
    constructor(address _depositVerifier, address _withdrawVerifier, uint256 _merkleTreeDepth, bytes32 _initialRoot) {
        owner = msg.sender;
        depositVerifier = _depositVerifier; //"0x47c9Fb923a43eD7612848C1132Fb21e9C43Cb08b"
        withdrawVerifier = _withdrawVerifier; //"0xc9924dc96397369B121001fc740D5E63470Ea537"
        maxDeposits = 2 ** _merkleTreeDepth; //merkleTreeDepth = 8
        currentRoot = _initialRoot;//initialRoot = "0x284470996674816a6562d21babb0686789730c31c7c8694426e6b27a5a5cf95c" (Default tree hash)
    }

    // Deposit function uses the internal depositIndex and checks against maxDeposits
    function deposit(bytes calldata proof, bytes32 newRoot, bytes32 commitment) external payable {
        require(depositIndex < maxDeposits, "Deposit limit reached");
        // Create a dynamic bytes32 array in memory with 4 elements
        bytes32[] memory publicInputs = new bytes32[](4);

        publicInputs[0] = currentRoot;
        publicInputs[1] = newRoot;
        publicInputs[2] = commitment;
        publicInputs[3] = bytes32(uint256(depositIndex)); // if depositIndex is uint256

        require(msg.value == 0.1 ether, "Must deposit exactly 0.1 ETH");
        require(IVerifier(depositVerifier).verify(proof, publicInputs), "Invalid deposit proof");

        currentRoot = newRoot;
        emit Deposit(newRoot, commitment, depositIndex);
        depositIndex++; // Increment internal deposit index
    }

    function withdraw(bytes calldata proof, bytes32 nullifier) external {
        require(!usedNullifiers[nullifier], "Nullifier already used");
        bytes32[] memory publicInputs = new bytes32[](2);
        publicInputs[0] = currentRoot;
        publicInputs[1] = nullifier;
        require(IVerifier(withdrawVerifier).verify(proof, publicInputs), "Invalid withdraw proof");

        usedNullifiers[nullifier] = true;
        emit Withdraw(msg.sender, nullifier);
        payable(msg.sender).transfer(0.1 ether);
    }
}
